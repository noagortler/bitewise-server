# Bitewise Server

The API for [Bitewise](https://github.com/noagortler/bitewise-client), a community-driven web app that helps people with food allergies find safe dishes at restaurants near them. Built with Node.js, Express, MongoDB, and Passport.js session auth.

**Live API:** https://bitewise-server.onrender.com
**Client repo:** https://github.com/noagortler/bitewise-client

## Overview

The server handles accounts and sessions, restaurants, dish logs, and the Google APIs the app depends on. Google Places and Geocoding calls are made server-side so API keys are never exposed to the browser.

A few design points:

- Restaurants are created automatically the first time someone logs a dish at them, keyed by Google Place ID so the same restaurant is never duplicated
- Dish names are normalized (trimmed, lowercased) so "Mushroom Burger" and "mushroom burger" count as the same dish, and restaurant pages aggregate logs of the same dish into one entry with a count
- The map endpoint returns each restaurant's combined allergen coverage from its dishes, which powers the allergen filter and pin colours
- Restaurant search combines a case-insensitive lookup of the Bitewise database with Google Places Autocomplete, filtered to food places and biased to the user's map position

## API

All routes below `/api` except auth require a logged-in session.

### Auth
| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Create an account and start a session |
| POST | /api/auth/login | Log in |
| POST | /api/auth/logout | Log out and destroy the session |
| PUT | /api/auth/password | Change password |

### Users
| Method | Route | Description |
|---|---|---|
| GET | /api/users/me | Current user's profile |
| PUT | /api/users/:id | Update profile (own account only) |
| DELETE | /api/users/:id | Delete account (own account only) |
| POST | /api/users/:id/favourites/:restaurantId | Save a restaurant |
| DELETE | /api/users/:id/favourites/:restaurantId | Remove a saved restaurant |

### Restaurants
| Method | Route | Description |
|---|---|---|
| GET | /api/restaurants | Restaurants in the map viewport (bounds query), with aggregated allergens |
| GET | /api/restaurants/search | Hybrid search: Bitewise database plus Google Places Autocomplete |
| GET | /api/restaurants/place-details/:placeId | Full Google details for one place |
| GET | /api/restaurants/:id | One restaurant |

### Dishes
| Method | Route | Description |
|---|---|---|
| GET | /api/dishes?restaurantId= | Dishes at a restaurant, grouped with log counts |
| GET | /api/dishes?userId= | Dishes logged by a user |
| POST | /api/dishes | Log a dish (creates the restaurant if needed) |
| PUT | /api/dishes/:id | Edit a dish (owner only) |
| DELETE | /api/dishes/:id | Delete a dish (owner only) |

### Geocoding
| Method | Route | Description |
|---|---|---|
| GET | /api/geocode?address= | City to coordinates |
| GET | /api/geocode/reverse?lat=&lng= | Coordinates to city label |
| GET | /api/geocode/autocomplete?input= | City suggestions |

## Running locally

1. Install dependencies:

```bash
cd server
npm install
```

2. Create a `.env` file in `server/` with:

```
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=any_long_random_string
GOOGLE_MAPS_API_KEY=your_server_key
```

The Google key needs the Places API (New) and Geocoding API enabled.

3. Start the server:

```bash
npm run dev
```

## Seeding demo data

```bash
npm run seed
```

The seed script creates six demo users and logs dishes at twenty real Metro Vancouver restaurants. Restaurant details (place ID, address, phone, website, coordinates) are fetched live from Google Places when the script runs, so nothing is hand-typed. The script is safe to re-run: it only ever replaces its own data, tagged by demo email domain, and never touches real accounts or restaurants added through the app.

## Tests

62 tests run with Vitest and Supertest against an in-memory MongoDB, covering auth, validation, ownership checks, dish aggregation, and the search endpoints with the Google API mocked. See `testing.md` for the full case list.

```bash
npm run test:run
```