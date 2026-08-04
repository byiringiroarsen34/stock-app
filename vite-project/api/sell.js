import { readStore, writeStore, verifyToken, parseJsonBody, sendJson } from './_lib/store.js';

export default async function handler(req, res) {
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { message: 'Method not allowed' });
  }

  const token = req.headers.authorization;
  const decoded = verifyToken(token);

  if (!decoded) {
    return sendJson(res, 401, { message: 'Unauthorized' });
  }

  try {
    const body = await parseJsonBody(req);
    const store = readStore();
    const product = store.products.find((item) => item._id === body.id);

    if (!product || product.quantity < Number(body.quantity)) {
      return sendJson(res, 400, { message: 'Not enough stock' });
    }

    product.quantity -= Number(body.quantity);

    const sale = {
      _id: `${Date.now()}`,
      productName: product.name,
      stockType: product.stockType,
      price: Number(body.price),
      quantity: Number(body.quantity),
      date: new Date().toLocaleString()
    };

    store.sales.push(sale);

    if (product.quantity === 0) {
      store.products = store.products.filter((item) => item._id !== product._id);
    }

    writeStore(store);

    return sendJson(res, 200, { message: 'Sold successfully', sale });
  } catch (error) {
    return sendJson(res, 500, { message: 'Server error', error: error.message });
  }
}
