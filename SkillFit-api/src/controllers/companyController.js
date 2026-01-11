const Company = require("../models/companyModel");
const { logEvent } = require("../services/audit.service");

/* CREATE COMPANY */
exports.createCompany = async (req, res) => {
  try {
    const { name, description, website, location, industry } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Company name is required" });
    }

    const exists = await Company.findOne({ createdBy: req.user._id });
    if (exists) {
      return res.status(409).json({ message: "Company already exists" });
    }

    const company = await Company.create({
      name,
      description,
      website,
      location,
      industry,
      createdBy: req.user._id
    });

    await logEvent(req, {
      userId: req.user._id,
      email: req.user.email,
      action: "COMPANY_CREATED",
      status: "SUCCESS",
      metadata: { companyId: company._id }
    });

    return res.status(201).json(company);
  } catch (error) {
    console.error("Create company error:", error);

    await logEvent(req, {
      userId: req.user._id,
      email: req.user.email,
      action: "COMPANY_CREATE_FAILED",
      status: "FAILED",
      metadata: { error: error.message }
    });

    return res.status(500).json({ message: "Failed to create company" });
  }
};

/* GET MY COMPANY */
exports.getMyCompany = async (req, res) => {
  try {
    const company = await Company.findOne({ createdBy: req.user._id });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    return res.json(company);
  } catch (error) {
    console.error("Get company error:", error);

    return res.status(500).json({ message: "Something went wrong" });
  }
};

/* UPDATE COMPANY */
exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findOneAndUpdate(
      { createdBy: req.user._id },
      req.body,
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    await logEvent(req, {
      userId: req.user._id,
      email: req.user.email,
      action: "COMPANY_UPDATED",
      status: "SUCCESS",
      metadata: { companyId: company._id }
    });

    return res.json(company);
  } catch (error) {
    console.error("Update company error:", error);

    await logEvent(req, {
      userId: req.user._id,
      email: req.user.email,
      action: "COMPANY_UPDATE_FAILED",
      status: "FAILED",
      metadata: { error: error.message }
    });

    return res.status(500).json({ message: "Failed to update company" });
  }
};
