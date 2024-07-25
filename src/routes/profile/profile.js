const { getEmployerProfile, getFreelancerProfile } = require('../../queries/profileQueries');
const { updateEmployer, updateFreelancer, updateUser } = require('../../queries/profileUpdate');
const {isLoggedIn} = require('../../middleware/authStatus');
const express = require("express");
const router = express.Router();
const db = require("../../config/database");


router.get("/", isLoggedIn, async (req, res) => {
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

    const petData = await db.any(
        `
          SELECT name, pet_type, age, special_needs
          FROM pet
          WHERE owner_id = (SELECT id FROM EMPLOYER WHERE user_id = $1 LIMIT 1)`,
        [userId]
      );

    // Render the Handlebars template with the fetched data
    res.render("pages/edit-profile", {
      user: {
        name: userData.name,
        location: userData.location,
        type: req.session.userType,
      },
      ...userData,
      email: req.session.email,
      petData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching profile data");
  }
});


router.post("/", isLoggedIn, async (req, res) => {
  const userId = req.session.userId;
  try {
    const name = req.body.name;
    const location = req.body.location;

    if (req.session.userType == "employer") {
      const budget = req.body.budget;

      // Validate input
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


router.post("/add-pet", isLoggedIn, async (req, res) => {
    const userId = req.session.userId;
    try {
      const pet_name = req.body.pet_name;
      const pet_type = req.body.pet_type;
      const pet_age = req.body.pet_age;
      const special_needs = req.body.special_needs;
  
      // Validate input
      if (pet_name == undefined || pet_type == undefined) {
        return res.status(400).send("Invalid input");
      }
  
     
      if (pet_age != undefined && special_needs != undefined) {
        db.none(
          `INSERT INTO pet (owner_id, name, pet_type, age, special_needs)
            VALUES ((SELECT id FROM EMPLOYER WHERE user_id = $1 LIMIT 1), $2, $3, $4, $5);`,
          [userId, pet_name, pet_type, pet_age, special_needs]
        );
      }else if(pet_age != undefined){
        db.none(
          `INSERT INTO pet (owner_id, name, pet_type, age)
            VALUES ((SELECT id FROM EMPLOYER WHERE user_id = $1 LIMIT 1), $2, $3, $4);`,
          [userId, pet_name, pet_type, pet_age]
        );
      }else if(special_needs != undefined){
        db.none(
          `INSERT INTO pet (owner_id, name, pet_type, special_needs)
            VALUES ((SELECT id FROM EMPLOYER WHERE user_id = $1 LIMIT 1), $2, $3, $4);`,
          [userId, pet_name, pet_type, pet_age, special_needs]
        );
      }else{
        db.none(
          `INSERT INTO pet (owner_id, name, pet_type)
            VALUES ((SELECT id FROM EMPLOYER WHERE user_id = $1 LIMIT 1), $2, $3);`,
          [userId, pet_name, pet_type]
        );
      }
  
      res.send(`
                  <script>
                      alert('Pets updated successfully');
                      setTimeout(function() {
                      window.location.href = '/edit-profile';
                      }, 500);
                  </script>
          `);
    } catch (error) {
      console.log(error);
      res.status(500).send("Error adding pet");
    }
  });

module.exports = router;