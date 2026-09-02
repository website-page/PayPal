const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "students.json");
const MEMO_FILE = path.join(DATA_DIR, "memos.json");
const sessions = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([
      {
        email: "student@example.test",
        schoolName: "PolePlus Demo School",
        seatNumber: "1234",
        favouriteFood: "Rice"
      }
    ], null, 2));
  }
  if (!fs.existsSync(MEMO_FILE)) {
    fs.writeFileSync(MEMO_FILE, "[]");
  }
}

function readStudents() {
  ensureData();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeStudents(students) {
  ensureData();
  fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2));
}

function readMemos() {
  ensureData();
  return JSON.parse(fs.readFileSync(MEMO_FILE, "utf8"));
}

function writeMemos(memos) {
  ensureData();
  fs.writeFileSync(MEMO_FILE, JSON.stringify(memos, null, 2));
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function auth(req, res, next) {
  const header = req.get("authorization") || "";
  const value = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = sessions.get(value);

  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ ok: false, message: "Session expired. Please start again." });
  }

  req.session = session;
  req.token = value;
  next();
}

app.post("/api/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const schoolName = String(req.body.schoolName || "").trim().toLowerCase();

  if (!email || !schoolName) {
    return res.status(400).json({ ok: false, message: "Enter your student email and school name." });
  }

  const student = readStudents().find(item =>
    item.email.toLowerCase() === email && item.schoolName.toLowerCase() === schoolName
  );

  if (!student) {
    return res.status(401).json({ ok: false, message: "Demo details not recognized." });
  }

  const token = makeToken();
  sessions.set(token, {
    email: student.email,
    expiresAt: Date.now() + 15 * 60 * 1000,
    seatVerified: false
  });

  res.json({ ok: true, token });
});

app.post("/api/verify-seat", auth, (req, res) => {
  const seatNumber = String(req.body.seatNumber || "").trim();

  if (!/^\d{4}$/.test(seatNumber)) {
    return res.status(400).json({ ok: false, message: "Seat number must contain exactly 4 digits." });
  }

  const student = readStudents().find(item => item.email.toLowerCase() === req.session.email.toLowerCase());
  if (!student || student.seatNumber !== seatNumber) {
    return res.status(401).json({ ok: false, message: "Seat number does not match the demo record." });
  }

  req.session.seatVerified = true;
  res.json({ ok: true });
});

app.post("/api/reset-food", auth, (req, res) => {
  if (!req.session.seatVerified) {
    return res.status(403).json({ ok: false, message: "Verify your seat number first." });
  }

  const food = String(req.body.food || "").trim();
  const confirmFood = String(req.body.confirmFood || "").trim();

  if (!food || food.length < 2) {
    return res.status(400).json({ ok: false, message: "Enter a favourite food." });
  }
  if (food.toLowerCase() !== confirmFood.toLowerCase()) {
    return res.status(400).json({ ok: false, message: "The food entries do not match." });
  }

  const students = readStudents();
  const index = students.findIndex(item => item.email.toLowerCase() === req.session.email.toLowerCase());
  if (index === -1) return res.status(404).json({ ok: false, message: "Demo record not found." });

  students[index].favouriteFood = food;
  writeStudents(students);
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  sessions.delete(token);
  res.json({ ok: true });
});

// MEMO form backend. Submissions are stored server-side in data/memos.json.
app.post("/api/memos", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const subject = String(req.body.subject || "").trim();
  const message = String(req.body.message || "").trim();

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ ok: false, message: "Please complete all fields." });
  }

  if (name.length > 100 || email.length > 160 || subject.length > 160 || message.length > 5000) {
    return res.status(400).json({ ok: false, message: "One or more fields are too long." });
  }

  const memos = readMemos();
  const record = {
    id: crypto.randomUUID(),
    name,
    email,
    subject,
    message,
    createdAt: new Date().toISOString()
  };

  memos.unshift(record);
  writeMemos(memos);

  res.status(201).json({ ok: true, message: "Your memo has been sent.", id: record.id });
});

app.get("/api/memos", (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return res.status(503).json({ ok: false, message: "Admin access is not configured. Set ADMIN_KEY on the server." });
  }

  if (req.get("x-admin-key") !== adminKey) {
    return res.status(401).json({ ok: false, message: "Unauthorized." });
  }

  res.json({ ok: true, memos: readMemos() });
});

app.get("/health", (_req, res) => res.json({ ok: true, app: "PolePlus + Memo" }));

app.listen(PORT, () => {
  console.log(`PolePlus + Memo running on port ${PORT}`);
});
