require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./src/app");
const PORT = process.env.PORT||5000;

mongoose.connect(process.env.MONGO_URI)
.then(()=>{
    console.log("MongoDB connected");
    app.listen(PORT,()=>{
        console.log(`SkillFit API running on port${PORT}`);
    });
}).catch(err=>{
    console.log("Database connection failed:",err);
    process.exit(1);
});