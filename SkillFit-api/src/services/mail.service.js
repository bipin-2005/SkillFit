const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    poet: 465,
    secure: true,
    auth: {

        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

exports.sendMail = async (to, subject, text) => {
await transporter.sendMail({
    from: `"SkillFit" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text
});
};
