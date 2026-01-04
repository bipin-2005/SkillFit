exports.checkVerified = (req,res,next) =>{
    if(!req.user.isVerified){
        return res.status(403).json({message:"Please verify your email first."});
    }

    next();
}