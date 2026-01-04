const User = require("../models/userModel");
const { hashPassword, comparePassword } = require("../services/password.service");
const { generateToken, generateRefreshToken } = require("../services/token.service");
const { generateotp } = require("../services/otp.service");
const { sendMail } = require("../services/mail.service");
const { hashToken } = require("../services/tokenHash.service");
const { getDevice } = require("../services/device.services")
const { logEvent } = require("../services/audit.service")

/* SignUp Admin */
exports.signupAdmin = async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    const { name, email, password, secret } = req.body;

    if (secret !== process.env.ADMIN_SECRET_KEY) {
      throw new Error("Forbidden: Invalid admin secret");
    }

    if (!name || !email || !password) {
      throw new Error("All fields are required");
    }

    const exists = await User.findOne({ email }).session(session);
    if (exists) throw new Error("Account already exits");

    const hashed = await hashPassword(password);

    const otp = generateotp();

    const [admin] = await User.create([{
      name,
      email,
      password: hashed,
      role: "admin",
      emailVerificationOTP: otp,
      emailVerificationExpiry: Date.now() + 10 * 60 * 1000
    }], { session })

    await sendMail(
      email,
      "Verify Your SkillFit Admin Account",
      `Your verification OTP is: ${otp}`
    )

    await session.commitTransaction()
    session.endSession();

    await logEvent(req, {
      userId: admin._id,
      email: admin.email,
      action: "ADMIN_ACCOUNT_CREATED",
      status: "SUCCESS"
    });

    return res.status(201).json({ message: "Admin Account Created sucessfully, PLEASE VERIFY YOUR EMAIL" });


  } catch (error) {
    console.log("error in admi sign up ", error);
    await session.abortTransaction();
    session.endSession();

    await logEvent(req, {
      action: "ADMIN_ACCOUNT_CREATE_FAILED",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.status(500).json({ message: "Signup failed " })
  }

};

/* Login Admin */

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      await logEvent(req, {
        email,
        action: "ADMIN_LOGIN_FAILED",
        status: "FAILED",
        metadata: { reason: "ADMIN_NOT_FOUND" }
      });
      return res.status(404).json({ message: "Admin not found" });
    }

    //Admin tighter lock

    if (admin.lockUntil && admin.lockUntil > Date.now()) {
      return res.status(423).json({ message: "Account temporarily locked" });
    }

    const valid = await comparePassword(password, admin.password);
    if (!valid) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;

      if (admin.failedLoginAttempts >= 3) {
        admin.lockUntil = Date.now() + 30 * 60 * 1000;
      }

      await admin.save();

      await logEvent(req, {
        userId: admin._id,
        email,
        action: "ADMIN_LOGIN_FAILED",
        status: "FAILED",
        metadata: { reason: "INVALID_PASSWORD" }
      });

      return res.status(401).json({ message: "INVALID PASSWORD" });
    }

    if (!admin.isVerified) return res.status(400).json({ message: "Please verify your email" });

    //success - reset counter

    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;

    admin.refreshTokens.forEach(t => (t.revoked = true));

    const refreshToken = generateRefreshToken();
    const device = getDevice(req);

    admin.refreshTokens.push({
      token: hashToken(refreshToken),
      device,
      ip: req.ip,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false
    });

    await admin.save();


    const token = generateToken({ id: admin._id, role: admin.role });

    await logEvent(req, {
      userId: admin._id,
      email,
      action: "ADMIN_LOGIN_SUCCESS",
      status: "SUCCESS"
    });

    return res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000
      })
      .status(200)
      .json({ token });
  } catch (error) {
    console.error("Admin Login Error:", error);

    await logEvent(req, {
      action: "ADMIN_LOGIN_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.status(500).json({ message: "Login failed" });
  }

};


/* REFRESH ACCESS TOKEN FOR ADMIN */

exports.refreshAdmin = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.sendStatus(401);

    const hashed = hashToken(token);
    const device = getDevice(req);

    const admin = await User.findOne({
      "refreshTokens.token": hashed,
      "refreshTokens.revoked": false,
      "refreshTokens.expiresAt": { $gt: Date.now() },
      role: "admin"
    });

    if (!admin) {
      await logEvent(req, {
        action: "ADMIN_REFRESH_FAILED",
        status: "FAILED",
        metadata: { reason: "INVALID_OR_EXPIRED" }
      });
      return res.sendStatus(403);
    }

    //locates session
    const session = admin.refreshTokens.find(t => t.token === hashed);

    //breach detection
    if (session && session.device && session.device !== device) {
      admin.refreshTokens.forEach(t => (t.revoked = true));
      await admin.save();

      await logEvent(req, {
        userId: admin._id,
        email: admin.email,
        action: "ADMIN_REFRESH_BREACH",
        status: "FAILED",
        metadata: {
          originalDevice: session.device,
          attemptedDevice: device
        }
      });

      return res.status(403).json({ message: "Suspicious session . login again...." });
    }
    //Rotate refresh Tokens

    admin.refreshTokens = admin.refreshTokens.filter(t => t.token !== hashed);

    const newRefresh = generateRefreshToken();
    admin.refreshTokens.push({
      token: hashToken(newRefresh),
      device,
      ip: req.ip,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false
    });

    await admin.save();

    const accessToken = generateToken({ id: admin._id, role: admin.role });

    await logEvent(req, {
      userId: admin._id,
      email: admin.email,
      action: "ADMIN_TOKEN_REFRESH",
      status: "SUCCESS"
    });

    return res
      .cookie("refreshToken", newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000
      })
      .json({ accessToken });
  } catch (error) {
    console.error("Admin Refresh Error:", error);

    await logEvent(req, {
      action: "ADMIN_REFRESH_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.sendStatus(500);
  }
};

/* ADMIN LOGOUT */
exports.logoutAdmin = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.sendStatus(204);

    const hashed = hashToken(token);
    const admin = await User.findOne({ "refreshTokens.token": hashed, role: "admin" });
    if (!admin) {
      await logEvent(req, {
        action: "ADMIN_LOGOUT_FAILED",
        status: "FAILED",
        metadata: { reason: "TOKEN_NOT_FOUND" }
      });

      res.clearCookie("refreshToken");
      return res.sendStatus(204);
    }

    admin.refreshTokens = admin.refreshTokens.filter(t => t.token !== hashed);
    await admin.save();


    await logEvent(req, {
      userId: admin._id,
      email: admin.email,
      action: "ADMIN_LOGOUT",
      status: "SUCCESS"
    });


    res.clearCookie("refreshToken").sendStatus(204);
  } catch (error) {
    console.error("Admin Logout Error:", error);

    await logEvent(req, {
      action: "ADMIN_LOGOUT_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.sendStatus(500);
  }
};


/*FORGOT PASSWORD */

exports.forgotPassword = async (req, res) => {

  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "All fields are required" });
    const admin = await User.findOne({ email, role: "admin" });

    if (!admin) {

      await logEvent(req, {
        email,
        action: "ADMIN_FORGOT_PASSWORD",
        status: "SUCCESS",
        metadata: { exists: false }
      });
      return res.status(200).json({ message: "OTP send if user exits" });
    }

    const otp = generateotp();
    admin.resetOTP = otp;
    admin.resetOTPExpiry = Date.now() + 5 * 60 * 1000;

    await admin.save();

    await sendMail(email, "Your SkillFit OTP", `Your OTP for password reset is: ${otp}`);

    await logEvent(req, {
      userId: admin._id,
      email,
      action: "ADMIN_OTP_SENT",
      status: "SUCCESS"
    });


    return res.json({ message: "OTP sent to email" });
  }
  catch (error) {
    console.log("Error in forgot password", error);

    await logEvent(req, {
      action: "ADMIN_FORGOT_PASSWORD_FAILED",
      status: "FAILED",
      metadata: { error: error.message }
    });

    return res.status(500).json({ message: "Something went wrong" });
  }
}

/*RESET PASSWORD */

exports.resetPassword = async (req, res) => {
  try {

    const { email, otp, newPassword } = req.body;
    const admin = await User.findOne({
      email,
      role: "admin",
      resetOTP: otp,
      resetOTPExpiry: { $gt: Date.now() }
    });

    if (!admin) {

      await logEvent(req, {
        email,
        action: "ADMIN_RESET_FAILED",
        status: "FAILED",
        metadata: { reason: "INVALID_OR_EXPIRED_OTP" }
      });
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    admin.password = await hashPassword(newPassword);
    admin.refreshTokens = [];
    admin.passwordChangedAt = new Date();
    admin.resetOTP = undefined;
    admin.resetOTPExpiry = undefined;

    await admin.save();
    await logEvent(req, {
      userId: admin._id,
      email,
      action: "ADMIN_PASSWORD_RESET",
      status: "SUCCESS"
    });

    return res.json({ message: "Password reset Successfully" });
  } catch (error) {
    console.log("Reset password error");
    await logEvent(req, {
      action: "ADMIN_RESET_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.status(500).json({ message: "something went wrong" });
  }
}
/* VERIFY EMAIL */
exports.verifyMail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) return res.status(400).json({ message: "All fields are required" });
    const admin = await User.findOne({
      email,
      role: "admin",
      emailVerificationOTP: otp,
      emailVerificationExpiry: { $gt: Date.now() }
    }
    )
    if (!admin) {
      await logEvent(req, {
        email,
        action: "ADMIN_EMAIL_VERIFY_FAILED",
        status: "FAILED"
      });

      return res.status(400).json({ message: "Invalid or wrong OTP" });
    }

    admin.isVerified = true;
    admin.emailVerificationOTP = undefined;
    admin.emailVerificationExpiry = undefined;

    admin.refreshTokens = [];

    await admin.save();

    await logEvent(req, {
      userId: admin._id,
      email,
      action: "ADMIN_EMAIL_VERIFIED",
      status: "SUCCESS"
    });

    return res.status(200).json({ message: "Email verification successfull" });
  } catch (error) {
    console.log("Error in Verify Email", error);

    await logEvent(req, {
      action: "ADMIN_EMAIL_VERIFY_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });

    return res.status(500).json({ message: "something went wrong" });
  }

}