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

router.use(auth, requireRole("admin", "secretary"));

// Answers all of a collection's count questions in a single query.
//
// Opening a dashboard used to fire seventeen separate queries - fifteen
// countDocuments calls, a find, and an aggregate for the intake capacity total -
// six of them `countDocuments({})` over an entire collection. Each collection now
// folds its own counts into one $facet, so the round trips drop to one per
// collection plus the two standalone queries at the bottom.
//
// This is a round-trip and query-count win, not an index win: a `$count` inside a
// $facet still scans the collection's documents, because an index is only used
// for a leading $match on the pipeline itself. The indexes added alongside this
// pay off on the individual filtered counts that remain, and on every list route.
//
// A $facet always returns exactly one document, so `[0]` is always safe.
const facet = async (Model, stages) => {
  const [row] = await Model.aggregate([{ $facet: stages }]);
  return row || {};
};

router.get("/", async (req, res) => {
  try {
    const [
      messageCounts,
      memberCounts,
      postCounts,
      intakeCounts,
      applicationCounts,
      studentCounts,
      testimonialCounts,
      userCounts,
      activeAssignments,
      recentApplications,
    ] = await Promise.all([
      facet(Message, {
        total: [{ $count: "n" }],
        unread: [{ $match: { isRead: false } }, { $count: "n" }],
      }),
      facet(Member, {
        total: [{ $count: "n" }],
      }),
      facet(Post, {
        total: [{ $count: "n" }],
        published: [{ $match: { isPublished: true } }, { $count: "n" }],
      }),
      facet(Intake, {
        total: [{ $count: "n" }],
        open: [{ $match: { status: "open" } }, { $count: "n" }],
        // The capacity total used to be a separate aggregate of its own.
        capacity: [{ $group: { _id: null, capacity: { $sum: "$capacity" } } }],
      }),
      facet(Application, {
        total: [{ $count: "n" }],
        pending: [{ $match: { status: "pending" } }, { $count: "n" }],
      }),
      facet(Student, {
        total: [{ $count: "n" }],
        active: [{ $match: { status: "active" } }, { $count: "n" }],
      }),
      facet(Testimonial, {
        total: [{ $count: "n" }],
        pending: [{ $match: { isApproved: false } }, { $count: "n" }],
      }),
      facet(User, {
        active: [{ $match: { active: true } }, { $count: "n" }],
        trainers: [{ $match: { role: "trainer", active: true } }, { $count: "n" }],
      }),
      // A standalone indexed count, not a $facet: it is a different collection
      // with no sibling counts to fold in, and a plain count off
      // { active: -1, createdAt: -1 } avoids scanning the whole collection.
      TrainerAssignment.countDocuments({ active: true }),
      Application.find({})
        .select("name program intakeTitle status createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({
      messages: messageCounts.total?.[0]?.n || 0,
      unreadMessages: messageCounts.unread?.[0]?.n || 0,
      members: memberCounts.total?.[0]?.n || 0,
      posts: postCounts.total?.[0]?.n || 0,
      publishedPosts: postCounts.published?.[0]?.n || 0,
      intakes: intakeCounts.open?.[0]?.n || 0,
      totalIntakes: intakeCounts.total?.[0]?.n || 0,
      totalCapacity: intakeCounts.capacity?.[0]?.capacity || 0,
      applications: applicationCounts.total?.[0]?.n || 0,
      pendingApplications: applicationCounts.pending?.[0]?.n || 0,
      students: studentCounts.total?.[0]?.n || 0,
      activeStudents: studentCounts.active?.[0]?.n || 0,
      testimonials: testimonialCounts.total?.[0]?.n || 0,
      pendingTestimonials: testimonialCounts.pending?.[0]?.n || 0,
      trainers: userCounts.trainers?.[0]?.n || 0,
      activeAssignments,
      staffAccounts: userCounts.active?.[0]?.n || 0,
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
