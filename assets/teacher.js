// assets/teacher.js
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const capFirst = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const has = k => Array.isArray(T[k]) && T[k].length;
let T;

fetch('data/teachers.json?v=' + Date.now()).then(r => r.json()).then(d => {
  T = d.teachers.find(t => t.id === new URLSearchParams(location.search).get('id')) || d.teachers[0];
  if (!T) { document.getElementById('main').innerHTML = '<p class="p-4">Нет данных.</p>'; return; }
  document.title = (T.short || T.name) + ' — СПбГМТУ';
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

  document.getElementById('p-name').textContent = T.name;
  document.getElementById('p-post').textContent = T.post;
  document.getElementById('p-chips').innerHTML = (T.chips || []).map(c =>
    `<span class="chip" title="${esc(c)}"><b class="chip-text">${esc(c)}</b></span>`).join('');
}

/* ═══ Меню ═══ */
function buildMenu() {
  const items = [
    { h: 'main', t: '<i class="fa-regular fa-user"></i>', v: true },
    { h: 'education', t: 'Образование', v: has('education') || has('upk') },
    { h: 'career', t: 'Карьера', v: has('career') || has('achievements') },
    { h: 'edu-activity', t: 'Педагогическая деятельность', v: has('programs') || has('courses') || has('schedule') || has('session') },
    { h: 'science', t: 'Научная деятельность', v: has('metrics') || has('publications') || has('projects') || has('patents') },
    { h: 'social', t: 'Общественная деятельность', v: has('social') },
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

/* ═══ Карточки программ/дисциплин ═══ */
const programCards = a => `<div class="row g-3 reveal">${a.map(i => {
  const tagCls = (i.tag || '').toLowerCase().includes('бак') ? 'vak' : (i.tag || '').toLowerCase().includes('маг') ? 'scopus' : 'rinc';
  return `<div class="col-md-${a.length <= 2 ? 6 : 4}">
    <div class="card-lift"><div class="bar"></div><div class="p-3 d-flex flex-column">
      <span class="tag ${tagCls}">${esc(i.tag)}</span>
      <h3 class="fs-6 fw-bold mt-2">${esc(i.title)}</h3>
      <small class="text-secondary">${esc(i.text)}</small>
    </div></div></div>`;
}).join('')}</div>`;

const upkCards = (a, limit = 6) => `
<div class="row g-3 reveal" id="upk-list">${a.map((i, idx) => `
  <div class="col-md-6 ${idx >= limit ? 'd-none reveal-hidden' : ''}">
    <div class="card-lift"><div class="bar"></div><div class="p-3">
      <span class="tag rinc">${esc(i.year)}</span>
      <h3 class="fs-6 fw-bold mt-2 mb-1">${esc(i.title)}</h3>
      ${i.text ? `<small class="text-secondary fst-italic">${esc(i.text)}</small>` : ''}
    </div></div>
  </div>`).join('')}</div>
${a.length > limit ? `<div class="text-center mt-4 mb-5"><button class="btn btn-outline-secondary btn-lg reveal-btn">Показать ещё</button></div>` : ''}`;

/* ═══ Достижения с раскрытием ═══ */
const achievementCards = (a, limit = 6) => `
<div class="row g-3 reveal" id="ach-list">${a.map((i, idx) => `
  <div class="col-md-6 ${idx >= limit ? 'd-none reveal-hidden' : ''}">
    <div class="card-lift"><div class="bar"></div><div class="p-3 d-flex flex-column">
      <div class="d-flex justify-content-between">
        <i class="bi bi-${i.icon || 'award'} fs-4" style="color:var(--amber)"></i>
        <small class="text-secondary mt-1">${esc(i.year)}</small>
      </div>
      <h3 class="fs-6 fw-bold mt-2 mb-1">${esc(i.title)}</h3>
      <small class="text-secondary text-toggle-content">${esc(i.text)}</small>
      <span class="text-toggle-btn">
        <span class="dots">раскрыть <i class="bi bi-caret-down-fill"></i></span>
        <span class="collapse-text" style="display:none">скрыть <i class="bi bi-caret-up-fill"></i></span>
      </span>
    </div></div>
  </div>`).join('')}</div>
${a.length > limit ? `<div class="text-center mt-4 mb-5"><button class="btn btn-outline-secondary btn-lg reveal-btn">Показать ещё</button></div>` : ''}`;

/* ═══ Таблица ═══ */
const table = (head, rows, hover = false) => `
<div class="table-responsive reveal">
  <table class="table align-middle ${hover ? 'table-hover' : ''}">
    <thead><tr>${head.map(h => `<th${h.e ? ' class="text-end"' : ''}>${h.t}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td${c.e ? ' class="text-end"' : ''}>${esc(c.v)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</div>`;

/* ═══ Публикации ═══ */
const pubs = a => a.map(i => `
<div class="pub"><span class="py">${esc(i.year)}</span>
  <div>${esc(i.title)} <b>${esc(i.text)}</b>
    ${i.tag ? `<span class="tag vak">${esc(i.tag)}</span>` : ''}
    ${i.link ? ` <a href="${esc(i.link)}">${esc(i.link)}</a>` : ''}
    ${i.doi ? ` DOI:${esc(i.doi)}` : ''}
  </div>
</div>`).join('');

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

/* ═══ Основной контент ═══ */
function renderMain() {
  const o = [];
  /* MAIN: блок должностей */
  if (has('positions')) {
    o.push(`<section class="section mt-4 py-0 px-0 reveal" id="main">
      <div class="positions reveal">
        <div class="positions-icon"><i class="fa-regular fa-user"></i></div>
        <div><ul class="positions-list">${T.positions.map((p, i) =>
      `<li class="${i === 0 ? 'main' : ''}">${esc(p)}</li>`).join('')}</ul></div>
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
    if (has('achievements')) body += sub('pro', 'Профессиональные достижения · Награды', achievementCards(T.achievements, 6));
    o.push(sec('career', '', 'Карьера', body));
  }
  /* PEDAGOGICAL (alt) — программы/дисциплины/расписание/сессия */
  if (has('programs') || has('courses') || has('schedule') || has('session')) {
    let body = '';
    if (T.ped_text) body += `<div class="text-block reveal">${esc(T.ped_text).replace(/\n/g, '<br>')}</div>`;
    if (has('programs')) body += sub('programs', 'Образовательные программы', programCards(T.programs));
    if (has('courses')) body += sub('courses', 'Читаемые дисциплины', table(
      [{ t: 'Дисциплина' }, { t: 'Уровень' }, { t: 'Курс' }, { t: 'Семестр' }, { t: 'Часы', e: 1 }],
      T.courses.map(c => [{ v: c.a }, { v: c.b }, { v: c.c }, { v: c.d }, { v: c.e, e: 1 }])));
    if (has('schedule')) body += sub('schedule', 'Расписание занятий', table(
      [{ t: 'День' }, { t: 'Время' }, { t: 'Дисциплина' }, { t: 'Тип' }, { t: 'Группа' }, { t: 'Ауд.' }],
      T.schedule.map(c => [{ v: c.a }, { v: c.b }, { v: c.c }, { v: c.d }, { v: c.e }, { v: c.f }]), true));
    if (has('session')) body += sub('session', 'Расписание сессии', table(
      [{ t: 'Дата' }, { t: 'Время' }, { t: 'Дисциплина' }, { t: 'Форма' }, { t: 'Группа' }, { t: 'Ауд.' }],
      T.session.map(c => [{ v: c.a }, { v: c.b }, { v: c.c }, { v: c.d }, { v: c.e }, { v: c.f }])));
    o.push(sec('edu-activity', 'alt', 'Педагогическая деятельность', body));
  }
  /* SCIENCE */
  if (has('metrics') || has('publications') || has('projects') || has('patents')) {
    let body = '';
    if (has('metrics')) body += `<div class="row g-3 mb-4 reveal">${T.metrics.map(m =>
      `<div class="col-6 col-md-3"><div class="metric"><span class="m-num">${esc(m.n)}</span>
      <small class="text-secondary">${esc(m.l)}</small></div></div>`).join('')}</div>`;
    if (has('projects')) body += sub('projects', 'Проекты', timeline(T.projects));
    if (has('patents')) body += sub('patents', 'Патенты и НИОКР', pubs(T.patents));
    if (has('publications')) body += sub('publications', 'Избранные публикации', pubs(T.publications));
    o.push(sec('science', '', 'Научная деятельность', body));
  }
  /* SOCIAL (alt) */
  if (has('social')) {
    o.push(sec('social', 'alt', 'Общественная деятельность',
      `<div class="text-block"><ul class="text-block-list">${T.social.map(s =>
        `<li>${esc(s.text || s.title)}</li>`).join('')}</ul></div>`));
  }
  /* CONTACTS (blue) */
  o.push(`<section class="section blue" id="contact" style="border:0">
    <h2 class="sec-title reveal">Контактная информация</h2><div class="rule"></div>
    <div class="row g-4 reveal">
      <div class="col-md-6">
        <p><i class="bi bi-envelope me-2" style="color:var(--amber)"></i>
          <a href="mailto:${esc(T.email)}" style="color:var(--teal)">${esc(T.email)}</a></p>
        ${T.phone ? `<p><i class="bi bi-telephone me-2" style="color:var(--amber)"></i>
          <a href="tel:${esc(T.phone)}" style="color:var(--teal)">${esc(T.phone)}</a></p>` : ''}
        ${T.address ? `<p><i class="bi bi-geo-alt me-2" style="color:var(--amber)"></i>${esc(T.address)}</p>` : ''}
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

/* ═══ Правый сайдбар ═══ */
function renderRail() {
  /* События — без изменений */
  const events = (T.events || []).map(e => `
    <div class="box" ${e.now ? 'style="background-color:var(--paper-light)"' : ''}>
      <p class="small mb-${e.now ? '0' : '1'}" ${e.now ? '' : 'style="color:var(--muted)"'}>
        ${e.now ? '<span class="status-dot me-2"></span><b>Сейчас</b>' : esc(e.t)}
      </p>
      <p class="small mb-0" ${e.now ? 'style="color:blue"' : ''}><b>${esc(e.x.split('·')[0])}</b>${e.x.includes('·') ? ' · <i>' + esc(e.x.split('·').slice(1).join('·').trim()) + '</i>' : ''}</p>
    </div>`).join('');

  /* ── 3б: Учебный процесс — из данных rail_edu, с фолбэком ── */
  const ext = T.external_links || {};
  const eduLinks = (T.rail_edu && T.rail_edu.length)
    ? T.rail_edu.map(p => {
      const icon = String(p.u || '').startsWith('http')
        ? 'bi-box-arrow-up-right'   // внешняя ссылка — иконка «наружу»
        : 'bi-arrow-right';        // якорь на странице — стрелка
      return `<a class="btn-side" href="${esc(p.u)}"><span>${esc(p.t)}</span><i class="bi ${icon} arr"></i></a>`;
    }).join('')
    : `<a class="btn-side" href="${esc(ext.schedule || '#schedule')}"><span>Расписание занятий</span><i class="bi bi-arrow-right arr"></i></a>
       <a class="btn-side" href="#session"><span>Сессия</span><i class="bi bi-arrow-right arr"></i></a>
       <a class="btn-side" href="#books"><span>Учебные пособия</span><i class="bi bi-arrow-right arr"></i></a>`;

  /* Профили — без изменений */
  const profiles = (T.profiles || []).map(p =>
    `<a class="btn-side" href="${esc(p.u)}"><span>${esc(p.t)}</span><i class="bi bi-box-arrow-up-right arr"></i></a>`).join('');

  document.getElementById('rail').innerHTML = `
    <div class="rail-card">
      <h3 class="mb-3">Ближайшие события</h3>${events}
    </div>
    <div class="rail-card">
      <h3>Учебный процесс</h3>${eduLinks}
    </div>
    <div class="rail-card mb-0">
      <h3><i class="bi bi-link-45deg"></i>Профили</h3>${profiles}
    </div>`;
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
  ['upk-list', 'ach-list'].forEach(id => {
    const row = document.getElementById(id);
    if (!row) return;
    const btn = row.parentElement.querySelector('.reveal-btn');
    if (!btn) return;
    let isOpen = false;
    btn.addEventListener('click', () => {
      isOpen = !isOpen;
      row.querySelectorAll('.reveal-hidden').forEach(c => c.classList.toggle('d-none', !isOpen));
      btn.textContent = isOpen ? 'Свернуть' : 'Показать ещё';
    });
  });
}

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
        ? '<i class="bi bi-mortarboard me-1" style="color:var(--teal)" title="Квалификация" aria-label="Квалификация"></i>' + esc(capFirst(i.qualification))
        : esc(i.text || '')
    ].filter(Boolean).join('<br>');
    return `<li><span class="year">${esc(i.year)}</span>
      <h3 class="fs-6 fw-bold mb-1">${inst}${level}</h3>
      ${lines}</li>`;
  }).join('')}</ul>`;
}

window.sendForm = sendForm;