const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

function storePath() {
  return path.join(app.getPath('userData'), 'moodle-config.json');
}

function encrypt(str) {
  return safeStorage.encryptString(str || '').toString('base64');
}

function decrypt(b64) {
  if (!b64) return '';
  try {
    return safeStorage.decryptString(Buffer.from(b64, 'base64'));
  } catch (e) {
    return '';
  }
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(storePath(), 'utf-8'));
  } catch (e) {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(storePath(), JSON.stringify(data, null, 2), 'utf-8');
}

function saveSession({ siteUrl, token, userId, fullname }) {
  const data = {
    siteUrl,
    userId,
    fullname,
    tokenEnc: encrypt(token)
  };
  save(data);
}

function getSession() {
  const data = load();
  if (!data.tokenEnc) return null;
  return {
    siteUrl: data.siteUrl,
    token: decrypt(data.tokenEnc),
    userId: data.userId,
    fullname: data.fullname
  };
}

function hasSession() {
  return !!load().tokenEnc;
}

function clearSession() {
  try {
    fs.unlinkSync(storePath());
  } catch (e) {
    // и так пусто
  }
}

module.exports = { saveSession, getSession, hasSession, clearSession };
