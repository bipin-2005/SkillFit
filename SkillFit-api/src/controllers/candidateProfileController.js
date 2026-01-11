const CandidateProfile = require("../models/candidateProfileSchema");

const { logEvent } = require("../services/audit.service");

exports.getMyProfile = async (req, res) => {
    try {
        const profile = await CandidateProfile.findOne({ userId: req.user._id });

        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        return res.json(profile);
    } catch (error) {
        console.error("Get profile error:", error);
        await logEvent(req, {
            userId: req.user._id,
            email: req.user.email,
            action: "GET_PROFILE_ERROR",
            status: "FAILED",
            metadata: { error: error.message }
        });

        return res.status(500).json({ message: "Something went wrong" })
    }
};

exports.usertProfile = async(req,res)=>{
    try{
        const data = req.body;

        const profile = await CandidateProfile.findOneAndUpdate(
            {userId:req.user._id},
            {...data,userId:req.user._id},
            {new:true,upsert:true}
        );

        await logEvent(req,{
            userId:req.user._id,
            email:req.user.email,
            action:"PROFILE_UPDATED",
            status:"SUCCESS"
        });

        return res.json(profile);
    }catch(error){
        console.log("Profile upsert error",error);

        await logEvent(req,{
            userId:req.user._id,
            email:req.user.email,
            action:"PROFILE_UPDATE_ERROR",
            status:"FAILED",
            metadata :{error:error.message}
        });

        return res.status(500).json({message:"Something went wrong "})
    }
}