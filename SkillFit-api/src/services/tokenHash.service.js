const crypto = require("crypto");
exports.hashToken=token=>
    crypto.createHash("sha256").update(token).digest("hex");
