const fs = require('fs');
const path = require('path');
const os = require('os');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg']);

function candidateDirs() {
  const home = os.homedir();
  return [
    path.join(home, 'OneDrive', 'Изображения', 'Снимки экрана'),
    path.join(home, 'Изображения', 'Снимки экрана'),
    path.join(home, 'OneDrive', 'Pictures', 'Screenshots'),
    path.join(home, 'Pictures', 'Screenshots')
  ];
}

function resolveScreenshotsDir() {
  for (const d of candidateDirs()) {
    if (fs.existsSync(d)) return d;
  }
  const fallback = candidateDirs()[0];
  try {
    fs.mkdirSync(fallback, { recursive: true });
  } catch (e) {
    // не смогли создать — вернём путь всё равно, list просто будет пустым
  }
  return fallback;
}

function listScreenshots(limit = 30) {
  const dir = resolveScreenshotsDir();
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    return [];
  }
  return files
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .map((f) => {
      const full = path.join(dir, f);
      let mtime = 0;
      try {
        mtime = fs.statSync(full).mtimeMs;
      } catch (e) {
        // файл мог исчезнуть между readdir и stat — пропустим дату
      }
      return { path: full, name: f, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit);
}

module.exports = { resolveScreenshotsDir, listScreenshots };
