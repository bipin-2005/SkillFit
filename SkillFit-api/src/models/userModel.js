const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["candidate", "recruiter","admin"],
      default: "candidate"
    },
    resetOTP: {
      type: String
    },
    resetOTPExpiry: {
      type: Date
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationOTP: {
      type: String
    },
    emailVerificationExpiry: {
      type: Date
    },
    passwordChangedAt: Date,
    refreshTokens: [
      {
        token: String,
        device: String,
        ip: String,
        createdAt: Date,
        expiresAt: Date,
        revoked: Boolean
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
