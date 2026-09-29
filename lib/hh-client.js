const USER_AGENT = 'OverlayAssistant/1.0 (personal overlay app)';

function buildAuthUrl({ clientId, redirectUri }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri
  });
  return `https://hh.ru/oauth/authorize?${params.toString()}`;
}

async function exchangeCode({ clientId, clientSecret, redirectUri, code }) {
  const res = await fetch('https://hh.ru/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });
  if (!res.ok) throw new Error('Не удалось обменять код на токен (код ' + res.status + ')');
  return res.json();
}

async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch('https://hh.ru/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    })
  });
  if (!res.ok) throw new Error('Не удалось обновить токен (код ' + res.status + ')');
  return res.json();
}

async function fetchNegotiations(accessToken) {
  const res = await fetch('https://api.hh.ru/negotiations?per_page=20', {
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'User-Agent': USER_AGENT
    }
  });
  if (!res.ok) throw new Error('Ошибка запроса откликов (код ' + res.status + ')');
  const data = await res.json();
  return (data.items || []).map((item) => ({
    id: item.id,
    vacancyName: item.vacancy ? item.vacancy.name : '(вакансия удалена)',
    employerName: item.vacancy && item.vacancy.employer ? item.vacancy.employer.name : '',
    state: item.state ? item.state.name : '',
    updatedAt: item.updated_at || item.created_at,
    url: item.vacancy ? item.vacancy.alternate_url : null
  }));
}

function formatSalary(salary) {
  if (!salary) return '';
  const from = salary.from ? salary.from.toLocaleString('ru-RU') : '';
  const to = salary.to ? salary.to.toLocaleString('ru-RU') : '';
  const cur = salary.currency === 'RUR' ? '₽' : (salary.currency || '');
  if (from && to) return `${from}–${to} ${cur}`;
  if (from) return `от ${from} ${cur}`;
  if (to) return `до ${to} ${cur}`;
  return '';
}

async function searchVacancies(text) {
  const params = new URLSearchParams({ text: text || '', per_page: '20' });
  const res = await fetch('https://api.hh.ru/vacancies?' + params.toString(), {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) throw new Error('Ошибка поиска вакансий (код ' + res.status + ')');
  const data = await res.json();
  return (data.items || []).map((item) => ({
    id: item.id,
    name: item.name,
    employerName: item.employer ? item.employer.name : '',
    salary: formatSalary(item.salary),
    url: item.alternate_url,
    publishedAt: item.published_at
  }));
}

module.exports = { buildAuthUrl, exchangeCode, refreshAccessToken, fetchNegotiations, searchVacancies };
