(function () {
  const setupEl = document.getElementById('moodleSetup');
  const mainEl = document.getElementById('moodleMain');

  const siteUrlInput = document.getElementById('moodleSiteUrl');
  const usernameInput = document.getElementById('moodleUsername');
  const passwordInput = document.getElementById('moodlePassword');
  const loginBtn = document.getElementById('moodleLoginBtn');
  const logoutBtn = document.getElementById('moodleLogoutBtn');

  const tabsEl = document.getElementById('moodleTabs');
  const contentEl = document.getElementById('moodleContent');

  let activeTab = 'deadlines';

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function formatDate(ms) {
    if (!ms) return '';
    try {
      return new Date(ms).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  async function refreshState() {
    const hasSession = await window.overlayAPI.moodle.hasSession();
    if (hasSession) {
      setupEl.style.display = 'none';
      mainEl.style.display = 'block';
      loadTab(activeTab);
    } else {
      setupEl.style.display = 'block';
      mainEl.style.display = 'none';
    }
  }

  loginBtn.addEventListener('click', async () => {
    const siteUrl = siteUrlInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!siteUrl || !username || !password) return;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Входим...';
    try {
      await window.overlayAPI.moodle.login(siteUrl, username, password);
      passwordInput.value = '';
      refreshState();
    } catch (e) {
      alert(window.cleanIpcError(e));
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Войти';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await window.overlayAPI.moodle.logout();
    refreshState();
  });

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.hh-tab');
    if (!btn) return;
    activeTab = btn.dataset.tab;
    tabsEl.querySelectorAll('.hh-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    loadTab(activeTab);
  });

  function renderRows(rows, emptyText) {
    contentEl.innerHTML = '';
    if (!rows.length) {
      contentEl.innerHTML = '<p class="placeholder">' + escapeHtml(emptyText) + '</p>';
      return;
    }
    rows.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'row link-row';

      const info = document.createElement('div');
      info.className = 'link-info';
      if (r.url) info.style.cursor = 'pointer';
      info.innerHTML =
        '<div class="title">' + escapeHtml(r.title) + '</div>' +
        '<div class="subtitle">' + escapeHtml(r.subtitle) + '</div>';
      if (r.url) {
        info.addEventListener('click', () => window.overlayAPI.links.open(r.url));
      }
      row.appendChild(info);

      if (r.meta) {
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = r.meta;
        row.appendChild(meta);
      }

      contentEl.appendChild(row);
    });
  }

  async function loadTab(tab) {
    contentEl.innerHTML = '<p class="placeholder">Загрузка...</p>';
    try {
      if (tab === 'deadlines') {
        const items = await window.overlayAPI.moodle.deadlines();
        renderRows(items.map((i) => ({
          title: i.name,
          subtitle: i.courseName,
          meta: formatDate(i.duedate)
        })), 'Дедлайнов нет.');
      } else if (tab === 'grades') {
        const items = await window.overlayAPI.moodle.grades();
        renderRows(items.map((i) => ({
          title: i.itemName,
          subtitle: i.courseName,
          meta: i.grade
        })), 'Оценок пока нет.');
      } else if (tab === 'announcements') {
        const items = await window.overlayAPI.moodle.announcements();
        renderRows(items.map((i) => ({
          title: i.title,
          subtitle: i.message,
          meta: formatDate(i.date)
        })), 'Объявлений нет.');
      } else if (tab === 'materials') {
        const items = await window.overlayAPI.moodle.materials();
        renderRows(items.map((i) => ({
          title: i.name,
          subtitle: i.courseName,
          url: i.url
        })), 'Материалов нет.');
      }
    } catch (e) {
      contentEl.innerHTML = '<p class="placeholder">Не удалось загрузить данные.</p>';
    }
  }

  refreshState();
})();
