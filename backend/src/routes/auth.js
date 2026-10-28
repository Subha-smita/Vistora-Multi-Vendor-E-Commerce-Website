
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return process.env.JWT_SECRET;
}

// Create a JWT for the authenticated account.
function makeToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role || "customer"
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

// Never return the password hash to the frontend.
function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role || "customer"
  };
}

// CUSTOMER REGISTRATION
router.post("/register", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Please fill in all fields."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Please enter a valid email address."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must contain at least 8 characters."
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        error: "Email is already registered."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Public registration can create customers only.
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "customer"
    });

    return res.status(201).json({
      message: "Account created successfully.",
      token: makeToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: "Email is already registered."
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      error: "Server error."
    });
  }
});

// LOGIN
// Customers, vendors, and admins may use this endpoint.
// Their permissions depend on their verified database role.
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required."
      });
    }

    const user = await User.findOne({ email }).select('+passwordHash');

    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        error: "Wrong email or password."
      });
    }

    return res.json({
      message: "Login successful.",
      token: makeToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Server error."
    });
  }
});

// AUTHENTICATE THE TOKEN AND LOAD THE CURRENT ACCOUNT.
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Please sign in."
      });
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, getJwtSecret());

    if (!decoded.id) {
      return res.status(401).json({
        error: "Invalid session. Please sign in again."
      });
    }

    // Read the latest account and role from the database.
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

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Session expired or invalid. Please sign in again."
      });
    }

    console.error("Authentication error:", error);

    return res.status(500).json({
      error: "Server error."
    });
  }
}

// ROLE-BASED AUTHORIZATION
export function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Please sign in."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission to access this resource."
      });
    }

    next();
  };
}

// CHECK THE CURRENTLY LOGGED-IN ACCOUNT.
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({
        error: "Account not found. Please sign in again."
      });
    }

    return res.json({
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Current-user error:", error);

    return res.status(500).json({
      error: "Server error."
    });
  }
});

export default router;