const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true
        },

        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        recruiter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        status: {
            type: String,
            enum: ["applied", "shortlisted", "rejected", "hired"],
            default: "applied"
        },
        resume: {
            url: String,
            uploadedAt: Date
        },
        coverLetter: String
    },
    { timestamps: true }
);

/* Prevent duplicate applications */
applicationSchema.index(
    { job: 1, candidate: 1 },
    { unique: true }
);

module.exports = mongoose.model("Application", applicationSchema);
