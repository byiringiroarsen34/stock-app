require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Import Models
const User = require("./models/user");
const Product = require("./models/products");
const Sale = require("./models/sales");

const app = express();
const path = require("path");

// CORS Configuration - Allow Vercel frontend and local development
const allowedOrigins = [
  "https://stock-app-two-dusky.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:5001",
  "http://127.0.0.1:5173"
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

/* ================= ENV ================= */

const SECRET = process.env.JWT_SECRET || "fallbacksecret";
const MONGO_URI = process.env.MONGO_URI;

/* ================= DATABASE ================= */

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log("✅ MongoDB Connected");
      await createDefaultUsers();
    })
    .catch(err => console.log("❌ DB ERROR:", err));
} else {
  console.warn("⚠️  No MONGO_URI provided — starting in file-store fallback mode.");
}

/* ================= CREATE DEFAULT USERS ================= */

const createDefaultUsers = async () => {
  try {
    let admin = await User.findOne({ username: "admin" });
    if (!admin) {
      const hashed = await bcrypt.hash("1234", 10);
      await User.create({
        username: "admin",
        password: hashed,
        role: "admin"
      });
      console.log("✅ Admin created (admin / 1234)");
    }

    let worker = await User.findOne({ username: "worker" });
    if (!worker) {
      const hashed = await bcrypt.hash("1234", 10);
      await User.create({
        username: "worker",
        password: hashed,
        role: "worker"
      });
      console.log("✅ Worker created (worker / 1234)");
    }

  } catch (err) {
    console.log("❌ Error creating users:", err);
  }
};

/* ================= MIDDLEWARE ================= */

const auth = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

/* ================= AUTH ENDPOINTS ================= */

if (MONGO_URI) {
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await User.findOne({ username });

      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: "Wrong password" });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        SECRET,
        { expiresIn: "1d" }
      );

      res.json({
        token,
        role: user.role
      });

    } catch (err) {
      console.log("❌ LOGIN ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  });
} else {
  // Mount file-based api handlers (fallback for environments without MongoDB)
  const fileApiDir = path.join(__dirname, "..", "api");
  try {
    const fileLogin = require(path.join(fileApiDir, "login.js"));
    const fileChange = require(path.join(fileApiDir, "change-credentials.js"));
    const fileProducts = require(path.join(fileApiDir, "products.js"));
    const fileSell = require(path.join(fileApiDir, "sell.js"));
    const fileHistory = require(path.join(fileApiDir, "history.js"));

    app.post("/api/login", fileLogin);
    app.post("/api/change-credentials", fileChange);
    app.post("/api/products", fileProducts);
    app.get("/api/products", fileProducts);
    app.post("/api/sell", fileSell);
    app.get("/api/history", fileHistory);
    app.delete("/api/history/:stockType", fileHistory);
    console.log("✅ File-store API handlers mounted (no DB required)");
  } catch (err) {
    console.error("❌ Could not mount file-based API handlers:", err.message);
  }
}

// Helpful GET route for developers visiting the endpoint in a browser
app.get("/api/login", (req, res) => {
  res.status(200).json({ message: "This endpoint accepts POST with JSON {username, password}. Use POST to authenticate." });
});

app.post("/api/change-credentials", auth, async (req, res) => {
  const { currentUsername, currentPassword, newUsername, newPassword } = req.body;

  try {
    const user = await User.findOne({ username: currentUsername });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    if (newUsername) user.username = newUsername;

    if (newPassword) {
      const hashed = await bcrypt.hash(newPassword, 10);
      user.password = hashed;
    }

    await user.save();

    res.json({ message: "Credentials updated successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= PRODUCTS ENDPOINTS ================= */

app.post("/api/products", auth, adminOnly, async (req, res) => {
  try {
    const { name, stockType, quantity } = req.body;

    if (!name || !stockType || !quantity) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const product = new Product({ name, stockType, quantity });
    await product.save();

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Error creating product" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find({ quantity: { $gt: 0 } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Error fetching products" });
  }
});

/* ================= SALES ENDPOINTS ================= */

app.post("/api/sell", auth, async (req, res) => {
  try {
    const { id, price, quantity } = req.body;

    if (!id || !price || !quantity) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const product = await Product.findById(id);

    if (!product || product.quantity < quantity) {
      return res.status(400).json({ message: "Not enough stock" });
    }

    product.quantity -= quantity;

    const sale = new Sale({
      productName: product.name,
      stockType: product.stockType,
      price: Number(price),
      quantity: Number(quantity),
      date: new Date().toLocaleString()
    });

    await sale.save();

    if (product.quantity === 0) {
      await Product.findByIdAndDelete(product._id);
    } else {
      await product.save();
    }

    res.json({ message: "Sold successfully", sale });
  } catch (err) {
    res.status(500).json({ message: "Error processing sale" });
  }
});

/* ================= HISTORY ENDPOINTS ================= */

app.get("/api/history", auth, async (req, res) => {
  try {
    const history = await Sale.find();
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Error fetching history" });
  }
});

app.delete("/api/history/:stockType", auth, adminOnly, async (req, res) => {
  try {
    const { stockType } = req.params;

    await Sale.deleteMany({ stockType: Number(stockType) });

    res.json({ message: `Stock ${stockType} history cleared` });
  } catch (err) {
    res.status(500).json({ message: "Error clearing history" });
  }
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
