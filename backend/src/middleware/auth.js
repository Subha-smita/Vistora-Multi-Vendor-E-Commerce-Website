import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify the JWT and load the current account from MongoDB.
export const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Please sign in."
      });
    }

    const token = authorization.slice(7);

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return res.status(500).json({
        error: "Server configuration error."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({
        error: "Invalid session. Please sign in again."
      });
    }

    // Check the current role in the database, not only in the token.
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: "Account not found. Please sign in again."
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role || "customer",
      email: user.email
    };

    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        error: "Your session is invalid or expired. Please sign in again."
      });
    }

    console.error("Authentication error:", error);

    return res.status(500).json({
      error: "Server error."
    });
  }
};

// Allow only the specified account roles.
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Please sign in."
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission to access this resource."
      });
    }

    return next();
  };
};