# Bitewise - Testing Edge Cases

Automated suites: backend in `server/tests/` (Vitest + Supertest + in-memory MongoDB, 62 tests), frontend in `client/src/tests/` (Vitest + React Testing Library, 16 tests). Run with `npm run test:run` in each repo.

## Auth

**Registration**
- User submits the form with a missing required field (firstName, lastName, email, password) - returns 400
- User registers with an email that is already in use - returns 409
- User registers with a password shorter than 8 characters - returns 400
- User registers with an invalid email format (e.g. "notanemail") - returns 400
- User registers with no allergens selected - account created successfully, returns 201
- User submits the registration form twice quickly - no duplicate accounts created, enforced by the unique index on email

**Login**
- User logs in with the correct email but wrong password - returns 401
- User logs in with an email that does not exist - returns 401
- User logs in with missing email or password fields - returns 400
- User attempts to access a protected route without being logged in - returns 401

**Logout**
- User logs out and then attempts to access a protected route - returns 401
- User logs out and then logs back in - returns 200 (verified manually in production)

**Change password**
- User submits with missing current password, new password, or confirm password - returns 400
- User submits incorrect current password - returns 401
- User submits a new password shorter than 8 characters - returns 400
- User submits a new password and confirm password that do not match - returns 400
- User successfully changes their password and logs in with the new password - returns 200

---

## Users

**Profile fetch**
- User fetches their own profile - returns full profile data without the password
- User fetches a profile with an ID that does not exist - returns 404

**Profile update**
- User updates their email to one that is already in use by another account - returns 409
- User updates their allergens with a value not in the fixed allergen list - not validated server-side. The UI only offers the fixed chips, so invalid values require hand-crafted API requests, and a stray string in the array breaks nothing. Accepted as MVP scope rather than maintaining a duplicate allergen list on the backend.
- User updates their `defaultLocation` with only `lat` and no `lng` - cannot happen through the app; the Settings flow geocodes the city and always saves both together
- User updates their profile with no fields provided - ignored gracefully, Mongoose skips undefined fields
- User attempts to update another user's profile - returns 403

**Favourites**
- User saves a restaurant to favourites - returns favourites with restaurant names populated
- User saves the same restaurant to favourites twice - returns 409
- User removes a restaurant from favourites that is not in their favourites - returns 404
- User attempts to update another user's favourites - returns 403

---

## Restaurants

**Map query**
- Request is missing both viewport bounds and `lat`/`lng` - returns 400
- Bounds query returns restaurants inside the viewport and excludes those outside
- Response includes each restaurant's aggregated allergens from its dishes, which powers the map filter
- Request returns no restaurants in the area - returns an empty array
- User denies location access and has no saved position - map falls back to hardcoded default (verified manually)

**Restaurant fetch**
- Restaurant ID does not exist - returns 404
- Restaurant has no dishes logged yet - returns the restaurant document with no dishes

**Search** (Google API mocked in tests)
- Request is missing `query` - returns 400
- On-Bitewise results match partial names case-insensitively
- Google results are filtered to food places only
- Google results already on Bitewise are deduplicated out
- `lat`/`lng` bias parameters are passed through to the Google request

**Place details** (Google API mocked in tests)
- Known place ID - returns normalized details (name, address, phone, website, location)
- Unknown place ID - returns 404

---

## Dishes

**Logging a dish**
- User submits the form with no `dishName` - returns 400
- User submits the form with an empty `freeFrom` array - returns 400
- User submits a `freeFrom` or `modifications` value not in the fixed chip lists - not validated server-side, same reasoning as allergens: only reachable by bypassing the UI, and harmless if it happens. Accepted as MVP scope.
- User logs a dish at a restaurant that does not yet exist in MongoDB - restaurant created automatically
- User logs a dish at a restaurant that already exists in MongoDB - restaurant not duplicated
- Two users log a dish at the same restaurant at the same time - restaurant only created once, mitigated by the unique index on `googlePlaceId`
- `dishName` is submitted with extra whitespace or mixed capitalisation (e.g. " Mushroom Burger ") - normalized to "mushroom burger" before saving
- User is not logged in - returns 401

**Dish count aggregation**
- Two users log the same dish name at the same restaurant - `logCount` returns 2
- Two users log slightly different capitalisations of the same dish (e.g. "mushroom burger" and "Mushroom Burger") - counts as the same dish after normalization
- Two users log different dish names - treated as separate entries
- Two users log the same dish name at different restaurants - counts separate per restaurant
- `lastLoggedBy` is formatted as "First L." from the most recent logger

**Editing a dish**
- User edits a dish they did not log - returns 403
- User edits a dish that does not exist - returns 404
- User submits an edit with no fields provided - ignored gracefully
- User edits `dishName` with mixed capitalisation - normalized before saving

**Deleting a dish**
- User deletes a dish they did not log - returns 403
- User deletes a dish that does not exist - returns 404
- User deletes a dish - dish count for that dish name at that restaurant decreases

**Fetching dishes**
- Request is missing both `restaurantId` and `userId` - returns 400
- Restaurant has dishes logged by multiple users - grouped by dish with counts, sorted by most logged
- User has logged no dishes yet - returns an empty array
- Dish with no modifications selected - card displays "None" in the modifications area (frontend behavior)

---

## Frontend Components

**LogDishModal**
- Renders the restaurant name and heading
- Submitting without a dish name shows a validation error and does not call onSuccess
- Submitting without allergens shows a validation error
- Allergen chips toggle active and inactive
- "Other" modifications input appears only when the Other chip is selected
- Successful submit sends the trimmed name and lowercased allergens, calls onSuccess with the response
- Server rejection displays the API's error message
- Cancel calls onClose

**EditDishModal**
- Pre-fills the dish name and restaurant name
- Pre-selects chips by mapping stored lowercase allergens back to capitalized labels
- Activates the Other chip and shows its input when the dish has custom modifications
- Saving sends a PUT to the dish's ID and calls onSuccess with the updated dish
- Removing all allergens before saving shows a validation error

**ProtectedRoute**
- Renders nothing while the auth check is loading
- Redirects to the login page when not logged in
- Renders the protected content when logged in

---

## Data Integrity

- A restaurant is deleted from MongoDB manually - its dishes are left pointing at a restaurant that no longer exists. The dish queries skip these, so lists just leave them out instead of crashing. Nothing in the app deletes restaurants, so this can only happen by editing the database directly.
- A user account is deleted - their dishes stay in the database and still show on restaurant pages. Whether they should be deleted too is an open decision; for MVP they are left in place.
- `googlePlaceId` is submitted with leading or trailing whitespace - trimmed before the duplicate check runs, so the same restaurant cannot be created twice because of extra spaces.
- Two simultaneous requests to create the same restaurant (same `googlePlaceId`) - the unique index on `googlePlaceId` means the database only accepts one; the other request fails and the user can resubmit.