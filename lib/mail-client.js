const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const YANDEX_IMAP = { host: 'imap.yandex.ru', port: 993, secure: true };

function makeClient({ email, password }) {
  const client = new ImapFlow({
    host: YANDEX_IMAP.host,
    port: YANDEX_IMAP.port,
    secure: YANDEX_IMAP.secure,
    auth: { user: email, pass: password },
    logger: false
  });

  // imapflow иногда эмитит 'error' на сокете уже ПОСЛЕ того, как наш запрос
  // отработал (например, при закрытии соединения). Если это событие не
  // слушать, Node считает такую ошибку необработанной и валит весь процесс
  // Electron. Слушаем и просто игнорируем — реальные ошибки мы и так ловим
  // через await/try-catch в местах вызова.
  client.on('error', () => {});

  return client;
}

function describeConnectError(err) {
  const msg = (err && err.message) || '';
  const code = err && (err.authenticationFailed ? 'AUTH' : err.code);

  if (err && err.authenticationFailed) {
    return 'Логин или пароль приложения неверны (или в Яндекс.Почте выключен доступ по IMAP — Настройки → Почтовые программы → включить IMAP).';
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'Не удалось связаться с сервером Яндекса. Проверьте интернет.';
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED') {
    return 'Сервер Яндекса не отвечает (таймаут). Проверьте интернет или повторите позже.';
  }
  return 'Ошибка подключения: ' + (msg || 'неизвестная причина') +
    '. Проверьте, включён ли доступ по IMAP в настройках Яндекс.Почты (Настройки → Почтовые программы).';
}

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function listMessages({ email, password }, limit = 20) {
  const client = makeClient({ email, password });
  try {
    await client.connect();
  } catch (err) {
    throw new Error(describeConnectError(err));
  }
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.status('INBOX', { messages: true });
      const total = status.messages || 0;
      if (total === 0) return [];

      const from = Math.max(1, total - limit + 1);
      const range = `${from}:${total}`;
      const messages = [];

      for await (const msg of client.fetch(range, { envelope: true, uid: true, flags: true })) {
        const fromAddr = msg.envelope.from && msg.envelope.from[0];
        messages.push({
          uid: msg.uid,
          subject: msg.envelope.subject || '(без темы)',
          from: fromAddr ? (fromAddr.name || fromAddr.address) : '',
          date: msg.envelope.date,
          seen: msg.flags ? msg.flags.has('\\Seen') : false
        });
      }

      messages.reverse(); // самые новые сверху
      return messages;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

async function getMessageBody({ email, password }, uid) {
  const client = makeClient({ email, password });
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const { content } = await client.download(uid, undefined, { uid: true });
      const parsed = await simpleParser(content);
      return {
        subject: parsed.subject || '(без темы)',
        from: parsed.from ? parsed.from.text : '',
        date: parsed.date,
        text: parsed.text || (parsed.html ? stripHtml(parsed.html) : '')
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

module.exports = { listMessages, getMessageBody };
