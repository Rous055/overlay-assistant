(function () {
  const INBOX = 'Входящие';

  const foldersEl = document.getElementById('linksFolders');
  const inboxBadge = document.getElementById('inboxBadge');
  const addToggleBtn = document.getElementById('linksAddToggle');
  const addForm = document.getElementById('linksAddForm');
  const addInput = document.getElementById('linksAddInput');
  const addConfirmBtn = document.getElementById('linksAddConfirm');
  const addBlock = document.getElementById('linksAdd');

  const listViewEl = document.getElementById('linksListView');
  const listEl = document.getElementById('linksList');
  const backBtn = document.getElementById('linksBackBtn');
  const foldersBlock = document.getElementById('linksFolders');
  const headerBlock = document.querySelector('.links-header');

  let sections = [];
  let allLinks = [];
  let currentFolder = null;

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  function shortenUrl(url) {
    try {
      const u = new URL(url);
      let p = u.pathname + u.search;
      if (p.length > 28) p = p.slice(0, 28) + '…';
      return u.hostname.replace(/^www\./, '') + p;
    } catch (e) {
      return url.length > 40 ? url.slice(0, 40) + '…' : url;
    }
  }

  function showFoldersPane() {
    listViewEl.style.display = 'none';
    foldersBlock.style.display = 'flex';
    addBlock.style.display = 'block';
    headerBlock.style.display = 'flex';
  }

  function showListPane() {
    listViewEl.style.display = 'block';
    foldersBlock.style.display = 'none';
    addBlock.style.display = 'none';
    headerBlock.style.display = 'none';
  }

  async function loadAll() {
    sections = await window.overlayAPI.links.getSections();
    allLinks = await window.overlayAPI.links.list();
    renderFolders();
    renderInboxBadge();
    if (currentFolder) renderList(currentFolder);
  }

  function renderInboxBadge() {
    const count = allLinks.filter((l) => l.section === INBOX).length;
    if (count > 0) {
      inboxBadge.style.display = 'inline-flex';
      inboxBadge.textContent = count > 9 ? '9+' : String(count);
    } else {
      inboxBadge.style.display = 'none';
      if (currentFolder === INBOX) {
        currentFolder = null;
        showFoldersPane();
      }
    }
  }

  function renderFolders() {
    const folders = sections.filter((s) => s !== INBOX);
    foldersEl.innerHTML = '';

    if (!folders.length) {
      const empty = document.createElement('p');
      empty.className = 'placeholder';
      empty.textContent = 'Разделов пока нет — создай первый кнопкой ниже.';
      foldersEl.appendChild(empty);
      return;
    }

    folders.forEach((name) => {
      const count = allLinks.filter((l) => l.section === name).length;
      const row = document.createElement('div');
      row.className = 'row folder-row';
      row.innerHTML =
        '<div class="title">' + escapeHtml(name) + '</div>' +
        '<div class="meta">' + count + '</div>';
      row.addEventListener('click', () => openFolder(name));
      foldersEl.appendChild(row);
    });
  }

  function openFolder(name) {
    currentFolder = name;
    showListPane();
    renderList(name);
  }

  async function renderList(section) {
    const links = await window.overlayAPI.links.list(section);
    listEl.innerHTML = '';

    if (!links.length) {
      const empty = document.createElement('p');
      empty.className = 'placeholder';
      empty.textContent = section === INBOX
        ? 'Новых ссылок нет.'
        : 'В этом разделе пока пусто.';
      listEl.appendChild(empty);
      return;
    }

    links.forEach((link) => {
      const row = document.createElement('div');
      row.className = 'row link-row';

      const info = document.createElement('div');
      info.className = 'link-info';
      info.innerHTML =
        '<div class="title link-url" title="' + escapeHtml(link.url) + '">' + escapeHtml(shortenUrl(link.url)) + '</div>' +
        '<div class="subtitle">' + formatDate(link.addedAt) + '</div>';
      info.addEventListener('click', () => {
        window.overlayAPI.links.open(link.url);
      });

      const controls = document.createElement('div');
      controls.className = 'link-controls';

      const select = document.createElement('select');
      select.className = 'link-move-select';
      sections.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        if (s === link.section) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener('change', async () => {
        await window.overlayAPI.links.move(link.id, select.value);
        await loadAll();
        renderList(section);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'link-delete-btn';
      delBtn.textContent = '×';
      delBtn.title = 'Удалить';
      delBtn.addEventListener('click', async () => {
        await window.overlayAPI.links.delete(link.id);
        await loadAll();
        renderList(section);
      });

      controls.appendChild(select);
      controls.appendChild(delBtn);

      row.appendChild(info);
      row.appendChild(controls);
      listEl.appendChild(row);
    });
  }

  addToggleBtn.addEventListener('click', () => {
    addForm.style.display = addForm.style.display === 'none' ? 'flex' : 'none';
    if (addForm.style.display === 'flex') addInput.focus();
  });

  async function submitAddSection() {
    const name = addInput.value.trim();
    if (!name) return;
    await window.overlayAPI.links.addSection(name);
    addInput.value = '';
    addForm.style.display = 'none';
    await loadAll();
  }

  addConfirmBtn.addEventListener('click', submitAddSection);
  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAddSection();
  });

  inboxBadge.addEventListener('click', () => openFolder(INBOX));
  backBtn.addEventListener('click', () => {
    currentFolder = null;
    showFoldersPane();
  });

  window.overlayAPI.links.onChanged(() => {
    loadAll();
  });

  showFoldersPane();
  loadAll();
})();
