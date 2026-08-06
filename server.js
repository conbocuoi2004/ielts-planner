// app.js — IELTS Study Planner
// Express server: phục vụ giao diện (public/) + REST API (/api/...)

const express = require('express');
const path = require('path');
const { load, save, newId } = require('./store');

const app = express();
app.use(express.json());                      // đọc JSON body
app.use(express.static(path.join(__dirname, 'public'))); // phục vụ frontend

// ---------- Health check (Kubernetes sẽ dùng ở Bước 6) ----------
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ---------- TASKS: việc cần làm ----------
app.get('/api/tasks', (req, res) => {
  res.json(load().tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, due, skill } = req.body;
  if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề việc cần làm' });
  const db = load();
  const task = { id: newId('t'), title, due: due || null, skill: skill || null, done: false };
  db.tasks.push(task);
  save(db);
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const db = load();
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy task' });
  Object.assign(task, req.body);
  save(db);
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const db = load();
  db.tasks = db.tasks.filter((t) => t.id !== req.params.id);
  save(db);
  res.status(204).end();
});

// ---------- SCHEDULE: lịch học trong tuần ----------
app.get('/api/schedule', (req, res) => {
  res.json(load().schedule);
});

app.post('/api/schedule', (req, res) => {
  const { day, start, end, title, skill } = req.body;
  if (day === undefined || !start || !title) {
    return res.status(400).json({ error: 'Cần có: day (0-6), start, title' });
  }
  const db = load();
  const item = { id: newId('s'), day: Number(day), start, end: end || '', title, skill: skill || null };
  db.schedule.push(item);
  save(db);
  res.status(201).json(item);
});

app.delete('/api/schedule/:id', (req, res) => {
  const db = load();
  db.schedule = db.schedule.filter((s) => s.id !== req.params.id);
  save(db);
  res.status(204).end();
});

// ---------- FLASHCARDS: hệ Leitner (spaced repetition) ----------
// Hộp 1 → ôn ngay hôm nay; hộp càng cao, càng lâu mới phải ôn lại.
const BOX_INTERVAL_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

app.get('/api/decks', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const decks = load().decks.map((d) => ({
    id: d.id,
    name: d.name,
    total: d.cards.length,
    due: d.cards.filter((c) => c.nextReview <= today).length,
  }));
  res.json(decks);
});

app.post('/api/decks', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Thiếu tên bộ thẻ' });
  const db = load();
  const deck = { id: newId('d'), name, cards: [] };
  db.decks.push(deck);
  save(db);
  res.status(201).json(deck);
});

app.post('/api/decks/:id/cards', (req, res) => {
  const { front, back, example } = req.body;
  if (!front || !back) return res.status(400).json({ error: 'Thẻ cần có mặt trước và mặt sau' });
  const db = load();
  const deck = db.decks.find((d) => d.id === req.params.id);
  if (!deck) return res.status(404).json({ error: 'Không tìm thấy bộ thẻ' });
  const card = {
    id: newId('c'),
    front,
    back,
    example: example || '',
    box: 1,
    nextReview: new Date().toISOString().slice(0, 10),
  };
  deck.cards.push(card);
  save(db);
  res.status(201).json(card);
});

// Lấy các thẻ đến hạn ôn hôm nay
app.get('/api/decks/:id/due', (req, res) => {
  const deck = load().decks.find((d) => d.id === req.params.id);
  if (!deck) return res.status(404).json({ error: 'Không tìm thấy bộ thẻ' });
  const today = new Date().toISOString().slice(0, 10);
  res.json(deck.cards.filter((c) => c.nextReview <= today));
});

// Chấm kết quả ôn 1 thẻ: nhớ → lên hộp, quên → về hộp 1
app.post('/api/cards/:id/review', (req, res) => {
  const { correct } = req.body;
  const db = load();
  for (const deck of db.decks) {
    const card = deck.cards.find((c) => c.id === req.params.id);
    if (card) {
      card.box = correct ? Math.min(card.box + 1, 5) : 1;
      const today = new Date().toISOString().slice(0, 10);
      card.nextReview = addDays(today, BOX_INTERVAL_DAYS[card.box]);
      save(db);
      return res.json(card);
    }
  }
  res.status(404).json({ error: 'Không tìm thấy thẻ' });
});

// ---------- 4 KỸ NĂNG: nhật ký luyện tập ----------
app.get('/api/logs', (req, res) => {
  res.json(load().logs);
});

app.post('/api/logs', (req, res) => {
  const { skill, minutes, note } = req.body;
  const valid = ['listening', 'reading', 'writing', 'speaking'];
  if (!valid.includes(skill)) return res.status(400).json({ error: 'skill phải là 1 trong 4 kỹ năng' });
  if (!minutes || minutes <= 0) return res.status(400).json({ error: 'minutes phải > 0' });
  const db = load();
  const log = {
    id: newId('l'),
    skill,
    minutes: Number(minutes),
    note: note || '',
    date: new Date().toISOString().slice(0, 10),
  };
  db.logs.push(log);
  save(db);
  res.status(201).json(log);
});

// Tổng hợp: tổng phút luyện mỗi kỹ năng trong 7 ngày gần nhất
app.get('/api/logs/summary', (req, res) => {
  const cutoff = addDays(new Date().toISOString().slice(0, 10), -7);
  const summary = { listening: 0, reading: 0, writing: 0, speaking: 0 };
  for (const log of load().logs) {
    if (log.date >= cutoff && summary[log.skill] !== undefined) {
      summary[log.skill] += log.minutes;
    }
  }
  res.json(summary);
});

// ---------- Khởi động ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`IELTS Planner đang chạy tại http://localhost:${PORT}`);
});
