const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

function configPath() {
  return path.join(app.getPath('userData'), 'mail-config.json');
}

function saveConfig({ email, password }) {
  const encrypted = safeStorage.encryptString(password);
  const data = { email, password: encrypted.toString('base64') };
  fs.writeFileSync(configPath(), JSON.stringify(data), 'utf-8');
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(configPath(), 'utf-8');
    const data = JSON.parse(raw);
    const password = safeStorage.decryptString(Buffer.from(data.password, 'base64'));
    return { email: data.email, password };
  } catch (e) {
    return null;
  }
}

function hasConfig() {
  return fs.existsSync(configPath());
}

function clearConfig() {
  try {
    fs.unlinkSync(configPath());
  } catch (e) {
    // файла и так нет — ничего не делаем
  }
}

module.exports = { saveConfig, loadConfig, hasConfig, clearConfig };
