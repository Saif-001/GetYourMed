import express from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";

import Product from "../models/Product.js";
// import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Injection",
  "Syrup",
  "Drops",
  "Cream",
  "Ointment",
  "Inhaler",
  "Powder",
  "Gel",
  "Lotion",
  "Other",
];

function validateProduct(body) {
  const requiredFields = [
    "medicineName",
    "strength",
    "dosageForm",
    "category",
    "subcategory",
  ];

  for (const field of requiredFields) {
    if (!String(body[field] ?? "").trim()) {
      return `${field} is required.`;
    }
  }

  const mrp = Number(body.mrp);

  if (
    body.mrp === "" ||
    body.mrp === undefined ||
    !Number.isFinite(mrp) ||
    mrp < 0
  ) {
    return "Enter a valid MRP.";
  }

  if (!DOSAGE_FORMS.includes(body.dosageForm)) {
    return "Invalid dosage form.";
  }

  if (
    body.unitsPerStrip !== "" &&
    body.unitsPerStrip !== null &&
    body.unitsPerStrip !== undefined
  ) {
    const units = Number(body.unitsPerStrip);

    if (!Number.isInteger(units) || units < 1) {
      return "Units per strip must be a positive whole number.";
    }
  }

  return null;
}

function toProductData(body) {
  return {
    medicineName: String(body.medicineName).trim(),
    strength: String(body.strength).trim(),
    dosageForm: String(body.dosageForm).trim(),
    unitsPerStrip:
      body.unitsPerStrip === "" ||
      body.unitsPerStrip === null ||
      body.unitsPerStrip === undefined
        ? null
        : Number(body.unitsPerStrip),
    packaging: String(body.packaging || "").trim(),
    mrp: Number(body.mrp),
    category: String(body.category).trim(),
    subcategory: String(body.subcategory).trim(),
    description: String(body.description || "").trim(),
    isActive:
      body.isActive === undefined ? true : body.isActive === true ||
        body.isActive === "true",
  };
}

// Protect all product-management APIs.
// Authentication middleware must identify the logged-in user.
// Admin middleware must verify the user's admin role.
router.use(adminMiddleware);

// GET /api/products?search=paracetamol
router.get("/", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const filter = {};

    if (search) {
      filter.$or = [
        { medicineName: { $regex: search, $options: "i" } },
        { strength: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { subcategory: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(filter).sort({ updatedAt: -1 });

    res.json({ products });
  } catch (error) {
    console.error("Fetch products error:", error);
    res.status(500).json({ message: "Failed to fetch products." });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json({ product });
  } catch {
    res.status(400).json({ message: "Invalid product ID." });
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  try {
    const validationError = validateProduct(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const product = await Product.create(toProductData(req.body));

    res.status(201).json({
      message: "Product added successfully.",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This product already exists.",
      });
    }

    console.error("Create product error:", error);
    res.status(500).json({ message: "Failed to add product." });
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  try {
    const validationError = validateProduct(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: toProductData(req.body) },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json({
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Duplicate product.",
      });
    }

    console.error("Update product error:", error);
    res.status(400).json({ message: "Failed to update product." });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json({ message: "Product deleted successfully." });
  } catch {
    res.status(400).json({ message: "Failed to delete product." });
  }
});

// POST /api/products/import
// CSV columns:
// medicineName,strength,dosageForm,unitsPerStrip,packaging,
// mrp,category,subcategory,description
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a CSV file.",
      });
    }

    let rows;

    try {
      const csvText = req.file.buffer
        .toString("utf8")
        .replace(/^\uFEFF/, "");

      rows = parse(csvText, {
        columns: (headers) => headers.map((header) => header.trim()),
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch {
      return res.status(400).json({
        message: "Unable to read the CSV file.",
      });
    }

    let imported = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validationError = validateProduct(row);

      if (validationError) {
        errors.push({
          row: i + 2,
          message: validationError,
        });
        continue;
      }

      try {
        await Product.create(toProductData(row));
        imported++;
      } catch (error) {
        errors.push({
          row: i + 2,
          message:
            error.code === 11000
              ? "Duplicate product."
              : "Unable to save this product.",
        });
      }
    }

    res.json({
      message: `Imported ${imported} product(s).`,
      imported,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Import products error:", error);
    res.status(500).json({
      message: "Product import failed.",
    });
  }
});

export default router;