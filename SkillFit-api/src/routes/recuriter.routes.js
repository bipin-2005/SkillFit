const router = require("express").Router();

const { requireAuth } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/role.middleware");
const jobController = require("../controllers/jobController");

const companyController = require("../controllers/companyController");

router.post(
  "/company",
  requireAuth,
  allowRoles("recruiter"),
  companyController.createCompany
);

router.get(
  "/company",
  requireAuth,
  allowRoles("recruiter"),
  companyController.getMyCompany
);

router.put(
  "/company",
  requireAuth,
  allowRoles("recruiter"),
  companyController.updateCompany
);

router.post(
  "/jobs",
  requireAuth,
  allowRoles("recruiter"),
  jobController.createJob
);

router.get(
  "/jobs",
  requireAuth,
  allowRoles("recruiter"),
  jobController.getMyJobs
);


module.exports = router;
