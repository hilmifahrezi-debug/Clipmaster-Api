const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');                 // CORS yang benar
const Queue = require('bull');                // Queue yang benar

const app = express();

app.use(cors());                              // IZINKAN frontend akses API
app.use(bodyParser.json());

// Redis queue setup
const jobs = new Queue('clip-jobs', process.env.REDIS_URL || 'redis://localhost:6379');

// Sementara pakai in-memory map untuk status (nanti bisa diganti DB)
const JOBS = {};

// Submit job
app.post('/submit', async (req, res) => {
  const { youtubeUrl, ownerConfirm } = req.body;

  if (!ownerConfirm) return res.status(400).json({ error: 'Harus konfirmasi izin' });
  if (!youtubeUrl) return res.status(400).json({ error: 'youtubeUrl required' });

  try {
    const job = await jobs.add({ youtubeUrl });
    JOBS[job.id] = { status: 'queued' };
    return res.json({ jobId: job.id });
  } catch (e) {
    console.error('Job error:', e);
    return res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

// Cek status job
app.get('/status/:id', (req, res) => {
  const id = req.params.id;
  const info = JOBS[id] || { status: 'unknown' };
  return res.json(info);
});

// Update dari worker
app.post('/worker-update/:id', (req, res) => {
  const id = req.params.id;
  JOBS[id] = req.body;
  return res.json({ ok: true });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API running on port', port));