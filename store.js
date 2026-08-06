// store.js — "Database" đơn giản bằng file JSON.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function seed() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    tasks: [
      { id: 't1', title: 'Làm 1 đề Reading passage 2', due: today, skill: 'reading', done: false },
      { id: 't2', title: 'Học 15 từ vựng chủ đề Environment', due: today, skill: 'vocab', done: false },
      { id: 't3', title: 'Shadowing 10 phút — BBC 6 Minute English', due: today, skill: 'listening', done: true },
    ],
    schedule: [
      { id: 's1', day: 1, start: '19:00', end: '20:00', title: 'Listening — Cam 18 Test 1', skill: 'listening' },
      { id: 's2', day: 2, start: '19:00', end: '20:00', title: 'Reading — True/False/NG', skill: 'reading' },
      { id: 's3', day: 3, start: '19:00', end: '20:30', title: 'Writing Task 2 — Opinion essay', skill: 'writing' },
      { id: 's4', day: 4, start: '19:00', end: '19:45', title: 'Speaking Part 2 — cue cards', skill: 'speaking' },
      { id: 's5', day: 6, start: '09:00', end: '11:00', title: 'Full mock test', skill: 'reading' },
    ],
    decks: [
      {
        id: 'd1',
        name: 'Academic Vocabulary — Band 7+',
        cards: [
          { id: 'c1', front: 'mitigate', back: 'giảm nhẹ, làm dịu bớt', example: 'Planting trees helps mitigate climate change.', box: 1, nextReview: today },
          { id: 'c2', front: 'phenomenon', back: 'hiện tượng', example: 'Urbanisation is a global phenomenon.', box: 1, nextReview: today },
          { id: 'c3', front: 'controversial', back: 'gây tranh cãi', example: 'Animal testing remains a controversial issue.', box: 1, nextReview: today },
          { id: 'c4', front: 'inevitable', back: 'không thể tránh khỏi', example: 'Technological change is inevitable.', box: 1, nextReview: today },
          { id: 'c5', front: 'substantial', back: 'đáng kể, lớn', example: 'There has been a substantial increase in demand.', box: 1, nextReview: today },
          { id: 'c6', front: 'deteriorate', back: 'xấu đi, suy giảm', example: 'Air quality has deteriorated in many cities.', box: 1, nextReview: today },
          { id: 'c7', front: 'allocate', back: 'phân bổ', example: 'Governments should allocate more funds to education.', box: 1, nextReview: today },
          { id: 'c8', front: 'compulsory', back: 'bắt buộc', example: 'School uniforms are compulsory in Vietnam.', box: 1, nextReview: today },
        ],
      },
      {
        id: 'd2',
        name: 'Writing — Linking words',
        cards: [
          { id: 'c9', front: 'Nevertheless', back: 'Tuy nhiên (trang trọng hơn However)', example: 'Nevertheless, the benefits outweigh the drawbacks.', box: 1, nextReview: today },
          { id: 'c10', front: 'Consequently', back: 'Do đó, kết quả là', example: 'Consequently, unemployment rates fell sharply.', box: 1, nextReview: today },
          { id: 'c11', front: 'Furthermore', back: 'Hơn nữa', example: 'Furthermore, remote work reduces commuting time.', box: 1, nextReview: today },
          { id: 'c12', front: 'In contrast', back: 'Ngược lại', example: 'In contrast, rural areas saw little change.', box: 1, nextReview: today },
          { id: 'c13', front: 'Provided that', back: 'Miễn là, với điều kiện', example: 'Provided that funding is available, the project will proceed.', box: 1, nextReview: today },
        ],
      },
    ],
    logs: [
      { id: 'l1', skill: 'listening', date: today, minutes: 30, note: 'Cam 18 Test 1 — 32/40' },
    ],
  };
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(seed(), null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

module.exports = { load, save, newId };