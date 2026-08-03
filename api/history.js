const { readStore, verifyToken, sendJson } = require('./_lib/store');

module.exports = async function handler(req, res) {
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
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
    return sendJson(res, 200, store.sales);
  }

  return sendJson(res, 405, { message: 'Method not allowed' });
};
