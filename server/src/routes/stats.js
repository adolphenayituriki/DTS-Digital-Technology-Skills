import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import Application from "../models/Application.js";
import Attendance from "../models/Attendance.js";
import Intake from "../models/Intake.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import Post from "../models/Post.js";
import Student from "../models/Student.js";
import Testimonial from "../models/Testimonial.js";
import TrainerAssignment from "../models/TrainerAssignment.js";
import User from "../models/User.js";

const router = Router();

router.use(auth, requireRole("admin", "editor"));

// Real counts straight from the database, so a dashboard can never show a
// number that was guessed locally or silently defaulted to 0 on a failed call.
router.get("/", async (req, res) => {
  try {
    const [
      totalMessages,
      unreadMessages,
      totalMembers,
      totalPosts,
      publishedPosts,
      totalIntakes,
      openIntakes,
      totalApplications,
      pendingApplications,
      totalStudents,
      activeStudents,
      totalTestimonials,
      pendingTestimonials,
      totalTrainers,
      activeAssignments,
      totalUsers,
      recentApplications,
    ] = await Promise.all([
      Message.countDocuments({}),
      Message.countDocuments({ isRead: false }),
      Member.countDocuments({}),
      Post.countDocuments({}),
      Post.countDocuments({ isPublished: true }),
      Intake.countDocuments({}),
      Intake.countDocuments({ status: "open" }),
      Application.countDocuments({}),
      Application.countDocuments({ status: "pending" }),
      Student.countDocuments({}),
      Student.countDocuments({ status: "active" }),
      Testimonial.countDocuments({}),
      Testimonial.countDocuments({ isApproved: false }),
      User.countDocuments({ role: "trainer", active: true }),
      TrainerAssignment.countDocuments({ active: true }),
      User.countDocuments({ active: true }),
      Application.find({}).select("name program intakeTitle status createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const intakeRollup = await Intake.aggregate([
      { $group: { _id: null, capacity: { $sum: "$capacity" } } },
    ]);

    res.json({
      messages: totalMessages,
      unreadMessages,
      members: totalMembers,
      posts: totalPosts,
      publishedPosts,
      intakes: openIntakes,
      totalIntakes,
      totalCapacity: intakeRollup[0]?.capacity || 0,
      applications: totalApplications,
      pendingApplications,
      students: totalStudents,
      activeStudents,
      testimonials: totalTestimonials,
      pendingTestimonials,
      trainers: totalTrainers,
      activeAssignments,
      staffAccounts: totalUsers,
      recentApplications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Enrollment + attendance rollup for the student records view.
router.get("/students", async (req, res) => {
  try {
    const [byStatus, byIntake, attendance] = await Promise.all([
      Student.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Student.aggregate([
        {
          $group: {
            _id: "$intakeId",
            count: { $sum: 1 },
            intakeTitle: { $last: "$intakeTitle" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Attendance.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      byStatus: byStatus.reduce((acc, row) => ({ ...acc, [row._id || "unknown"]: row.count }), {}),
      byIntake: byIntake.map((row) => ({
        intakeId: row._id,
        intakeTitle: row.intakeTitle || "Unassigned",
        count: row.count,
      })),
      attendance: attendance.reduce(
        (acc, row) => ({ ...acc, [row._id || "unknown"]: row.count }),
        {}
      ),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
