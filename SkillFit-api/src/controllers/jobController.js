const Job = require("../models/jobModel");
const Company = require("../models/companyModel");
const { logEvent } = require("../services/audit.service");

/* RECRUITER: CREATE JOB */
exports.createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      skillsRequired,
      location,
      employmentType,
      experienceRequired,
      salaryRange
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    // recruiter must have a company
    const company = await Company.findOne({ createdBy: req.user._id });
    if (!company) {
      return res.status(400).json({ message: "Create company before posting jobs" });
    }

    const job = await Job.create({
      title,
      description,
      skillsRequired,
      location,
      employmentType,
      experienceRequired,
      salaryRange,
      company: company._id,
      postedBy: req.user._id
    });

    await logEvent(req, {
      userId: req.user._id,
      email: req.user.email,
      action: "JOB_CREATED",
      status: "SUCCESS",
      metadata: { jobId: job._id }
    });

    return res.status(201).json(job);
  } catch (error) {
    console.error("Create job error:", error);

    await logEvent(req, {
      userId: req.user._id,
      email: req.user.email,
      action: "JOB_CREATE_FAILED",
      status: "FAILED",
      metadata: { error: error.message }
    });

    return res.status(500).json({ message: "Failed to create job" });
  }
};

/* RECRUITER: GET MY JOBS */
exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id })
      .populate("company", "name location");

    return res.json(jobs);
  } catch (error) {
    console.error("Get recruiter jobs error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/* PUBLIC: LIST ALL OPEN JOBS */
exports.getPublicJobs = async (req, res) => {
  try {
    const { location, skill } = req.query;

    const filter = { status: "open" };

    if (location) filter.location = location;
    if (skill) filter.skillsRequired = { $in: [skill] };

    const jobs = await Job.find(filter)
      .populate("company", "name location industry")
      .sort({ createdAt: -1 });

    return res.json(jobs);
  } catch (error) {
    console.error("Public jobs error:", error);
    return res.status(500).json({ message: "Unable to fetch jobs" });
  }
};

/* PUBLIC: GET SINGLE JOB */
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("company", "name description website location");

    if (!job || job.status !== "open") {
      return res.status(404).json({ message: "Job not found" });
    }

    return res.json(job);
  } catch (error) {
    console.error("Get job error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
