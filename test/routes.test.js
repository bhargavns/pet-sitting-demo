const request = require("supertest");
const { app, db } = require("../app");
const bcrypt = require("bcryptjs");

describe("Auth and Profile Routes", () => {
  let testUserId;
  let testUserId2;

  beforeAll(async () => {
    // Create a test user for login tests
    const hashedPassword = await bcrypt.hash("testpassword", 10);
    const user = await db.one(
      `
      INSERT INTO app_user (name, email, password_hash, type, location)
      VALUES ('Test User', 'test@example.com', $1, 'employer', 'Test Location')
      RETURNING id
    `,
      [hashedPassword]
    );
    const user2 = await db.one(
      `
        INSERT INTO app_user (name, email, password_hash, type, location)
        VALUES ('Test User', 'test2@example.com', $1, 'freelancer', 'Test Location')
        RETURNING id
    `,
      [hashedPassword]
    );
    testUserId = user.id;
    testUserId2 = user2.id;

    await db.none(
      `
      INSERT INTO employer (user_id, budget)
      VALUES ($1, 1000)
    `,
      [testUserId]
    );

    await db.none(
      `
      INSERT INTO freelancer (user_id, bio, profile_picture)
      VALUES ($1, 'some bio', 'example.jpg')
    `,
      [testUserId2]
    );
  });

  afterAll(async () => {
    // Clean up test data
    await db.none("DELETE FROM employer WHERE user_id = $1", [testUserId]);
    await db.none("DELETE FROM app_user WHERE id = $1", [testUserId]);

    await db.none("DELETE FROM freelancer WHERE user_id = $1", [testUserId2]);
    await db.none("DELETE FROM app_user WHERE id = $1", [testUserId2]);
  });

  describe("POST /register", () => {
    it("should register a new user", async () => {
      const response = await request(app)
        .post("/register")
        .query({ type: "freelancer" })
        .send({
          name: "New User",
          email: "new@example.com",
          password: "newpassword",
          location: "New Location",
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain("Registration successful");

      // Clean up
      await db.none(
        "DELETE FROM freelancer WHERE user_id = (SELECT id FROM app_user WHERE email = $1)",
        ["new@example.com"]
      );
      await db.none("DELETE FROM app_user WHERE email = $1", [
        "new@example.com",
      ]);
    });

    it("should not register a user with an existing email", async () => {
      const response = await request(app)
        .post("/register")
        .query({ type: "employer" })
        .send({
          name: "Duplicate User",
          email: "test@example.com",
          password: "password",
          location: "Location",
        });

      expect(response.status).toBe(500);
      expect(response.text).toContain("Error in user registration");
    });
  });

  describe("POST /login", () => {
    it("should login an existing user", async () => {
      const response = await request(app).post("/login").send({
        email: "test@example.com",
        password: "testpassword",
      });

      expect(response.status).toBe(302); // Expecting a redirect
      expect(response.headers.location).toBe("/edit-profile");
    });

    it("should not login with incorrect credentials", async () => {
      const response = await request(app).post("/login").send({
        email: "test@example.com",
        password: "asdcoisdf",
      });

      expect(response.status).toBe(401);
      expect(response.text).toBe("Invalid credentials");
    });
  });

  describe("GET /logout", () => {
    it("should logout a logged-in user", async () => {
      const agent = request.agent(app);

      // Login first
      await agent.post("/login").send({
        email: "test@example.com",
        password: "testpassword",
      });

      const response = await agent.get("/logout");

      expect(response.status).toBe(200);
      expect(response.text).toContain("Logout successful");
    });
  });

  describe("GET /edit-profile", () => {
    it("should return profile data for a logged-in employer", async () => {
      const agent = request.agent(app);

      // Login first
      await agent.post("/login").send({
        email: "test@example.com",
        password: "testpassword",
      });

      const response = await agent.get("/edit-profile");

      expect(response.status).toBe(200);
      expect(response.text).toContain("Test User");
      expect(response.text).toContain("Test Location");
      expect(response.text).toContain("1000"); // budget
    });

    it("should not allow access for non-logged-in users", async () => {
      const response = await request(app).get("/edit-profile");

      expect(response.status).toBe(401);
      expect(response.text).toBe("You are not logged in");
    });
  });

  describe("POST /edit-profile", () => {
    it("should change the profile for a logged-in employer", async () => {
      const agent = request.agent(app);

      await agent.post("/login").send({
        email: "test@example.com",
        password: "testpassword",
      });

      const response = await agent.post("/edit-profile").send({
        name: "Updated Name",
        location: "Updated Location",
        budget: 500,
      });

      // expect to redirect back to profile page
      expect(response.status).toBe(302);

      const updatedUser = await db.one(
        "SELECT * FROM app_user WHERE email = $1",
        ["test@example.com"]
      );
      const updatedEmployer = await db.one(
        "SELECT * FROM employer WHERE user_id = $1",
        [updatedUser.id]
      );

      expect(updatedUser.name).toBe("Updated Name");
      expect(updatedUser.location).toBe("Updated Location");
      expect(updatedEmployer.budget).toBe(500);
    });
  });

  describe("GET /jobs", () => {
    beforeAll(async () => {
      // Create a test job post
      await db.none(
        `
        INSERT INTO pet (owner_id, name, pet_type, age, special_needs)
        VALUES ((SELECT id FROM employer WHERE user_id = $1), 'TestPet', 'dog', 5, 'None')
      `,
        [testUserId]
      );

      await db.none(
        `
        INSERT INTO job_post (employer_id, pet_id, title, description, date_start, date_end, status, hourly_rate)
        VALUES (
          (SELECT id FROM employer WHERE user_id = $1),
          (SELECT id FROM pet WHERE name = 'TestPet'),
          'Test Job',
          'Test Description',
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '7 days',
          'open',
          15
        )
      `,
        [testUserId]
      );
    });

    afterAll(async () => {
      // Clean up test data
      await db.none("DELETE FROM job_post WHERE title = $1", ["Test Job"]);
      await db.none("DELETE FROM pet WHERE name = $1", ["TestPet"]);
    });

    it("should list job posts", async () => {
      const agent = request.agent(app);

      await agent.post("/login").send({
        email: "test@example.com",
        password: "testpassword",
      });

      const response = await agent.get("/jobs");

      expect(response.status).toBe(200);
      expect(response.text).toContain("Test Job");
      expect(response.text).toContain("Test Description");
      expect(response.text).toContain("TestPet");
    });
  });
});
