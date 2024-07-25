function isLoggedIn(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).send("You are not logged in");
    }
    next();
  }
  
module.exports = { isLoggedIn };