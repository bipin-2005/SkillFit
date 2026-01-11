const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    description: String,

    website: String,

    location: String,

    industry: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true   // one company per recruiter
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
