// server.js - simple Express API (skeleton)
const express = require('express');
const bodyParser = require('body-parser');
const Queue = require('bull');
const app = express();
app.use(bodyParser.json());
const jobs = new Queue('clip-jobs', process.env.REDIS_URL || 'redis://localhost:6379');

// simple in-memory map for demo (replace with DB in production)
const JOBS = {};

app.post('/submit', async (req, res) => {
  const { youtubeUrl, ownerConfirm } = req.body;
  if(!ownerConfirm) return res.status(400).json({error:'Harus konfirmasi izin'});
  if(!youtubeUrl) return res.status(400).json({error:'youtubeUrl required'});
  const job = await jobs.add({ youtubeUrl });
  JOBS[job.id] = { status: 'queued' };
  return res.json({ jobId: job.id });
});

app.get('/status/:id', async (req, res) => {
  const id = req.params.id;
  const info = JOBS[id] || { status: 'unknown' };
  return res.json(info);
});

// simple webhook from worker (for demo)
app.post('/worker-update/:id', (req, res) => {
  const id = req.params.id;
  JOBS[id] = req.body;
  return res.json({ ok:true });
});

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log('API running on', port));
