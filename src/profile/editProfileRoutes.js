const express = require('express');
const router = express.Router();
const db = require('../db');
const { isLoggedIn } = require('../middleware');

router.get('/edit-profile', isLoggedIn, async (req, res) => {
  const userId = req.session.userId;
  if (req.session.userType == "employer") {
    try {
      const userData = await db.one(
        `
          SELECT a.name, a.location, e.budget
          FROM app_user a
          INNER JOIN employer e ON a.id = e.user_id
          WHERE a.id = $1`,
        [userId]
      );

      res.render("pages/edit-profile", {
        user: {
          name: userData.name,
          location: userData.location,
          type: req.session.userType,
        },
        employer: {
          budget: userData.budget,
        },
        email: req.session.email,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Error fetching profile data");
    }
  }
  if (req.session.userType == "freelancer") {
    try {
      const userData = await db.one(
        `
          SELECT a.name, a.location, f.bio, f.profile_picture
          FROM app_user a
          INNER JOIN freelancer f ON a.id = f.user_id
          WHERE a.id = $1`,
        [userId]
      );

      res.render("pages/edit-profile", {
        user: {
          name: userData.name,
          location: userData.location,
          type: req.session.userType,
        },
        freelancer: {
          bio: userData.bio,
          profile_picture: userData.profile_picture,
        },
        email: req.session.email,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Error fetching profile data");
    }
  }
});

router.post('/edit-profile', isLoggedIn, async (req, res) => {
  const userId = req.session.userId;
  try {
    const name = req.body.name;
    const location = req.body.location;

    if (req.session.userType == "employer") {
      const budget = req.body.budget;

      if (budget !== undefined && (isNaN(budget) || budget < 0)) {
        return res.status(400).send("Invalid budget value");
      }
      await db.tx(async (t) => {
        if (budget !== undefined) {
          await t.none(
            `UPDATE employer
              SET budget = $1
              WHERE user_id = $2`,
            [budget, userId]
          );
        }
      });
    }
    if (req.session.userType == "freelancer") {
      const bio = req.body.bio;
      const profile_picture = req.body.profile_picture;
      await db.tx(async (t) => {
        if (bio !== undefined || profile_picture !== undefined) {
          await t.none(
            `UPDATE freelancer
              SET bio = COALESCE($1, bio), profile_picture = COALESCE($2, profile_picture)
              WHERE user_id = $3`,
            [bio, profile_picture, userId]
          );
        }
      });
    }

    if (name !== undefined || location !== undefined) {
      await db.none(
        `UPDATE app_user
          SET name = COALESCE($1, name), location = COALESCE($2, location)
          WHERE id = $3`,
        [name, location, userId]
      );
    }
    res.send(`
                <script>
                    alert('Profile updated successfully');
                    setTimeout(function() {
                    window.location.href = '/edit-profile';
                    }, 500);
                </script>
        `);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error updating profile");
  }
});

module.exports = router;
