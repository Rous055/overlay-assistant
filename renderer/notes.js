(function () {
  const listPane = document.getElementById('notesListPane');
  const editorPane = document.getElementById('notesEditorPane');
  const listEl = document.getElementById('notesList');
  const addBtn = document.getElementById('notesAddBtn');
  const backBtn = document.getElementById('notesBackBtn');
  const deleteBtn = document.getElementById('notesDeleteBtn');
  const textarea = document.getElementById('notesTextarea');

  let currentId = null;
  let saveTimer = null;

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

  function preview(text) {
    const lines = (text || '').split('\n').filter((l) => l.trim());
    const title = lines[0] || '(пустая заметка)';
    const rest = lines.slice(1).join(' ');
    return { title: title.slice(0, 60), rest: rest.slice(0, 80) };
  }

  function showList() {
    editorPane.style.display = 'none';
    listPane.style.display = 'block';
    currentId = null;
  }

  function showEditor() {
    listPane.style.display = 'none';
    editorPane.style.display = 'flex';
  }

  async function renderList() {
    const notes = await window.overlayAPI.notes.list();
    listEl.innerHTML = '';

    if (!notes.length) {
      const empty = document.createElement('p');
      empty.className = 'placeholder';
      empty.textContent = 'Заметок пока нет — создай первую кнопкой выше.';
      listEl.appendChild(empty);
      return;
    }

    notes.forEach((note) => {
      const { title, rest } = preview(note.text);
      const row = document.createElement('div');
      row.className = 'row note-row';
      row.innerHTML =
        '<div>' +
        '<div class="title">' + escapeHtml(title) + '</div>' +
        '<div class="subtitle">' + escapeHtml(rest) + '</div>' +
        '</div>' +
        '<div class="meta">' + formatDate(note.updatedAt) + '</div>';
      row.addEventListener('click', () => openNote(note.id, note.text));
      listEl.appendChild(row);
    });
  }

  function openNote(id, text) {
    currentId = id;
    textarea.value = text || '';
    showEditor();
    textarea.focus();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (currentId) {
        await window.overlayAPI.notes.update(currentId, textarea.value);
      }
    }, 500);
  }

  textarea.addEventListener('input', scheduleSave);

  addBtn.addEventListener('click', async () => {
    const note = await window.overlayAPI.notes.create('');
    openNote(note.id, '');
  });

  backBtn.addEventListener('click', async () => {
    clearTimeout(saveTimer);
    if (currentId) {
      await window.overlayAPI.notes.update(currentId, textarea.value);
    }
    showList();
    renderList();
  });

  deleteBtn.addEventListener('click', async () => {
    clearTimeout(saveTimer);
    if (currentId) {
      await window.overlayAPI.notes.delete(currentId);
    }
    showList();
    renderList();
  });

  showList();
  renderList();
})();
