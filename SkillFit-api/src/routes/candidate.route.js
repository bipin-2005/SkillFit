const router = require("express").Router();

const{requireAuth}= require("../middleware/auth.middleware");
const {allowRoles} = require("../middleware/role.middleware");
const { uploadResume } = require("../middleware/upload.middleware");
const candidateProfile = require("../controllers/candidateProfileController");
const  applicationController = require("../controllers/applicationController");

router.get("/profile",requireAuth,allowRoles("candidate"),candidateProfile.getMyProfile);
router.get("/updateprofile",requireAuth,allowRoles("candidate"),candidateProfile.usertProfile);
router.post("/jobs/:jobId/apply",requireAuth,allowRoles("candidate"),uploadResume,applicationController.applyToJob);


module.exports=router;