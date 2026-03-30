const http = require('http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { setupWebSocket } = require('./ws/broadcast');
const { startTimerLoop } = require('./services/timerService');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Rate limit bid placement: max 10 bids per 10 seconds per IP
const bidLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many bids, please slow down.' },
});
app.use('/api/v1/bids', bidLimiter);

app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/teams', require('./routes/teams'));
app.use('/api/v1/bids',  require('./routes/bids'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/stats', require('./routes/stats'));

app.get('/api/v1/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
setupWebSocket(server);
startTimerLoop();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`API listening on :${PORT}`));
