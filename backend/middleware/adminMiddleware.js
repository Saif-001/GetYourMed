// import User from "../models/User.js";

export default async function adminMiddleware(req, res, next) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.userId).select("role");

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Administrator access required",
      });
    }

    next();
  } catch (error) {
    console.error("Admin authorization error:", error);

    res.status(500).json({
      message: "Unable to verify administrator access",
    });
  }
}