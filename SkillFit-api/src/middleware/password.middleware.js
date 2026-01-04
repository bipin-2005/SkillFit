exports.passwordFresh = (req,res,next)=>{

    if(!req.user?.passwordChangedAt) return next();

    const passwordChanged = req.user.passwordChangedAt.getTime();

    if(req.tokenIssuedAt < passwordChanged){
        return res.status(401).json({message:"Please login again.Password was changed"});
    }

    next();
};