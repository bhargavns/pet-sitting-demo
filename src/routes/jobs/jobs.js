const {getOpenJobs} = require('../../queries/getOpenJobs');
const db = require('../../config/database');
const {isLoggedIn} = require('../../middleware/authStatus');
const express = require("express");
const router = express.Router();

router.get("/", isLoggedIn, async (req, res) => {
  try {
    const jobs = await getOpenJobs();

    // Render the job board template with the jobs data
    res.render("pages/job_listing", { jobs, email: req.session.email });
  } catch (err) {
    console.error("Error fetching job posts:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;