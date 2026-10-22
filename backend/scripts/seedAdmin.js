
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";

async function seedAdmin() {
  const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env"
    );
  }

  await mongoose.connect(MONGODB_URI);

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const existing = await User.findOne({ email }).select("+passwordHash");

  if (existing) {
    // Never silently promote an existing customer to admin.
    if (existing.role !== "admin") {
      throw new Error(
        "This email already belongs to a non-admin account. Choose a different ADMIN_EMAIL."
      );
    }

    existing.passwordHash = passwordHash;
    existing.isActive = true;
    await existing.save();

    console.log("Existing admin password updated.");
  } else {
    await User.create({
      name: "GetYourMed Administrator",
      email,
      passwordHash,
      role: "admin",
      isActive: true,
      // No mobile number is required for this admin account.
    });

    console.log("Admin account created.");
  }
}

seedAdmin()
  .catch((error) => {
    console.error("Admin seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
