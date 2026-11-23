/* Aurora 2 Lab · v2050 · pages rebuilt after the "Aurora 2 · před a po" canvas.
   Phone first. Each page keeps the app's own data, actions and helpers; only what is shown and where changes.
   The computer keeps its own layouts unless a page says otherwise. */
(function () {
  const isDesk = () => typeof DESK !== 'undefined' && DESK.on;
  const cs = () => lang() === 'cs';
  const L = (en, cz) => cs() ? cz : en;

  /* ================= HOME · one screen: Today · one row "now" · your cards · new ideas ================= */
  function cardTile(c) {
    let frac = 0, val = '';
    try {
      if (c.type === 'habit') { const n = habitWeek(c.id).filter(Boolean).length, g = goalOf(c); frac = n / g; val = n + '/' + g; }
      else if (c.type === 'month') { const ms = monthStats(c); frac = ms.total ? ms.done / ms.total : 0; val = ms.done + '/' + ms.total; }
      else { const ps = projectStats(c.id); frac = ps.total ? ps.done / ps.total : 0; val = c.deadline ? Math.max(0, daysBetween(T(), c.deadline)) + L('d', 'd') : ps.open + ''; }
    } catch (e) {}
    return '<button class="a2ct frost press" data-a="openCard" data-id="' + c.id + '" style="--a2c:' + c.color + '" aria-label="' + esc(c.name) + '"><span class="a2cr">' + ringSVG(48, frac, c.color, 4) + '<b>' + esc(val) + '</b></span><span class="a2cn">' + esc(c.name) + '</span></button>';
  }
  function cardsRow() {
    const d = T();
    const score = c => (itemsOn(d).some(i => i.card === c.id) ? 100 : 0) + (c.type === 'habit' ? 20 + (typeof streakOf === 'function' ? streakOf(c.id) : 0) : 0) + (c.deadline ? Math.max(0, 30 - daysBetween(d, c.deadline)) : 0);
    let tiles = [];
    const kn = window.KR && KR.now ? KR.now() : null;
    if (kn && KR.cardList) KR.cardList().slice(0, 2).forEach(k => tiles.push('<button class="a2ct frost press" data-a="krOpen" data-k="' + esc(k.name === 'Keiro' ? '' : k.name) + '" style="--a2c:' + k.color + '"><span class="a2cr">' + ringSVG(48, kn.n ? .6 : 1, k.color, 4) + '<b>' + (kn.n || '✓') + '</b></span><span class="a2cn">' + esc(k.name) + '</span></button>'));
    S.cards.slice().sort((a, b) => score(b) - score(a)).slice(0, 4 - tiles.length).forEach(c => tiles.push(cardTile(c)));
    if (!tiles.length) tiles.push('<button class="a2ct a2new frost press" data-a="newCard"><span class="a2cr"><span class="ci">' + ico('plus', 20, 1.8) + '</span></span><span class="a2cn">' + esc(t('newCard')) + '</span></button>');
    return '<div class="a2lh"><span class="cap">' + esc(L('Cards · this week', 'Karty · tento týden')) + '</span><button class="a2more" data-a="tab" data-k="spaces">Spaces ›</button></div><div class="a2cards">' + tiles.join('') + '</div>';
  }
  function ideasRow() {
    const ms = S.moments.filter(m => !(m.planned && typeof itemById === 'function' && itemById(m.planned)));
    if (!ms.length) return '';
    const th = ms.slice(-3).reverse().map(m => { const u = typeof momThumb === 'function' ? momThumb(m) : ''; const c = m.card && cardById(m.card) ? cardById(m.card).color : '#5fb2d4';
      return '<i style="' + (u ? 'background-image:url(' + u + ')' : 'background:linear-gradient(160deg,color-mix(in srgb,' + c + ' 55%,#1b2a36),#14202a)') + '"></i>'; }).join('');
    const n = ms.length, word = cs() ? (n === 1 ? 'nápad' : n < 5 ? 'nápady' : 'nápadů') : (n === 1 ? 'idea' : 'ideas');
    return '<button class="a2ideas frost press" data-a="tab" data-k="board"><span class="a2th">' + th + '</span><b>' + n + ' ' + word + L(' on Board', ' na Boardu') + '</b><span class="a2go">Board ›</span></button>';
  }

  /* notes: one row with one action. Urgent Keiro first, then reminders and Lab notes, then the account invite */
  if (typeof homeNotes === 'function') {
    const _hn = homeNotes;
    homeNotes = function () {
      const out = [];
      const kn = window.KR && KR.now ? KR.now() : null;
      if (kn && (kn.urgent || kn.n)) out.push({ id: 'keiro', c: kn.red ? '#ee5a85' : '#a983f7', icon: ico('play', 16, 2.2), t: kn.t, s: kn.s, btn: kn.kind === 'send' ? L('Send', 'Odeslat') : kn.kind === 'off' ? L('Fix', 'Opravit') : L('Review', 'Schválit'), act: kn.act });
      _hn().forEach(n => out.push(n));
      const at = typeof accTip === 'function' ? accTip() : null;
      if (at) out.push({ id: 'acc', c: '#9fd6e8', icon: ico('users', 16, 2.2), t: L('Create your account', 'Vytvoř si účet'), s: L('Same data on phone and computer', 'Stejná data v telefonu i počítači'), btn: L('Create', 'Vytvořit'), act: 'accTipGo', x: 'accTipX' });
      return out;
    };
  }

  if (typeof renderHome === 'function') {
    const _home = renderHome;
    renderHome = function () {
      const r = _home.apply(this, arguments);
      if (isDesk()) return r;
      /* keep what the app drew (header, Lab badge, the arc, the one-row note) and swap the widget stack for the two rows */
      const st = document.querySelector('#s-home .stack'); if (!st) return r;
      const hs = st.querySelector('#hstack'); if (hs) hs.remove();
      st.classList.add('a2home'); st.insertAdjacentHTML('beforeend', cardsRow() + ideasRow());
      return r;
    };
    if (typeof RENDER !== 'undefined') RENDER.home = renderHome;
  }
  /* ================= SPACES · one anatomy for every card: type · name + ring · mini view + next step ================= */
  function nextOf(c) {
    const d = T();
    try {
      if (c.type === 'project') { const ps = projectStats(c.id); return ps.next ? { t: ps.next.t, w: ps.next.time || (ps.next.date ? (ps.next.date === T() ? L('today', 'dnes') : dayShort(ps.next.date)) : '') } : null; }
      const its = cardItems(c.id).filter(i => occurs(i, d)); const nx = its.find(i => !isDone(i, d)) || cardItems(c.id).find(i => !i.done && !i.repeat);
      return nx ? { t: nx.t, w: nx.time || (occurs(nx, d) ? L('today', 'dnes') : '') } : null;
    } catch (e) { return null; }
  }
  function spaceCard(c, i) {
    const d = T(); let frac = 0, val = '', mini = '';
    if (c.type === 'habit') {
      const w = habitWeek(c.id), g = goalOf(c), n = w.filter(Boolean).length, td = dow(d); frac = n / g; val = n + '/' + g;
      mini = '<span class="a2wk">' + w.map((on, k) => '<i class="' + (on ? 'on' : '') + (k === td ? ' td' : '') + '"></i>').join('') + '</span>';
    } else if (c.type === 'month') {
      const ms = monthStats(c, d); frac = ms.total ? ms.done / ms.total : 0; val = ms.done + '/' + ms.total;
      mini = '<span class="a2wk">' + ms.its.slice(0, 8).map(it => '<i class="' + (isDone(it, d) ? 'on' : '') + '"></i>').join('') + '</span>';
    } else {
      const ps = projectStats(c.id); frac = ps.total ? ps.done / ps.total : 0; val = ps.total ? ps.done + '/' + ps.total : '';
      const n = Math.min(8, ps.total), on = ps.total ? Math.round(ps.done / ps.total * n) : 0;
      mini = n ? '<span class="a2seg8">' + Array.from({ length: n }, (_, k) => '<i class="' + (k < on ? 'on' : '') + '"></i>').join('') + '</span>' : '';
    }
    const nx = nextOf(c);
    const sub = c.type === 'project' && c.deadline ? esc(t('deadline')) + ' ' + esc(dayShort(c.deadline)) + ' · <b>' + esc(deadlineText(c.deadline)) + '</b>'
      : c.type === 'habit' ? esc(t('streak')) + ' <b>' + streakOf(c.id) + '</b> · ' + esc(t('best', bestStreak(c.id))) : '';
    return '<section class="a2sc frost press" role="button" data-a="openCard" data-id="' + c.id + '" style="--a2c:' + c.color + ';--i:' + i + '">'
      + '<div class="a2h">' + kickOf(c) + (val ? '<span class="a2rg">' + ringSVG(56, frac, c.color, 5) + '<b>' + esc(val) + '</b></span>' : '') + '</div>'
      + '<div class="a2nm">' + esc(c.name) + '</div>' + (sub ? '<div class="a2sub">' + sub + '</div>' : '')
      + '<div class="a2ft">' + mini + (nx ? '<span class="a2nx"><small>' + esc(t('nextStep')) + '</small><span class="a2nt">' + esc(nx.t) + (nx.w ? ' <em>· ' + esc(nx.w) + '</em>' : '') + '</span></span>'
        : '<button class="a2nx a2add press" data-a="add" data-card="' + c.id + '">' + ico('plus', 14, 2.4) + esc(L('First step', 'První krok')) + '</button>') + '</div></section>';
  }
  if (typeof renderSpaces === 'function') {
    const _sp = renderSpaces;
    renderSpaces = function () {
      const r = _sp.apply(this, arguments);
      if (isDesk() || V.spEdit || !S.cards.length) return r;
      const el = $('#s-spaces'); const chips = el.querySelector('.chips'); const ks = [...el.querySelectorAll('.kspc')];
      let ord = []; try { ord = JSON.parse(localStorage.getItem('spOrder') || '[]') || []; } catch (e) {}
      const pos = c => { const i = ord.indexOf('c:' + c.id); return i < 0 ? 1e6 : i; };
      const list = filteredCards().map((c, i) => [c, pos(c), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
      el.innerHTML = '<div class="hdr"><h1 class="t1">' + esc(t('spaces')) + '</h1><button class="cb frost press" data-a="newCard" aria-label="' + esc(t('newCard')) + '">' + ico('plus', 20, 2) + '</button></div>'
        + (chips ? chips.outerHTML : '') + '<div class="stack a2spaces"></div>';
      const box = el.querySelector('.a2spaces');
      ks.forEach(k => box.appendChild(k));
      box.insertAdjacentHTML('beforeend', list.map(spaceCard).join(''));
      auraFromCards(null);
      return r;
    };
    if (typeof RENDER !== 'undefined') RENDER.spaces = renderSpaces;
  }

  /* ================= CARD · what you do first goes first; the next step is the big button ================= */
  if (typeof renderCard === 'function') {
    const _rc = renderCard;
    renderCard = function () {
      const r = _rc.apply(this, arguments);
      if (isDesk() || !V.card) return r;
      const c = cardById(V.card), st = document.querySelector('#s-card .stack'); if (!c || !st) return r;
      st.classList.add('a2card'); st.style.setProperty('--a2c', c.color);
      const root = document.getElementById('s-card');
      const secs = [...root.children].filter(n => n.classList.contains('sec') && n.querySelector('[data-a="openItem"],[data-a="toggle"]'));
      if (c.type === 'project') {
        const nx = st.querySelector(':scope > .nextp'), s3 = st.querySelector(':scope > .stat3');
        if (nx) { nx.classList.add('a2big'); if (s3) st.insertBefore(nx, s3); }
      } else {
        const hero = st.querySelector(':scope > .hero');
        if (hero) { let at = hero.nextSibling; secs.slice(0, 2).forEach(sc => { sc.classList.add('a2in'); st.insertBefore(sc, at); at = sc.nextSibling; }); }
      }
      return r;
    };
  }

  /* ================= SETTINGS · five groups: Look · Account · Notifications · (Tools) · Help, then Data ================= */
  function regroupSettings() {
    if (V.settingsPage && V.settingsPage !== 'main') return;
    const root = document.getElementById('s-settings'); if (!root) return;
    const secs = [...root.querySelectorAll(':scope > .sec')];
    const by = a => secs.find(x => x.querySelector('[data-a="' + a + '"]'));
    const look = by('lookPage'), dev = by('syncPage'), notif = by('notifPage'), home = by('toggleNudges'), beta = by('feedback'), video = by('promo'), gen = by('pickLang'), data = by('exportData');
    const cap = (sec, txt) => { const c = sec && sec.querySelector(':scope > .cap'); if (c) c.textContent = txt; };
    if (dev) cap(dev, L('Account', 'Účet'));
    if (notif && home) { const g = notif.querySelector('.grp'), hg = home.querySelector('.grp'); if (g && hg) { [...hg.children].forEach(x => g.appendChild(x)); home.remove(); } }
    if (gen) {
      cap(gen, L('Help', 'Pomoc')); const g = gen.querySelector('.grp');
      if (beta && g) { const fb = beta.querySelector('[data-a="feedback"]'); if (fb) g.insertBefore(fb, g.firstChild); beta.remove(); }
      if (video) { [...video.children].filter(x => !x.classList.contains('cap')).forEach(x => gen.appendChild(x)); video.remove(); }
    }
    const acct = root.querySelector(':scope > .acct'); let at = acct ? acct.nextSibling : null;
    [look, dev, notif].filter(Boolean).forEach(x => { root.insertBefore(x, at); at = x.nextSibling; });
    const tail = root.querySelector(':scope > .ver');
    [gen, data].filter(Boolean).forEach(x => root.insertBefore(x, tail));
  }
  if (typeof renderSettings === 'function') {
    const _rs2 = renderSettings;
    renderSettings = function () { const r = _rs2.apply(this, arguments); try { regroupSettings(); } catch (e) {} return r; };
  }

  /* ================= BOARD · filters say how many ideas they hold; empty ones step aside ================= */
  if (typeof renderBoard === 'function') {
    const _rb = renderBoard;
    renderBoard = function () {
      const r = _rb.apply(this, arguments);
      document.querySelectorAll('#s-board .chips [data-a="boardFilter"], #desk [data-a="boardFilter"]').forEach(b => {
        const k = b.dataset.k; if (b.dataset.n) return;
        const n = k === 'all' ? S.moments.length : k === 'none' ? S.moments.filter(m => !m.card || !cardById(m.card)).length : S.moments.filter(m => m.card === k).length;
        b.dataset.n = n; b.insertAdjacentHTML('beforeend', '<span class="a2n">' + n + '</span>');
        if (!n && V.boardFilter !== k && k !== 'all') b.style.display = 'none';
      });
      return r;
    };
    if (typeof RENDER !== 'undefined') RENDER.board = renderBoard;
  }

  /* the Lab badge and other wrappers still run: they wrapped the old renderHome, so call them on top */
  document.addEventListener('DOMContentLoaded', () => { if (typeof S !== 'undefined' && S && S.onboarded && V.tab === 'home' && !isDesk()) renderHome(); });
})();
