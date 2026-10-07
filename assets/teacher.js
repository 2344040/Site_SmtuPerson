// assets/teacher.js

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const capFirst = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
/* Ссылка на сайт: добавляем протокол, если его забыли ввести */
const siteHref = s => /^https?:\/\//i.test(String(s)) ? String(s) : 'https://' + String(s);
const makeShort = name => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const initials = parts.slice(1).map(w => w[0].toUpperCase() + '.').join('');
  return initials ? parts[0] + ' ' + initials : parts[0];
};
const isFilled = i => typeof i === 'string'
  ? i.trim() !== ''
  : Object.entries(i || {}).some(([k, v]) => k !== 'icon' && String(v ?? '').trim() !== '');

/* Если в строке есть теги — вставляем как HTML, иначе как текст с переносами */
const htmlOrText = s => /<[a-z!\/]/i.test(s) ? s : esc(s).replace(/\n/g, '<br>');

const has = k => Array.isArray(T[k]) && T[k].length;
let T;

/* Бейдж версии: берём из параметра ?v=NN, с которым этот файл загрузился */
const SCRIPT_VER = ((document.currentScript && document.currentScript.src) || '').match(/[?&]v=(\d+)/);
const verBadgeEl = document.getElementById('p-ver');
if (verBadgeEl) verBadgeEl.textContent = SCRIPT_VER ? 'v.' + SCRIPT_VER[1] : 'v.—';

fetch('data/teachers.json?v=' + Date.now()).then(r => r.json()).then(d => {
  T = d.teachers.find(t => t.id === new URLSearchParams(location.search).get('id'))
    || d.teachers.find(t => !t.hidden) || d.teachers[0];
  if (!T) { document.getElementById('main').innerHTML = '<p class="p-4">Нет данных.</p>'; return; }
  if (T.hidden) {
    document.title = 'Страница не опубликована — СПбГМТУ';
    document.getElementById('main').innerHTML = '<p class="p-4">Эта страница не опубликована.</p>';
    return;
  }
  Object.keys(T).forEach(k => { if (Array.isArray(T[k])) T[k] = T[k].filter(isFilled); });
  document.title = (T.short || makeShort(T.name) || T.name) + ' — СПбГМТУ';
  fillHeader();
  buildMenu();
  renderMain();
  renderRail();
  initReveal();
  initToggles();
  initCardReveal();
  initShare();
});

/* ═══ Заполнение шапки ═══ */
function fillHeader() {
  document.getElementById('p-photo').src = T.photo;

  const kicker = [T.university, T.faculty].filter(Boolean).join(' · ');
  document.getElementById('p-kicker').textContent = kicker;

  /* ФИО делим по любым пробелам, включая неразрывные (копирование из Word/PDF) */
  const nameParts = String(T.name || '').trim().split(/[\s\u00A0\u2007\u202F]+/).filter(Boolean);
  const surname = nameParts[0] || '';
  const rest = nameParts.slice(1).join(' ');
  document.getElementById('p-name').innerHTML =
    `<span class="surname">${esc(surname)}</span>` +
    (rest ? `<br><span class="given-name">${esc(rest)}</span>` : '');
  document.getElementById('p-name').innerHTML =
    `<span class="surname">${esc(surname)}</span><br><span class="given-name">${esc(rest)}</span>`;
  document.getElementById('p-post').textContent = T.post;
  /* Структурированные чипы: степень → звание → стаж, затем произвольные чипы */
  const structured = [];
  if (T.degree_level || T.degree_branch) {
    structured.push([capFirst(T.degree_level || ''), T.degree_branch || ''].filter(Boolean).join(' '));
  }
  if (T.academic_title) structured.push(T.academic_title);
  const yrs = parseInt(String(T.experience_years ?? '').trim(), 10);
  if (!isNaN(yrs)) structured.push('Педагогический стаж ' + yrs + ' ' + pluralize(yrs, ['год', 'года', 'лет']));
  document.getElementById('p-chips').innerHTML = [...structured, ...(T.chips || [])].map(c =>
    `<span class="chip" title="${esc(c)}"><b class="chip-text">${esc(c)}</b></span>`).join('');


}

// * buildMenu
/* ═══ Меню ═══ */
function buildMenu() {
  const items = [
    { h: 'main', t: '<i class="fa-regular fa-user"></i>', v: true },
    { h: 'education', t: 'Образование', v: has('education') || has('upk') },
    { h: 'career', t: 'Карьера', v: has('career') || has('achievements') },
    { h: 'edu-activity', t: 'Педагогическая деятельность', v: has('programs') || has('courses') || has('schedule') || has('session') || has('books') || hasMat() },
    { h: 'science', t: 'Научная деятельность', v: has('metrics') || has('publications') || has('projects') || has('patents') },
    { h: 'publications', t: 'Публикации', v: PUB_RUBRICS.some(r => has(r.key)) },
    { h: 'social', t: 'Общественная деятельность', v: has('social') || T.social_text },
    { h: 'news', t: 'Новости', v: has('news') }
  ];
  document.getElementById('menu').innerHTML = items.filter(i => i.v).map(i =>
    `<li class="nav-item"><a class="nav-link" href="#${i.h}">${i.t}</a></li>`).join('');
}

/* ═══ Секция ═══ */
const sec = (id, cls, title, body) =>
  `<section class="section ${cls}" id="${id}"><h2 class="sec-title reveal">${title}</h2><div class="rule"></div>${body}</section>`;
const sub = (id, title, body) =>
  `<section class="mt-5" id="${id}"><h3 class="sub-title reveal">${title}</h3><div class="rule-sm"></div>${body}</section>`;

/* ═══ Timeline ═══ */
const timeline = a => `<ul class="timeline reveal">${a.map(i =>
  `<li><span class="year">${esc(i.year)}</span>
    <h3 class="fs-6 fw-bold mb-1">${esc(i.title)}</h3>${esc(i.text)}</li>`).join('')}</ul>`;

// * programCards
/* ═══ Карточки программ/дисциплин ═══ */
const programCards = a => `<div class="row g-3 reveal">${a.map(i => {
  const tagLower = (i.tag || '').toLowerCase().trim();
  const tagCls = {
    'бакалавриат': 'lvl-green-1',
    'специалитет': 'lvl-green-2',
    'базовое высшее': 'lvl-green-3',
    'магистратура': 'lvl-yellow-1',
    'специализированное высшее': 'lvl-yellow-2',
    'аспирантура': 'lvl-blue-1',
    'докторантура': 'lvl-blue-2',
    'спо': 'lvl-purple',
    'дпо': 'lvl-teal'
  }[tagLower] || 'lvl-default';

  const href = i.url ? esc(siteHref(i.url)) : '';
  const open = href ? `<a class="card-lift" href="${href}" target="_blank" rel="noopener">` : '<div class="card-lift">';
  const close = href ? '</a>' : '</div>';
  return `<div class="col-md-${a.length <= 2 ? 6 : 4}">
${open}<div class="bar"></div><div class="p-3 d-flex flex-column">
<span class="tag ${tagCls}" style="text-transform:capitalize">${esc(i.tag)}</span>
<h3 class="fs-6 fw-bold mt-2">${esc(i.title)}</h3>
<small class="text-secondary d-flex justify-content-between align-items-center">
<span>${esc(i.text)}</span>
${href ? '<i class="bi bi-box-arrow-up-right prog-link" aria-hidden="true"></i>' : ''}
</small>
${i.comment ? `<small class="text-secondary fst-italic mt-1 d-block">${esc(i.comment)}</small>` : ''}
</div>${close}</div>`;
}).join('')}</div>`;

const upkCards = (a, limit = 6) => `
<div class="row g-3 reveal" id="upk-list">${a.map((i, idx) => `
  <div class="col-md-6 ${idx >= limit ? 'd-none reveal-hidden' : ''}">
    <div class="card-lift"><div class="bar"></div><div class="p-3">
      <span class="tag rinc">${esc(i.year)}</span>
      <h3 class="fs-6 fw-bold mt-2 mb-1">${esc(i.title)}</h3>
      ${i.type ? `<div class="small mb-1">${esc(i.type)}</div>` : ''}
      ${i.text ? `<small class="text-secondary fst-italic">${esc(i.text)}</small>` : ''}
    </div></div>
  </div>`).join('')}</div>
${a.length > limit ? `<div class="text-center mt-4 mb-5"><button class="btn btn-outline-secondary btn-sm reveal-btn">Показать ещё</button></div>` : ''}`;

/* ═══ Достижения с раскрытием ═══ */
const achievementCards = (a, limit = 6) => `
<div class="row g-3 reveal" id="ach-list">${a.map((i, idx) => {
  const rawIcon = (String(i.icon || '').trim().match(/[a-z][a-z0-9-]*/i) || [])[0] || '';
  const iconKey = ICON_OK.has(rawIcon) ? rawIcon : 'award';
  return `
  <div class="col-md-6 ${idx >= limit ? 'd-none reveal-hidden' : ''}">
    <div class="card-lift"><div class="bar"></div><div class="p-3 d-flex flex-column">
      <div class="d-flex justify-content-between">
        <i class="bi bi-${iconKey} fs-4" style="color:var(--amber)"></i>
        <small class="text-secondary mt-1">${esc(i.year)}</small>
      </div>
      <h3 class="fs-6 fw-bold mt-2 mb-1">${esc(i.title)}</h3>
      <small class="text-secondary text-toggle-content">${esc(i.text)}</small>
      <span class="text-toggle-btn">
        <span class="dots">раскрыть <i class="bi bi-caret-down-fill"></i></span>
        <span class="collapse-text" style="display:none">скрыть <i class="bi bi-caret-up-fill"></i></span>
      </span>
    </div></div>
  </div>`;
}).join('')}</div>
${a.length > limit ? `<div class="text-center mt-4 mb-5"><button class="btn btn-outline-secondary btn-sm reveal-btn">Показать ещё</button></div>` : ''}`;

/* ═══ Таблица ═══ */
const table = (head, rows, hover = false) => `
<div class="table-responsive reveal">
   <table class="table align-middle">
    <thead><tr>${head.map(h => `<th${h.e ? ' class="text-end"' : ''}>${h.t}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td${c.e ? ' class="text-end"' : ''}>${esc(c.v)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</div>`;

/* ═══ Публикации ═══ */
/* ═══ Публикации: библиографический формат ═══ */
const pubTagCls = tag => {
  const t = String(tag || '').toLowerCase();
  if (t.includes('scopus')) return 'scopus';
  if (t.includes('ринц')) return 'rinc';
  if (t.includes('книг') || t.includes('book')) return 'book';
  return 'vak';
};

/* Библиоспан: слэш склеен с первым словом выходных в nowrap-кусочек,
внутри которого перенос невозможен даже аварийный */
const biblioSpan = b => {
  const s = String(b || '').trim();
  if (!s) return '';
  const sp = s.indexOf(' ');
  const head = sp === -1 ? s : s.slice(0, sp);
  const tail = sp === -1 ? '' : s.slice(sp + 1);
  return `<span class="mat-biblio"><span class="mat-nows"><span class="mat-slash">//</span> ${esc(head)}</span>${tail ? ' ' + esc(tail) : ''}</span>`;
};

const pubs = a => a.map(i => {
  const author = i.author ? `<span class="mat-author">${esc(i.author)}</span>` : '';
  const title = i.title ? `<span class="pub-title">${esc(i.title)}</span>` : '';
  const biblio = i.biblio || i.text || '';
  const description = i.description || '';
  const biblioHtml = biblio
    ? `<span class="mat-biblio">${(i.author || i.title) ? '<span class="mat-slash">//</span>&nbsp;' : ''}${esc(biblio)}</span>`
    : '';
  const descriptionHtml = description ? `<span class="mat-description">${esc(description)}</span>` : '';
  const tag = i.tag ? `<span class="tag ${pubTagCls(i.tag)}">${esc(i.tag)}</span>` : '';
  const doi = i.doi ? `<span class="pub-doi">DOI: ${esc(i.doi)}</span>` : '';
  const link = i.url || i.link || '';
  return `
<div class="pub"><span class="py">${esc(i.year)}</span>
  <div class="pub-body">
   <div class="mat-line">${author}${title}${biblioHtml ? ' ' + biblioHtml : ''}${tag ? ' ' + tag : ''}${doi ? ' ' + doi : ''}</div>
    ${descriptionHtml ? `<div class="mat-description-line">${descriptionHtml}</div>` : ''}
  </div>
  ${link ? `<a class="mat-btn" href="${esc(link)}" target="_blank" rel="noopener" title="Открыть публикацию"><i class="bi bi-box-arrow-up-right"></i></a>` : ''}
</div>`;
}).join('');

/* ═══ Единый раздел «Публикации»: рубрики произведений героя ═══ */
const PUB_RUBRICS = [
  { key: 'pub_articles', title: 'Статьи', tag: true, doi: true, buy: false },
  { key: 'pub_theses', title: 'Тезисы', tag: false, doi: false, buy: false },
  { key: 'pub_textbooks', title: 'Учебники', tag: false, doi: false, buy: true },
  { key: 'pub_posobia', title: 'Учебные пособия', tag: false, doi: false, buy: false },
  { key: 'pub_mono', title: 'Монографии', tag: false, doi: false, buy: true },
  { key: 'pub_other', title: 'Прочее', tag: false, doi: false, buy: true },
];
/* Год не выносим влево: он дописывается после выходных данных (часто его там и пишут) */
const pubRow = (i, r, hidden) => {
  const author = i.author ? `<span class="mat-author">${esc(i.author)}</span>` : '';
  const title = i.title ? `<span class="pub-title">${esc(i.title)}</span>` : '';
  const biblio = [i.biblio, i.year].filter(v => String(v || '').trim()).join(', ');
  const biblioHtml = (i.author || i.title) ? biblioSpan(biblio) : '';
  const tag = r.tag && i.tag ? `<span class="tag ${pubTagCls(i.tag)}">${esc(i.tag)}</span>` : '';
  const doi = r.doi && i.doi ? `<span class="pub-doi">DOI: ${esc(i.doi)}</span>` : '';
  const desc = i.description ? `<div class="mat-description-line"><span class="mat-description">${esc(i.description)}</span></div>` : '';
  const actions = [];
  if (i.url) actions.push(`<a class="mat-btn" href="${esc(i.url)}" target="_blank" rel="noopener" title="Открыть или скачать"><i class="bi bi-box-arrow-up-right"></i></a>`);
  if (r.buy && i.url_buy) actions.push(`<a class="mat-btn" href="${esc(i.url_buy)}" target="_blank" rel="noopener" title="Купить"><i class="bi bi-cart-fill"></i></a>`);
  return `<div class="pub${hidden ? ' d-none reveal-hidden' : ''}"><div class="pub-body">
<div class="mat-line">${author}${title}${biblioHtml ? ' ' + biblioHtml : ''}${tag ? ' ' + tag : ''}${doi ? ' ' + doi : ''}</div>
${desc}
</div>${actions.join('')}</div>`;
};
/* * Рубрика: строки + «Показать ещё» при более чем N записях (п.11) */

const PUB_LIMIT = 5; /* сколько записей видно в рубрике без раскрытия */
const pubRubric = (arr, r) =>
  `<div id="publist-${r.key}">${arr.map((i, idx) => pubRow(i, r, idx >= PUB_LIMIT)).join('')}</div>` +
  (arr.length > PUB_LIMIT ? `<div class="text-center mt-3 mb-4"><button class="btn btn-outline-secondary btn-sm reveal-btn">Показать ещё</button></div>` : '');

/* ═══ Учебные материалы: автоопределение и дерево рубрик ═══ */
const isExternal = url => /^https?:\/\//i.test(url);

const pluralize = (n, forms) => {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
};

/* Формы подписей метрик: [1, 2–4, 5+]. Чего нет в словаре — выводится как есть */
const METRIC_FORMS = {
  /* Актуальные ключи (род. падеж) из METRIC_LABELS админки */
  'публикаций': ['публикация', 'публикации', 'публикаций'],
  'монографий': ['монография', 'монографии', 'монографий'],
  'учебников': ['учебник', 'учебника', 'учебников'],
  'ст. ВАК': ['статья ВАК', 'статьи ВАК', 'статей ВАК'],
  'ст. Scopus': ['статья Scopus', 'статьи Scopus', 'статей Scopus'],
  'ст. WoS': ['статья WoS', 'статьи WoS', 'статей WoS'],
  'ст. РИНЦ': ['статья РИНЦ', 'статьи РИНЦ', 'статей РИНЦ'],
  'патентов': ['патент', 'патента', 'патентов'],
  /* Устаревшие ключи — для старых записей в JSON */
  'монография': ['монография', 'монографии', 'монографий'],
  'патенты': ['патент', 'патента', 'патентов'],
};

/* Белый список иконок достижений: всё, что реально есть в Bootstrap Icons */
const ICON_OK = new Set(['award', 'award-fill', 'trophy', 'star', 'patch-check', 'mortarboard', 'gem', 'bookmark-star']);

const metricLabel = (n, l) =>
  METRIC_FORMS[l] ? pluralize(parseInt(String(n).replace(/\s.*/, ''), 10) || 0, METRIC_FORMS[l]) : l;

const MAT_ICON = {
  pdf: 'bi-file-earmark-pdf-fill', doc: 'bi-file-earmark-word-fill',
  excel: 'bi-file-earmark-excel-fill', djvu: 'bi-file-earmark-text-fill',
  ppt: 'bi-file-earmark-slides-fill', zip: 'bi-file-earmark-zip-fill',
  audio: 'bi-mic-fill', video: 'bi-camera-video-fill',
  'video-youtube': 'bi-youtube', image: 'bi-image-fill',
  shop: 'bi-cart-fill', book: 'bi-book-fill',
  file: 'bi-file-earmark-fill', link: 'bi-link-45deg',
};
const MAT_LABEL = { pdf: 'PDF', doc: 'DOC', excel: 'XLS', djvu: 'DJVU', ppt: 'PPT', zip: 'архив', audio: 'аудио', video: 'видео', image: 'изображение', 'video-youtube': 'YouTube', shop: 'магазин' };
/* Типы, которые браузер реально скачивает: им кнопка скачивания, остальным — переход */
const DL_TYPES = new Set(['pdf', 'doc', 'djvu', 'excel', 'ppt', 'zip', 'audio']);

const MAT_SRC = [
  [/youtube\.com|youtu\.be/, 'YouTube', 'video-youtube'],
  [/rutube\.ru/, 'Rutube', 'video'],
  [/vimeo\.com/, 'Vimeo', 'video'],
  [/vk\.com\/video|vkvideo\.ru/, 'VK Видео', 'video'],
  [/ozon\.ru/, 'Ozon', 'shop'],
  [/wildberries\.ru/, 'Wildberries', 'shop'],
  [/litres\.ru/, 'Литрес', 'shop'],
  [/labirint\.ru/, 'Лабиринт', 'shop'],
];
const matType = url => {
  const u = String(url || '').toLowerCase();
  const src = MAT_SRC.find(([re]) => re.test(u));
  if (src) return src[2];
  const ext = (u.match(/\.(pdf|docx?|pptx?|xlsx?|xlsm|csv|ods|djvu|zip|rar|7z|mp3|wav|m4a|mp4|avi|mov|mkv|webm|jpe?g|png|gif|webp)(?:[?#]|$)/) || [])[1];
  if (!ext) return null;
  if (ext === 'pdf') return 'pdf';
  if (ext === 'djvu') return 'djvu';
  if (ext.startsWith('doc')) return 'doc';
  if (ext.startsWith('ppt')) return 'ppt';
  if (/^(xlsx?|xlsm|csv|ods)$/.test(ext)) return 'excel';
  if (/^(zip|rar|7z)$/.test(ext)) return 'zip';
  if (/^(mp3|wav|m4a)$/.test(ext)) return 'audio';
  if (/^(mp4|avi|mov|mkv|webm)$/.test(ext)) return 'video';
  return 'image';
};

/* Ссылка материала: протокол оставляем как есть; голый домен получает https://;
относительный путь внутри репозитория не трогаем */
const matHref = s => {
  const u = String(s || '').trim();
  if (!u) return '';
  if (/^(https?:|mailto:|tel:|ftp:)/i.test(u)) return u;
  if (/^[a-z0-9а-яё-]+(\.[a-z0-9а-яё-]+)+([\/?#]|$)/i.test(u)) return 'https://' + u;
  return u;
};

const matSource = url => {
  const u = String(url || '').toLowerCase();
  const src = MAT_SRC.find(([re]) => re.test(u));
  return src ? src[1] : null;
};

/* Легаси: плоские строки с rub → дерево (пока данные не сохранены в новом формате) */
const matFromFlat = arr => {
  const root = [];
  const findHead = (siblings, title) => {
    let h = siblings.find(n => n.kind === 'head' && n.title === title);
    if (!h) { h = { kind: 'head', title, children: [] }; siblings.push(h); }
    return h;
  };
  arr.forEach(row => {
    const path = String(row.rub || '').split(/[\/›>|]/).map(s => s.trim()).filter(Boolean);
    let siblings = root;
    path.forEach(p => { const h = findHead(siblings, p); siblings = h.children; });
    const node = Object.assign({ kind: 'rec' }, row);
    delete node.rub;
    siblings.push(node);
  });
  return root;
};
/* Пустые узлы не выводим */
const matPrune = nodes => nodes
  .map(n => Object.assign({}, n, n.children ? { children: matPrune(n.children) } : {}))
  .filter(n => n.kind === 'head'
    ? (String(n.title || '').trim() || (n.children || []).length)
    : Object.entries(n).some(([k, v]) => k !== 'kind' && k !== 'children' && String(v ?? '').trim()));
const matNorm = arr => {
  if (!Array.isArray(arr) || !arr.length) return [];
  return matPrune(arr[0] && arr[0].kind ? arr : matFromFlat(arr));
};
const matCount = nodes => nodes.reduce((n, x) => n + (x.kind === 'rec' ? 1 : 0) + matCount(x.children || []), 0);

const matItem = (item, sec, isContainer, isSub) => {
  const t = matType(item.url);
  const fmt = t || (item.url ? 'link' : '');
  const icon = t ? MAT_ICON[t] : (item.url ? 'bi-link-45deg' : sec.fb);
  const isResources = sec.key === 'mat_resources';

  /* Автор — курсивом, первым */
  const author = item.author ? `<span class="mat-author">${esc(item.author)}</span>` : '';

  /* Название — вес 500 */
  const title = item.title ? `<span class="mat-title">${esc(item.title)}</span>` : '';

  /* Выходные данные — мелким серым; слэш неотрываем от первого слова */
  const biblio = (item.author || item.title) && item.biblio ? biblioSpan(item.biblio) : '';

  /* Описание — малый серый курсив; в книгах и пособиях сворачивается после 3 строк */
  const descCollapsible = sec.key === 'mat_books' || sec.key === 'mat_posobia';
  const description = item.description
    ? (descCollapsible
      ? `<span class="mat-description text-toggle-content">${esc(item.description)}</span><span class="text-toggle-btn mat-desc-toggle"><span class="dots">подробнее <i class="bi bi-caret-down-fill"></i></span><span class="collapse-text" style="display:none">скрыть <i class="bi bi-caret-up-fill"></i></span></span>`
      : `<span class="mat-description">${esc(item.description)}</span>`)
    : '';
  /* Строка 1: автор + название + выходные данные */
  let line1 = `<div class="mat-line">${author}${title}${biblio ? ' ' + biblio : ''}</div>`;
  /* Строка 2: описание + кнопка сворачивания (d-flex нужен initToggles для поиска контента) */
  const line2 = description ? `<div class="mat-description-line d-flex">${description}</div>` : '';

  /* Ресурсы: своя раскладка (название + видимый URL) */
  if (isResources) {
    line1 = `<div class="mat-line mat-line-res">
      <span class="mat-title">${esc(item.title)}</span>
      <span class="mat-url" title="${esc(item.url)}">${esc(item.url)}</span>
    </div>`;
  }

  /* Правая часть: иконка формата (янтарная) + кнопка по типу ссылки:
  файл (pdf/doc/xls/…) → скачать, страница/стрим/магазин → перейти */
  const tip = MAT_LABEL[t] || (t ? t : (item.url ? 'ссылка' : 'файл'));
  const actions = [`<i class="mat-icon bi ${icon}${fmt ? ' fmt-' + fmt : ''}" title="${tip}"></i>`];
  if (item.url) {
    const dl = DL_TYPES.has(t);
    actions.push(`<a href="${esc(matHref(item.url))}" class="mat-btn" target="_blank" rel="noopener" title="${dl ? 'Скачать' : 'Открыть'}"><i class="bi ${dl ? 'bi-download' : 'bi-box-arrow-up-right'}"></i></a>`);
  }
  if (item.url_buy) actions.push(`<a href="${esc(matHref(item.url_buy))}" class="mat-btn" target="_blank" rel="noopener" title="Купить"><i class="bi bi-cart-fill"></i></a>`);

  return `<li class="mat-item${isContainer ? ' mat-container' : ''}${isSub ? ' mat-sub' : ''}">
    <div class="mat-info">${line1}${line2}</div>
    <div class="mat-actions">${actions.join('')}</div>
  </li>`;
};

/* Ступени дерева: шрифт, цвет и отступ по уровню */
const MAT_INDENT = 24; /* шаг отступа в px для каждого нового уровня */
const MAT_HEAD_TEXT = 18; /* padding-left у .mat-h: где начинается фраза заголовка */
const matHeadStyle = (lvl, ind) => {
  const fs = lvl === 1 ? '20px' : lvl === 2 ? '16px' : lvl === 3 ? '14px' : '13px';
  const c = lvl === 1 ? 'var(--teal)' : lvl === 2 ? 'var(--ink)' : 'var(--muted)';
  const fw = lvl <= 2 ? 700 : 600;
  return `font-size:${fs};color:${c};font-weight:${fw};margin-left:${ind}px;`;
};
/* pos: 0 — единственный ребёнок, 1 — первый, 2 — средний, 3 — последний (для коннекторов) */
const renderMatNode = (node, depth, sec, sub, pos, ind) => {
  const kids = node.children || [];
  if (node.kind === 'head') {
    /* Дети рубрики выравниваются по началу её фразы, а не по левому краю */
    return `<div class="mat-h" style="${matHeadStyle(depth + 1, ind)}">${esc(node.title)}</div>` +
      kids.map(c => renderMatNode(c, depth + 1, sec, sub, pos, ind + MAT_HEAD_TEXT)).join('');
  }
  const isContainer = kids.length > 0;
  const kidCls = sub ? ` mat-kid${pos === 0 || pos === 1 ? ' mat-kid-first' : ''}${pos === 0 || pos === 3 ? ' mat-kid-last' : ''}` : '';
  const row = `<ul class="mat-list mat-lvl-${Math.min(depth, 3)}${kidCls}" style="margin-left:${ind}px">${matItem(node, sec, isContainer, sub)}</ul>`;
  if (!kids.length) return row;
  /* Дети контейнера: +24px вправо и статус потомка для коннекторов */
  return row + kids.map((c, ci) => renderMatNode(c, depth + 1, sec, true,
    kids.length === 1 ? 0 : ci === 0 ? 1 : ci === kids.length - 1 ? 3 : 2,
    ind + MAT_INDENT)).join('');
};

const MAT_SECTIONS = [
  { key: 'mat_posobia', title: 'Учебники/Учебные пособия', icon: 'bi-journal-text', fb: 'bi-file-earmark-fill' },
  { key: 'mat_books', title: 'Книги/Монографии', icon: 'bi-book', fb: 'bi-book-fill' },
  { key: 'mat_lectures', title: 'Записи лекций', icon: 'bi-mic', fb: 'bi-mic-fill' },
  { key: 'mat_video', title: 'Видео-материалы', icon: 'bi-camera-video', fb: 'bi-camera-video-fill' },
  { key: 'mat_resources', title: 'Полезные ресурсы', icon: 'bi-link-45deg', fb: 'bi-link-45deg' },
];
const hasMat = () => MAT_SECTIONS.some(s => has(s.key));

const materialsBlock = T => {
  const secs = MAT_SECTIONS.filter(s => has(s.key));
  if (!secs.length) return '';
  return `<div class="materials-accordion reveal">
${secs.map((s) => {
    const tree = matNorm(T[s.key]);
    return `
<details class="mat-group" name="materials">
<summary class="mat-summary">
<span class="mat-cat-title"><i class="bi ${s.icon} me-2"></i>${s.title}</span>
<span class="mat-count">${matCount(tree)}</span>
</summary>
<div class="mat-body">${tree.map(n => renderMatNode(n, 0, s, false, 2, 0)).join('')}</div>
</details>`;
  }).join('')}
</div>`;
};

/* ═══ Новости карусель ═══ */
function newsBlock() {
  if (!has('news')) return '';
  const pages = []; for (let i = 0; i < T.news.length; i += 9) pages.push(T.news.slice(i, i + 9));
  const slideHTML = (pg, active) => `<div class="carousel-item ${active ? 'active' : ''}"><div class="row g-2">${pg.map(n => `<div class="col-sm-6 col-lg-4">
      <div class="news-item">
        ${n.url ? `<a href="${esc(n.url)}">` : ''}
          <div class="news-img"><img src="${esc(n.img)}" alt=""></div>
          <small class="text-secondary">${esc(n.date)}</small>
          <h3 class="fs-6 fw-bold mt-1 mb-0">${esc(n.title)}</h3>
        ${n.url ? '</a>' : ''}
      </div>
    </div>`).join('')
    }</div></div>`;
  return `<section class="section" id="news">
    <h2 class="sec-title reveal">Упоминание в новостях</h2><div class="rule"></div>
    <div id="newsCarousel" class="carousel slide news-slider reveal" data-bs-ride="false">
      <div class="carousel-inner">${pages.map((p, i) => slideHTML(p, i === 0)).join('')}</div>
      ${pages.length > 1 ? `
        <button class="news-nav prev" data-bs-target="#newsCarousel" data-bs-slide="prev"><i class="bi bi-chevron-left"></i></button>
        <button class="news-nav next" data-bs-target="#newsCarousel" data-bs-slide="next"><i class="bi bi-chevron-right"></i></button>
        <div class="carousel-indicators">${pages.map((_, i) =>
    `<button data-bs-target="#newsCarousel" data-bs-slide-to="${i}" class="${i ? '' : 'active'}"></button>`).join('')}
        </div>` : ''}
    </div>
  </section>`;
}


// * renderMain
/* ═══ Основной контент ═══ */
function renderMain() {
  const o = [];
  /* MAIN: блок должностей */
  /* MAIN: карточка регалий — должности, членство, звания */
  if (has('positions') || has('memberships') || has('honors')) {
    const credsGroup = (cap, items, mode) => items.length ? `
      <div class="creds-group">
        ${cap ? `<div class="creds-cap">${cap}</div>` : ''}
        <ul class="creds-list">${items.map((p, i) => {
      const cls = mode === 'pos' ? (i === 0 ? 'c1' : 'c2') : mode;
      const ico = cls === 'c3'
        ? '<i class="bi bi-mortarboard-fill"></i>'
        : cls === 'c4'
          ? '<i class="bi bi-award-fill"></i>'
          : '<i class="bi bi-bank2"></i>';
      return `<li class="${cls}"><span class="creds-ico">${ico}</span><span>${esc(p)}</span></li>`;
    }).join('')}</ul>
      </div>` : '';
    o.push(`<section class="section mt-4 py-0 px-0 reveal" id="main">
      <div class="creds reveal alt">
        ${credsGroup('', T.positions || [], 'pos')}
        ${credsGroup('', T.memberships || [], 'c3')}
        ${credsGroup('', T.honors || [], 'c4')}
      </div>
    </section>`);
  }
  /* EDUCATION (alt) */
  if (has('education') || has('upk')) {
    let body = '';
    if (has('education')) body += eduTimeline(T.education);
    if (has('upk')) body += sub('upk', 'Повышение квалификации', upkCards(T.upk, 6));
    o.push(sec('education', 'alt', 'Образование', body));
  }
  /* CAREER + achievements */
  if (has('career') || has('achievements')) {
    let body = '';
    if (has('career')) body += timeline(T.career);
    if (has('achievements') || T.ach_text) {
      const achBody =
        (T.ach_text ? `<div class="text-block">${T.ach_text}</div>` : '') +
        (has('achievements') ? achievementCards(T.achievements, 6) : '');
      body += sub('pro', 'Профессиональные достижения · Награды', achBody);
    };
    o.push(sec('career', '', 'Карьера', body));
  }
  /* PEDAGOGICAL (alt) — программы/дисциплины/расписание/сессия */
  if (has('programs') || has('courses') || has('schedule') || has('session') || hasMat()) {
    let body = '';
    if (T.ped_text) body += `<div class="text-block reveal">${htmlOrText(T.ped_text)}</div>`;
    if (has('programs')) body += sub('programs', 'Образовательные программы', programCards(T.programs));
    if (has('courses')) body += sub('courses', 'Читаемые дисциплины', table(
      [{ t: 'Дисциплина' }, { t: 'Уровень' }, { t: 'Курс' }, { t: 'Семестр' }, { t: 'Часы', e: 1 }],
      T.courses.map(c => [{ v: c.a }, { v: c.b }, { v: c.c }, { v: c.d }, { v: c.e, e: 1 }])));
    if (has('schedule')) {
      // 3. Заголовок с прижатым вправо подзаголовком
      body += sub('schedule',
        `<div class="d-flex justify-content-between align-items-baseline flex-wrap gap-2">
       <span>Расписание занятий</span>
       <span class="small" style="color:var(--amber); font-weight:500;">текущая неделя · верхняя</span>
     </div>`,
        table(
          [{ t: 'День' }, { t: 'Время' }, { t: 'Дисциплина' }, { t: 'Тип' }, { t: 'Группа' }, { t: 'Ауд.' }],
          T.schedule.map(c => [{ v: c.a }, { v: c.b }, { v: c.c }, { v: c.d }, { v: c.e }, { v: c.f }]), true
        )
      );

      // 1. Кнопка "Полное расписание" под таблицей (если ссылка задана)
      const fullScheduleUrl = T.external_links?.schedule;
      if (fullScheduleUrl) {
        body += `<div class="mt-3 reveal">
      <a href="${esc(fullScheduleUrl)}" class="btn-schedule" target="_blank" rel="noopener">
        Полное расписание <i class="bi bi-box-arrow-up-right"></i>
      </a>
    </div>`;
      }
    }
    if (has('session')) body += sub('session', 'Расписание сессии', table(
      [{ t: 'Дата' }, { t: 'Время' }, { t: 'Дисциплина' }, { t: 'Форма' }, { t: 'Группа' }, { t: 'Ауд.' }],
      T.session.map(c => [{ v: c.a }, { v: c.b }, { v: c.c }, { v: c.d }, { v: c.e }, { v: c.f }])));


    // Учебные материалы (в самом конце раздела)
    if (hasMat()) body += sub('materials', 'Учебные материалы', materialsBlock(T));

    o.push(sec('edu-activity', 'alt', 'Педагогическая деятельность', body));
  }
  /* * SCIENCE */
  if (has('metrics') || has('projects') || has('patents') || T.science_text) {
    let body = '';
    if (has('metrics')) {
      const items = T.metrics.map(m =>
        `<div class="metric"><span class="m-num">${esc(m.n)}</span>
         <small class="text-secondary">${esc(metricLabel(m.n, m.l))}</small></div>`);
      const n = items.length;
      const rows = Math.ceil(n / 4);          /* максимум 4 в строке, как сейчас */
      const base = Math.floor(n / rows);      /* базовая длина строки */
      const rem = n % rows;                   /* остаток раздаём первым строкам */
      let grid = '', i = 0;
      for (let r = 0; r < rows; r++) {
        const cnt = base + (r < rem ? 1 : 0);
        grid += `<div class="metrics-row">${items.slice(i, i + cnt).join('')}</div>`;
        i += cnt;
      }
      body += `<div class="metrics-grid mb-4 reveal">${grid}</div>`;
    }
    if (T.science_text) body += `<div class="text-block reveal">${htmlOrText(T.science_text)}</div>`;
    if (has('projects')) body += sub('projects', 'Проекты', timeline(T.projects));
    if (has('patents')) body += sub('patents', 'Патенты и НИОКР', pubs(T.patents));

    o.push(sec('science', '', 'Научная деятельность', body));
  }

  /* * PUBLICATIONS — единый раздел произведений героя; пустые рубрики не выводятся (п.12) */
  if (PUB_RUBRICS.some(r => has(r.key))) {
    let body = '';
    PUB_RUBRICS.forEach(r => { if (has(r.key)) body += sub(r.key, r.title, pubRubric(T[r.key], r)); });
    o.push(sec('publications', 'alt', 'Публикации', body));
  }

  /* * SOCIAL (alt) */
  if (has('social') || T.social_text) {
    let body = '';
    if (T.social_text) body += `<div class="text-block reveal">${htmlOrText(T.social_text)}</div>`;
    if (has('social')) body += `<div class="text-block"><ul class="text-block-list">${T.social.map(s =>
      `<li>${esc(s.text || s.title)}</li>`).join('')}</ul></div>`;
    o.push(sec('social', 'alt', 'Общественная деятельность', body));
  }
  /* * CONTACTS (blue) */
  o.push(`<section class="section blue" id="contact" style="border:0">
    <h2 class="sec-title reveal">Контактная информация</h2><div class="rule"></div>
    <div class="row g-4 reveal">
      <div class="col-md-6">
       ${[T.email, ...(T.email_extra || [])].filter(Boolean).map(e => `<p class="mb-2"><i class="bi bi-envelope me-2" style="color:var(--amber)"></i>
          <a href="mailto:${esc(e)}" style="color:var(--teal)">${esc(e)}</a></p>`).join('')}
        ${[T.phone, ...(T.phone_extra || [])].filter(Boolean).map(p => `<p class="mb-2"><i class="bi bi-telephone me-2" style="color:var(--amber)"></i>
          <a href="tel:${esc(String(p).replace(/[^+\d]/g, ''))}" style="color:var(--teal)">${esc(p)}</a></p>`).join('')}
        ${T.address ? `<p class="mb-2"><i class="bi bi-geo-alt me-2" style="color:var(--amber)"></i>${esc(T.address)}</p>` : ''}
        ${T.hours ? `<p class="mb-2"><i class="bi bi-clock-history me-2" style="color:var(--amber)"></i>${esc(T.hours)}</p>` : ''}
        ${T.site ? `<p class="mb-2"><i class="bi bi-globe me-2" style="color:var(--amber)"></i>
          <a href="${esc(isExternal(T.site) ? T.site : 'https://' + T.site)}" target="_blank" rel="noopener" style="color:var(--teal)">${esc(String(T.site).replace(/^https?:\/\//i, ''))}</a></p>` : ''}
        <div style="height:40px">
          ${T.share_tg_url ? `<a class="chip-link h-100 p-2" target="_blank" rel="noopener" href="${esc(T.share_tg_url)}"><i class="fa-brands fa-telegram fa-2xl"></i></a>` : ''}
          ${T.share_vk_url ? `<a class="chip-link h-100 p-2" target="_blank" rel="noopener" href="${esc(T.share_vk_url)}"><i class="fa-brands fa-vk fa-2xl"></i></a>` : ''}
        </div>
      </div>
      <div class="col-md-6">
        <form onsubmit="return sendForm(this)">
          <div class="mb-2"><input class="form-control" placeholder="Ваше имя" required></div>
          <div class="mb-2"><input type="email" class="form-control" placeholder="E-mail" required></div>
          <div class="mb-2"><select class="form-select">
            <option>Тема обращения…</option><option>Образовательный процесс</option>
            <option>Консультация</option><option>Вопрос</option><option>Другое</option>
          </select></div>
          <div class="mb-3"><textarea class="form-control" rows="4" placeholder="Сообщение" required></textarea></div>
          <label class="form-check-label small text-secondary mb-3"><input type="checkbox" class="form-check-input me-1" required> Согласен(на) на обработку персональных данных</label>
          <button class="btn btn-ink w-100" type="submit"><i class="bi bi-send me-2"></i>Отправить</button>
          <p class="form-ok text-center small fw-bold mt-2 mb-0" style="color:var(--teal);display:none"><i class="bi bi-check-circle me-1"></i>Сообщение отправлено!</p>
        </form>
      </div>
    </div>
  </section>`);
  /* NEWS */
  o.push(newsBlock());
  document.getElementById('main').innerHTML = o.join('');
}

/* * renderRail */
function renderRail() {
  /* События */
  const events = (T.events || []).slice(0, 2).map(e => `
  <div class="box event-box" ${e.now ? 'style="background-color:var(--paper-light)"' : ''}>
    <div class="event-line-1">
      ${e.now ? '<span class="status-dot me-1"></span><b>Сейчас</b>' : ''}
      <span class="event-time">${esc([e.day, e.time].filter(Boolean).join(', '))}</span>
    </div>
    <div class="event-line-2" title="${esc(e.subject)}">${esc(e.subject)}</div>
    <div class="event-line-3">
      <span class="event-type">${esc(e.type)}</span>
      <span class="event-loc">${esc(e.building)} · ауд. ${esc(e.room)}</span>
    </div>
  </div>
`).join('');

  /* ── 3б: Учебный процесс — из данных rail_edu, с фолбэком ── */
  const ext = T.external_links || {};
  /* ── 3б: Учебный процесс ── */
  /* Кнопка материалов — последняя, только если есть хотя бы одна запись */
  const matLink = hasMat()
    ? `<a class="btn-side" href="#materials"><span>Учебные материалы</span><i class="bi bi-arrow-right arr"></i></a>`
    : '';

  /* Ручные ссылки из админки (раздел 9) — если заполнены */
  const manualLinks = (T.rail_edu && T.rail_edu.length)
    ? T.rail_edu.map(p => {
      const ext = String(p.u || '').startsWith('http');
      const icon = ext ? 'bi-box-arrow-up-right' : 'bi-arrow-right';
      const blank = ext ? ' target="_blank" rel="noopener"' : '';
      return `<a class="btn-side" href="${esc(p.u)}"${blank}><span>${esc(p.t)}</span><i class="bi ${icon}"></i></a>`;
    }).join('')
    : '';

  /* Автоматические кнопки — по заполненным данным */
  const autoLinks = [
    has('schedule') ? `<a class="btn-side" href="#schedule"><span>Расписание занятий</span><i class="bi bi-arrow-right arr"></i></a>` : '',
    has('session') ? `<a class="btn-side" href="#session"><span>Сессия</span><i class="bi bi-arrow-right arr"></i></a>` : '',
    // кнопка на авторские учебные пособия - пока не выводим
    // has('books') ? `<a class="btn-side" href="#books"><span>Учебные пособия</span><i class="bi bi-arrow-right arr"></i></a>` : ''
  ].filter(Boolean).join('');

  const eduLinks = manualLinks + autoLinks + matLink;

  /* Профили — без изменений */

  const profiles = (T.profiles || []).map(p =>
    `<a class="btn-side" href="${esc(p.u)}" target="_blank" rel="noopener noreferrer"><span>${esc(p.t)}</span><i class="bi bi-box-arrow-up-right"></i></a>`).join('');

  const railHtml = `
    <div class="rail-card">
      <h3 class="mb-3">Ближайшие события</h3>${events}
    </div>
   ${eduLinks ? `<div class="rail-card">
      <h3>Учебный процесс</h3>${eduLinks}
    </div>` : ''}
  <div class="rail-card mb-0 rail-brick">
      <h3><i class="bi bi-link-45deg"></i>Профили</h3>${profiles}
    </div>`;
  document.getElementById('rail').innerHTML = railHtml;
  const railMobile = document.getElementById('railMobile');
  if (railMobile) railMobile.innerHTML = railHtml;
}

/* ═══ Анимация появления ═══ */
function initReveal() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  /* progress bar */
  addEventListener('scroll', () => {
    const h = document.documentElement, p = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
    document.getElementById('progress').style.width = p + '%';
  }, { passive: true });
}

/* ═══ Раскрытие длинного текста ═══ */
function initToggles() {
  const toggleButtons = document.querySelectorAll('.text-toggle-btn');
  function checkIfNeedsToggle(btn) {
    const container = btn.closest('.d-flex');
    if (!container) return;
    const content = container.querySelector('.text-toggle-content');
    if (!content) return;
    btn.style.display = content.scrollHeight > content.clientHeight ? 'inline-block' : 'none';
  }
  toggleButtons.forEach(btn => {
    checkIfNeedsToggle(btn);
    btn.addEventListener('click', function () {
      const container = this.closest('.d-flex');
      const content = container.querySelector('.text-toggle-content');
      const dots = this.querySelector('.dots');
      const collapseText = this.querySelector('.collapse-text');
      const isExpanded = content.classList.contains('expanded');
      content.classList.toggle('expanded');
      dots.style.display = isExpanded ? 'inline' : 'none';
      collapseText.style.display = isExpanded ? 'none' : 'inline';
    });
  });
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt); rt = setTimeout(() => toggleButtons.forEach(btn => {
      const c = btn.closest('.d-flex')?.querySelector('.text-toggle-content');
      if (c && !c.classList.contains('expanded')) checkIfNeedsToggle(btn);
    }), 250);
  });
}

/* ═══ Раскрытие карточек «Показать ещё» ═══ */
function initCardReveal() {
  document.querySelectorAll('#upk-list, #ach-list, [id^="publist-"]').forEach(row => {
    const btn = row.parentElement ? row.parentElement.querySelector('.reveal-btn') : null;
    if (!btn) return;
    let isOpen = false;
    btn.addEventListener('click', () => {
      isOpen = !isOpen;
      row.querySelectorAll('.reveal-hidden').forEach(c => c.classList.toggle('d-none', !isOpen));
      btn.textContent = isOpen ? 'Свернуть' : 'Показать ещё';
    });
  });
}


/* ═══ Цветовая схема: переключение атрибутом корня, без правок HTML ═══ */
const THEME_KEY = 'site-theme';
const THEMES = ['default', 'blue', 'mix', 'dark'];
const THEME_NAMES = {
  default: 'фирменный оранжевый',
  blue: 'синяя пастель',
  mix: 'микс — тёплый фон, синие акценты',
  dark: 'тёмная'
};
const getTheme = () => {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t && THEMES.includes(t)) return t;
  } catch (e) { }
  /* Явного выбора нет — следуем за системной тёмной схемой */
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default';
};
function applyTheme(name) {
  const root = document.documentElement;
  if (name === 'default') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', name);
  document.querySelectorAll('.theme-toggle').forEach(b => {
    b.setAttribute('aria-pressed', name !== 'default' ? 'true' : 'false');
    b.title = 'Цветовая схема: ' + THEME_NAMES[name] + ' (нажмите для смены)';
  });
}
function toggleTheme() {
  const next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { }
  applyTheme(next);
}
document.querySelectorAll('.theme-toggle').forEach(b => b.addEventListener('click', toggleTheme));
applyTheme(getTheme());

/* ═══ Share ═══ */
function initShare() {
  document.getElementById('shareBtn')?.addEventListener('click', function () {
    if (navigator.share) { navigator.share({ title: document.title, url: location.href }).catch(() => { }); return; }
    navigator.clipboard.writeText(location.href).then(() => alert('Ссылка скопирована'));
  });
}

/* ═══ Форма ═══ */
function sendForm(f) {
  f.querySelector('.form-ok').style.display = 'block';
  f.querySelectorAll('input,textarea,select,button').forEach(e => e.disabled = true);
  return false;
}

/* Образование: учреждение · уровень (одной строкой, жирным), ниже профиль и квалификация */
function eduTimeline(a) {
  return `<ul class="timeline reveal">${a.map(i => {
    const inst = esc(i.institution || i.title || '');
    const level = i.level ? ' &middot; <b style="text-transform:capitalize">' + esc(i.level) + '</b>' : '';
    const lines = [
      esc(i.profile || ''),
      i.qualification
        ? '<i class="bi bi-mortarboard me-2 fs-5" style="color:var(--amber)" title="Квалификация" aria-label="Квалификация"></i><em>' + esc(capFirst(i.qualification)) + '</em>'
        : esc(i.text || '')
    ].filter(Boolean).join('<br>');
    return `<li><span class="year">${esc(i.year)}</span>
      <h3 class="fs-6 fw-bold mb-1">${inst}${level}</h3>
      ${lines}</li>`;
  }).join('')}</ul>`;
}

window.sendForm = sendForm;

/* ═══ Мобильные: меню и панель не мешают друг другу ═══ */
const menuEl = document.getElementById('menuCollapse');
const railEl = document.getElementById('railPanel');
if (menuEl && railEl) {
  menuEl.addEventListener('show.bs.collapse', () => {
    bootstrap.Offcanvas.getInstance(railEl)?.hide();
  });
  railEl.addEventListener('show.bs.offcanvas', () => {
    bootstrap.Collapse.getInstance(menuEl)?.hide();
  });
}

/* ═══ Мобильные: оверлей закрывается после тапа по ссылке ═══ */
document.addEventListener('click', e => {
  const link = e.target.closest('a');
  if (!link) return;
  const isMobile = window.matchMedia('(max-width: 767.98px)').matches;
  if (!isMobile) return;
  if (link.closest('#menuCollapse') && menuEl) {
    bootstrap.Collapse.getOrCreateInstance(menuEl, { toggle: false }).hide();
  } else if (link.closest('#railPanel') && railEl) {
    bootstrap.Offcanvas.getOrCreateInstance(railEl, { toggle: false }).hide();
  }
});