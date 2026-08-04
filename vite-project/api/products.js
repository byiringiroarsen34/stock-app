import { readStore, writeStore, verifyToken, parseJsonBody, sendJson } from './_lib/store.js';

export default async function handler(req, res) {
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = req.headers.authorization;
  const decoded = verifyToken(token);

  if (!decoded) {
    return sendJson(res, 401, { message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const store = readStore();
    return sendJson(res, 200, store.products.filter((product) => product.quantity > 0));
  }

  if (req.method === 'POST') {
    if (decoded.role !== 'admin') {
      return sendJson(res, 403, { message: 'Admin access required' });
    }

    try {
      const body = await parseJsonBody(req);
      const store = readStore();

      if (!body.name || !body.stockType || !body.quantity) {
        return sendJson(res, 400, { message: 'Missing required fields' });
      }

      const product = {
        _id: `${Date.now()}`,
        name: body.name,
        stockType: Number(body.stockType),
        quantity: Number(body.quantity)
      };

      store.products.push(product);
      writeStore(store);

      return sendJson(res, 200, product);
    } catch (error) {
      return sendJson(res, 500, { message: 'Server error', error: error.message });
    }
  }

  return sendJson(res, 405, { message: 'Method not allowed' });
}
