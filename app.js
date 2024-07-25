const express = require("express");
const app = express();
const path = require("path");

console.log("Public directory:", path.join(__dirname, "public"));
app.use(express.static("public"));

const handlebars = require("express-handlebars");
const bodyParser = require("body-parser");

const session = require("express-session");

// -------------------------------------  MIDDLEWARE IMPORTS   ----------------------------------------------

const { isLoggedIn } = require("./src/middleware/authStatus");

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

const db = require("./src/config/database");

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
    console.log("Tables exist");
  })
  .catch((error) => {
    console.error("Table does not exist:", error);
  });

// -------------------------------------  ROUTES   ---------------------------------------

const landingRoutes = require("./src/routes/landing/landing");
app.use("/", landingRoutes);

// -------------------------------------  REGISTER   ---------------------------------------

const registerRoute = require("./src/routes/auth/register");
app.use("/register", registerRoute);

// -------------------------------------  LOGIN   ---------------------------------------

const loginRoute = require("./src/routes/auth/auth");
app.use("/login", loginRoute);

// -------------------------------------  LOGOUT   ---------------------------------------

const logoutRoute = require("./src/routes/auth/logout");
app.use("/logout", logoutRoute);

// -------------------------------------  JOB LISTING   ---------------------------------------

const jobsRoute = require("./src/routes/jobs/jobs");
app.use("/jobs", jobsRoute);

// -------------------------------------  PROFILE EDIT   ---------------------------------------

const profileRoute = require('./src/routes/profile/profile');
app.use("/edit-profile", profileRoute);

// -------------------------------------  404   ---------------------------------------

const notFoundRoute = require("./src/middleware/pageNotFound");
app.use(notFoundRoute);

app.post("/edit-profile/add-pet", isLoggedIn, async (req, res) => {
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

// -------------------------------------  SERVER START   ---------------------------------------

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

module.exports = { app, db };
