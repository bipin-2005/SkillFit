const router = require("express").Router();

const controller = require("../controllers/authController");
const {loginLimiter,otpLimiter,refreshLimiter} = require("../middleware/rateLimiter"); 
const { requireAuth } = require("../middleware/auth.middleware");
const { checkVerified } = require("../middleware/verify.middleware");
const { passwordFresh } = require("../middleware/password.middleware");

router.post("/signup",controller.signup);
router.post("/login",loginLimiter,controller.login);
router.post("/refresh",refreshLimiter,controller.refresh);
router.post("/logout",controller.logout);
router.post("/forgotpassword",otpLimiter,controller.forgotPassword);
router.post("/resetpassword",otpLimiter,controller.resetPassword);
router.post("/verifymail",otpLimiter,controller.verifyMail);

module.exports = router;

