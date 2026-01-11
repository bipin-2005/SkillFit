const router = require("express").Router();
const jobController = require("../controllers/jobController");

router.get("/", jobController.getPublicJobs);
router.get("/:id", jobController.getJobById);

module.exports = router;
