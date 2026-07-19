import request from "supertest";
import { describe, test, expect } from "vitest";
import app from "../src/app.js";
import Restaurant from "../src/models/Restaurant.js";

const makeUser = (n) => ({
  firstName: "fav",
  lastName: `tester${n}`,
  email: `fav${n}@example.com`,
  password: "password123",
});

const loggedInAgent = async (n) => {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send(makeUser(n));
  return { agent, user: response.body };
};

const makeRestaurant = (name = "Fave Spot") =>
  Restaurant.create({
    googlePlaceId: `place-${Math.random().toString(36).slice(2)}`,
    name,
    address: "1 Test Ave",
    location: { lat: 49.16, lng: -123.13 },
  });

describe("User Routes", () => {
  describe("GET /api/users/me", () => {
    test("returns the logged-in user's profile without the password", async () => {
      const { agent } = await loggedInAgent(1);

      const response = await agent.get("/api/users/me");

      expect(response.status).toBe(200);
      expect(response.body.email).toBe("fav1@example.com");
      expect(response.body).not.toHaveProperty("password");
    });
  });

  describe("PUT /api/users/:id", () => {
    test("returns 403 when updating another user's profile", async () => {
      const { user: victim } = await loggedInAgent(1);
      const { agent: attacker } = await loggedInAgent(2);

      const response = await attacker
        .put(`/api/users/${victim._id}`)
        .send({ firstName: "Hacked" });

      expect(response.status).toBe(403);
    });

    test("returns 409 when changing email to one already in use", async () => {
      await loggedInAgent(1);
      const { agent, user } = await loggedInAgent(2);

      const response = await agent
        .put(`/api/users/${user._id}`)
        .send({ email: "fav1@example.com" });

      expect(response.status).toBe(409);
    });

    test("updates allergens successfully", async () => {
      const { agent, user } = await loggedInAgent(1);

      const response = await agent
        .put(`/api/users/${user._id}`)
        .send({ allergens: ["gluten", "sesame"] });

      expect(response.status).toBe(200);
      expect(response.body.allergens).toEqual(["gluten", "sesame"]);
    });
  });

  describe("Favourites", () => {
    test("saves a restaurant and returns favourites with names populated", async () => {
      const { agent, user } = await loggedInAgent(1);
      const restaurant = await makeRestaurant("Steveston Harbour Grill");

      const response = await agent.post(
        `/api/users/${user._id}/favourites/${restaurant._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.favourites).toHaveLength(1);
      expect(response.body.favourites[0].name).toBe("Steveston Harbour Grill");
    });

    test("returns 409 when saving the same restaurant twice", async () => {
      const { agent, user } = await loggedInAgent(1);
      const restaurant = await makeRestaurant();

      await agent.post(`/api/users/${user._id}/favourites/${restaurant._id}`);
      const response = await agent.post(
        `/api/users/${user._id}/favourites/${restaurant._id}`
      );

      expect(response.status).toBe(409);
    });

    test("returns 404 when removing a restaurant that is not saved", async () => {
      const { agent, user } = await loggedInAgent(1);
      const restaurant = await makeRestaurant();

      const response = await agent.delete(
        `/api/users/${user._id}/favourites/${restaurant._id}`
      );

      expect(response.status).toBe(404);
    });

    test("returns 403 when updating another user's favourites", async () => {
      const { user: victim } = await loggedInAgent(1);
      const { agent: attacker } = await loggedInAgent(2);
      const restaurant = await makeRestaurant();

      const response = await attacker.post(
        `/api/users/${victim._id}/favourites/${restaurant._id}`
      );

      expect(response.status).toBe(403);
    });

    test("removes a saved restaurant", async () => {
      const { agent, user } = await loggedInAgent(1);
      const restaurant = await makeRestaurant();

      await agent.post(`/api/users/${user._id}/favourites/${restaurant._id}`);
      const response = await agent.delete(
        `/api/users/${user._id}/favourites/${restaurant._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.favourites).toEqual([]);
    });
  });
});