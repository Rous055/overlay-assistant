(function () {
  const setupEl = document.getElementById('mailSetup');
  const listEl = document.getElementById('mailList');
  const messageEl = document.getElementById('mailMessage');
  const messageContentEl = document.getElementById('mailMessageContent');

  const emailInput = document.getElementById('mailEmail');
  const passwordInput = document.getElementById('mailPassword');
  const connectBtn = document.getElementById('mailConnectBtn');
  const backBtn = document.getElementById('mailBackBtn');

  function showSetup() {
    setupEl.style.display = 'block';
    listEl.style.display = 'none';
    messageEl.style.display = 'none';
  }

  function showListPane() {
    setupEl.style.display = 'none';
    listEl.style.display = 'block';
    messageEl.style.display = 'none';
  }

  function showMessagePane() {
    setupEl.style.display = 'none';
    listEl.style.display = 'none';
    messageEl.style.display = 'block';
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function formatDate(d) {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  function renderList(messages) {
    listEl.innerHTML = '';

    const toolbar = document.createElement('div');
    toolbar.className = 'mail-toolbar';
    toolbar.innerHTML =
      '<button class="link-btn" id="mailRefreshBtn">обновить</button>' +
      '<button class="link-btn" id="mailLogoutBtn">отключить</button>';
    listEl.appendChild(toolbar);

    if (!messages.length) {
      const empty = document.createElement('p');
      empty.className = 'placeholder';
      empty.textContent = 'Писем нет.';
      listEl.appendChild(empty);
    }

    messages.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'row mail-row';
      row.innerHTML =
        '<div>' +
        '<div class="title">' + escapeHtml(m.from) + '</div>' +
        '<div class="subtitle">' + escapeHtml(m.subject) + '</div>' +
        '</div>' +
        '<div class="meta">' + formatDate(m.date) + '</div>';
      row.addEventListener('click', () => openMessage(m.uid));
      listEl.appendChild(row);
    });

    document.getElementById('mailRefreshBtn').addEventListener('click', loadList);
    document.getElementById('mailLogoutBtn').addEventListener('click', async () => {
      await window.overlayAPI.mail.clearConfig();
      emailInput.value = '';
      passwordInput.value = '';
      showSetup();
    });
  }

  async function loadList() {
    listEl.innerHTML = '<p class="placeholder">Загрузка...</p>';
    showListPane();
    try {
      const messages = await window.overlayAPI.mail.list();
      renderList(messages);
    } catch (e) {
      listEl.innerHTML = '<p class="placeholder">Не удалось загрузить письма. Проверьте интернет и попробуйте «обновить».</p>' +
        '<div class="mail-toolbar"><button class="link-btn" id="mailRetryBtn">обновить</button></div>';
      const retry = document.getElementById('mailRetryBtn');
      if (retry) retry.addEventListener('click', loadList);
    }
  }

  async function openMessage(uid) {
    showMessagePane();
    messageContentEl.innerHTML = '<p class="placeholder">Загрузка...</p>';
    try {
      const msg = await window.overlayAPI.mail.getMessage(uid);
      messageContentEl.innerHTML =
        '<div class="mail-msg-subject">' + escapeHtml(msg.subject) + '</div>' +
        '<div class="mail-msg-meta">' + escapeHtml(msg.from) + ' · ' + formatDate(msg.date) + '</div>' +
        '<div class="mail-body">' + escapeHtml(msg.text).replace(/\n/g, '<br>') + '</div>';
    } catch (e) {
      messageContentEl.innerHTML = '<p class="placeholder">Не удалось загрузить письмо.</p>';
    }
  }

  connectBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return;

    connectBtn.disabled = true;
    connectBtn.textContent = 'Подключаю...';
    try {
      const messages = await window.overlayAPI.mail.connect(email, password);
      showListPane();
      renderList(messages);
    } catch (e) {
      alert(window.cleanIpcError(e));
    } finally {
      connectBtn.disabled = false;
      connectBtn.textContent = 'Подключить';
    }
  });

  backBtn.addEventListener('click', showListPane);

  window.overlayAPI.mail.hasConfig().then((has) => {
    if (has) loadList();
    else showSetup();
  });
})();
