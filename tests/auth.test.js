import request from "supertest";
import { describe, test, expect } from "vitest";
import app from "../src/app.js";

const validUser = {
  firstName: "noa",
  lastName: "tester",
  email: "noa@example.com",
  password: "password123",
  allergens: ["gluten"],
};

describe("Auth Routes", () => {
  describe("POST /api/auth/register", () => {
    test("creates a user and logs them in with valid data", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(validUser);

      expect(response.status).toBe(201);
      expect(response.body.email).toBe("noa@example.com");
      expect(response.body.firstName).toBe("Noa");
      expect(response.body.lastName).toBe("Tester");
      expect(response.body).not.toHaveProperty("password");
    });

    test("returns 400 when required fields are missing", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "noa@example.com", password: "password123" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("All fields are required");
    });

    test("returns 400 for an invalid email format", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ ...validUser, email: "notanemail" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid email format");
    });

    test("returns 400 for a password shorter than 8 characters", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ ...validUser, password: "short" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Password must be at least 8 characters");
    });

    test("returns 409 when the email is already in use", async () => {
      await request(app).post("/api/auth/register").send(validUser);

      const response = await request(app)
        .post("/api/auth/register")
        .send(validUser);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Email already in use");
    });

    test("creates an account with no allergens selected", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ ...validUser, allergens: undefined });

      expect(response.status).toBe(201);
      expect(response.body.allergens).toEqual([]);
    });
  });

  describe("POST /api/auth/login", () => {
    test("returns 400 when email or password is missing", async () => {
      const response = await request(app).post("/api/auth/login").send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Email and password are required");
    });

    test("returns 401 for the wrong password", async () => {
      await request(app).post("/api/auth/register").send(validUser);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: validUser.email, password: "wrongpassword" });

      expect(response.status).toBe(401);
    });

    test("returns 401 for an email that does not exist", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "password123" });

      expect(response.status).toBe(401);
    });

    test("returns 200 and the user for valid credentials", async () => {
      await request(app).post("/api/auth/register").send(validUser);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: validUser.email, password: validUser.password });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(validUser.email);
      expect(Array.isArray(response.body.favourites)).toBe(true);
    });
  });

  describe("Protected routes and logout", () => {
    test("returns 401 for a protected route without being logged in", async () => {
      const response = await request(app).get("/api/users/me");

      expect(response.status).toBe(401);
    });

    test("allows a protected route while logged in, then blocks after logout", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/register").send(validUser);

      const before = await agent.get("/api/users/me");
      expect(before.status).toBe(200);
      expect(before.body.email).toBe(validUser.email);

      const logout = await agent.post("/api/auth/logout");
      expect(logout.status).toBe(200);

      const after = await agent.get("/api/users/me");
      expect(after.status).toBe(401);
    });
  });

  describe("PUT /api/auth/password", () => {
    test("returns 400 when fields are missing", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/register").send(validUser);

      const response = await agent.put("/api/auth/password").send({});

      expect(response.status).toBe(400);
    });

    test("returns 401 for an incorrect current password", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/register").send(validUser);

      const response = await agent.put("/api/auth/password").send({
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });

      expect(response.status).toBe(401);
    });

    test("returns 400 when new passwords do not match", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/register").send(validUser);

      const response = await agent.put("/api/auth/password").send({
        currentPassword: validUser.password,
        newPassword: "newpassword123",
        confirmPassword: "differentpassword",
      });

      expect(response.status).toBe(400);
    });

    test("returns 400 for a new password shorter than 8 characters", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/register").send(validUser);

      const response = await agent.put("/api/auth/password").send({
        currentPassword: validUser.password,
        newPassword: "short",
        confirmPassword: "short",
      });

      expect(response.status).toBe(400);
    });

    test("changes the password and allows login with the new one", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/register").send(validUser);

      const change = await agent.put("/api/auth/password").send({
        currentPassword: validUser.password,
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });
      expect(change.status).toBe(200);

      const login = await request(app)
        .post("/api/auth/login")
        .send({ email: validUser.email, password: "newpassword123" });
      expect(login.status).toBe(200);
    });
  });
});