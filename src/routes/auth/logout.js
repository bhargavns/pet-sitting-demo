const express = require('express');
const router = express.Router();

router.get("/", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(400).send("Unable to log out");
      }
      res.send(`
                  <script>
                      alert('Logout successful');
                      setTimeout(function() {
                      window.location.href = '/login';
                      }, 1000);
                  </script>
          `);
    });
  });

  module.exports = router;