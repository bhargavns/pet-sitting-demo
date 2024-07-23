const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../../config/database");


router.get("/", (req, res) => {
  res.render("pages/login");
});


router.post("/", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db.oneOrNone("SELECT * FROM app_user WHERE email = $1", [
        email,
      ]);
      if (user && (await bcrypt.compare(password, user.password_hash))) {
        req.session.userId = user.id; // Set user ID in session
        req.session.userType = user.type; // Set user type in session
        req.session.email = user.email; // Set user email in session
        if (user.type === "freelancer") {
          res.redirect("/jobs");
        }
        if (user.type === "employer") {
          res.redirect("/edit-profile");
        }
      } else {
        res.status(401).send("Invalid credentials");
      }
    } catch (error) {
      console.log(error);
      res.status(500).send("Error logging in");
    }
  });



module.exports = router;