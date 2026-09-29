(function () {
  const gridEl = document.getElementById('shotsGrid');
  const toolbarEl = document.getElementById('shotsToolbar');
  const openBtn = document.getElementById('shotOpenBtn');
  const copyBtn = document.getElementById('shotCopyBtn');
  const folderBtn = document.getElementById('shotFolderBtn');
  const fabBtn = document.getElementById('shotsFab');

  const RECENT_WINDOW_MS = 5 * 60 * 1000;

  let items = [];
  let selectedPath = null;
  let showAll = false;

  function toFileUrl(p) {
    let normalized = p.replace(/\\/g, '/');
    if (!normalized.startsWith('/')) normalized = '/' + normalized;
    return 'file://' + encodeURI(normalized);
  }

  function formatTime(ms) {
    if (!ms) return '';
    try {
      return new Date(ms).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  function updateToolbar() {
    toolbarEl.style.display = selectedPath ? 'flex' : 'none';
  }

  function updateFab() {
    fabBtn.textContent = showAll ? 'Последние' : 'Все скрины';
  }

  function visibleItems() {
    if (showAll) return items;
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    return items.filter((i) => i.mtime >= cutoff);
  }

  function render() {
    gridEl.innerHTML = '';
    updateFab();

    const shown = visibleItems();

    if (!shown.length) {
      const empty = document.createElement('p');
      empty.className = 'placeholder';
      empty.textContent = showAll
        ? 'Скриншотов пока нет. Сделай снимок (Win+Print Screen) — он появится здесь.'
        : 'За последние 5 минут новых скриншотов нет. Есть более старые — жми «Все скрины».';
      gridEl.appendChild(empty);
      updateToolbar();
      return;
    }

    shown.forEach((item) => {
      const thumb = document.createElement('div');
      thumb.className = 'shot-thumb' + (item.path === selectedPath ? ' selected' : '');
      thumb.title = item.name + (item.mtime ? ' · ' + formatTime(item.mtime) : '');

      const img = document.createElement('img');
      img.src = toFileUrl(item.path);
      img.loading = 'lazy';

      thumb.appendChild(img);
      thumb.addEventListener('click', () => {
        selectedPath = selectedPath === item.path ? null : item.path;
        render();
      });

      if (item.path === selectedPath) {
        const check = document.createElement('div');
        check.className = 'shot-check';
        check.textContent = '✓';
        thumb.appendChild(check);
      }

      gridEl.appendChild(thumb);
    });

    updateToolbar();
  }

  async function load() {
    items = await window.overlayAPI.screenshots.list();
    if (selectedPath && !items.some((i) => i.path === selectedPath)) {
      selectedPath = null;
    }
    render();
  }

  openBtn.addEventListener('click', () => {
    if (selectedPath) window.overlayAPI.screenshots.open(selectedPath);
  });

  copyBtn.addEventListener('click', async () => {
    if (!selectedPath) return;
    const ok = await window.overlayAPI.screenshots.copy(selectedPath);
    copyBtn.textContent = ok ? 'скопировано' : 'ошибка';
    setTimeout(() => { copyBtn.textContent = 'копировать'; }, 1200);
  });

  folderBtn.addEventListener('click', () => {
    if (selectedPath) window.overlayAPI.screenshots.showInFolder(selectedPath);
  });

  fabBtn.addEventListener('click', () => {
    showAll = !showAll;
    render();
  });

  window.overlayAPI.screenshots.onChanged(() => {
    load();
  });

  load();
})();
