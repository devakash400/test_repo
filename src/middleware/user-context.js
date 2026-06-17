function userContextMiddleware(req, _res, next) {
  const userId = req.get("x-user-id");
  const userEmail = req.get("x-user-email");

  req.userContext = {
    id: userId || null,
    email: userEmail || null,
  };

  next();
}

module.exports = {
  userContextMiddleware,
};
