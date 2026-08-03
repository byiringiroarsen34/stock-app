const { readStore, createToken, parseJsonBody, sendJson } = require('./_lib/store');

module.exports = async function handler(req, res) {
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }

  if (req.method === 'OPTIONS') {
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
};
