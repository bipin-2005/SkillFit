const User = require("../models/userModel"); // Ensure the file is User.js
const { hashPassword, comparePassword } = require("../services/password.service");
const { generateToken, generateRefreshToken } = require("../services/token.service");
const { generateotp } = require("../services/otp.service");
const { sendMail } = require("../services/mail.service");
const { hashToken } = require("../services/tokenHash.service");
const { getDevice } = require("../services/device.services");
const { logEvent } = require("../services/audit.service");

/* SIGNUP */
exports.signup = async (req, res) => {

  const session = await User.startSession();

  session.startTransaction();

  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      throw new Error("All fields required");

    const exists = await User.findOne({ email }).session(session);
    if (exists) throw new Error("Account already exists");

    const hashed = await hashPassword(password);

    const otp = generateotp();

    const [user] = await User.create([{
      name,
      email,
      password: hashed,
      role,
      emailVerificationOTP: otp,
      emailVerificationExpiry: Date.now() + 10 * 60 * 1000
    }], { session });

    await sendMail(
      email,
      "Verify Your SkillFit Account",
      `Your verification OTP is: ${otp}`
    );
    await session.commitTransaction();
    session.endSession();
    await logEvent(req, {
      userId: user._id,
      email: user.email,
      action: "SIGNUP_SUCCESS",
      status: "SUCCESS"
    });

    return res.status(201).json({
      message: "Account created. Please verify your email."
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Signup Error:", error.message);
    await logEvent(req, {
      action: "SIGNUP_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.status(500).json({ message: "Signup failed" });
  }
};


/* LOGIN */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) {
      await logEvent(req, {
        email,
        action: "LOGIN FAILED",
        status: "FAILED",
        metadata: { reason: "USER_NOT_FOUND" }
      });
      return res.status(404).json({ message: "User not found" });
    }

    // ACCOUNT LOCK CHECKING......
    if (user.lockUntil && user.lockUntil > Date.now()) {
      await logEvent(req, {
        userId: user._id,
        email: user.email,
        action: "LOGIN_BLOCKED",
        status: "FAILED",
        metadata: { reason: "ACCOUNT_LOCKED" }
      });

      return res.status(423).json({ message: "Account locked due to too many failed attempts. TRY LATER" });
    }
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      //incremet failed login attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000;
      }

      await user.save();
      await logEvent(req, {
        userId: user._id,
        email: user.email,
        action: "LOGIN_FAILED",
        status: "FAILED",
        metadata: { reason: "INVALID_PASSWORD" }
      });

      return res.status(401).json({ message: "Invalid password" });
    }

    if (!user.isVerified) return res.status(400).json({ message: "Please Verify your email" });

    //reseting attempts on success login
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    // Generate refresh token
    user.refreshTokens.forEach(t => t.revoked = true);

    const refreshToken = generateRefreshToken();
    const device = getDevice(req);
    user.refreshTokens.push({
      token: hashToken(refreshToken),
      device,
      ip: req.ip,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false
    });

    await user.save();

    const token = generateToken({ id: user._id, role: user.role });

    return res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      })
      .status(200).json({ token });
  } catch (error) {
    console.error("Login Error:", error);
    await logEvent(req, {
      action: "LOGIN_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.status(500).json({ message: "Login Failed" });
  }
};

/* REFRESH ACCESS TOKEN */
exports.refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.sendStatus(401);

    const hashed = hashToken(token);
    const device = getDevice(req);
    const user = await User.findOne({
      "refreshTokens.token": hashed,
      "refreshTokens.revoked": false,
      "refreshTokens.expiresAt": { $gt: Date.now() }
    });
    if (!user) {
      await logEvent(req, {
        action: "REFRESH_FAILED",
        status: "FAILED",
        metadata: { reason: "INVLAID_OR_REVOKED_TOKEN" }
      });
      return res.sendStatus(403);
    }

    //BREACH CONTAINMENT 
    const session = user.refreshTokens.find(
      t => t.token === hashed &&
        !t.revoked &&
        t.expiresAt > Date.now()
    );

    //INTRUSION DETECTION

    if (session && session.device !== device) {
      user.refreshTokens.forEach(t => (t.revoked = true));
      await user.save();

      await logEvent(req, {
        userId: user._id,
        email: user.email,
        action: "REFRESH_BREACH_DETECTED",
        status: "FAILED",
        metadata: {
          originalDevice: session.device,
          attemptedDevice: device
        }
      });
      return res.status(403).json({ message: "Suspicious session detected. Please login again." });
    }
    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== hashed);


    const newRefresh = generateRefreshToken();

    user.refreshTokens.push({
      token: hashToken(newRefresh),
      device,
      ip: req.ip,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false
    });
    await user.save();

    const accessToken = generateToken({ id: user._id, role: user.role });

    await logEvent(req, {
      userId: user._id,
      email: user.email,
      action: "TOKEN_REFRESH",
      status: "SUCCESS"
    });
    return res
      .cookie("refreshToken", newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000
      }).json({ accessToken });
  } catch (error) {
    console.error("Refresh Error:", error);

    await logEvent(req, {
      action: "REFRESH_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.sendStatus(500);
  }
};

/* LOGOUT */
exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) { return res.sendStatus(204); }

    const hashed = hashToken(token);
    const device = getDevice(req);
    const user = await User.findOne({ "refreshTokens.token": hashed });
    if (!user) {

      await logEvent(req, {
        action: "LOGOUT_FAILED",
        stauts: "FAILED",
        metadata: { reason: "TOKEN_NOT_FOUND" }
      });

      res.clearCookie("refreshToken");
      return res.sendStatus(204);
    }

    user.refreshTokens = user.refreshTokens.filter(t => t.device !== device);

    await user.save();

    await logEvent(req, {
      userId: user._id,
      email: user.email,
      action: "LOGOUT",
      status: "SUCCESS",
      metadata: { device }
    })
    res.clearCookie("refreshToken").sendStatus(204);
  } catch (error) {
    console.error("Logout Error:", error);

    await logEvent(req, {
      action: "LOGOUT_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.sendStatus(500);
  }
};

/* FORGOT PASSWORD */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      await logEvent(req, {
        email,
        action: "FORGOT_PASSWORD_REQUEST",
        status: "SUCCESS",
        metadata: { exists: false }
      });
      return res.status(200).json({ message: "If the account exists, OTP has been sent" });
    }

    //---LIMIT OTP REQUEST---
    if ((user.resetRequestCount || 0) >= 5) {
      await logEvent(req, {
        userId: user._id,
        email,
        action: "PASSWORD_RESET_RATE_LIMIT",
        status: "FAILED"
      });

      return res.status(429).json({ message: "Too many reset attempts. Try again later" });
    }

    user.resetRequestCount = (user.resetRequestCount || 0) + 1;

    //Generate OTP
    const otp = generateotp();
    user.resetOTP = otp;
    user.resetOTPExpiry = Date.now() + 5 * 60 * 1000;

    // revoke all active refresh tokens for safety
    user.refreshTokens = [];

    
    await user.save();
    // Send OTP via email
    await sendMail(email, "Your SkillFit OTP", `Your OTP for password reset is: ${otp}`);

    await logEvent(req, {
      userId: user._id,
      email,
      action: "PASSWORD_RESET_OTP_SENT",
      status: "SUCCESS"
    });

    return res.json({ message: "OTP sent to email" });
  } catch (error) {
    console.log("Forgot password error");

    await logEvent(req, {
      action: "PASSWORD_RESET_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.status(500).json({ message: "Something went wrong" });
  }
};


/* RESET PASSWORD */

exports.resetPassword = async (req, res) => {
  try {

    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email });

    if (!user) {
      await logEvent(req, {
        email,
        action: "PASSWORD_RESET_ATTEMPT",
        status: "FAILED",
        metadata: { reason: "USER_NOT_FOUND" }
      });
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // OTP brute force protection

    user.otpAttempts = (user.otpAttempts || 0) + 1;

    if (user.otpAttempts > 5) {
      return res.status(429).json({ message: "Too many attempts. Try again later" });
    }

    const validUser = await User.findOne({
      email,
      resetOTP: otp,
      resetOTPExpiry: { $gt: Date.now() }
    });

    if (!validUser) {
      await user.save();

      await logEvent(req, {
        userId: user._id,
        email,
        action: "PASSWORD_RESET_FAILED",
        status: "FAILED",
        metadata: { reason: "INVALID_OR_EXPIRED_OTP" }
      });
      return res.status(400).json({ message: "invalid or expired OTP " });
    }

    //reset success
    user.password = await hashPassword(newPassword);
    user.refreshTokens = [];
    user.passwordChangedAt = new Date();
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    user.otpAttempts = 0;
    user.resetRequestCount = 0;

    await user.save();

    await logEvent(req, {
      userId: user._id,
      email,
      action: "PASSWORD_RESET_SUCCESS",
      status: "SUCCESS"
    });


    return res.json({ message: "Password reset Successfully" });
  } catch (error) {
    console.log("Reset password error");

    await logEvent(req, {
      action: "PASSWORD_RESET_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });

    return res.status(500).json({ message: "something went wrong" });
  }
}


/* VERIFY EMAIL  */

exports.verifyMail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid or expired otp" });

    user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;

    if (user.emailOtpAttempts > 5) {
      return res.status(429).json({ message: "Too many attempts. Try again later." });
    }

    const validUser = await User.findOne({
      email,
      emailVerificationOTP: otp,
      emailVerificationExpiry: { $gt: Date.now() }
    });

    if (!validUser) {

      await user.save();

      await logEvent(req, {
        userId: user._id,
        email,
        action: "EMAIL_VERIFY_FAILED",
        status: "FAILED"
      });


      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    user.isVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpiry = undefined;
    user.emailOtpAttempts = 0

    // security: clear sessions to reduce hijack scenarios
    user.refreshTokens = [];

    await user.save();

    await logEvent(req, {
      userId: user._id,
      email,
      action: "EMAIL_VERIFIED",
      status: "SUCCESS"
    });

    return res.status(200).json({ message: "Email verified successfully" });

  } catch (error) {
    console.log("Verify mail error", error);

    await logEvent(req, {
      action: "EMAIL_VERIFY_SERVER_ERROR",
      status: "FAILED",
      metadata: { error: error.message }
    });
    return res.status(500).json({ message: "something went wrong" });
  }
}