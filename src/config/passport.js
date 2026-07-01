import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import User from "../models/User.js";

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      // Find the user by email
      const user = await User.findOne({ email });

      if (!user) {
        return done(null, false, { message: "No account found with that email" });
      }

      // Compare the password that's submitted with the hashed password in the db
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return done(null, false, { message: "Incorrect password" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

// Save the user ID to the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Retrieve the full user from the database using the ID stored in the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;