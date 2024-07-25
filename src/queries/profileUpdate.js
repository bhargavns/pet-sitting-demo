// profileUpdates.js
const db = require("../config/database");

const updateEmployer = async (budget, userId) => {
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
};

const updateFreelancer = async (bio, profile_picture, userId) => {
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
};

const updateUser = async (name, location, userId) => {
  if (name !== undefined || location !== undefined) {
    await db.none(
      `UPDATE app_user
        SET name = COALESCE($1, name), location = COALESCE($2, location)
        WHERE id = $3`,
      [name, location, userId]
    );
  }
};

module.exports = { updateEmployer, updateFreelancer, updateUser };