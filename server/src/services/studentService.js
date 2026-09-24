import crypto from "crypto";
import bcrypt from "bcryptjs";
import Student from "../models/Student.js";

const PIN_SALT_ROUNDS = 10;

export function generatePin() {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function generateRegNumber() {
  const year = new Date().getFullYear();
  const prefix = `DTS-${year}-`;
  const latest = await Student.findOne({
    regNumber: new RegExp(`^DTS-${year}-(\\d{4})$`),
  })
    .sort({ regNumber: -1 })
    .select("regNumber")
    .lean();
  const seq = latest ? parseInt(latest.regNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export const studentStatusFromApplication = (status) =>
  status === "accepted" ? "active" : status === "rejected" ? "rejected" : "applicant";

export const applicationStatusFromStudent = (status) =>
  status === "active" ? "accepted" : status === "rejected" ? "rejected" : "pending";

export async function createStudentForApplication(application, { userId } = {}) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const pin = generatePin();
      const pinHash = await bcrypt.hash(pin, PIN_SALT_ROUNDS);
      const regNumber = await generateRegNumber();
      const student = await Student.create({
        regNumber,
        pinHash,
        applicationId: application._id,
        userId: userId || application.userId || undefined,
        intakeId: application.intakeId,
        intakeTitle: application.intakeTitle,
        name: application.name,
        email: application.email,
        phone: application.phone,
        campus: application.campus,
        program: application.program,
        preferredCourses: Array.isArray(application.preferredCourses)
          ? application.preferredCourses
          : [],
        motivation: application.motivation,
        status: studentStatusFromApplication(application.status),
      });
      return { student, pin };
    } catch (error) {
      lastError = error;
      if (!error || error.code !== 11000) throw error;
    }
  }
  throw lastError || new Error("Could not allocate a registration number");
}

export async function resetStudentPin(student) {
  const pin = generatePin();
  student.pinHash = await bcrypt.hash(pin, PIN_SALT_ROUNDS);
  return { student, pin };
}