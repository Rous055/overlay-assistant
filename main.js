const { app, BrowserWindow, Tray, Menu, globalShortcut, screen, ipcMain, clipboard, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const mailStore = require('./lib/mail-store');
const mailClient = require('./lib/mail-client');
const linksStore = require('./lib/links-store');
const screenshotsLib = require('./lib/screenshots');
const scheduleStore = require('./lib/schedule-store');
const notesStore = require('./lib/notes-store');
const moodleStore = require('./lib/moodle-store');
const moodleClient = require('./lib/moodle-client');

// ---------- Настройки ----------
const HOTKEY = 'CommandOrControl+Shift+Space'; // резервный вызов оверлея
const OVERLAY_WIDTH = 460;
const OVERLAY_HEIGHT = 620;
const TRIGGER_ZONE_WIDTH = 320; // ширина зоны наведения сверху экрана
const TRIGGER_ZONE_HEIGHT = 6;  // высота зоны наведения (у самого края)
const HIDE_DELAY_MS = 350;      // сколько курсор должен отсутствовать над зоной/окном, чтобы оно свернулось
const POLL_MS = 100;            // частота опроса позиции курсора
const ANIM_STEPS = 30;
const ANIM_INTERVAL_MS = 10;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

let tray = null;
let overlayWin = null;
let visible = false;
let animating = false;
let cursorPollTimer = null;
let hideTimer = null;

// Защита от падения всего приложения из-за необработанной ошибки в фоне
// (например, обрыв сетевого соединения при работе с почтой).
process.on('uncaughtException', (err) => {
  console.error('Необработанная ошибка (проигнорирована):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Необработанный отказ промиса (проигнорирован):', reason);
});

function getTriggerZone() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  return {
    x: Math.round((screenWidth - TRIGGER_ZONE_WIDTH) / 2),
    y: 0,
    width: TRIGGER_ZONE_WIDTH,
    height: TRIGGER_ZONE_HEIGHT
  };
}

function pointInRect(p, r) {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

function createOverlayWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  const x = Math.round((screenWidth - OVERLAY_WIDTH) / 2);

  overlayWin = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    x,
    y: -OVERLAY_HEIGHT, // спрятано за верхним краем экрана
    frame: false,
    resizable: false,
    movable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: true, // окно "видимо" всегда, но спрятано за пределами экрана — так проще анимировать
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function animateY(fromY, toY, onDone) {
  if (animating) return;
  animating = true;
  let step = 0;
  const bounds = overlayWin.getBounds();
  const timer = setInterval(() => {
    step += 1;
    const progress = easeOutCubic(step / ANIM_STEPS);
    const y = Math.round(fromY + (toY - fromY) * progress);
    overlayWin.setBounds({ ...overlayWin.getBounds(), x: bounds.x, y, width: bounds.width, height: bounds.height });
    if (step >= ANIM_STEPS) {
      clearInterval(timer);
      animating = false;
      if (onDone) onDone();
    }
  }, ANIM_INTERVAL_MS);
}

function showOverlay() {
  if (visible || animating) return;
  visible = true;
  clearTimeout(hideTimer);
  animateY(-OVERLAY_HEIGHT, 0);
}

function hideOverlay() {
  if (!visible || animating) return;
  visible = false;
  animateY(0, -OVERLAY_HEIGHT);
}

function toggleOverlay() {
  if (visible) hideOverlay();
  else showOverlay();
}

function startCursorWatcher() {
  cursorPollTimer = setInterval(() => {
    const p = screen.getCursorScreenPoint();
    const zone = getTriggerZone();
    const inZone = pointInRect(p, zone);
    const bounds = overlayWin.getBounds();
    const inWindow = pointInRect(p, bounds);

    if (!visible && inZone && !animating) {
      showOverlay();
    } else if (visible && !inZone && !inWindow) {
      if (!hideTimer) {
        hideTimer = setTimeout(() => {
          hideTimer = null;
          hideOverlay();
        }, HIDE_DELAY_MS);
      }
    } else if (inZone || inWindow) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }, POLL_MS);
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  const menu = Menu.buildFromTemplate([
    { label: 'Показать/скрыть (' + HOTKEY + ')', click: toggleOverlay },
    { type: 'separator' },
    {
      label: 'Запускать со стартом Windows',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked });
      }
    },
    { type: 'separator' },
    { label: 'Выход', click: () => app.quit() }
  ]);
  tray.setToolTip('Overlay Assistant');
  tray.setContextMenu(menu);
  tray.on('click', toggleOverlay);
}

const URL_REGEX = /^https?:\/\/\S+$/i;
const CLIPBOARD_POLL_MS = 1000;
let lastClipboardText = '';
let clipboardPollTimer = null;

function startClipboardWatcher() {
  lastClipboardText = clipboard.readText() || ''; // не реагируем на то, что уже было в буфере при старте
  clipboardPollTimer = setInterval(() => {
    const text = (clipboard.readText() || '').trim();
    if (text && text !== lastClipboardText) {
      lastClipboardText = text;
      if (URL_REGEX.test(text)) {
        linksStore.addLink(text);
        if (overlayWin && !overlayWin.isDestroyed()) {
          overlayWin.webContents.send('links:changed');
        }
      }
    }
  }, CLIPBOARD_POLL_MS);
}

function registerScreenshotsIpc() {
  ipcMain.handle('screenshots:list', () => screenshotsLib.listScreenshots(30));

  ipcMain.handle('screenshots:open', (event, filePath) => {
    shell.openPath(filePath);
    return true;
  });

  ipcMain.handle('screenshots:copy', (event, filePath) => {
    const image = nativeImage.createFromPath(filePath);
    if (!image.isEmpty()) {
      clipboard.writeImage(image);
      return true;
    }
    return false;
  });

  ipcMain.handle('screenshots:show-in-folder', (event, filePath) => {
    shell.showItemInFolder(filePath);
    return true;
  });
}

let screenshotsWatcher = null;
let screenshotsDebounce = null;

function startScreenshotsWatcher() {
  const dir = screenshotsLib.resolveScreenshotsDir();
  try {
    screenshotsWatcher = fs.watch(dir, { persistent: false }, () => {
      clearTimeout(screenshotsDebounce);
      screenshotsDebounce = setTimeout(() => {
        if (overlayWin && !overlayWin.isDestroyed()) {
          overlayWin.webContents.send('screenshots:changed');
        }
      }, 300);
    });
  } catch (e) {
    // папка недоступна для отслеживания — список всё равно можно обновить вручную
  }
}

function registerMoodleIpc() {
  ipcMain.handle('moodle:has-session', () => moodleStore.hasSession());

  ipcMain.handle('moodle:login', async (event, { siteUrl, username, password }) => {
    const cleanUrl = siteUrl.replace(/\/$/, '');
    const token = await moodleClient.login(cleanUrl, username, password);
    const info = await moodleClient.getSiteInfo(cleanUrl, token);
    moodleStore.saveSession({ siteUrl: cleanUrl, token, userId: info.userid, fullname: info.fullname });
    return { fullname: info.fullname };
  });

  ipcMain.handle('moodle:logout', () => {
    moodleStore.clearSession();
    return true;
  });

  async function withCourses(fn) {
    const session = moodleStore.getSession();
    if (!session) throw new Error('not-logged-in');
    const courses = await moodleClient.getCourses(session.siteUrl, session.token, session.userId);
    return fn(session, courses);
  }

  ipcMain.handle('moodle:deadlines', () =>
    withCourses((session, courses) =>
      moodleClient.getDeadlines(session.siteUrl, session.token, courses.map((c) => c.id))
    )
  );

  ipcMain.handle('moodle:grades', () =>
    withCourses((session, courses) => moodleClient.getGrades(session.siteUrl, session.token, session.userId, courses))
  );

  ipcMain.handle('moodle:announcements', () =>
    withCourses((session, courses) =>
      moodleClient.getAnnouncements(session.siteUrl, session.token, courses.map((c) => c.id))
    )
  );

  ipcMain.handle('moodle:materials', () =>
    withCourses((session, courses) => moodleClient.getMaterials(session.siteUrl, session.token, courses))
  );
}


function registerNotesIpc() {
  ipcMain.handle('notes:list', () => notesStore.listNotes());
  ipcMain.handle('notes:create', (event, text) => notesStore.createNote(text));
  ipcMain.handle('notes:update', (event, { id, text }) => notesStore.updateNote(id, text));
  ipcMain.handle('notes:delete', (event, id) => {
    notesStore.deleteNote(id);
    return true;
  });
}

function registerScheduleIpc() {
  ipcMain.handle('schedule:list', (event, date) => scheduleStore.listForDate(date));
  ipcMain.handle('schedule:add', (event, { date, time, title }) => scheduleStore.addItem({ date, time, title }));
  ipcMain.handle('schedule:toggle', (event, id) => scheduleStore.toggleDone(id));
  ipcMain.handle('schedule:delete', (event, id) => {
    scheduleStore.deleteItem(id);
    return true;
  });
}

function registerLinksIpc() {
  ipcMain.handle('links:get-sections', () => linksStore.getSections());
  ipcMain.handle('links:add-section', (event, name) => linksStore.addSection(name));
  ipcMain.handle('links:remove-section', (event, name) => {
    linksStore.removeSection(name);
    return linksStore.getSections();
  });
  ipcMain.handle('links:list', (event, section) => linksStore.listLinks(section));
  ipcMain.handle('links:move', (event, { id, toSection }) => linksStore.moveLink(id, toSection));
  ipcMain.handle('links:delete', (event, id) => {
    linksStore.deleteLink(id);
    return true;
  });
  ipcMain.handle('links:open', (event, url) => {
    shell.openExternal(url);
    return true;
  });
}

function registerMailIpc() {
  ipcMain.handle('mail:has-config', () => mailStore.hasConfig());

  ipcMain.handle('mail:connect', async (event, { email, password }) => {
    // Сначала проверяем, что логин/пароль реально работают, и только потом сохраняем
    const messages = await mailClient.listMessages({ email, password }, 20);
    mailStore.saveConfig({ email, password });
    return messages;
  });

  ipcMain.handle('mail:clear-config', () => {
    mailStore.clearConfig();
    return true;
  });

  ipcMain.handle('mail:list', async () => {
    const config = mailStore.loadConfig();
    if (!config) throw new Error('no-config');
    return await mailClient.listMessages(config, 20);
  });

  ipcMain.handle('mail:get-message', async (event, uid) => {
    const config = mailStore.loadConfig();
    if (!config) throw new Error('no-config');
    return await mailClient.getMessageBody(config, uid);
  });
}

app.whenReady().then(() => {
  // На собранном (упакованном) приложении включает автозапуск при старте Windows.
  // В режиме разработки (electron .) эта настройка привязывается к electron.exe и практического смысла не имеет.
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  createOverlayWindow();
  createTray();
  registerMailIpc();
  registerLinksIpc();
  registerScreenshotsIpc();
  registerScheduleIpc();
  registerNotesIpc();
  registerMoodleIpc();
  startClipboardWatcher();
  startScreenshotsWatcher();

  globalShortcut.register(HOTKEY, toggleOverlay);

  overlayWin.webContents.once('did-finish-load', () => {
    startCursorWatcher();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  clearInterval(cursorPollTimer);
  clearInterval(clipboardPollTimer);
  if (screenshotsWatcher) screenshotsWatcher.close();
});

// Не выходим при закрытии всех окон — это трей-приложение
app.on('window-all-closed', (e) => {
  // намеренно ничего не делаем
});
