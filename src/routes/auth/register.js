// registerRoute.js
const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../../config/database');

const router = express.Router();

router.get("/", (req, res) => {
  res.render("pages/register");
});

router.post("/", async (req, res) => {
  const { name, email, password, location } = req.body;
  const type = req.query.type;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.one(
      `INSERT INTO app_user (name, email, password_hash, type, location)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, hashedPassword, type, location]
    );

    if (type === "employer") {
      await db.none(
        `INSERT INTO employer (user_id, budget)
            VALUES ($1, $2)`,
        [newUser.id, 0]
      );
    }

    if (type === "freelancer") {
      await db.none(
        `INSERT INTO freelancer (user_id, bio, profile_picture)
            VALUES ($1, $2, $3)`,
        [newUser.id, "new freelancer", "default.jpg"]
      );
    }

    req.session.userId = newUser.id;
    req.session.userType = type;
    res.send(`
                <script>
                    alert('Registration successful');
                    setTimeout(function() {
                    window.location.href = '/login';
                    }, 1000);
                </script>
        `);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error in user registration");
  }
});

module.exports = router;