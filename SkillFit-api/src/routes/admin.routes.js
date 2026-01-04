const router = require("express").Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/role.middleware");
const adminController = require("../controllers/adminController");
const {loginLimiter,otpLimiter,refreshLimiter} = require("../middleware/rateLimiter"); 
const {getAuditLogs}= require("../controllers/adminAuditController");


router.post("/signup",adminController.signupAdmin);
router.post("/login",loginLimiter,adminController.loginAdmin);
router.post("/refresh", refreshLimiter,adminController.refreshAdmin);
router.post("/logout",adminController.logoutAdmin);
router.post("/forgotpassword",otpLimiter,adminController.forgotPassword);
router.post("/resetpassword",otpLimiter,otpLimiter,adminController.resetPassword);
router.post("/verifyMail",otpLimiter,adminController.verifyMail);

router.get("/audit-logs",requireAuth,allowRoles("admin"),getAuditLogs);
module.exports = router;
