import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Student from "../models/Student.js";
import Application from "../models/Application.js";
import FinanceTransaction from "../models/FinanceTransaction.js";
import { acceptStudentFromPayment } from "../services/studentService.js";

await connectDB();

try {
  const students = await Student.find({ status: { $ne: "active" } })
    .select("_id applicationId status")
    .lean();
  const applications = await Application.find({
    _id: { $in: students.map((student) => student.applicationId).filter(Boolean) },
    status: { $in: ["pending", "reviewed"] },
  })
    .select("_id")
    .lean();
  const pendingIds = new Set(applications.map((application) => String(application._id)));
  const payments = await FinanceTransaction.find({
    kind: "payment",
    status: "completed",
    studentId: { $in: students.map((student) => student._id) },
  })
    .select("studentId")
    .lean();
  const paidIds = new Set(payments.map((payment) => String(payment.studentId)));
  const candidates = students.filter(
    (student) => pendingIds.has(String(student.applicationId)) && paidIds.has(String(student._id))
  );

  for (const student of candidates) {
    await acceptStudentFromPayment(student);
  }

  console.log(`Accepted ${candidates.length} student${candidates.length === 1 ? "" : "s"} with completed payments.`);
} finally {
  await mongoose.disconnect();
}
