const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const MEMO_FILE = path.join(DATA_DIR, 'memos.json');

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function readMemos() {
  try {
    if (!fs.existsSync(MEMO_FILE)) return [];
    return JSON.parse(fs.readFileSync(MEMO_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeMemos(memos) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(MEMO_FILE, JSON.stringify(memos, null, 2));
}

function requireAdmin(req, res, next) {
  const key = process.env.ADMIN_KEY;
  if (!key) return res.status(503).json({ message: 'Admin access is not configured.' });
  if (req.get('x-admin-key') !== key) return res.status(401).json({ message: 'Unauthorized.' });
  next();
}

app.post('/api/memos', (req, res) => {
  const { answer1, answer2, answer3, answer4 } = req.body || {};
  const answers = [answer1, answer2, answer3, answer4].map(v => String(v ?? '').trim());
  if (answers.some(v => !v)) return res.status(400).json({ message: 'Please complete all fields.' });
  if (answers[0].length > 300 || answers[1].length > 300 || answers[2].length > 500 || answers[3].length > 5000) {
    return res.status(400).json({ message: 'One or more answers are too long.' });
  }

  const memos = readMemos();
  memos.push({
    id: crypto.randomUUID(),
    answer1: answers[0], answer2: answers[1], answer3: answers[2], answer4: answers[3],
    createdAt: new Date().toISOString()
  });
  writeMemos(memos);
  res.json({ success: true });
});

app.get('/api/memos', requireAdmin, (req, res) => {
  res.json(readMemos());
});

app.delete('/api/memos/:id', requireAdmin, (req, res) => {
  const memos = readMemos();
  const next = memos.filter(memo => memo.id !== req.params.id);
  if (next.length === memos.length) return res.status(404).json({ message: 'Submission not found.' });
  writeMemos(next);
  res.json({ success: true });
});

app.get('/health', (_req, res) => res.json({ ok: true, app: 'MEMO' }));

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'memo.html')));

app.listen(PORT, () => console.log(`MEMO running on port ${PORT}`));
