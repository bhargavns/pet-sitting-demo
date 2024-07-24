const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../../middleware/authStatus");
const { getEmployerProfile, getFreelancerProfile } = require("../../queries/profileQueries");
const { updateEmployer, updateFreelancer, updateUser } = require("../../queries/profileUpdate");

router.get("/edit-profile", isLoggedIn, async (req, res) => {
  const userId = req.session.userId;
  try {
    let userData;
    if (req.session.userType == "employer") {
      userData = await getEmployerProfile(userId);
      userData.employer = { budget: userData.budget };
    } else if (req.session.userType == "freelancer") {
      userData = await getFreelancerProfile(userId);
      userData.freelancer = {
        bio: userData.bio,
        profile_picture: userData.profile_picture,
      };
    }

    res.render("pages/edit-profile", {
      user: {
        name: userData.name,
        location: userData.location,
        type: req.session.userType,
      },
      ...userData,
      email: req.session.email,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching profile data");
  }
});

router.post("/edit-profile", isLoggedIn, async (req, res) => {
  const userId = req.session.userId;
  try {
    const name = req.body.name;
    const location = req.body.location;

    if (req.session.userType == "employer") {
      const budget = req.body.budget;
      if (budget !== undefined && (isNaN(budget) || budget < 0)) {
        return res.status(400).send("Invalid budget value");
      }
      await updateEmployer(budget, userId);
    }

    if (req.session.userType == "freelancer") {
      const bio = req.body.bio;
      const profile_picture = req.body.profile_picture;
      await updateFreelancer(bio, profile_picture, userId);
    }

    await updateUser(name, location, userId);

    res.status(302).send(`
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
