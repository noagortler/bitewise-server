import request from "supertest";
import { describe, test, expect, vi, afterEach } from "vitest";
import mongoose from "mongoose";
import app from "../src/app.js";
import Restaurant from "../src/models/Restaurant.js";
import Dish from "../src/models/Dish.js";

const testUser = {
  firstName: "resto",
  lastName: "tester",
  email: "resto@example.com",
  password: "password123",
};

const loggedInAgent = async () => {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send(testUser);
  return { agent, user: response.body };
};

const makeRestaurant = (overrides = {}) =>
  Restaurant.create({
    googlePlaceId: `place-${Math.random().toString(36).slice(2)}`,
    name: "Inside Grill",
    address: "1 Test Ave",
    location: { lat: 49.16, lng: -123.13 },
    ...overrides,
  });

const prediction = (placeId, mainText, types) => ({
  placePrediction: {
    placeId,
    text: { text: mainText },
    structuredFormat: {
      mainText: { text: mainText },
      secondaryText: { text: "Somewhere, BC, Canada" },
    },
    types,
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Restaurant Routes", () => {
  describe("GET /api/restaurants", () => {
    test("returns 401 when not logged in", async () => {
      const response = await request(app).get("/api/restaurants");
      expect(response.status).toBe(401);
    });

    test("returns 400 without bounds or lat/lng", async () => {
      const { agent } = await loggedInAgent();
      const response = await agent.get("/api/restaurants");
      expect(response.status).toBe(400);
    });

    test("returns restaurants inside the bounds and excludes those outside", async () => {
      const { agent } = await loggedInAgent();

      await makeRestaurant({ name: "Inside Grill", location: { lat: 49.16, lng: -123.13 } });
      await makeRestaurant({ name: "Far Away Diner", location: { lat: 53.5, lng: -113.5 } });

      const response = await agent.get(
        "/api/restaurants?north=49.3&south=49.0&east=-123.0&west=-123.3"
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Inside Grill");
    });

    test("includes aggregated allergens from the restaurant's dishes", async () => {
      const { agent, user } = await loggedInAgent();

      const restaurant = await makeRestaurant();
      await Dish.create({
        restaurantId: restaurant._id,
        userId: new mongoose.Types.ObjectId(user._id),
        dishName: "test dish",
        freeFrom: ["gluten", "dairy"],
      });
      await Dish.create({
        restaurantId: restaurant._id,
        userId: new mongoose.Types.ObjectId(user._id),
        dishName: "other dish",
        freeFrom: ["dairy", "peanuts"],
      });

      const response = await agent.get(
        "/api/restaurants?north=49.3&south=49.0&east=-123.0&west=-123.3"
      );

      expect(response.status).toBe(200);
      expect(response.body[0].allergens.sort()).toEqual(["dairy", "gluten", "peanuts"]);
    });
  });

  describe("GET /api/restaurants/:id", () => {
    test("returns 404 for a restaurant that does not exist", async () => {
      const { agent } = await loggedInAgent();
      const response = await agent.get("/api/restaurants/000000000000000000000000");
      expect(response.status).toBe(404);
    });

    test("returns the restaurant document", async () => {
      const { agent } = await loggedInAgent();
      const restaurant = await makeRestaurant({ name: "Fetch Me" });

      const response = await agent.get(`/api/restaurants/${restaurant._id}`);
      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Fetch Me");
    });
  });

  describe("GET /api/restaurants/search", () => {
    test("returns 400 when the query is missing", async () => {
      const { agent } = await loggedInAgent();
      const response = await agent.get("/api/restaurants/search");
      expect(response.status).toBe(400);
    });

    test("finds restaurants on Bitewise with case-insensitive partial match", async () => {
      const { agent } = await loggedInAgent();
      await makeRestaurant({ name: "Gami Sushi", googlePlaceId: "gami-001" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ json: async () => ({ suggestions: [] }) })
      );

      const response = await agent.get("/api/restaurants/search?query=GAMI");

      expect(response.status).toBe(200);
      expect(response.body.onBitewise).toHaveLength(1);
      expect(response.body.onBitewise[0].name).toBe("Gami Sushi");
      expect(response.body.fromGoogle).toEqual([]);
    });

    test("filters Google results to food places only", async () => {
      const { agent } = await loggedInAgent();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          json: async () => ({
            suggestions: [
              prediction("g-1", "Salt Spring Island", ["establishment", "island", "natural_feature"]),
              prediction("g-2", "Sawasdee Thai", ["thai_restaurant", "restaurant", "food"]),
              prediction("g-3", "Sam's Barbershop", ["hair_salon", "establishment"]),
              prediction("g-4", "Sasamat Cafe", ["cafe", "food", "establishment"]),
            ],
          }),
        })
      );

      const response = await agent.get("/api/restaurants/search?query=sa");

      expect(response.status).toBe(200);
      const names = response.body.fromGoogle.map((r) => r.name);
      expect(names).toEqual(["Sawasdee Thai", "Sasamat Cafe"]);
    });

    test("excludes Google results that are already on Bitewise", async () => {
      const { agent } = await loggedInAgent();
      await makeRestaurant({ name: "Sawasdee Thai", googlePlaceId: "g-2" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          json: async () => ({
            suggestions: [
              prediction("g-2", "Sawasdee Thai", ["thai_restaurant", "restaurant"]),
              prediction("g-5", "Saba Foods", ["restaurant", "food"]),
            ],
          }),
        })
      );

      const response = await agent.get("/api/restaurants/search?query=sa");

      expect(response.body.onBitewise).toHaveLength(1);
      expect(response.body.fromGoogle).toHaveLength(1);
      expect(response.body.fromGoogle[0].name).toBe("Saba Foods");
    });

    test("passes the location bias to the Google request when lat/lng provided", async () => {
      const { agent } = await loggedInAgent();

      const fetchMock = vi
        .fn()
        .mockResolvedValue({ json: async () => ({ suggestions: [] }) });
      vi.stubGlobal("fetch", fetchMock);

      await agent.get("/api/restaurants/search?query=sushi&lat=49.16&lng=-123.13");

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.locationBias.circle.center.latitude).toBe(49.16);
      expect(requestBody.locationBias.circle.center.longitude).toBe(-123.13);
    });
  });

  describe("GET /api/restaurants/place-details/:placeId", () => {
    test("returns normalized place details", async () => {
      const { agent } = await loggedInAgent();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            id: "g-9",
            displayName: { text: "Blue Canoe" },
            formattedAddress: "3866 Bayview St, Richmond",
            nationalPhoneNumber: "(604) 555-0199",
            websiteUri: "https://bluecanoe.example",
            location: { latitude: 49.1245, longitude: -123.1836 },
          }),
        })
      );

      const response = await agent.get("/api/restaurants/place-details/g-9");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        googlePlaceId: "g-9",
        name: "Blue Canoe",
        address: "3866 Bayview St, Richmond",
        phone: "(604) 555-0199",
        website: "https://bluecanoe.example",
        location: { lat: 49.1245, lng: -123.1836 },
      });
    });

    test("returns 404 when Google does not know the place", async () => {
      const { agent } = await loggedInAgent();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ error: { message: "Not found" } }),
        })
      );

      const response = await agent.get("/api/restaurants/place-details/nope");
      expect(response.status).toBe(404);
    });
  });
});