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

//admiRouter

const adminRoutes = require("./routes/admin.routes");
app.use("/api/admin", adminRoutes);

app.use("/api/auth",authRoutes);
module.exports = app;