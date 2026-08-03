const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'fallbacksecret';
const storeDir = path.join(os.tmpdir(), 'stock-app-backend');
const storePath = process.env.STORE_PATH || path.join(storeDir, '.store.json');

const defaultStore = {
  users: [
    { username: 'admin', password: '1234', role: 'admin' },
    { username: 'worker', password: '1234', role: 'worker' }
  ],
  products: [],
  sales: []
};

function ensureStoreDirectory() {
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }
}

function ensureStore() {
  ensureStoreDirectory();

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(defaultStore, null, 2), 'utf8');
  }

  return JSON.parse(fs.readFileSync(storePath, 'utf8'));
}

function readStore() {
  return ensureStore();
}

function writeStore(state) {
  ensureStoreDirectory();
  fs.writeFileSync(storePath, JSON.stringify(state, null, 2), 'utf8');
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (!req.body) {
      resolve({});
      return;
    }

    if (typeof req.body === 'object') {
      resolve(req.body);
      return;
    }

    try {
      resolve(JSON.parse(req.body));
    } catch (error) {
      reject(error);
    }
  });
}

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function createToken(user) {
  const payload = {
    username: user.username,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
  if (!token) return null;

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return decoded.exp && decoded.exp > Date.now() ? decoded : null;
  } catch {
    return null;
  }
}

async function login(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { message: 'Method not allowed' });
  }

  try {
    const body = await parseJsonBody(req);
    const { username, password } = body;
    const store = readStore();
    const user = store.users.find((item) => item.username === username);

    if (!user || user.password !== password) {
      return sendJson(res, 400, { message: 'Invalid credentials' });
    }

    const token = createToken(user);
    return sendJson(res, 200, { token, role: user.role });
  } catch (error) {
    return sendJson(res, 500, { message: 'Server error', error: error.message });
  }
}

async function changeCredentials(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { message: 'Method not allowed' });
  }

  try {
    const body = await parseJsonBody(req);
    const token = req.headers.authorization;
    const decoded = verifyToken(token);

    if (!decoded) {
      return sendJson(res, 401, { message: 'Unauthorized' });
    }

    const store = readStore();
    const user = store.users.find((item) => item.username === body.currentUsername);

    if (!user || user.password !== body.currentPassword) {
      return sendJson(res, 400, { message: 'Wrong username or password' });
    }

    if (body.newUsername) {
      user.username = body.newUsername;
    }
    if (body.newPassword) {
      user.password = body.newPassword;
    }

    writeStore(store);
    return sendJson(res, 200, { message: 'Credentials updated successfully' });
  } catch (error) {
    return sendJson(res, 500, { message: 'Server error', error: error.message });
  }
}

async function products(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(200).end();
  }

  const store = readStore();

  if (req.method === 'GET') {
    return sendJson(res, 200, store.products.filter((product) => product.quantity > 0));
  }

  if (req.method === 'POST') {
    const token = req.headers.authorization;
    const decoded = verifyToken(token);

    if (!decoded) {
      return sendJson(res, 401, { message: 'Unauthorized' });
    }

    if (decoded.role !== 'admin') {
      return sendJson(res, 403, { message: 'Admin access required' });
    }

    try {
      const body = await parseJsonBody(req);
      const { name, stockType, quantity } = body;

      if (!name || !stockType || !quantity) {
        return sendJson(res, 400, { message: 'Missing required fields' });
      }

      const product = { id: `${Date.now()}`, name, stockType, quantity: Number(quantity) };
      store.products.push(product);
      writeStore(store);
      return sendJson(res, 200, product);
    } catch (error) {
      return sendJson(res, 500, { message: 'Server error', error: error.message });
    }
  }

  return sendJson(res, 405, { message: 'Method not allowed' });
}

async function sell(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization;
    const decoded = verifyToken(token);

    if (!decoded) {
      return sendJson(res, 401, { message: 'Unauthorized' });
    }

    const body = await parseJsonBody(req);
    const { id, price, quantity } = body;
    const store = readStore();
    const product = store.products.find((item) => item.id === id);

    if (!product || product.quantity < quantity) {
      return sendJson(res, 400, { message: 'Not enough stock' });
    }

    product.quantity -= Number(quantity);
    const sale = {
      id: `${Date.now()}`,
      productName: product.name,
      stockType: product.stockType,
      price: Number(price),
      quantity: Number(quantity),
      soldAt: new Date().toISOString()
    };

    store.sales.push(sale);
    writeStore(store);
    return sendJson(res, 200, { message: 'Sold successfully', sale });
  } catch (error) {
    return sendJson(res, 500, { message: 'Server error', error: error.message });
  }
}

async function history(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { message: 'Method not allowed' });
  }

  const token = req.headers.authorization;
  const decoded = verifyToken(token);

  if (!decoded) {
    return sendJson(res, 401, { message: 'Unauthorized' });
  }

  const store = readStore();
  return sendJson(res, 200, store.sales);
}

async function clearHistory(req, res) {
  if (req.method !== 'DELETE') {
    return sendJson(res, 405, { message: 'Method not allowed' });
  }

  const token = req.headers.authorization;
  const decoded = verifyToken(token);

  if (!decoded) {
    return sendJson(res, 401, { message: 'Unauthorized' });
  }

  if (decoded.role !== 'admin') {
    return sendJson(res, 403, { message: 'Admin access required' });
  }

  try {
    const store = readStore();
    const stockType = req.params.stockType;
    store.sales = store.sales.filter((sale) => sale.stockType !== stockType);
    writeStore(store);
    return sendJson(res, 200, { message: `Stock ${stockType} history cleared` });
  } catch (error) {
    return sendJson(res, 500, { message: 'Server error', error: error.message });
  }
}

module.exports = {
  login,
  changeCredentials,
  products,
  sell,
  history,
  clearHistory
};
