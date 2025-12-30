const { randomUUID } = require("crypto");

module.exports = function requestId(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const id = typeof incoming === "string" && incoming.trim() ? incoming : randomUUID();
  req.id = id;
  res.setHeader("x-request-id", id);
  next();
};

