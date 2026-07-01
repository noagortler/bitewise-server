// Middleware checks if a user is logged in before allowing access to a route.
// If not logged in, returns a 401 response instead of continuing to the route handler.
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "You must be logged in to access this" });
};