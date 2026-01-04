const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(

    {
    userId:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    email:String,
    action: { type: String, required: true },   
    status: { type: String, required: true },
    ip:String,
    userAgent:String,
    metadata:Object
},

{timestamps:true}
);

module.exports = mongoose.model("AUditLog",auditLogSchema);
