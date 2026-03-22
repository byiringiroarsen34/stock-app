import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [tab, setTab] = useState("products");

  const [currency, setCurrency] = useState("RWF");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);

  const [selectedStock, setSelectedStock] = useState("");

  const [name, setName] = useState("");
  const [stockType, setStockType] = useState(1);
  const [quantity, setQuantity] = useState(1);

  const [prices, setPrices] = useState({});
  const [sellQty, setSellQty] = useState({}); // ✅ NEW

  const API = "https://your-backend.onrender.com/api";
  const token = localStorage.getItem("token");
  const [showChange, setShowChange] = useState(false);

const [currentUsername, setCurrentUsername] = useState("");
const [currentPassword, setCurrentPassword] = useState("");

const [newUsername, setNewUsername] = useState("");
const [newPassword, setNewPassword] = useState(""); 

const [page, setPage] = useState("login"); // login | change

  /* ================= FORMAT ================= */

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return currency === "RWF"
      ? `${Number(amount).toLocaleString()} RWF`
      : `$${Number(amount).toLocaleString()}`;
  };

  /* ================= LOGIN ================= */

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Fill all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API}/login`, {
        username,
        password
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      setRole(res.data.role);
    } catch {
      setError("Invalid credentials");
    }

    setLoading(false);
  };

  const logout = () => {
    localStorage.clear();
    setRole(null);
  };
  const changeCredentials = async () => {
  try {
    await axios.post(`${API}/change-credentials`, {
      currentUsername,
      currentPassword,
      newUsername,
      newPassword
    });

    alert("Updated successfully");
    setShowChange(false);
  } catch {
    alert("Wrong username or password");
  }
};

  /* ================= FETCH ================= */

  const fetchProducts = async () => {
    const res = await axios.get(`${API}/products`, {
      headers: { Authorization: token }
    });
    setProducts(res.data);
  };

  const fetchHistory = async () => {
    const res = await axios.get(`${API}/history`, {
      headers: { Authorization: token }
    });
    setHistory(res.data);
  };

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchHistory();
    }
  }, []);

  /* ================= ACTIONS ================= */

  const addProduct = async () => {
    if (!name || !quantity) return alert("Fill all fields");

    await axios.post(
      `${API}/products`,
      { name, stockType, quantity },
      { headers: { Authorization: token } }
    );

    setName("");
    setQuantity(1);
    fetchProducts();
  };

  const sellProduct = async (id) => {
    const price = prices[id];
    const quantity = sellQty[id];
    if (!price || !quantity) return alert("Enter price & quantity");

    await axios.post(`${API}/sell`, {
  id,
  price,
  quantity
});
    fetchProducts();
    fetchHistory();

    // ✅ AUTO REFRESH
    window.location.reload();
  };

 const clearHistory = async () => {
  if (!selectedStock) return alert("Select stock first");

  const confirmDelete = window.confirm(
    `Are you sure you want to clear all data in Stock ${selectedStock}?`
  );

  if (!confirmDelete) return; // ❌ user clicked NO

  await axios.delete(`${API}/history/${selectedStock}`, {
    headers: { Authorization: token }
  });

  fetchHistory();
};
  /* ================= LOGIN UI ================= */

  if (!role && page === "login") {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <h1 className="logo">Stock Manager</h1>
          <p className="subtitle">Manage your inventory smartly</p>

          {error && <div className="error-box">{error}</div>}

          <div className="input-group">
            <label>Username</label>
            <div className="input-box">
              <span>👤</span>
              <input
                type="text"
                placeholder="Enter username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-box">
              <span>🔒</span>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Enter password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <span onClick={() => setShowPass(!showPass)}>👁</span>
            </div>
          </div>

          <button
            className="login-btn"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? <div className="spinner"></div> : "Sign in"}
          </button>
          <button className="change-btn"
  style={{ marginTop: "10px" }}
  onClick={() => setPage("change")}
>
  Change Username / Password
</button>

        </div>
      </div>
    );
  }
  if (!role && page === "change") {
  return (
    <div className="login-wrapper">
      <div className="login-card change-page">
        <h1 className="logo">🔐 Change Credentials</h1>

        <div className="input-group">
          <label>Current Username</label>
          <div className="input-box">
            <span>👤</span>
            <input onChange={(e) => setCurrentUsername(e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label>Current Password</label>
          <div className="input-box">
            <span>🔒</span>
            <input type="password" onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label>New Username</label>
          <div className="input-box">
            <span>✨</span>
            <input onChange={(e) => setNewUsername(e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label>New Password</label>
          <div className="input-box">
            <span>🔑</span>
            <input type="password" onChange={(e) => setNewPassword(e.target.value)} />
          </div>
        </div>

        <button className="save-btn" onClick={changeCredentials}>
          💾 Save Changes
        </button>

        <button
          className="back-btn"
          onClick={() => setPage("login")}
        >
          ⬅ Back to Login
        </button>
      </div>
    </div>
  );
}

  /* ================= ADMIN ================= */

  if (role === "admin") {
    return (
      <div className="layout">
        <div className="sidebar">
          <h2>Admin</h2>
          <button onClick={() => setTab("products")}>Products</button>
          <button onClick={() => setTab("history")}>History</button>
          <button onClick={() => setCurrency(currency === "RWF" ? "USD" : "RWF")}>
            {currency}
          </button>
          <button className="logout" onClick={logout}>Logout</button>
        </div>

        <div className="content">
          {tab === "products" && (
            <>
              <div className="card">
                <h2>Add Product</h2>

                <div className="form-grid">
                  <input
                    placeholder="Product Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <select
                    value={stockType}
                    onChange={(e) => setStockType(Number(e.target.value))}
                  >
                    <option value={1}>Stock 1</option>
                    <option value={2}>Stock 2</option>
                  </select>

                  <input
                    type="number"
                    placeholder="Quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />

                  <button className="add-btn" onClick={addProduct}>
                    ➕ Add Product
                  </button>
                </div>
              </div>

              <div className="card">
                <h2>Stock Table</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Stock</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p._id}>
                        <td>{p.name}</td>
                        <td>{p.stockType}</td>
                        <td>
                          {p.quantity}
                          {p.quantity <= 2 && (
                            <span style={{ color: "red", fontWeight: "bold", marginLeft: "5px" }}>
                              ⚠ Low
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "history" && (
            <div className="card">
              <h2>Sales History</h2>

              <div className="history-controls">
                <select
                  className="select-stock"
                  value={selectedStock}
                  onChange={(e) => setSelectedStock(Number(e.target.value))}
                >
                  <option value="">Select Stock</option>
                  <option value={1}>Stock 1</option>
                  <option value={2}>Stock 2</option>
                </select>

                <button className="danger" onClick={clearHistory}>
                  🗑 Clear
                </button>
              </div>

              {selectedStock && (
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Stock</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history
                      .filter(h => h.stockType === selectedStock)
                      .map((h, i) => (
                        <tr key={i}>
                          <td>{h.productName}</td>
                          <td>{h.stockType}</td>
                          <td>{formatCurrency(h.price)}</td>
                          <td>{h.quantity}</td>
                          <td>{h.date}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ================= WORKER ================= */

  if (role === "worker") {
    return (
      <div className="layout">
        <div className="sidebar">
          <h2>Worker</h2>
          <button onClick={() => setTab("view")}>View</button>
          <button onClick={() => setTab("sell")}>Sell</button>
          <button className="logout" onClick={logout}>Logout</button>
        </div>

        <div className="content">
          {tab === "view" && (
            <div className="card">
              <h2>Products</h2>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Stock</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td>{p.stockType}</td>
                      <td>{p.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "sell" && (
            <div className="card">
              <h2>Sell Product</h2>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Stock</th>
                    <th>Available</th>
                    <th>Sell Qty</th>
                    <th>Price</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td>{p.stockType}</td>
                      <td>{p.quantity}</td>

                      {/* ✅ INPUT QUANTITY */}
                      <td>
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          style={{ width: "60px" }}
                          onChange={(e) =>
                            setSellQty({ ...sellQty, [p._id]: e.target.value })
                          }
                        />
                      </td>

                      {/* PRICE */}
                      <td>
                        <input
                          type="number"
                          placeholder="Price"
                          onChange={(e) =>
                            setPrices({ ...prices, [p._id]: e.target.value })
                          }
                        />
                      </td>

                      <td>
                        <button
                          disabled={p.quantity === 0}
                          onClick={() => sellProduct(p._id)}
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default App;