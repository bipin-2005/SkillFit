const mongoose = require("mongoose");

const candidateProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    headline: String,
    skills: [String],
    experience: Number, // years
    education: String,

    resumeUrl: String,

    location: String,
    openToWork: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("candidateProfile", candidateProfileSchema);
