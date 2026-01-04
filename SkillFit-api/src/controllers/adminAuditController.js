const AuditLog = require("../models/auditLogSchema");

exports.getAuditLogs = async (req, res) => {
    try {
        const { email, action, status, page = 1, limit = 20, sort = 'desc' } = req.query;


        const filter = {};

        if (email) filter.email = email;
        if (action) filter.action = action;
        if (status) filter.status = status;

        const logs = await AuditLog.find(filter).sort({ createdAt: sort === "asc" ? 1 : -1 })
            .skip((page - 1) * limit).limit(Number(limit));

        const count = await AuditLog.countDocuments(filter);

        return res.json({
            data: logs,
            pagination:{
                page:Number(page),
                limit:Number(limit),
                total:count,
                pages:Math.ceil(count/limit)
            }
        });
    } catch (error) {
        console.log("Get Audit Logs Error",error);
        return res.status(500).json({message:"Unable to load logs"});
    }
};