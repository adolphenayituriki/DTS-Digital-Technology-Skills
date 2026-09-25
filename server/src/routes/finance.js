import { Router } from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import Intake from "../models/Intake.js";
import Student from "../models/Student.js";
import FinanceTransaction from "../models/FinanceTransaction.js";

const router = Router();
router.use(auth, requireRole("finance", "admin"));

const validId = (value) => mongoose.isValidObjectId(value);
const currencyValues = new Set(["RWF", "USD", "EUR", "GBP"]);
const transactionKinds = new Set(["payment", "income", "expense"]);
const transactionStatuses = new Set(["completed", "pending", "voided"]);
const methods = new Set(["cash", "mobile_money", "bank", "other"]);
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sum = (items, getter) => items.reduce((total, item) => total + Number(getter(item) || 0), 0);

const studentFilter = ({ intakeId, status, q } = {}) => {
  const filter = {};
  if (intakeId && validId(intakeId)) filter.intakeId = intakeId;
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim()), "i");
    filter.$or = [{ name: rx }, { email: rx }, { regNumber: rx }];
  }
  return filter;
};

const getBalances = async (filters = {}) => {
  const students = await Student.find(studentFilter(filters))
    .select("_id name email phone regNumber intakeId intakeTitle program status preferredCourses")
    .sort({ name: 1 })
    .lean();
  const ids = students.map((student) => student._id);
  const payments = ids.length
    ? await FinanceTransaction.find({ kind: "payment", status: "completed", studentId: { $in: ids } })
        .select("studentId amount currency occurredAt")
        .lean()
    : [];
  const paymentMap = new Map();
  payments.forEach((payment) => {
    const key = String(payment.studentId);
    paymentMap.set(key, (paymentMap.get(key) || 0) + Number(payment.amount || 0));
  });
  const intakeIds = [...new Set(students.map((student) => String(student.intakeId)))];
  const intakes = intakeIds.length ? await Intake.find({ _id: { $in: intakeIds } }).select("_id title program tuitionFee currency").lean() : [];
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
    res.json(await getBalances(req.query));
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
      const rx = new RegExp(escapeRegex(req.query.q), "i");
      filter.$or = [{ reference: rx }, { category: rx }, { notes: rx }];
    }
    const transactions = await populateTransaction(FinanceTransaction.find(filter).sort({ occurredAt: -1, createdAt: -1 }));
    res.json(transactions);
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
    const intakeId = student?.intakeId || (validId(rawIntakeId) ? rawIntakeId : undefined);
    if (rawIntakeId && !validId(rawIntakeId)) return res.status(400).json({ message: "Invalid intake" });
    const intake = intakeId ? await Intake.findById(intakeId).select("currency") : null;
    if (rawIntakeId && !intake) return res.status(404).json({ message: "Intake not found" });
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

export default router;
