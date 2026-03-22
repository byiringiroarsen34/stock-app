require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const Sale = require("./models/sales");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

/* ================= ENV ================= */

const SECRET = process.env.JWT_SECRET || "fallbacksecret";
const MONGO_URI = process.env.MONGO_URI;

/* ================= DATABASE ================= */

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");
    await createDefaultUsers();
  })
  .catch(err => console.log("❌ DB ERROR:", err));

/* ================= MODELS ================= */

const User = mongoose.model("User", {
  username: String,
  password: String,
  role: String
});

const Product = mongoose.model("Product", {
  name: String,
  stockType: Number,
  quantity: Number
});

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

/* ================= CHANGE CREDENTIALS ================= */

app.post("/api/change-credentials", async (req, res) => {
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

/* ================= LOGIN ================= */

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

/* ================= AUTH ================= */

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

/* ================= PRODUCTS ================= */

app.post("/api/products", auth, async (req, res) => {
  const { name, stockType, quantity } = req.body;

  const product = new Product({ name, stockType, quantity });
  await product.save();

  res.json(product);
});

app.get("/api/products", async (req, res) => {
  const products = await Product.find({ quantity: { $gt: 0 } });
  res.json(products);
});

/* ================= SELL ================= */

app.post("/api/sell", async (req, res) => {
  const { id, price, quantity } = req.body;

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

  res.json({ message: "Sold successfully" });
});

/* ================= HISTORY ================= */

app.get("/api/history", auth, async (req, res) => {
  const history = await Sale.find();
  res.json(history);
});

app.delete("/api/history/:stockType", async (req, res) => {
  const { stockType } = req.params;

  await Sale.deleteMany({ stockType: Number(stockType) });

  res.json({ message: `Stock ${stockType} history cleared` });
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});