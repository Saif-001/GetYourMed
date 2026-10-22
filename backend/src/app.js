import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { OAuth2Client } from "google-auth-library";
import User from "./models/User.js";
import productRoutes from "./routes/productRoutes.js";

const app = express();
const googleClient = new OAuth2Client();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const safeUser = (u) => ({
  id: u._id,
  name: u.name,
  mobile: u.mobile || "",
  email: u.email,
  gstin: u.gstin || "",
  role: u.role,
  contactVerified: u.contactVerified,
});

function setCookie(res, user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d", issuer: "medicine-management-api" });
  res.cookie("mm_auth", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400000 });
}
async function auth(req, res, next) {
  try {
    const token = req.cookies?.mm_auth;
    if (!token) return res.status(401).json({ message: "Please sign in." });
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: "medicine-management-api" });
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ message: "Session is invalid." });
    req.user = user; next();
  } catch { return res.status(401).json({ message: "Session is invalid or expired." }); }
}

app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));
app.post("/api/v1/auth/register", limiter, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const mobile = String(req.body.mobile || "").replace(/\D/g, "");
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");
    if (!name || !mobile || !email || !password || !confirmPassword) return res.status(400).json({ message: "All fields are required." });
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: "Name must be 2–100 characters." });
    if (!/^[6-9]\d{9}$/.test(mobile)) return res.status(400).json({ message: "Enter a valid 10-digit Indian mobile number." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return res.status(400).json({ message: "Password must be 8–72 characters and include a letter and a number." });
    if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });
    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing) return res.status(409).json({ message: "An account with this email or mobile already exists." });
    const user = await User.create({ name, mobile, email, passwordHash: await bcrypt.hash(password, 12), role: "customer", contactVerified: false });
    setCookie(res, user);
    return res.status(201).json({ message: "Account created.", user: safeUser(user) });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "An account with this email or mobile already exists." });
    console.error(e.message); return res.status(500).json({ message: "Could not create account." });
  }
});
app.post("/api/v1/auth/login", limiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Invalid email or password." });
    if (!user.isActive) return res.status(403).json({ message: "Account is inactive." });
    setCookie(res, user); return res.json({ message: "Signed in.", user: safeUser(user) });
  } catch (e) { console.error(e.message); return res.status(500).json({ message: "Could not sign in." }); }
});

app.post("/api/v1/auth/google", limiter, async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        message: "Google sign-in is not configured yet.",
      });
    }

    const credential = String(req.body.credential || "");

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required.",
      });
    }

    // Always verify the Google credential on the backend.
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const googleProfile = ticket.getPayload();

    if (
      !googleProfile?.sub ||
      !googleProfile.email ||
      !googleProfile.email_verified
    ) {
      return res.status(401).json({
        message: "Google identity could not be verified.",
      });
    }

    const googleId = googleProfile.sub;
    const email = googleProfile.email.trim().toLowerCase();

    // Existing Google customer: sign them in.
    let user = await User.findOne({ googleId });

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({
          message: "Account is inactive.",
        });
      }

      setCookie(res, user);

      return res.json({
        message: "Signed in with Google.",
        user: safeUser(user),
      });
    }

    // Never automatically link a Google identity to an existing
    // password account solely because the email addresses match.
    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      return res.status(409).json({
        message:
          "An account already exists with this email. Please log in using your existing sign-in method.",
      });
    }

    // Create a new customer without a mobile number.
    user = await User.create({
      name: String(googleProfile.name || email.split("@")[0])
        .trim()
        .slice(0, 100),
      email,
      googleId,
      role: "customer",
      isActive: true,
      contactVerified: false,
      // Deliberately omit mobile and passwordHash.
    });

    setCookie(res, user);

    return res.status(201).json({
      message: "Account created and signed in with Google.",
      user: safeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "An account with this email or Google identity already exists. Please try logging in again.",
      });
    }

    console.error("Google authentication error:", error.message);

    return res.status(401).json({
      message: "Google sign-in failed.",
    });
  }
});

app.post("/api/v1/auth/logout", (_req, res) => {
  res.clearCookie("mm_auth", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
  res.json({ message: "Signed out." });
});
app.get("/api/v1/auth/me", auth, (req, res) => res.json({ user: safeUser(req.user) }));

app.patch("/api/v1/users/me", auth, async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ["name", "mobile", "gstin"];

    // Ignore fields that are not allowed to be changed here.
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "name")) {
      if (typeof updates.name !== "string") {
        return res.status(400).json({
          message: "Name must be text.",
        });
      }

      updates.name = updates.name.trim();

      if (updates.name.length < 2 || updates.name.length > 100) {
        return res.status(400).json({
          message: "Name must be 2–100 characters.",
        });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "mobile")) {
      if (updates.mobile === null || updates.mobile === "") {
        // Allow users to clear their mobile number.
        updates.mobile = undefined;
      } else {
        if (typeof updates.mobile !== "string") {
          return res.status(400).json({
            message: "Mobile number must be text.",
          });
        }

        updates.mobile = updates.mobile.replace(/\D/g, "");

        if (!/^[6-9]\d{9}$/.test(updates.mobile)) {
          return res.status(400).json({
            message: "Enter a valid 10-digit Indian mobile number.",
          });
        }

        const existingMobile = await User.findOne({
          mobile: updates.mobile,
          _id: { $ne: req.user._id },
        });

        if (existingMobile) {
          return res.status(409).json({
            message: "This mobile number is already in use.",
          });
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "gstin")) {
      if (updates.gstin === null || updates.gstin === "") {
        updates.gstin = undefined;
      } else {
        if (typeof updates.gstin !== "string") {
          return res.status(400).json({
            message: "GSTIN must be text.",
          });
        }

        updates.gstin = updates.gstin.trim().toUpperCase();

        const gstinPattern =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

        if (!gstinPattern.test(updates.gstin)) {
          return res.status(400).json({
            message: "Enter a valid GSTIN.",
          });
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No profile fields were provided.",
      });
    }

    // Only update the account identified by the authenticated cookie.
    const user = await User.findById(req.user._id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "Your account is unavailable. Please sign in again.",
      });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "name")) {
      user.name = updates.name;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "mobile")) {
      if (updates.mobile === undefined) {
        user.mobile = undefined;
        user.contactVerified = false;
      } else {
        user.mobile = updates.mobile;
        // No OTP is used, so do not mark this number verified.
        user.contactVerified = false;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "gstin")) {
      user.gstin = updates.gstin;
    }

    await user.save();

    return res.json({
      message: "Profile updated successfully.",
      user: safeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This mobile number or another unique value is already in use.",
      });
    }

    console.error("Profile update error:", error.message);

    return res.status(500).json({
      message: "Could not update profile.",
    });
  }
});

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));
app.use((err, _req, res, _next) => { console.error(err.message); res.status(500).json({ message: "Unexpected server error." }); });
export default app;
