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
