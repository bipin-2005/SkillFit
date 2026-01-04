const rateLimit = require("express-rate-limit");
const { logEvent } = require("../services/audit.service");



/*LOGIN LIMITER */
const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: { message: "TO many login attempts .Try again later" },
    standardHeaders: true,
    legacyHeaders: false,

    handler:async(req,res)=>{
        await logEvent(req,{
            email:req.body?.email,
            action:"LOGIN_RATE_LIMIT_TRIGGERED",
            status:"BLOCKED",
            metadata:{
                ip:req.ip,
                router:req.originalUrl
            }
        });
        return res.status(429).json({message:"Too many login attempts .Try again later"});
    }
});


/*OTP LIMITER */

const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: { message: "OTP request limit reached .Try again later" },
    standardHeaders: true,
    legacyHeaders: false,
     handler: async (req, res) => {
    await logEvent(req, {
      email: req.body?.email,
      action: "OTP_RATE_LIMIT_TRIGGERED",
      status: "BLOCKED",
      metadata: {
        ip: req.ip,
        route: req.originalUrl
      }
    });

    return res
      .status(429)
      .json({ message: "OTP request limit reached. Try again later." });
  }
})

/*REFRESH TOKEN LIMITER */

const refreshLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: { message: "Too many token refresh attempts" },
    standardHeaders: true,
    legacyHeaders: false,

     handler: async (req, res) => {
    await logEvent(req, {
      action: "REFRESH_RATE_LIMIT_TRIGGERED",
      status: "BLOCKED",
      metadata: {
        ip: req.ip,
        route: req.originalUrl
      }
    });

    return res
      .status(429)
      .json({ message: "Too many token refresh attempts." });
  }
})

module.exports={
    loginLimiter,
    otpLimiter,
    refreshLimiter
};