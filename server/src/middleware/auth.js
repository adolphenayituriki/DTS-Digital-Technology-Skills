import User from "../models/User.js";
import { verifyToken } from "../utils/token.js";

const auth = async (req, res, next) => {
  try {
    const header = req.header("Authorization");

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const decoded = verifyToken(header.replace("Bearer ", ""));
    if (decoded.kind === "student") {
      return res.status(401).json({ message: "Not a staff account" });
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

export default auth;
