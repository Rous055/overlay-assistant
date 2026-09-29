document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;

  const tabId = btn.dataset.tab;

  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('active', v.dataset.view === tabId);
  });
});

// Общий помощник: Electron оборачивает ошибки из main-процесса в служебный
// текст вида "Error invoking remote method '...': Error: <причина>".
// Вырезаем это, чтобы в alert'ах видна была только реальная причина.
window.cleanIpcError = function (err) {
  let msg = (err && err.message) || '';
  msg = msg.replace(/^Error invoking remote method '[^']+':\s*/i, '');
  msg = msg.replace(/^Error:\s*/i, '');
  return msg || 'Произошла ошибка.';
};
