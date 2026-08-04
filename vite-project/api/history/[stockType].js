import { readStore, writeStore, verifyToken, sendJson } from '../_lib/store.js';

export default async function handler(req, res) {
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return sendJson(res, 405, { message: 'Method not allowed' });
  }

  const token = req.headers.authorization;
  const decoded = verifyToken(token);

  if (!decoded || decoded.role !== 'admin') {
    return sendJson(res, 403, { message: 'Admin access required' });
  }

  const stockType = Number(req.query?.stockType ?? req.params?.stockType);
  const store = readStore();
  store.sales = store.sales.filter((item) => item.stockType !== stockType);
  writeStore(store);

  return sendJson(res, 200, { message: `Stock ${stockType} history cleared` });
}
