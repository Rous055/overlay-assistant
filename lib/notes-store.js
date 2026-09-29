const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function storePath() {
  return path.join(app.getPath('userData'), 'notes-store.json');
}

function load() {
  try {
    const raw = fs.readFileSync(storePath(), 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.notes)) data.notes = [];
    return data;
  } catch (e) {
    return { notes: [] };
  }
}

function save(data) {
  fs.writeFileSync(storePath(), JSON.stringify(data, null, 2), 'utf-8');
}

function listNotes() {
  const data = load();
  return data.notes.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function createNote(text) {
  const data = load();
  const now = new Date().toISOString();
  const note = { id: crypto.randomUUID(), text: text || '', createdAt: now, updatedAt: now };
  data.notes.unshift(note);
  save(data);
  return note;
}

function updateNote(id, text) {
  const data = load();
  const note = data.notes.find((n) => n.id === id);
  if (note) {
    note.text = text;
    note.updatedAt = new Date().toISOString();
    save(data);
  }
  return note;
}

function deleteNote(id) {
  const data = load();
  data.notes = data.notes.filter((n) => n.id !== id);
  save(data);
}

module.exports = { listNotes, createNote, updateNote, deleteNote };
