const Job= require("../models/jobModel");
const Application= require("../models/application");
const { uploadResumeToCloudinary } = require("../services/resumeUpload.services");

/* APPLY WITH RESUME */
exports.applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Resume required" });
    }

    const job = await Job.findById(jobId);
    if (!job || job.status !== "open") {
      return res.status(404).json({ message: "Job not available" });
    }

    const resumeUrl = await uploadResumeToCloudinary(
      req.file,
      req.user._id
    );

    const application = await Application.create({
      job: job._id,
      candidate: req.user._id,
      recruiter: job.postedBy,
      resume: {
        url: resumeUrl,
        uploadedAt: new Date()
      },
      coverLetter
    });

    return res.status(201).json(application);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Already applied" });
    }

    console.error(error);
    return res.status(500).json({ message: "Application failed" });
  }
};
