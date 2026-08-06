// public/app.js — logic giao diện. Gọi API bằng fetch(), không framework.

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const SKILL_COLORS = {
  listening: '#6c5ce7',
  reading: '#0fa36b',
  writing: '#e8930c',
  speaking: '#e4572e',
};
const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
  return data;
}

/* ==================== TABS ==================== */
$$('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.tab').forEach((b) => b.classList.remove('active'));
    $$('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    $('#tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ==================== TASKS ==================== */
async function renderTasks() {
  const tasks = await api('/api/tasks');
  const list = $('#task-list');
  list.innerHTML = '';
  if (tasks.length === 0) {
    list.innerHTML = '<li class="hint">Chưa có việc nào — thêm việc đầu tiên ở trên nhé.</li>';
    return;
  }
  for (const t of tasks) {
    const li = document.createElement('li');
    if (t.done) li.classList.add('done');
    li.innerHTML = `
      <input type="checkbox" ${t.done ? 'checked' : ''} aria-label="Hoàn thành" />
      <span class="task-title">${escapeHtml(t.title)}</span>
      ${t.skill ? `<span class="badge ${t.skill}">${t.skill}</span>` : ''}
      <button class="del-btn" aria-label="Xóa">✕</button>
    `;
    li.querySelector('input').addEventListener('change', async (e) => {
      await api('/api/tasks/' + t.id, { method: 'PATCH', body: JSON.stringify({ done: e.target.checked }) });
      renderTasks();
    });
    li.querySelector('.del-btn').addEventListener('click', async () => {
      await api('/api/tasks/' + t.id, { method: 'DELETE' });
      renderTasks();
    });
    list.appendChild(li);
  }
}

$('#task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('#task-title').value.trim();
  if (!title) return;
  await api('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, skill: $('#task-skill').value || null }),
  });
  $('#task-title').value = '';
  renderTasks();
});

/* ==================== POMODORO ==================== */
const POMO_SECONDS = 25 * 60;
let pomoLeft = POMO_SECONDS;
let pomoTimer = null;
let pomoCount = 0;

function renderPomo() {
  const m = String(Math.floor(pomoLeft / 60)).padStart(2, '0');
  const s = String(pomoLeft % 60).padStart(2, '0');
  $('#pomo-time').textContent = `${m}:${s}`;
}

$('#pomo-start').addEventListener('click', () => {
  if (pomoTimer) {
    clearInterval(pomoTimer);
    pomoTimer = null;
    $('#pomo-start').textContent = 'Tiếp tục';
    return;
  }
  $('#pomo-start').textContent = 'Tạm dừng';
  pomoTimer = setInterval(() => {
    pomoLeft--;
    renderPomo();
    if (pomoLeft <= 0) {
      clearInterval(pomoTimer);
      pomoTimer = null;
      pomoCount++;
      $('#pomo-count').textContent = pomoCount;
      pomoLeft = POMO_SECONDS;
      renderPomo();
      $('#pomo-start').textContent = 'Bắt đầu';
      alert('🎉 Hết phiên 25 phút! Nghỉ 5 phút rồi ghi nhật ký luyện tập nhé.');
    }
  }, 1000);
});

$('#pomo-reset').addEventListener('click', () => {
  clearInterval(pomoTimer);
  pomoTimer = null;
  pomoLeft = POMO_SECONDS;
  renderPomo();
  $('#pomo-start').textContent = 'Bắt đầu';
});

/* ==================== SUMMARY (7 ngày) ==================== */
async function renderSummary() {
  const summary = await api('/api/logs/summary');
  const max = Math.max(60, ...Object.values(summary));
  const wrap = $('#summary-bars');
  wrap.innerHTML = '';
  for (const [skill, mins] of Object.entries(summary)) {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <span class="bar-label">${skill}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(mins / max) * 100}%;background:${SKILL_COLORS[skill]}"></div></div>
      <span class="bar-min">${mins} phút</span>
    `;
    wrap.appendChild(row);
  }
}

/* ==================== SCHEDULE ==================== */
async function renderSchedule() {
  const items = await api('/api/schedule');
  const grid = $('#week-grid');
  grid.innerHTML = '';
  const todayIdx = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  for (const day of order) {
    const col = document.createElement('div');
    col.className = 'day-col' + (day === todayIdx ? ' today' : '');
    col.innerHTML = `<div class="day-head">${DAY_NAMES[day]}</div>`;
    const dayItems = items.filter((i) => i.day === day).sort((a, b) => a.start.localeCompare(b.start));
    for (const item of dayItems) {
      const el = document.createElement('div');
      el.className = 'sched-item ' + (item.skill || '');
      el.innerHTML = `
        <span class="time">${item.start}${item.end ? '–' + item.end : ''}</span>
        ${escapeHtml(item.title)}
        <button class="del-btn" aria-label="Xóa">✕</button>
      `;
      el.querySelector('.del-btn').addEventListener('click', async () => {
        await api('/api/schedule/' + item.id, { method: 'DELETE' });
        renderSchedule();
      });
      col.appendChild(el);
    }
    grid.appendChild(col);
  }
}

$('#sched-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/schedule', {
    method: 'POST',
    body: JSON.stringify({
      day: $('#sched-day').value,
      start: $('#sched-start').value,
      end: $('#sched-end').value,
      title: $('#sched-title').value.trim(),
      skill: $('#sched-skill').value,
    }),
  });
  $('#sched-title').value = '';
  renderSchedule();
});

/* ==================== FLASHCARDS ==================== */
let studyQueue = [];
let currentCard = null;
let studyTotal = 0;

async function renderDecks() {
  const decks = await api('/api/decks');
  const list = $('#deck-list');
  const select = $('#card-deck');
  list.innerHTML = '';
  select.innerHTML = '';
  for (const d of decks) {
    const row = document.createElement('div');
    row.className = 'deck-row';
    row.innerHTML = `
      <div>
        <span class="deck-name">${escapeHtml(d.name)}</span>
        ${d.due > 0 ? `<span class="due-pill">${d.due} thẻ đến hạn</span>` : ''}
        <div class="deck-meta">${d.total} thẻ</div>
      </div>
      <button ${d.due === 0 ? 'disabled' : ''}>Học ngay</button>
    `;
    row.querySelector('button').addEventListener('click', () => startStudy(d.id));
    list.appendChild(row);

    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    select.appendChild(opt);
  }
}

$('#deck-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/decks', { method: 'POST', body: JSON.stringify({ name: $('#deck-name').value.trim() }) });
  $('#deck-name').value = '';
  renderDecks();
});

$('#card-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const deckId = $('#card-deck').value;
  await api(`/api/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify({
      front: $('#card-front').value.trim(),
      back: $('#card-back').value.trim(),
      example: $('#card-example').value.trim(),
    }),
  });
  $('#card-front').value = '';
  $('#card-back').value = '';
  $('#card-example').value = '';
  renderDecks();
  alert('Đã lưu thẻ! ✓');
});

async function startStudy(deckId) {
  studyQueue = await api(`/api/decks/${deckId}/due`);
  studyTotal = studyQueue.length;
  $('#deck-view').classList.add('hidden');
  $('#study-view').classList.remove('hidden');
  $('#study-done').classList.add('hidden');
  nextCard();
}

function nextCard() {
  if (studyQueue.length === 0) {
    currentCard = null;
    $('#flashcard').classList.add('hidden');
    $('#study-actions').classList.add('hidden');
    $('#study-progress').textContent = '';
    $('#study-done').classList.remove('hidden');
    return;
  }
  currentCard = studyQueue.shift();
  $('#flashcard').classList.remove('hidden');
  $('#study-progress').textContent = `Còn ${studyQueue.length + 1}/${studyTotal} thẻ · Hộp Leitner: ${currentCard.box}/5`;
  $('.fc-front').textContent = currentCard.front;
  $('.fc-front').classList.remove('hidden');
  $('.fc-back').innerHTML = `
    <span class="meaning">${escapeHtml(currentCard.back)}</span>
    ${currentCard.example ? `<span class="example">"${escapeHtml(currentCard.example)}"</span>` : ''}
  `;
  $('.fc-back').classList.add('hidden');
  $('#study-actions').classList.add('hidden');
}

$('#flashcard').addEventListener('click', () => {
  if (!currentCard) return;
  $('.fc-front').classList.toggle('hidden');
  $('.fc-back').classList.toggle('hidden');
  $('#study-actions').classList.remove('hidden');
});

async function review(correct) {
  await api(`/api/cards/${currentCard.id}/review`, {
    method: 'POST',
    body: JSON.stringify({ correct }),
  });
  nextCard();
}
$('#btn-knew').addEventListener('click', () => review(true));
$('#btn-forgot').addEventListener('click', () => review(false));

$('#study-back').addEventListener('click', () => {
  $('#study-view').classList.add('hidden');
  $('#deck-view').classList.remove('hidden');
  renderDecks();
});

/* ==================== 4 SKILLS LOGS ==================== */
async function renderLogs() {
  const logs = await api('/api/logs');
  $$('.skill-card').forEach((card) => {
    const skill = card.dataset.skill;
    const history = card.querySelector('.log-history');
    const entries = logs.filter((l) => l.skill === skill).slice(-5).reverse();
    history.innerHTML = entries.length
      ? entries
          .map(
            (l) => `
        <div class="log-entry">
          <span class="date">${l.date}</span>
          <span class="mins">${l.minutes}p</span>
          <span>${escapeHtml(l.note)}</span>
        </div>`
          )
          .join('')
      : '<p class="hint">Chưa có buổi luyện nào được ghi lại.</p>';
  });
}

$('#log-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/logs', {
    method: 'POST',
    body: JSON.stringify({
      skill: $('#log-skill').value,
      minutes: Number($('#log-minutes').value),
      note: $('#log-note').value.trim(),
    }),
  });
  $('#log-minutes').value = '';
  $('#log-note').value = '';
  renderLogs();
  renderSummary();
});

/* ==================== Helpers & init ==================== */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

renderTasks();
renderPomo();
renderSummary();
renderSchedule();
renderDecks();
renderLogs();