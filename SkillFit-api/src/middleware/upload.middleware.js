const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only PDF/DOC/DOCX allowed"), false);
  }

  cb(null, true);
};

exports.uploadResume = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter
}).single("resume");
