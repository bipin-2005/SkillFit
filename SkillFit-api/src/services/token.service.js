const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // ← REQUIRED
const { secret, expiresIn } = require("../config/jwt");

/* Generate Access Token */
exports.generateToken = payload => {
  payload.pca=Date.now();
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn:"15m" });
};

/* Generate Refresh Token */
exports.generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};
