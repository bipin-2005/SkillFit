const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

exports.requireAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const token = auth.split(" ")[1];

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // Block tokens issued before password change
    if (user.passwordChangedAt) {
      const passwordChangedAtSeconds = parseInt(
        user.passwordChangedAt.getTime() / 1000
      );

      if (payload.iat < passwordChangedAtSeconds) {
        return res
          .status(403)
          .json({ message: "Session expired — please login again" });
      }
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Auth error", error);
    return res
      .status(401)
      .json({ message: "Invalid or expired token" });
  }
};
