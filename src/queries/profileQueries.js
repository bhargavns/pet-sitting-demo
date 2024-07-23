// profileQueries.js
const db = require("../config/database");

const getEmployerProfile = async (userId) => {
  const userData = await db.one(`SELECT a.name, a.location, e.budget
    FROM app_user a
    INNER JOIN employer e ON a.id = e.user_id
    WHERE a.id = $1`, [userId]);
  return userData;
};

const getFreelancerProfile = async (userId) => {
  const userData = await db.one(
    `
      SELECT a.name, a.location, f.bio, f.profile_picture
      FROM app_user a
      INNER JOIN freelancer f ON a.id = f.user_id
      WHERE a.id = $1`,
    [userId]
  );
  return userData;
};

module.exports = { getEmployerProfile, getFreelancerProfile };