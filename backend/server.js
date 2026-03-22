const Sale = require("./models/Sales");
const express = require("express"); 

const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "mysecretkey";

/* ================= DATABASE ================= */

mongoose.connect("mongodb+srv://byiringiroarsen34_db_user:kizito890.@cluster0.udqecpv.mongodb.net/?appName=Cluster0")
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
    // ADMIN
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

    // WORKER
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
// CHANGE USERNAME & PASSWORD
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

    // UPDATE
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
/* ================= AUTH ================= */

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("LOGIN ATTEMPT:", username);

    const user = await User.findOne({ username });

    if (!user) {
      console.log("❌ User not found");
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("❌ Wrong password");
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      SECRET,
      { expiresIn: "1d" }
    );

    console.log("✅ Login success:", user.role);

    res.json({
      token,
      role: user.role
    });

  } catch (err) {
    console.log("❌ LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

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

/* ================= API ================= */

// ADD PRODUCT
app.post("/api/products", auth, async (req, res) => {
  const { name, stockType, quantity } = req.body;

  const product = new Product({ name, stockType, quantity });
  await product.save();

  res.json(product);
});

// GET PRODUCTS
app.get("/api/products", async (req, res) => {
  const products = await Product.find({ quantity: { $gt: 0 } });
  res.json(products);
});

// SELL PRODUCT
app.post("/api/sell", async (req, res) => {
  const { id, price, quantity } = req.body;

  const product = await Product.findById(id);

  // ❌ prevent invalid
  if (!product || product.quantity < quantity) {
    return res.status(400).json({ message: "Not enough stock" });
  }

  // ✅ reduce stock
  product.quantity -= quantity;

  // ✅ SAVE EXACT QUANTITY SOLD
  const sale = new Sale({
    productName: product.name,
    stockType: product.stockType,
    price: Number(price),
    quantity: Number(quantity), // ⭐ VERY IMPORTANT
    date: new Date().toLocaleString()
  });

  await sale.save();

  // ✅ remove if empty
  if (product.quantity === 0) {
    await Product.findByIdAndDelete(product._id);
  } else {
    await product.save();
  }

  res.json({ message: "Sold successfully" });
});
// GET HISTORY
app.get("/api/history", auth, async (req, res) => {
  const history = await Sale.find();
  res.json(history);
});


// CLEAR HISTORY
app.delete("/api/history/:stockType", async (req, res) => {
  const { stockType } = req.params;

  await Sale.deleteMany({ stockType: Number(stockType) });

  res.json({ message: `Stock ${stockType} history cleared` });
});

/* ================= SERVER ================= */

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});