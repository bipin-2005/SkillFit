const cloudinary = require("../config/cloudinary");

exports.uploadResumeToCloudinary = async (file, userId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "skillfit/resumes",
        resource_type: "raw",
        public_id: `resume_${userId}_${Date.now()}`
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    ).end(file.buffer);
  });
};
