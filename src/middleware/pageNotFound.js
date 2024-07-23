const express = require("express");
const router = express.Router();

router.use((req, res) => {
    res.status(404).render('pages/404', { title: 'Page Not Found' });
  });

module.exports = router;