import request from "supertest";
import { describe, test, expect } from "vitest";
import app from "../src/app.js";

const makeUser = (n) => ({
  firstName: "user",
  lastName: `number${n}`,
  email: `user${n}@example.com`,
  password: "password123",
});

const sampleRestaurant = {
  googlePlaceId: "test-place-001",
  name: "Test Sushi House",
  address: "123 Test St, Richmond, BC",
  phone: "",
  website: "",
  location: { lat: 49.16, lng: -123.13 },
};

const sampleDish = {
  dishName: "Mushroom Burger",
  freeFrom: ["gluten", "dairy"],
  modifications: ["No bun"],
  otherModifications: "",
};

const loggedInAgent = async (n) => {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send(makeUser(n));
  return { agent, user: response.body };
};

const logDish = (agent, overrides = {}) =>
  agent.post("/api/dishes").send({
    restaurant: sampleRestaurant,
    dish: { ...sampleDish, ...overrides },
  });

describe("Dish Routes", () => {
  describe("POST /api/dishes", () => {
    test("returns 401 when not logged in", async () => {
      const response = await request(app).post("/api/dishes").send({});
      expect(response.status).toBe(401);
    });

    test("returns 400 when dish name is missing", async () => {
      const { agent } = await loggedInAgent(1);
      const response = await logDish(agent, { dishName: "" });
      expect(response.status).toBe(400);
    });

    test("returns 400 when freeFrom is empty", async () => {
      const { agent } = await loggedInAgent(1);
      const response = await logDish(agent, { freeFrom: [] });
      expect(response.status).toBe(400);
    });

    test("creates the restaurant automatically when it does not exist", async () => {
      const { agent } = await loggedInAgent(1);

      const response = await logDish(agent);
      expect(response.status).toBe(201);

      const fetched = await agent.get(`/api/restaurants/${response.body.restaurantId}`);
      expect(fetched.status).toBe(200);
      expect(fetched.body.name).toBe(sampleRestaurant.name);
    });

    test("does not duplicate the restaurant when logging a second dish", async () => {
      const { agent } = await loggedInAgent(1);

      const first = await logDish(agent);
      const second = await logDish(agent, { dishName: "Veggie Wrap" });

      expect(first.body.restaurantId).toBe(second.body.restaurantId);
    });

    test("normalizes dish names to lowercase and trims whitespace", async () => {
      const { agent } = await loggedInAgent(1);

      const response = await logDish(agent, { dishName: "  Mushroom Burger  " });

      expect(response.status).toBe(201);
      expect(response.body.dishName).toBe("mushroom burger");
    });
  });

  describe("GET /api/dishes", () => {
    test("returns 400 when neither restaurantId nor userId is provided", async () => {
      const { agent } = await loggedInAgent(1);
      const response = await agent.get("/api/dishes");
      expect(response.status).toBe(400);
    });

    test("returns an empty array for a user with no dishes", async () => {
      const { agent, user } = await loggedInAgent(1);
      const response = await agent.get(`/api/dishes?userId=${user._id}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test("counts the same dish logged by two users as one entry with logCount 2", async () => {
      const { agent: agent1 } = await loggedInAgent(1);
      const { agent: agent2 } = await loggedInAgent(2);

      const first = await logDish(agent1);
      await logDish(agent2, { dishName: "MUSHROOM BURGER" });

      const response = await agent1.get(
        `/api/dishes?restaurantId=${first.body.restaurantId}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].logCount).toBe(2);
    });

    test("keeps different dish names as separate entries", async () => {
      const { agent } = await loggedInAgent(1);

      const first = await logDish(agent);
      await logDish(agent, { dishName: "Veggie Wrap" });

      const response = await agent.get(
        `/api/dishes?restaurantId=${first.body.restaurantId}`
      );

      expect(response.body).toHaveLength(2);
    });

    test("includes who last logged the dish", async () => {
      const { agent } = await loggedInAgent(1);
      const first = await logDish(agent);

      const response = await agent.get(
        `/api/dishes?restaurantId=${first.body.restaurantId}`
      );

      expect(response.body[0].lastLoggedBy).toBe("User N.");
    });
  });

  describe("PUT /api/dishes/:id", () => {
    test("returns 403 when editing someone else's dish", async () => {
      const { agent: owner } = await loggedInAgent(1);
      const { agent: other } = await loggedInAgent(2);

      const dish = await logDish(owner);

      const response = await other
        .put(`/api/dishes/${dish.body._id}`)
        .send({ dishName: "Hijacked Dish" });

      expect(response.status).toBe(403);
    });

    test("returns 404 for a dish that does not exist", async () => {
      const { agent } = await loggedInAgent(1);

      const response = await agent
        .put("/api/dishes/000000000000000000000000")
        .send({ dishName: "Ghost Dish" });

      expect(response.status).toBe(404);
    });

    test("updates a dish and normalizes the new name", async () => {
      const { agent } = await loggedInAgent(1);
      const dish = await logDish(agent);

      const response = await agent
        .put(`/api/dishes/${dish.body._id}`)
        .send({ dishName: "  Portobello Burger ", freeFrom: ["gluten"] });

      expect(response.status).toBe(200);
      expect(response.body.dishName).toBe("portobello burger");
      expect(response.body.freeFrom).toEqual(["gluten"]);
    });
  });

  describe("DELETE /api/dishes/:id", () => {
    test("returns 403 when deleting someone else's dish", async () => {
      const { agent: owner } = await loggedInAgent(1);
      const { agent: other } = await loggedInAgent(2);

      const dish = await logDish(owner);

      const response = await other.delete(`/api/dishes/${dish.body._id}`);
      expect(response.status).toBe(403);
    });

    test("returns 404 for a dish that does not exist", async () => {
      const { agent } = await loggedInAgent(1);
      const response = await agent.delete("/api/dishes/000000000000000000000000");
      expect(response.status).toBe(404);
    });

    test("deletes a dish and decreases its log count", async () => {
      const { agent: agent1 } = await loggedInAgent(1);
      const { agent: agent2 } = await loggedInAgent(2);

      const first = await logDish(agent1);
      await logDish(agent2);

      const del = await agent1.delete(`/api/dishes/${first.body._id}`);
      expect(del.status).toBe(200);

      const response = await agent1.get(
        `/api/dishes?restaurantId=${first.body.restaurantId}`
      );
      expect(response.body[0].logCount).toBe(1);
    });
  });
});