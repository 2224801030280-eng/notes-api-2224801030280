const express = require('express');
const os = require('os');
const mongoose = require('mongoose');
const notesRouter = require('./routes/notes');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Xin chào từ đám mây!',
    host: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    cpus: os.cpus().length,
    memoryGB: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
    uptimeSec: Math.round(os.uptime()),
    time: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = states[mongoose.connection.readyState] || 'unknown';
  res.status(dbState === 'connected' ? 200 : 503).json({
    status: dbState === 'connected' ? 'ok' : 'degraded',
    database: dbState,
    time: new Date().toISOString()
  });
});

app.use('/notes', notesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  const clientError = ['ValidationError', 'CastError'].includes(err.name)
    || ['LIMIT_FILE_SIZE', 'INVALID_FILE_TYPE'].includes(err.code)
    || err.type === 'entity.parse.failed'
    || err.status === 400;
  res.status(clientError ? 400 : 500).json({ error: err.message });
});

module.exports = app;
