// User auth: validates Bearer token against users.token column
const { pool } = require('../db');

async function userAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { rows } = await pool.query(
    'SELECT id, name, email FROM users WHERE token = $1',
    [token]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid token' });

  req.user = rows[0];
  next();
}

// Admin auth: validates Bearer token against ADMIN_PASSWORD env var
function adminAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { userAuth, adminAuth };
