const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_SECTION = 'Входящие';

function storePath() {
  return path.join(app.getPath('userData'), 'links-store.json');
}

function load() {
  try {
    const raw = fs.readFileSync(storePath(), 'utf-8');
    const data = JSON.parse(raw);
    if (!data.sections || !data.sections.includes(DEFAULT_SECTION)) {
      data.sections = [DEFAULT_SECTION, ...(data.sections || [])];
    }
    if (!Array.isArray(data.links)) data.links = [];
    return data;
  } catch (e) {
    return { sections: [DEFAULT_SECTION], links: [] };
  }
}

function save(data) {
  fs.writeFileSync(storePath(), JSON.stringify(data, null, 2), 'utf-8');
}

function getSections() {
  return load().sections;
}

function addSection(name) {
  const data = load();
  const trimmed = (name || '').trim();
  if (!trimmed) return data.sections;
  if (!data.sections.includes(trimmed)) {
    data.sections.push(trimmed);
    save(data);
  }
  return data.sections;
}

function removeSection(name) {
  const data = load();
  if (name === DEFAULT_SECTION) return data; // дефолтный раздел не удаляется
  data.sections = data.sections.filter((s) => s !== name);
  data.links = data.links.map((l) => (l.section === name ? { ...l, section: DEFAULT_SECTION } : l));
  save(data);
  return data;
}

function listLinks(section) {
  const data = load();
  const links = section ? data.links.filter((l) => l.section === section) : data.links;
  return links.slice().sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
}

function addLink(url) {
  const data = load();
  const link = {
    id: crypto.randomUUID(),
    url,
    section: DEFAULT_SECTION,
    addedAt: new Date().toISOString()
  };
  data.links.unshift(link);
  save(data);
  return link;
}

function moveLink(id, toSection) {
  const data = load();
  const link = data.links.find((l) => l.id === id);
  if (link) {
    link.section = toSection;
    save(data);
  }
  return link;
}

function deleteLink(id) {
  const data = load();
  data.links = data.links.filter((l) => l.id !== id);
  save(data);
}

module.exports = {
  DEFAULT_SECTION,
  getSections,
  addSection,
  removeSection,
  listLinks,
  addLink,
  moveLink,
  deleteLink
};
