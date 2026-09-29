const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function storePath() {
  return path.join(app.getPath('userData'), 'schedule-store.json');
}

function load() {
  try {
    const raw = fs.readFileSync(storePath(), 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.items)) data.items = [];
    return data;
  } catch (e) {
    return { items: [] };
  }
}

function save(data) {
  fs.writeFileSync(storePath(), JSON.stringify(data, null, 2), 'utf-8');
}

function listForDate(date) {
  const data = load();
  return data.items
    .filter((i) => i.date === date)
    .sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
}

function addItem({ date, time, title }) {
  const data = load();
  const item = {
    id: crypto.randomUUID(),
    date,
    time: time || null,
    title,
    done: false
  };
  data.items.push(item);
  save(data);
  return item;
}

function toggleDone(id) {
  const data = load();
  const item = data.items.find((i) => i.id === id);
  if (item) {
    item.done = !item.done;
    save(data);
  }
  return item;
}

function deleteItem(id) {
  const data = load();
  data.items = data.items.filter((i) => i.id !== id);
  save(data);
}

module.exports = { listForDate, addItem, toggleDone, deleteItem };
