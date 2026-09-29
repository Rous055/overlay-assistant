const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

function storePath() {
  return path.join(app.getPath('userData'), 'hh-config.json');
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

function saveCredentials({ clientId, clientSecret, redirectUri }) {
  const data = load();
  data.clientId = clientId;
  data.redirectUri = redirectUri;
  data.clientSecretEnc = encrypt(clientSecret);
  save(data);
}

function getCredentials() {
  const data = load();
  if (!data.clientId) return null;
  return {
    clientId: data.clientId,
    clientSecret: decrypt(data.clientSecretEnc),
    redirectUri: data.redirectUri
  };
}

function hasCredentials() {
  return !!load().clientId;
}

function saveTokens({ accessToken, refreshToken, expiresAt }) {
  const data = load();
  data.accessTokenEnc = encrypt(accessToken);
  data.refreshTokenEnc = encrypt(refreshToken);
  data.expiresAt = expiresAt;
  save(data);
}

function getTokens() {
  const data = load();
  if (!data.accessTokenEnc) return null;
  return {
    accessToken: decrypt(data.accessTokenEnc),
    refreshToken: decrypt(data.refreshTokenEnc),
    expiresAt: data.expiresAt
  };
}

function isLoggedIn() {
  return !!load().accessTokenEnc;
}

function clearTokens() {
  const data = load();
  delete data.accessTokenEnc;
  delete data.refreshTokenEnc;
  delete data.expiresAt;
  save(data);
}

function clearAll() {
  try {
    fs.unlinkSync(storePath());
  } catch (e) {
    // и так пусто
  }
}

module.exports = {
  saveCredentials,
  getCredentials,
  hasCredentials,
  saveTokens,
  getTokens,
  isLoggedIn,
  clearTokens,
  clearAll
};
