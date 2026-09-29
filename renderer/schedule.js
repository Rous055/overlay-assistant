(function () {
  // Учебное расписание — 4 курс, 4 группа ИВТ, I полугодие 26-27 уч.г.
  // Взято из присланного файла деканата. Меняется по семестрам — когда
  // появится новый файл, эти данные нужно будет обновить вручную.
  const STUDY_SCHEDULE = {
    'Понедельник': [
      { time: '11:30', text: 'ОВП (лек.) Насонов Никитинская 14Б ауд. 32 / ОВП (практика) Дубова Никитинская 14Б ауд. 32' },
      { time: '13:25', text: 'ОВП (лек.) Насонов Никитинская 14Б ауд. 32 / ОВП (практика) Дубова Никитинская 14Б ауд. 44' }
    ],
    'Вторник': [
      { time: '8:00', text: 'Аналитика больших объемов данных лек. Прохоров К.А. (https://edu.vsu.ru/course/view.php?id=10981)' },
      { time: '9:45', text: 'Аналитика больших объемов данных лаб. Прохоров К.А. 401' }
    ],
    'Среда': [
      { time: '9:45', text: 'Основы права (лекция + практика) Саприн И.Г. (дистант)' },
      { time: '16:55', text: 'Психология личности и её саморазвития (лек. + прак.) Велимедова О.В. (дистант)' }
    ],
    'Четверг': [
      { time: '11:30', text: 'БЖД Каленикина (дистант)' },
      { time: '13:25', text: 'БЖД Хорошилова (дистант)' },
      { time: '15:10', text: 'Основы теории передачи информации лаб. Гутерман Н.Е. 401' },
      { time: '16:55', text: 'Основы теории передачи информации лаб. Гутерман Н.Е. 401' }
    ],
    'Пятница': [
      { time: '9:45', text: 'Графические пользовательские интерфейсы лек.+лаб. Коровченко И.С. (https://edu.vsu.ru/course/view.php?id=25663)' },
      { time: '13:25', text: 'ООП лек.+лаб. Коровченко И.С. / Жевнеров К.С. (https://edu.vsu.ru/course/view.php?id=25664)' }
    ],
    'Суббота': [
      { time: '11:30', text: 'Защита информации лек. Овчинникова Т.М. 407' },
      { time: '13:25', text: 'Защита информации лаб. Овчинникова Т.М. 407' }
    ]
  };

  const modePersonalBtn = document.getElementById('schedModePersonal');
  const modeStudyBtn = document.getElementById('schedModeStudy');
  const personalPane = document.getElementById('schedPersonalPane');
  const studyPane = document.getElementById('schedStudyPane');
  const studyListEl = document.getElementById('schedStudyList');

  function escapeHtmlGlobal(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function renderStudySchedule() {
    studyListEl.innerHTML = '';
    Object.keys(STUDY_SCHEDULE).forEach((day) => {
      const lessons = STUDY_SCHEDULE[day];
      if (!lessons.length) return;

      const header = document.createElement('div');
      header.className = 'links-header-title sched-day-heading';
      header.textContent = day;
      studyListEl.appendChild(header);

      lessons.forEach((lesson) => {
        const row = document.createElement('div');
        row.className = 'row sched-study-row';
        row.innerHTML =
          '<div class="meta sched-study-time">' + escapeHtmlGlobal(lesson.time) + '</div>' +
          '<div class="title sched-study-text">' + escapeHtmlGlobal(lesson.text) + '</div>';
        studyListEl.appendChild(row);
      });
    });
  }

  modePersonalBtn.addEventListener('click', () => {
    modePersonalBtn.classList.add('active');
    modeStudyBtn.classList.remove('active');
    personalPane.style.display = 'block';
    studyPane.style.display = 'none';
  });

  modeStudyBtn.addEventListener('click', () => {
    modeStudyBtn.classList.add('active');
    modePersonalBtn.classList.remove('active');
    studyPane.style.display = 'block';
    personalPane.style.display = 'none';
    renderStudySchedule();
  });

  const prevBtn = document.getElementById('schedPrevBtn');
  const nextBtn = document.getElementById('schedNextBtn');
  const dateLabelEl = document.getElementById('schedDateLabel');
  const listEl = document.getElementById('schedList');

  const addToggleBtn = document.getElementById('schedAddToggle');
  const addForm = document.getElementById('schedAddForm');
  const timeInput = document.getElementById('schedTimeInput');
  const titleInput = document.getElementById('schedTitleInput');
  const addConfirmBtn = document.getElementById('schedAddConfirm');

  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatLabel(d) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d - today) / 86400000);
    const dayMonth = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    if (diffDays === 0) return 'Сегодня, ' + dayMonth;
    if (diffDays === 1) return 'Завтра, ' + dayMonth;
    if (diffDays === -1) return 'Вчера, ' + dayMonth;
    const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    return weekday + ', ' + dayMonth;
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  async function render() {
    dateLabelEl.textContent = formatLabel(currentDate);
    const items = await window.overlayAPI.schedule.list(dateKey(currentDate));
    listEl.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'placeholder';
      empty.textContent = 'На этот день ничего не запланировано.';
      listEl.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'row sched-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'sched-checkbox';
      checkbox.checked = item.done;
      checkbox.addEventListener('change', async () => {
        await window.overlayAPI.schedule.toggle(item.id);
        render();
      });

      const titleEl = document.createElement('div');
      titleEl.className = 'sched-item-title' + (item.done ? ' done' : '');
      titleEl.innerHTML = (item.time ? '<span class="sched-time">' + escapeHtml(item.time) + '</span>' : '') + escapeHtml(item.title);

      const delBtn = document.createElement('button');
      delBtn.className = 'link-delete-btn';
      delBtn.textContent = '×';
      delBtn.title = 'Удалить';
      delBtn.addEventListener('click', async () => {
        await window.overlayAPI.schedule.delete(item.id);
        render();
      });

      row.appendChild(checkbox);
      row.appendChild(titleEl);
      row.appendChild(delBtn);
      listEl.appendChild(row);
    });
  }

  prevBtn.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    render();
  });

  nextBtn.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    render();
  });

  addToggleBtn.addEventListener('click', () => {
    addForm.style.display = addForm.style.display === 'none' ? 'flex' : 'none';
    if (addForm.style.display === 'flex') titleInput.focus();
  });

  async function submitAdd() {
    const title = titleInput.value.trim();
    if (!title) return;
    await window.overlayAPI.schedule.add(dateKey(currentDate), timeInput.value || null, title);
    titleInput.value = '';
    timeInput.value = '';
    addForm.style.display = 'none';
    render();
  }

  addConfirmBtn.addEventListener('click', submitAdd);
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAdd();
  });

  render();
})();
