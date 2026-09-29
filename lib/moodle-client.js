function buildBase(siteUrl) {
  return siteUrl.replace(/\/$/, '');
}

async function callWS(siteUrl, token, wsfunction, params = {}) {
  const url = new URL(buildBase(siteUrl) + '/webservice/rest/server.php');
  url.searchParams.set('wstoken', token);
  url.searchParams.set('wsfunction', wsfunction);
  url.searchParams.set('moodlewsrestformat', 'json');

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item && typeof item === 'object') {
          Object.entries(item).forEach(([subKey, subVal]) => {
            url.searchParams.set(`${key}[${i}][${subKey}]`, subVal);
          });
        } else {
          url.searchParams.set(`${key}[${i}]`, item);
        }
      });
    } else if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data && data.exception) {
    throw new Error(data.message || data.errorcode || 'Ошибка Moodle API');
  }
  return data;
}

async function login(siteUrl, username, password) {
  const url = new URL(buildBase(siteUrl) + '/login/token.php');
  url.searchParams.set('username', username);
  url.searchParams.set('password', password);
  url.searchParams.set('service', 'moodle_mobile_app');

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (!data.token) throw new Error('Не удалось получить токен доступа.');
  return data.token;
}

function getSiteInfo(siteUrl, token) {
  return callWS(siteUrl, token, 'core_webservice_get_site_info');
}

async function getCourses(siteUrl, token, userId) {
  const courses = await callWS(siteUrl, token, 'core_enrol_get_users_courses', { userid: userId });
  return courses || [];
}

async function getDeadlines(siteUrl, token, courseIds) {
  if (!courseIds.length) return [];
  const data = await callWS(siteUrl, token, 'mod_assign_get_assignments', { courseids: courseIds });
  const items = [];
  (data.courses || []).forEach((course) => {
    (course.assignments || []).forEach((a) => {
      if (a.duedate) {
        items.push({
          courseName: course.fullname,
          name: a.name,
          duedate: a.duedate * 1000
        });
      }
    });
  });
  return items.sort((a, b) => a.duedate - b.duedate);
}

async function getGrades(siteUrl, token, userId, courses) {
  const items = [];
  for (const course of courses) {
    try {
      const data = await callWS(siteUrl, token, 'gradereport_user_get_grade_items', {
        courseid: course.id,
        userid: userId
      });
      const userGrades = (data.usergrades && data.usergrades[0]) || {};
      (userGrades.gradeitems || []).forEach((gi) => {
        if (gi.itemtype === 'course') return;
        if (gi.gradeformatted && gi.gradeformatted.trim() !== '-') {
          items.push({
            courseName: course.fullname,
            itemName: gi.itemname,
            grade: gi.gradeformatted.trim()
          });
        }
      });
    } catch (e) {
      // курс без доступных оценок — пропускаем
    }
  }
  return items;
}

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getAnnouncements(siteUrl, token, courseIds) {
  if (!courseIds.length) return [];
  const forums = await callWS(siteUrl, token, 'mod_forum_get_forums_by_courses', { courseids: courseIds });
  const newsForums = (forums || []).filter((f) => f.type === 'news');
  const items = [];

  for (const forum of newsForums) {
    try {
      const data = await callWS(siteUrl, token, 'mod_forum_get_forum_discussions', { forumid: forum.id });
      (data.discussions || []).forEach((d) => {
        items.push({
          courseName: forum.course_fullname || '',
          title: d.name,
          message: stripHtml(d.message).slice(0, 140),
          date: d.created ? d.created * 1000 : null
        });
      });
    } catch (e) {
      // форум недоступен (нет прав) — пропускаем
    }
  }

  return items.sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 20);
}

async function getMaterials(siteUrl, token, courses) {
  const items = [];
  for (const course of courses) {
    try {
      const sections = await callWS(siteUrl, token, 'core_course_get_contents', { courseid: course.id });
      (sections || []).forEach((section) => {
        (section.modules || []).forEach((mod) => {
          if (['resource', 'folder', 'url', 'page'].includes(mod.modname)) {
            const file = (mod.contents || [])[0];
            let url = null;
            if (file && file.fileurl) {
              const sep = file.fileurl.includes('?') ? '&' : '?';
              url = file.fileurl + sep + 'token=' + token;
            } else if (mod.modname === 'url' && mod.url) {
              url = mod.url;
            }
            items.push({
              courseName: course.fullname,
              name: mod.name,
              url
            });
          }
        });
      });
    } catch (e) {
      // курс без доступа к содержимому — пропускаем
    }
  }
  return items;
}

module.exports = {
  login,
  getSiteInfo,
  getCourses,
  getDeadlines,
  getGrades,
  getAnnouncements,
  getMaterials
};
