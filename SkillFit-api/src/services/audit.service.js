const AuditLog = require("../models/auditLogSchema");
const {getDevice} = require("./device.services");

exports.logEvent = async(req,data)=>{
    try{
        await AuditLog.create({
            user:data.userTD ||null,
            email:data.email|| null,
            action:data.action,
            status:data.status,
            ip:req.ip,
            device:getDevice(req),
            metadata:data.metadata || {}
        });
    }catch(error){
        console.log("Audit log failed",error.message);
    }
};
