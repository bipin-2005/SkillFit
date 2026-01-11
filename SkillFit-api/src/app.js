const express =require("express");
const cors = require("cors");
const app= express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//server
app.get("/",(req,res)=>{
    res.send("SkillFit API is running");})

//authRouter
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth",authRoutes);
//admiRouter
const adminRoutes = require("./routes/admin.routes");
app.use("/api/admin", adminRoutes);
//recuiter router
const recuriterRoutes = require("./routes/recuriter.routes");
app.use("/api/recruiter", recuriterRoutes);
app.use("/api/jobs", require("./routes/job.routes"));


//candidate router
const candidateRoutes = require("./routes/candidate.route");
app.use("/api/candidate",candidateRoutes);
module.exports = app;