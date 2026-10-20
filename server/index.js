require("dotenv").config();

const path = require("node:path");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const multer = require("multer");
const db = require("./db");

const app = express();
const port = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, "uploads");
const imageExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

fs.mkdirSync(uploadDir, { recursive: true });

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET belum diatur di file .env");
}

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => {
      callback(null, `${randomUUID()}${imageExtensions[file.mimetype]}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(imageExtensions, file.mimetype)) {
      return callback(new Error("Format foto harus JPG, PNG, atau WebP."));
    }

    callback(null, true);
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Terlalu banyak percobaan login. Coba lagi nanti.",
  },
});

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

app.use(
  session({
    name: "klassisch.sid",
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({
      status: "error",
      message: "Login admin diperlukan.",
    });
  }

  next();
}

function readProductFields(body = {}) {
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category =
    typeof body.category === "string" ? body.category.trim() : "";
  const size = typeof body.size === "string" ? body.size.trim() : "";
  const price = Number(body.price);
  const status = body.status;

  if (
    !id ||
    id.length > 20 ||
    !name ||
    name.length > 150 ||
    !category ||
    category.length > 80 ||
    !size ||
    size.length > 20 ||
    !Number.isSafeInteger(price) ||
    price < 0 ||
    !["available", "sold"].includes(status)
  ) {
    return null;
  }

  return { id, name, category, price, size, status };
}

function handleUpload(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) {
      return next();
    }

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Ukuran foto maksimal 5 MB."
        : error.message;

    res.status(400).json({ status: "error", message });
  });
}

function removeUploadedFile(file) {
  if (!file) {
    return;
  }

  fs.unlink(file.path, (error) => {
    if (error) {
      console.error("Failed to remove unused upload:", error);
    }
  });
}

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

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Email dan password wajib diisi.",
    });
  }

  try {
    const [rows] = await db.execute(
      "SELECT id, email, password_hash FROM admin_users WHERE email = ? LIMIT 1",
      [email],
    );
    const admin = rows[0];
    const passwordMatches =
      admin && (await bcrypt.compare(password, admin.password_hash));

    if (!passwordMatches) {
      return res.status(401).json({
        status: "error",
        message: "Email atau password salah.",
      });
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        console.error("Failed to create admin session:", sessionError);
        return res.status(500).json({
          status: "error",
          message: "Gagal membuat sesi login.",
        });
      }

      req.session.admin = { id: admin.id, email: admin.email };
      req.session.save((saveError) => {
        if (saveError) {
          console.error("Failed to save admin session:", saveError);
          return res.status(500).json({
            status: "error",
            message: "Gagal menyimpan sesi login.",
          });
        }

        res.json({
          status: "ok",
          admin: { id: admin.id, email: admin.email },
        });
      });
    });
  } catch (error) {
    console.error("Admin login failed:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat login.",
    });
  }
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.admin) {
    return res.json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    admin: {
      id: req.session.admin.id,
      email: req.session.admin.email,
    },
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Failed to destroy admin session:", error);
      return res.status(500).json({
        status: "error",
        message: "Gagal logout.",
      });
    }

    res.clearCookie("klassisch.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    res.json({ status: "ok" });
  });
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

app.post("/api/products", requireAdmin, handleUpload, async (req, res) => {
  const fields = readProductFields(req.body);
  const image = req.file ? `/uploads/${req.file.filename}` : "";

  if (!fields || !image) {
    removeUploadedFile(req.file);
    return res.status(400).json({
      status: "error",
      message: "Data produk tidak valid atau belum lengkap.",
    });
  }

  try {
    await db.execute(
      `INSERT INTO products (id, name, category, price, size, status, image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fields.id,
        fields.name,
        fields.category,
        fields.price,
        fields.size,
        fields.status,
        image,
      ],
    );
    res.status(201).json({ ...fields, image });
  } catch (error) {
    removeUploadedFile(req.file);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "ID produk sudah digunakan.",
      });
    }

    console.error("Failed to create product:", error);
    res.status(500).json({
      status: "error",
      message: "Gagal menyimpan produk.",
    });
  }
});

app.put(
  "/api/products/:id",
  requireAdmin,
  handleUpload,
  async (req, res) => {
    const fields = readProductFields({ ...req.body, id: req.params.id });

    if (!fields) {
      removeUploadedFile(req.file);
      return res.status(400).json({
        status: "error",
        message: "Data produk tidak valid atau belum lengkap.",
      });
    }

    try {
      const [existingRows] = await db.execute(
        "SELECT image FROM products WHERE id = ?",
        [req.params.id],
      );

      if (existingRows.length === 0) {
        removeUploadedFile(req.file);
        return res.status(404).json({
          status: "error",
          message: "Produk tidak ditemukan.",
        });
      }

      const image = req.file
        ? `/uploads/${req.file.filename}`
        : existingRows[0].image;
      await db.execute(
        `UPDATE products
         SET name = ?, category = ?, price = ?, size = ?, status = ?, image = ?
         WHERE id = ?`,
        [
          fields.name,
          fields.category,
          fields.price,
          fields.size,
          fields.status,
          image,
          req.params.id,
        ],
      );
      res.json({ ...fields, image });
    } catch (error) {
      removeUploadedFile(req.file);
      console.error("Failed to update product:", error);
      res.status(500).json({
        status: "error",
        message: "Gagal memperbarui produk.",
      });
    }
  },
);

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  try {
    const [result] = await db.execute(
      "DELETE FROM products WHERE id = ?",
      [req.params.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Produk tidak ditemukan.",
      });
    }

    res.json({ status: "ok", message: "Produk berhasil dihapus." });
  } catch (error) {
    console.error("Failed to delete product:", error);
    res.status(500).json({
      status: "error",
      message: "Gagal menghapus produk.",
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
        message: "Produk tidak ditemukan.",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    res.status(500).json({
      status: "error",
      message: "Gagal mengambil produk.",
    });
  }
});

app.listen(port, () => {
  console.log(`API berjalan di http://localhost:${port}`);
});
