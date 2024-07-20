const express = require("express");
const app = express();
const path = require("path");

console.log("Public directory:", path.join(__dirname, "public"));
app.use(express.static("public"));

const handlebars = require("express-handlebars");
const pgp = require("pg-promise")();
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");

const session = require("express-session");

// -------------------------------------  APP CONFIG   ----------------------------------------------
// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: "hbs",
  layoutsDir: __dirname + "/views/layouts",
  partialsDir: __dirname + "/views/partials",
  helpers: {
    ifEquals: function (arg1, arg2, options) {
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    },
  },
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
// set Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: true,
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// -------------------------------------  DB CONFIG AND CONNECT   ---------------------------------------
const dbConfig = {
  host: process.env.HOST,
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};
const db = pgp(dbConfig);

// db test
db.connect()
  .then((obj) => {
    console.log("Database connection successful");
    obj.done();
  })
  .catch((error) => {
    console.error("Database connection error:", error);
    console.error("Connection details:", {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
    });
  });

// db check if table exists
db.query("SELECT * FROM job_post")
  .then((result) => {
    console.log("Table exists");
  })
  .catch((error) => {
    console.error("Table does not exist:", error);
  });

// -------------------------------------  ROUTES   ---------------------------------------

app.get("/", (req, res) => {
  res.send("Example website");
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.get("/login", (req, res) => {
  res.render("pages/login");
});

// -------------------------------------  REGISTER   ---------------------------------------

app.post("/register", async (req, res) => {
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

// -------------------------------------  LOGIN   ---------------------------------------

app.post("/login", async (req, res) => {
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

// -------------------------------------  LOGOUT   ---------------------------------------

app.get("/logout", (req, res) => {
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

// -------------------------------------  Auth Middleware   ---------------------------------------

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).send("You are not logged in");
  }
  next();
}

// -------------------------------------  PROFILE EDIT - EMPLOYERS   ---------------------------------------

app.get("/edit-profile", isLoggedIn, async (req, res) => {
  const userId = req.session.userId;
  if (req.session.userType === "employer") {
    try {
      // Fetch the current profile data from the database
      const employerData = await db.one(
        `
        SELECT a.name, a.location, e.budget, e.id AS employer_id
        FROM app_user a
        INNER JOIN employer e ON a.id = e.user_id
        WHERE a.id = $1`,
        [userId]
      );

      const pets = await db.any(`
        SELECT name, pet_type, age, special_needs
        FROM pet
        WHERE owner_id = $1`,
        [employerData.employer_id]
      );

      // Render the Handlebars template with the fetched data
      res.render("pages/edit-profile", {
        user: {
          name: employerData.name,
          location: employerData.location,
          type: req.session.userType,
        },
        employer: {
          budget: employerData.budget,
        },
        pets: pets,
        email: req.session.email,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Error fetching profile data");
    }
  } else if (req.session.userType === "freelancer") {
    try {
      // Fetch the current profile data from the database
      const freelancerData = await db.one(`
        SELECT a.name, a.location, f.bio, f.profile_picture
        FROM app_user a
        INNER JOIN freelancer f ON a.id = f.user_id
        WHERE a.id = $1`,
        [userId]
      );
      
      // Render the Handlebars template with the fetched data
      res.render("pages/edit-profile", {
        user: {
          name: freelancerData.name,
          location: freelancerData.location,
          type: req.session.userType,
        },
        freelancer: {
          bio: freelancerData.bio,
          profile_picture: freelancerData.profile_picture,
        },
        email: req.session.email,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Error fetching profile data");
    }
  }
});

// -------------------------------------  ADD PET   ---------------------------------------

app.post("/edit-profile/add-pet", isLoggedIn, async (req, res) => {
  if (req.session.userType !== 'employer') {
    return res.status(403).send("Only employers can add pets.");
  }
  const { name, petType, age, specialNeeds } = req.body;
  const userId = req.session.userId;

  try {
    const employer = await db.one('SELECT id FROM EMPLOYER WHERE user_id = $1', [userId]);
    await db.none('INSERT INTO PET (owner_id, name, pet_type, age, special_needs) VALUES ($1, $2, $3, $4, $5)',
      [employer.id, name, petType, age, specialNeeds]);
    res.redirect('/edit-profile');
  } catch (error) {
    console.error('Error adding pet:', error);
    res.status(500).send("Failed to add pet: " + error.message);
  }
});

// -------------------------------------  SERVER START   ---------------------------------------

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

module.exports = { app, db };
