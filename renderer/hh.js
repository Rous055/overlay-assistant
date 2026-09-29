(function () {
  const setupEl = document.getElementById('hhSetup');
  const loginEl = document.getElementById('hhLogin');
  const mainEl = document.getElementById('hhMain');

  const clientIdInput = document.getElementById('hhClientId');
  const clientSecretInput = document.getElementById('hhClientSecret');
  const redirectUriInput = document.getElementById('hhRedirectUri');
  const saveCredsBtn = document.getElementById('hhSaveCredsBtn');

  const loginBtn = document.getElementById('hhLoginBtn');
  const editCredsBtn = document.getElementById('hhEditCredsBtn');
  const logoutBtn = document.getElementById('hhLogoutBtn');

  const tabNeg = document.getElementById('hhTabNegotiations');
  const tabSearch = document.getElementById('hhTabSearch');
  const negPane = document.getElementById('hhNegotiationsPane');
  const searchPane = document.getElementById('hhSearchPane');
  const negList = document.getElementById('hhNegotiationsList');
  const searchInput = document.getElementById('hhSearchInput');
  const searchBtn = document.getElementById('hhSearchBtn');
  const searchResults = document.getElementById('hhSearchResults');

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function show(el) {
    setupEl.style.display = 'none';
    loginEl.style.display = 'none';
    mainEl.style.display = 'none';
    el.style.display = 'block';
  }

  async function refreshState() {
    const hasCreds = await window.overlayAPI.hh.hasCredentials();
    if (!hasCreds) {
      show(setupEl);
      return;
    }
    const loggedIn = await window.overlayAPI.hh.isLoggedIn();
    if (!loggedIn) {
      show(loginEl);
      return;
    }
    show(mainEl);
    loadNegotiations();
  }

  saveCredsBtn.addEventListener('click', async () => {
    const clientId = clientIdInput.value.trim();
    const clientSecret = clientSecretInput.value.trim();
    const redirectUri = redirectUriInput.value.trim() || 'https://localhost/hh-callback';
    if (!clientId || !clientSecret) return;
    await window.overlayAPI.hh.saveCredentials(clientId, clientSecret, redirectUri);
    refreshState();
  });

  loginBtn.addEventListener('click', async () => {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Входим...';
    try {
      await window.overlayAPI.hh.login();
      refreshState();
    } catch (e) {
      alert(e && e.message ? e.message : 'Не удалось войти.');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Войти через hh.ru';
    }
  });

  editCredsBtn.addEventListener('click', () => show(setupEl));

  logoutBtn.addEventListener('click', async () => {
    await window.overlayAPI.hh.logout();
    refreshState();
  });

  tabNeg.addEventListener('click', () => {
    tabNeg.classList.add('active');
    tabSearch.classList.remove('active');
    negPane.style.display = 'block';
    searchPane.style.display = 'none';
  });

  tabSearch.addEventListener('click', () => {
    tabSearch.classList.add('active');
    tabNeg.classList.remove('active');
    searchPane.style.display = 'block';
    negPane.style.display = 'none';
  });

  async function loadNegotiations() {
    negList.innerHTML = '<p class="placeholder">Загрузка...</p>';
    try {
      const items = await window.overlayAPI.hh.negotiations();
      negList.innerHTML = '';
      if (!items.length) {
        negList.innerHTML = '<p class="placeholder">Откликов нет.</p>';
        return;
      }
      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'row link-row';
        const info = document.createElement('div');
        info.className = 'link-info';
        info.style.cursor = item.url ? 'pointer' : 'default';
        info.innerHTML =
          '<div class="title">' + escapeHtml(item.vacancyName) + '</div>' +
          '<div class="subtitle">' + escapeHtml(item.employerName) + (item.state ? ' · ' + escapeHtml(item.state) : '') + '</div>';
        if (item.url) {
          info.addEventListener('click', () => window.overlayAPI.links.open(item.url));
        }
        row.appendChild(info);
        negList.appendChild(row);
      });
    } catch (e) {
      negList.innerHTML = '<p class="placeholder">Не удалось загрузить отклики.</p>';
    }
  }

  async function doSearch() {
    const text = searchInput.value.trim();
    searchResults.innerHTML = '<p class="placeholder">Ищем...</p>';
    try {
      const items = await window.overlayAPI.hh.searchVacancies(text);
      searchResults.innerHTML = '';
      if (!items.length) {
        searchResults.innerHTML = '<p class="placeholder">Ничего не нашли.</p>';
        return;
      }
      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'row link-row';
        const info = document.createElement('div');
        info.className = 'link-info';
        info.style.cursor = 'pointer';
        info.innerHTML =
          '<div class="title">' + escapeHtml(item.name) + '</div>' +
          '<div class="subtitle">' + escapeHtml(item.employerName) + (item.salary ? ' · ' + escapeHtml(item.salary) : '') + '</div>';
        info.addEventListener('click', () => window.overlayAPI.links.open(item.url));
        row.appendChild(info);
        searchResults.appendChild(row);
      });
    } catch (e) {
      searchResults.innerHTML = '<p class="placeholder">Ошибка поиска.</p>';
    }
  }

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  refreshState();
})();
