import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootStorePath = path.join(__dirname, '..', '.store.json');
const tmpStorePath = path.join(os.tmpdir(), 'stock-app-api', '.store.json');

function isWritableDirectory(directory) {
  try {
    fs.accessSync(directory, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

const storePath = process.env.STORE_PATH || (isWritableDirectory(path.dirname(rootStorePath)) ? rootStorePath : tmpStorePath);

const defaultStore = {
  users: [
    { username: 'admin', password: '1234', role: 'admin' },
    { username: 'worker', password: '1234', role: 'worker' }
  ],
  products: [],
  sales: []
};

function ensureStoreDirectory(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function ensureStore() {
  const directory = path.dirname(storePath);
  ensureStoreDirectory(directory);

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(defaultStore, null, 2));
  }

  return JSON.parse(fs.readFileSync(storePath, 'utf8'));
}

export function readStore() {
  return ensureStore();
}

export function writeStore(state) {
  const directory = path.dirname(storePath);
  ensureStoreDirectory(directory);
  fs.writeFileSync(storePath, JSON.stringify(state, null, 2));
}

export function createToken(user) {
  const payload = {
    username: user.username,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifyToken(token) {
  if (!token) return null;

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return decoded.exp && decoded.exp > Date.now() ? decoded : null;
  } catch {
    return null;
  }
}

export function parseJsonBody(req) {
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

export function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}
