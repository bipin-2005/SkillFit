exports.getDevice = req => {
   return (req.headers["user-agent"] || "") +
        "|" +
        (req.ip || req.connection.remoteAddress || "");
}