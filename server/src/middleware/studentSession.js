import Student from "../models/Student.js";
import User from "../models/User.js";
import { verifyToken } from "../utils/token.js";

// Accepts EITHER kind of bearer token:
//   - a student-scoped token from POST /api/students/login  -> req.student
//   - a staff/user token                                    -> req.user
// Used for routes that both staff and a signed-in student need to reach.
const studentSession = async (req, res, next) => {
  try {
    const header = req.header("Authorization");
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Sign in to view this information" });
    }

    const decoded = verifyToken(header.replace("Bearer ", ""));

    if (decoded.kind === "student") {
      const student = await Student.findById(decoded.id);
      if (!student) {
        return res.status(401).json({ message: "Student session is no longer valid" });
      }
      req.student = student;
      return next();
    }

    const user = await User.findById(decoded.id);
    if (!user || user.active === false) {
      return res.status(401).json({ message: "Token is not valid" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

export default studentSession;
