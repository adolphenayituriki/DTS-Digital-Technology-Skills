import { Router } from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import studentSession from "../middleware/studentSession.js";
import Intake from "../models/Intake.js";
import Student from "../models/Student.js";
import FinanceTransaction from "../models/FinanceTransaction.js";
import { sendStudentBalanceNotification } from "../utils/mailer.js";
import { parsePage, pageResponse } from "../utils/pagination.js";
import { searchFilter } from "../utils/search.js";

const router = Router();

// Registered BEFORE the finance/admin role guard below, because a signed-in
// student must be able to read their own balance. Accepts either a
// student-scoped token or a staff/user token.
router.get("/student/me", studentSession, async (req, res) => {
  try {
    const query = req.student
      ? { _id: req.student._id }
      : { userId: req.user._id };

    const student = await Student.findOne(query)
      .select("_id name email regNumber intakeId intakeTitle program")
      .lean();
    if (!student) return res.status(404).json({ message: "Student profile not found" });

    const intake = student.intakeId ? await Intake.findById(student.intakeId).select("title program tuitionFee currency").lean() : null;
    const expected = Number(intake?.tuitionFee || 0);

    const payments = await FinanceTransaction.find({ kind: "payment", status: "completed", studentId: student._id })
      .select("amount currency occurredAt")
      .lean();
    const paid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    res.json({
      ...student,
      intakeTitle: intake?.title || student.intakeTitle,
      intakeProgram: intake?.program || student.program,
      currency: intake?.currency || "RWF",
      expected,
      paid,
      balance: Math.max(0, expected - paid),
      paymentStatus: expected === 0 ? "not_configured" : paid >= expected ? "paid" : paid > 0 ? "partial" : "unpaid",
      payments: payments
        .map((p) => ({ amount: Number(p.amount || 0), currency: p.currency || "RWF", occurredAt: p.occurredAt }))
        .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.use(auth, requireRole("finance", "admin"));

const validId = (value) => mongoose.isValidObjectId(value);
const currencyValues = new Set(["RWF", "USD", "EUR", "GBP"]);
const transactionKinds = new Set(["payment", "income", "expense"]);
const transactionStatuses = new Set(["completed", "pending", "voided"]);
const methods = new Set(["cash", "mobile_money", "bank", "other"]);

const sum = (items, getter) => items.reduce((total, item) => total + Number(getter(item) || 0), 0);

const BALANCE_FIELDS = "_id name email phone regNumber intakeId intakeTitle program status preferredCourses";

const studentFilter = ({ intakeId, status, q } = {}) => {
  const filter = {};
  if (intakeId && validId(intakeId)) filter.intakeId = intakeId;
  if (status) filter.status = status;
  // Anchored so it can use the { name: 1 } / { email: 1 } indexes; the
  // unanchored version this replaced scanned the whole students collection on
  // every keystroke.
  Object.assign(filter, searchFilter(q, ["name", "email", "regNumber"]) || {});
  return filter;
};

// Rolls up a balance row for each student already fetched.
//
// Takes the students rather than the filters on purpose. The dashboard needs a
// total across every student, so it cannot be served a page, and the list route
// can only compute balances for the rows it is about to return. Passing the rows
// in is what lets both share this logic without either one silently reading a
// partial total as a real one.
const attachBalances = (students) => {
  const ids = students.map((student) => student._id);
  return (payments, intakes) => {
    const paymentMap = new Map();
    payments.forEach((payment) => {
      const key = String(payment.studentId);
      paymentMap.set(key, (paymentMap.get(key) || 0) + Number(payment.amount || 0));
    });
    const intakeMap = new Map(intakes.map((intake) => [String(intake._id), intake]));
    return students.map((student) => {
      const intake = intakeMap.get(String(student.intakeId));
      const expected = Number(intake?.tuitionFee || 0);
      const paid = paymentMap.get(String(student._id)) || 0;
      return {
        ...student,
        intakeTitle: intake?.title || student.intakeTitle,
        intakeProgram: intake?.program || student.program,
        currency: intake?.currency || "RWF",
        expected,
        paid,
        balance: Math.max(0, expected - paid),
        paymentStatus: expected === 0 ? "not_configured" : paid >= expected ? "paid" : paid > 0 ? "partial" : "unpaid",
      };
    });
  };
};

// The balance rollup over every matching student. Used only by /dashboard, which
// is an aggregate view and genuinely needs all of them.
const getBalances = async (filters = {}) => {
  const students = await Student.find(studentFilter(filters))
    .select(BALANCE_FIELDS)
    .sort({ name: 1 })
    .lean();
  const ids = students.map((student) => student._id);
  const payments = ids.length
    ? await FinanceTransaction.find({ kind: "payment", status: "completed", studentId: { $in: ids } })
        .select("studentId amount currency occurredAt")
        .lean()
    : [];
  const intakeIds = [...new Set(students.map((student) => String(student.intakeId)))];
  const intakes = intakeIds.length
    ? await Intake.find({ _id: { $in: intakeIds } }).select("_id title program tuitionFee currency").lean()
    : [];
  return attachBalances(students)(payments, intakes);
};

// The paged form, for the list screen.
//
// This used to be the same unbounded call as the dashboard, so opening the
// balances page read every student, every one of their transactions and every
// intake title and shipped all of it to draw a table. Only the rows on the page
// are needed, so the student find is bounded first and the transaction lookup is
// restricted to those students - which is also the index-friendly shape.
const getBalancePage = async (filters, { page, limit, skip }) => {
  const filter = studentFilter(filters);
  const [students, total] = await Promise.all([
    Student.find(filter).select(BALANCE_FIELDS).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Student.countDocuments(filter),
  ]);

  const ids = students.map((student) => student._id);
  const [payments, intakes] = await Promise.all([
    ids.length
      ? FinanceTransaction.find({ kind: "payment", status: "completed", studentId: { $in: ids } })
          .select("studentId amount currency occurredAt")
          .lean()
      : [],
    (() => {
      const intakeIds = [...new Set(students.map((student) => String(student.intakeId)))];
      return intakeIds.length
        ? Intake.find({ _id: { $in: intakeIds } }).select("_id title program tuitionFee currency").lean()
        : [];
    })(),
  ]);

  return {
    items: attachBalances(students)(payments, intakes),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
};

const populateTransaction = (query) => query
  .populate("studentId", "name email regNumber")
  .populate("intakeId", "title program")
  .populate("recordedById", "name email");

router.get("/dashboard", async (req, res) => {
  try {
    const [intakes, students, transactions] = await Promise.all([
      Intake.find().sort({ createdAt: -1 }).lean(),
      getBalances(),
      FinanceTransaction.find({ status: "completed" }).sort({ occurredAt: -1 }).lean(),
    ]);
    const expected = sum(students, (student) => student.expected);
    const paid = sum(students, (student) => student.paid);
    const expenses = sum(transactions.filter((item) => item.kind === "expense"), (item) => item.amount);
    const otherIncome = sum(transactions.filter((item) => item.kind === "income"), (item) => item.amount);
    const byIntake = intakes.map((intake) => {
      const intakeStudents = students.filter((student) => String(student.intakeId) === String(intake._id));
      const intakeExpected = sum(intakeStudents, (student) => student.expected);
      const intakePaid = sum(intakeStudents, (student) => student.paid);
      return {
        _id: intake._id,
        title: intake.title,
        program: intake.program,
        currency: intake.currency || "RWF",
        tuitionFee: intake.tuitionFee || 0,
        studentCount: intakeStudents.length,
        expected: intakeExpected,
        paid: intakePaid,
        outstanding: Math.max(0, intakeExpected - intakePaid),
      };
    });
    const recent = await populateTransaction(FinanceTransaction.find().sort({ occurredAt: -1, createdAt: -1 }).limit(8));
    res.json({
      currency: "RWF",
      studentCount: students.length,
      expected,
      paid,
      outstanding: Math.max(0, expected - paid),
      expenses,
      otherIncome,
      net: paid + otherIncome - expenses,
      byIntake,
      recentTransactions: recent,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/intakes", async (req, res) => {
  try {
    const intakes = await Intake.find().sort({ createdAt: -1 }).lean();
    res.json(intakes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/students", async (req, res) => {
  try {
    const filters = { intakeId: req.query.intakeId, status: req.query.status, q: req.query.q };

    // The `all` escape hatch is checked first. It returns a bare array on purpose,
    // because the callers that need it - the CSV export, the bulk-email button, the
    // student picker on the records screen - want the whole filtered set and would
    // silently act on one page if it received the paged envelope. Skipping the
    // paginated call entirely here also avoids running two rollups for one request.
    if (req.query.all === "true") {
      return res.json(await getBalances(filters));
    }

    res.json(await getBalancePage(filters, parsePage(req.query)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const filter = {};
    if (req.query.kind && transactionKinds.has(req.query.kind)) filter.kind = req.query.kind;
    if (req.query.status && transactionStatuses.has(req.query.status)) filter.status = req.query.status;
    if (req.query.intakeId && validId(req.query.intakeId)) filter.intakeId = req.query.intakeId;
    if (req.query.studentId && validId(req.query.studentId)) filter.studentId = req.query.studentId;
    if (req.query.from || req.query.to) {
      filter.occurredAt = {};
      if (req.query.from) filter.occurredAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setUTCHours(23, 59, 59, 999);
        filter.occurredAt.$lte = to;
      }
    }
    if (req.query.q) {
      Object.assign(filter, searchFilter(req.query.q, ["reference", "category", "notes"]));
    }
    const base = FinanceTransaction.find(filter).sort({ occurredAt: -1, createdAt: -1 });

    // `all=true` is the export path: the CSV button wants every row that matches
    // the current filter, not the 50 that happen to be on screen. Deriving the
    // export from the page made "exported 340 rows" silently ship 50.
    if (req.query.all === "true") {
      const all = await populateTransaction(base);
      return res.json({
        items: all,
        total: all.length,
        page: 1,
        limit: all.length || 1,
        pages: 1,
      });
    }

    const { page, limit, skip } = parsePage(req.query);
    const [items, total] = await Promise.all([
      populateTransaction(base.skip(skip).limit(limit)),
      FinanceTransaction.countDocuments(filter),
    ]);
    res.json(
      pageResponse({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) })
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/transactions", async (req, res) => {
  try {
    const {
      kind,
      amount: rawAmount,
      studentId,
      intakeId: rawIntakeId,
      category,
      method = "other",
      status = "completed",
      occurredAt,
      reference,
      notes,
      currency: rawCurrency,
    } = req.body;
    const amount = Number(rawAmount);
    if (!transactionKinds.has(kind)) return res.status(400).json({ message: "Invalid transaction type" });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Amount must be greater than zero" });
    if (!methods.has(method)) return res.status(400).json({ message: "Invalid payment method" });
    if (!transactionStatuses.has(status) || status === "voided") return res.status(400).json({ message: "Invalid transaction status" });
    let student = null;
    if (studentId) {
      if (!validId(studentId)) return res.status(400).json({ message: "Invalid student" });
      student = await Student.findById(studentId).select("intakeId intakeTitle");
    }
    if (kind === "payment" && !student) return res.status(400).json({ message: "A student is required for a payment" });
    if (rawIntakeId && !validId(rawIntakeId)) return res.status(400).json({ message: "Invalid intake" });

    // A student's own intakeId can dangle if the intake row was later deleted or
    // renamed. That must NOT block recording a payment: the payment is real money
    // received, so fall back to the intake title already stored on the student.
    // Only a caller-supplied intakeId that cannot be found is a genuine 404.
    const studentIntakeId = student?.intakeId || null;
    const studentIntake = studentIntakeId ? await Intake.findById(studentIntakeId).select("currency tuitionFee") : null;
    const requestedIntake = validId(rawIntakeId) ? await Intake.findById(rawIntakeId).select("currency tuitionFee") : null;
    if (rawIntakeId && !requestedIntake) return res.status(404).json({ message: "Intake not found" });

    const intake = requestedIntake || studentIntake;
    const intakeId = requestedIntake ? requestedIntake._id : studentIntake?._id || undefined;
    const currency = rawCurrency || intake?.currency || "RWF";
    if (!currencyValues.has(currency)) return res.status(400).json({ message: "Invalid currency" });
    const date = occurredAt ? new Date(occurredAt) : new Date();
    if (Number.isNaN(date.getTime())) return res.status(400).json({ message: "Invalid transaction date" });
    const transaction = await FinanceTransaction.create({
      kind,
      amount,
      currency,
      studentId: student?._id,
      intakeId,
      category: String(category || "").trim(),
      method,
      status,
      occurredAt: date,
      reference: String(reference || "").trim(),
      notes: String(notes || "").trim(),
      recordedById: req.user._id,
    });
    const populated = await populateTransaction(FinanceTransaction.findById(transaction._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/transactions/:id/void", async (req, res) => {
  try {
    const transaction = await FinanceTransaction.findByIdAndUpdate(req.params.id, { status: "voided" }, { new: true });
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    const populated = await populateTransaction(FinanceTransaction.findById(transaction._id));
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/intakes/:id/fee", async (req, res) => {
  try {
    const tuitionFee = Number(req.body.tuitionFee);
    const currency = req.body.currency || "RWF";
    if (!Number.isFinite(tuitionFee) || tuitionFee < 0) return res.status(400).json({ message: "Tuition fee must be zero or greater" });
    if (!currencyValues.has(currency)) return res.status(400).json({ message: "Invalid currency" });
    const intake = await Intake.findByIdAndUpdate(req.params.id, { tuitionFee, currency }, { new: true, runValidators: true });
    if (!intake) return res.status(404).json({ message: "Intake not found" });
    res.json(intake);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/students/:id/send-balance", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select("_id name email regNumber intakeId intakeTitle program").lean();
    if (!student) return res.status(404).json({ message: "Student not found" });
    
    const intake = student.intakeId ? await Intake.findById(student.intakeId).select("title program tuitionFee currency").lean() : null;
    const expected = Number(intake?.tuitionFee || 0);
    
    const payments = await FinanceTransaction.find({ kind: "payment", status: "completed", studentId: student._id })
      .select("amount")
      .lean();
    const paid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balance = Math.max(0, expected - paid);
    
    await sendStudentBalanceNotification(student, {
      expected,
      paid,
      balance,
      intakeTitle: intake?.title || student.intakeTitle,
      currency: intake?.currency || "RWF",
    });
    
    res.json({ message: "Balance statement sent to student email." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/students/send-balance-bulk", async (req, res) => {
  try {
    const { intakeId, status, q } = req.body;
    // Reuses studentFilter rather than rebuilding the same $or by hand. This
    // endpoint and the list endpoint must agree on who "matching" means - when
    // they disagreed, the button would email a different set than the rows shown.
    const filter = studentFilter({ intakeId, status, q });

    // Not paged, and deliberately so: the whole point is to email every match.
    const students = await Student.find(filter)
      .select("_id name email regNumber intakeId intakeTitle program")
      .sort({ name: 1 })
      .lean();
    
    if (!students.length) return res.json({ message: "No students found matching criteria.", sent: 0 });
    
    const intakeIds = [...new Set(students.map((s) => String(s.intakeId)).filter(Boolean))];
    const intakes = intakeIds.length ? await Intake.find({ _id: { $in: intakeIds } }).select("_id title program tuitionFee currency").lean() : [];
    const intakeMap = new Map(intakes.map((i) => [String(i._id), i]));
    
    const studentIds = students.map((s) => s._id);
    const payments = await FinanceTransaction.find({ kind: "payment", status: "completed", studentId: { $in: studentIds } })
      .select("studentId amount")
      .lean();
    const paymentMap = new Map();
    payments.forEach((p) => {
      const key = String(p.studentId);
      paymentMap.set(key, (paymentMap.get(key) || 0) + Number(p.amount || 0));
    });
    
    let sent = 0;
    let failed = 0;
    for (const student of students) {
      const intake = intakeMap.get(String(student.intakeId));
      const expected = Number(intake?.tuitionFee || 0);
      const paid = paymentMap.get(String(student._id)) || 0;
      const balance = Math.max(0, expected - paid);

      try {
        await sendStudentBalanceNotification(student, {
          expected,
          paid,
          balance,
          intakeTitle: intake?.title || student.intakeTitle,
          currency: intake?.currency || "RWF",
        });
        sent++;
      } catch (e) {
        failed++;
        console.error(`[mailer] balance email failed for ${student.regNumber}:`, e.message);
      }
    }

    res.json({
      message: failed
        ? `Balance statements sent to ${sent} student(s); ${failed} failed.`
        : `Balance statements sent to ${sent} student(s).`,
      sent,
      failed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
