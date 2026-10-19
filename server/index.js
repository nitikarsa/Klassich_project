require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const db = require("./db");
const port = process.env.PORT || 3000;


app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "KLASSISCH API berjalan" });
});

app.get("/api/db-health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const [products] = await db.query(
      `SELECT id, name, category, price, size, status, image
       FROM products
       ORDER BY created_at DESC`,
    );

    res.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch products",
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, category, price, size, status, image
       FROM products
       WHERE id = ?`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch product",
    });
  }
});

app.listen(port, () => {
  console.log(`API berjalan di http://localhost:${port}`);
});
