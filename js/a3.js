/* Aurora 2 Lab · v2051 · the app built 1:1 after the canvas "Aurora 2 · vizuál před a po".
   Every page (phone and computer) is drawn here with the canvas classes (a3c.css) and the app's own data and actions.
   Loaded last: it replaces the page renderers; data, sheets, the orb and Keiro keep working underneath. */
(function () {
  const cs = () => lang() === 'cs';
  const L = (en, cz) => cs() ? cz : en;
  const desk = () => typeof DESK !== 'undefined' && DESK.on;
  const KX = () => (window.KR && KR.x ? KR.x() : null);
  const pct = f => Math.max(0, Math.min(1, f || 0));
  /* v2054 · an item's colour: its card's, else its own; only a plain item stays neutral */
  const hasCol = i => !!(i && ((i.card && cardById(i.card)) || i.color));
  const icol = (i, dflt) => hasCol(i) ? itemColor(i) : dflt;
  const plural = (n, one, few, many) => n === 1 ? one : n > 1 && n < 5 ? few : many;

  /* ---------------- shared pieces (canvas markup) ---------------- */
  const TICK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b2228" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>';
  function ring(size, frac, color, i, label, fs) {
    const off = (100 - pct(frac) * 100).toFixed(1);
    return '<div class="a3rg" style="width:' + size + 'px;height:' + size + 'px"><svg class="a2-ring" width="' + size + '" height="' + size + '" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" style="stroke:rgba(var(--wr),.14)" stroke-width="4"/><circle class="p" cx="20" cy="20" r="16" fill="none" stroke="' + color + '" stroke-width="4" pathLength="100" transform="rotate(-90 20 20)" style="--off:' + off + ';--i:' + (i || 0) + '"/></svg>'
      + (label != null ? '<b class="a2-num" style="font:700 ' + (fs || 12) + 'px/1 Inter">' + esc(String(label)) + '</b>' : '') + '</div>';
  }
  const check = (i, d, c, sz) => { const on = isDone(i, d); return '<button class="a2-check a3ck' + (on ? ' done on' : '') + '" style="--c:' + (c || itemColor(i)) + ';width:' + (sz || 24) + 'px;height:' + (sz || 24) + 'px" data-a="toggle" data-id="' + i.id + '" data-d="' + d + '" aria-label="' + esc(t('done')) + '">' + (on ? TICK.replace('width="20" height="20"', 'width="' + Math.round((sz || 24) * .62) + '" height="' + Math.round((sz || 24) * .62) + '"') : '') + '</button>'; };
  const cardName = i => i && i.card && cardById(i.card) ? cardById(i.card).name : '';
  const fmtMin = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
  function thumb(m) {
    try {
      if (m.kind === 'video' && m.thumb) return mediaNow(m.thumb);
      if ((m.kind === 'photo' || m.kind === 'video') && m.img && !missingMedia(m)) return m.kind === 'photo' ? mediaNow(m.img) : '';
      if (m.kind === 'link' && m.img) return m.img;
    } catch (e) {}
    return '';
  }
  const ideasList = () => S.moments.filter(m => !(m.planned && itemById(m.planned)) && m.sys !== 'tutorial').sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const ideaTitle = m => (m.note || m.title || (m.kind === 'video' ? L('Video', 'Video') : m.kind === 'photo' ? L('Photo', 'Fotka') : m.kind === 'link' ? L('Link', 'Odkaz') : L('Note', 'Poznámka'))).split('\n')[0];
  const ideaBg = m => { const u = thumb(m); const c = m.card && cardById(m.card) ? cardById(m.card).color : null;
    return u ? 'background:#14202a url(' + u + ') center/cover' : m.kind === 'note' ? 'background:linear-gradient(160deg,' + (c ? 'color-mix(in oklab,' + c + ' 30%,#f1e9da)' : '#f1e9da') + ',#e4d9c4)' : 'background:linear-gradient(160deg,#1d3557,#0e1b2e)'; };

  /* the header on the phone */
  const labTag = '<span class="a3lab">LAB</span>';
  const pHead = (title, right) => '<div class="a3hd a2-in" style="--i:0">' + title + (right || '') + '</div>';
  const logo = () => '<div class="a3lg"><b class="a2-d">aurora</b>' + labTag + '</div>';

  /* ---------------- the day arc (06:00–24:00 on half a circle) ---------------- */
  const ARC = 'M20 168 A150 150 0 0 1 320 168';
  const P = m => Math.max(0, Math.min(100, (m - 360) / 1080 * 100));
  function arc(M, w, h, dot) {
    const nowP = P(M.nm);
    let s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 340 178" aria-hidden="true" class="a3arc">'
      + '<path d="' + ARC + '" fill="none" style="stroke:rgba(var(--wr),.16)" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/>'
      + '<path d="' + ARC + '" fill="none" style="stroke:var(--cream);opacity:.85" stroke-width="3" pathLength="100" stroke-dasharray="' + nowP.toFixed(1) + ' 100" stroke-linecap="round"/>';
    M.arcs.forEach(a => {
      const st = P(a.s), len = Math.max(1.6, P(a.e) - st); const nx = a.st === 'next';
      const col = a.c || 'rgba(var(--wr),.4)';
      s += '<path d="' + ARC + '" fill="none" style="stroke:' + col + (nx || a.st === 'later' ? ';filter:drop-shadow(0 0 6px ' + col + ')' : '') + '" stroke-width="7" pathLength="100" stroke-dasharray="' + len.toFixed(1) + ' 100" stroke-dashoffset="-' + st.toFixed(1) + '" stroke-linecap="round"' + (a.st === 'done' ? ' opacity=".45"' : '') + '/>';
    });
    s += '</svg>';
    if (dot) { const th = Math.PI * nowP / 100; const x = (170 - 150 * Math.cos(th)) / 340 * 100, y = (168 - 150 * Math.sin(th)) / 178 * 100; s += '<span class="a2-now a3nowd" style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%"></span>'; }
    return s;
  }
  function nextInfo(M) {
    const nx = M.nextAny; if (!nx) return null;
    let lab = L('Next', 'Další');
    if (nx.time) { const s = tmin(nx.time); if (s > M.nm) lab += ' · ' + fmtMin(s - M.nm); else lab = L('Now', 'Teď'); }
    return { i: nx, lab, sub: [nx.time || L('any time', 'kdykoli'), cardName(nx)].filter(Boolean).join(' · ') };
  }
  const bigSize = (t, base) => { const n = String(t || '').length; return n <= 8 ? base : n <= 12 ? Math.round(base * .82) : n <= 16 ? Math.round(base * .68) : n <= 22 ? Math.round(base * .56) : Math.round(base * .48); };
  function slider(id) {
    return '<div class="a2-well a2-shimmer a3sl" data-id="' + id + '" role="slider" aria-label="' + esc(L('Slide to done', 'Posuň = hotovo')) + '"><span class="a3kn">' + TICK.replace('#1b2228', 'currentColor') + '</span><span class="a3slt">' + esc(L('Slide to done', 'Posuň = hotovo')) + '</span></div>';
  }
  function todayCard(M, isDesk) {
    const nx = nextInfo(M); const n = M.list.length;
    const cnt = n ? '<b style="color:var(--cream)">' + M.doneN + '</b> ' + L('of ', 'z ') + n + (isDesk ? L(' done', ' hotovo') : '') : L('nothing yet', 'zatím nic');
    const head = '<div class="a3row1"><b class="a2-d" style="font-size:24px">' + esc(L('Today', 'Dnes')) + '</b><span class="a2-t2 a2-num" style="font-size:13px">' + (isDesk ? '' : esc(dayShort(M.d)) + ' · ') + cnt + '</span></div>';
    let mid;
    if (nx) {
      const fs = bigSize(nx.i.t, 46);
      mid = '<div class="a3cen" style="top:' + (isDesk ? 62 : 50) + 'px"><span class="a2-lab">' + esc(nx.lab) + '</span><button class="a2-d a3big" style="font-size:' + fs + 'px" data-a="openItem" data-id="' + nx.i.id + '">' + esc(nx.i.t) + '</button>'
        + (isDesk ? '<span class="a2-t2" style="font-size:13px">' + esc(nx.sub) + '</span>' : '<span class="a2-chip" style="height:26px;font-size:12px">' + (hasCol(nx.i) ? '<span class="a2-dot" style="--c:' + itemColor(nx.i) + '"></span>' : '') + esc(nx.sub) + '</span>') + '</div>';
    } else {
      mid = '<div class="a3cen" style="top:' + (isDesk ? 62 : 50) + 'px"><span class="a2-lab">' + esc(n ? L('All done', 'Vše hotovo') : L('Free day', 'Volný den')) + '</span><b class="a2-d" style="font-size:46px">' + mtime(M.nm) + '</b><span class="a2-t2" style="font-size:13px">' + esc(n ? L('Nothing left for today', 'Na dnešek nic nezbývá') : L('Nothing planned', 'Nic naplánovaného')) + '</span></div>';
    }
    return todayFocus(M, nx, n, head, isDesk);
    const dial = isDesk ? '<div class="a3dial d">' + arc(M, '100%', 168, false) + mid + '</div>' : '<div class="a3dial"><div class="a3arcw">' + arc(M, 290, 152, true) + '</div>' + mid + '</div>';
    const foot = nx ? slider(nx.i.id) : '<button class="a2-btn ghost a3w" data-a="add" data-ctx="today">+ ' + esc(L('Add to Today', 'Přidat na dnešek')) + '</button>';
    const ent = V.a3enter && Date.now() - V.a3enter < 1500 ? ' enter' : '';
    return '<div class="a2-glass a2-in a3today' + (isDesk ? ' d' : '') + ent + '" style="--i:' + (isDesk ? 2 : 1) + '">' + head + dial + foot + '</div>';
  }
  /* the day as a flat line 06–24: items as segments, a dot for now */
  function dayLine(M) {
    const nowP = P(M.nm);
    const segs = M.arcs.map(a => { const st = P(a.s), len = Math.max(2.2, P(a.e) - st); const col = a.c || 'rgba(var(--wr),.45)';
      return '<i class="' + (a.st || '') + '" style="left:' + st.toFixed(1) + '%;width:' + len.toFixed(1) + '%;--c:' + col + '"></i>'; }).join('');
    return '<div class="a3dln" aria-hidden="true"><span class="a2-t3 a2-num">6</span><div class="a3dlt"><b style="width:' + nowP.toFixed(1) + '%"></b>' + segs + '<em style="left:' + nowP.toFixed(1) + '%"></em></div><span class="a2-t3 a2-num">24</span></div>';
  }
  function todayFocus(M, nx, n, head, isDesk) {
    const ent = V.a3enter && Date.now() - V.a3enter < 1500 ? ' enter' : '';
    let mid;
    if (nx) {
      const len = String(nx.i.t || '').length; const fs = len <= 12 ? 40 : len <= 20 ? 34 : len <= 32 ? 29 : 25;
      mid = '<div class="a3cen a3foc"><span class="a2-lab">' + esc(nx.lab) + '</span><button class="a2-d a3big" style="font-size:' + fs + 'px" data-a="openItem" data-id="' + nx.i.id + '">' + esc(nx.i.t) + '</button>'
        + '<span class="a3fm">' + (hasCol(nx.i) ? '<span class="a2-dot" style="--c:' + itemColor(nx.i) + '"></span>' : '') + '<span>' + esc(nx.sub) + '</span></span></div>';
    } else {
      mid = '<div class="a3cen a3foc"><span class="a2-lab">' + esc(n ? L('All done', 'Vše hotovo') : L('Free day', 'Volný den')) + '</span><b class="a2-d a2-num" style="font-size:44px;line-height:1">' + mtime(M.nm) + '</b><span class="a3fm"><span>' + esc(n ? L('Nothing left for today', 'Na dnešek nic nezbývá') : L('Nothing planned', 'Nic naplánovaného')) + '</span></span></div>';
    }
    const foot = nx ? slider(nx.i.id) : '<button class="a2-btn ghost a3w" data-a="add" data-ctx="today">+ ' + esc(L('Add to Today', 'Přidat na dnešek')) + '</button>';
    return '<div class="a2-glass a2-in a3today a3tf' + (isDesk ? ' d' : '') + ent + '" style="--i:' + (isDesk ? 2 : 1) + '">' + head + mid + dayLine(M) + foot + '</div>';
  }
  /* one row "now": Keiro first, then reminders / Lab notes */
  function nowRow(i) {
    const kx = KX(); let r = null;
    if (kx && kx.C.on && kx.C.feed) {
      const p = kx.parts(), o = kx.nowState();
      if (p.todo.length) { const g = p.first; const nm = kx.proj(g.streamer) ? kx.proj(g.streamer).name : 'Keiro'; const mins = p.left != null ? Math.max(1, Math.ceil(p.left / 60000)) : null;
        r = { c: kx.pcol(g.streamer), lab: nm + (mins != null ? ' · ' + L(mins + ' min left', 'zbývá ' + mins + ' min') : ''), t: L('Send the link to the campaign', 'Odešli odkaz do kampaně'), btn: L('Send ', 'Odeslat ') + p.todo.length, act: 'krOpen', k: g.streamer || '', pulse: p.hot };
      } else if (o.n) { const ps = kx.projs(); const pn = ps.length ? ps.map(x => [x, kx.inP(x.name, () => (kx.F().review || []).length)]).sort((a, b) => b[1] - a[1])[0] : null;
        r = { c: pn ? kx.pcol(pn[0].name) : kx.KC(), lab: (pn ? pn[0].name : 'Keiro') + ' · ' + L('waiting', 'čeká'), t: o.n + ' ' + kx.klip(o.n) + L(' to review', ' ke schválení'), btn: L('Review ', 'Schválit ') + o.n, act: 'krHomeReview', k: pn ? pn[0].name : '' };
      }
    }
    if (!r && typeof homeNotes === 'function') { const n = (homeNotes() || []).find(x => x.id !== 'keiro'); if (n) r = { c: n.c || '#9fd6e8', lab: n.s || '', t: n.t, btn: n.btn, act: n.act, k: '', id: n.id }; }
    if (!r) return '';
    return '<div class="a2-glass a2-tint a2-in a3now" style="--i:' + i + ';--c:' + r.c + '"><div class="a3nt"><span class="a2-lab" style="color:color-mix(in oklab,' + r.c + ' 45%,var(--mw))"><span class="a2-dot' + (r.pulse ? ' a2-pulse' : '') + '" style="--c:' + r.c + '"></span><span>' + esc(r.lab) + '</span></span><b>' + esc(r.t) + '</b></div>'
      + (r.btn ? '<button class="a2-btn" style="height:40px;padding:0 16px;font-size:14px" data-a="' + r.act + '" data-k="' + esc(r.k) + '"' + (r.id ? ' data-id="' + esc(r.id) + '"' : '') + '>' + esc(r.btn) + '</button>' : '') + '</div>';
  }

  /* what each card shows in one number */
  function cardVal(c) {
    const d = T();
    if (c.type === 'habit') { const n = habitWeek(c.id).filter(Boolean).length, g = goalOf(c); return { f: n / g, v: n + '/' + g, big: n, unit: '/' + g }; }
    if (c.type === 'month') { const ms = monthStats(c, d); return { f: ms.total ? ms.done / ms.total : 0, v: ms.done + '/' + ms.total, big: ms.done, unit: '/' + ms.total }; }
    const ps = projectStats(c.id);
    if (c.deadline) { const k = Math.max(0, daysBetween(d, c.deadline)); const span = Math.max(1, daysBetween(c.created || d, c.deadline)); return { f: ps.total ? ps.done / ps.total : 1 - k / span, v: k + L('d', 'd'), big: k, unit: L(k === 1 ? ' day' : ' days', ' ' + plural(k, 'den', 'dny', 'dní')) }; }
    return { f: ps.total ? ps.done / ps.total : 0, v: ps.total ? ps.done + '/' + ps.total : String(ps.open), big: ps.open, unit: ' ' + L('open', plural(ps.open, 'otevřený', 'otevřené', 'otevřených')) };
  }
  const score = c => { const d = T(); return (itemsOn(d).some(i => i.card === c.id) ? 100 : 0) + (c.type === 'habit' ? 20 + (typeof streakOf === 'function' ? streakOf(c.id) : 0) : 0) + (c.deadline ? Math.max(0, 30 - daysBetween(d, c.deadline)) : 0); };
  /* Keiro projects as cards: waiting = clips to review */
  function keiroCards() {
    const kx = KX(); if (!kx || !kx.C.on || !kx.C.feed) return [];
    const ps = kx.projs(); const one = p => kx.inP(p ? p.name : null, () => { const f = kx.F(), rv = (f.review || []).length, st = f.stats_today || {}; const tot = p && p.max_per_day ? +p.max_per_day : (st.approved || 0) + rv; const dn = p ? +p.today || 0 : st.approved || 0;
      return { keiro: true, name: p ? p.name : 'Keiro', k: p ? p.name : '', color: p ? kx.pcol(p.name) : kx.KC(), n: rv, f: tot ? dn / tot : 0 }; });
    return ps.length ? ps.map(one) : [one(null)];
  }
  const tileSub = c => c.type === 'habit' ? L('this week', 'tento týden') : c.type === 'month' ? L('this month', 'tento měsíc') : c.deadline ? L('days left', 'dní zbývá') : L('open', 'otevřené');
  function homeTiles(max) {
    const out = keiroCards().slice(0, 2).map(k => ({ k, html: (i) => '<button class="a2-glass a2-tint a2-in a3tile" style="--i:' + i + ';--c:' + k.color + '" data-a="krOpen" data-k="' + esc(k.k) + '">' + ring(46, k.f, k.color, i, k.n, 14) + '<i class="a3tsub">' + esc(L('to review', 'ke schválení')) + '</i><span>' + esc(k.name) + '</span></button>' }));
    S.cards.slice().sort((a, b) => score(b) - score(a)).slice(0, max - out.length).forEach(c => { const v = cardVal(c); out.push({ c, html: i => '<button class="a2-glass a2-tint a2-in a3tile" style="--i:' + i + ';--c:' + c.color + '" data-a="openCard" data-id="' + c.id + '">' + ring(46, v.f, c.color, i, v.v, v.v.length > 4 ? 10 : 12) + '<i class="a3tsub">' + esc(tileSub(c)) + '</i><span>' + esc(c.name) + '</span></button>' }); });
    return out;
  }

  /* ================= HOME · phone ================= */
  /* the widget stack (our swipe-up widget): the canvas rows are its first pages, the app's own pages follow */
  function nowPage() {
    const kx = KX(); let r = null;
    if (kx && kx.C.on && kx.C.feed) {
      const p = kx.parts(), o = kx.nowState();
      if (p.todo.length) { const g = p.first; const nm = kx.proj(g.streamer) ? kx.proj(g.streamer).name : 'Keiro'; const mins = p.left != null ? Math.max(1, Math.ceil(p.left / 60000)) : null;
        r = { c: kx.pcol(g.streamer), lab: nm + (mins != null ? ' · ' + L(mins + ' min left', 'zbývá ' + mins + ' min') : ''), t: L('Send the link to the campaign', 'Odešli odkaz do kampaně'), sub: (g.hook || '') + (p.todo.length > 1 ? ' · +' + (p.todo.length - 1) : ''), btn: L('Send ', 'Odeslat ') + p.todo.length, act: 'krOpen', k: g.streamer || '', pulse: p.hot };
      } else if (o.n) { const ps = kx.projs(); const pn = ps.length ? ps.map(x => [x, kx.inP(x.name, () => (kx.F().review || []).length)]).sort((a, b) => b[1] - a[1])[0] : null;
        r = { c: pn ? kx.pcol(pn[0].name) : kx.KC(), lab: (pn ? pn[0].name : 'Keiro') + ' · ' + L('waiting', 'čeká'), t: o.n + ' ' + kx.klip(o.n) + L(' to review', ' ke schválení'), sub: o.p || '', btn: L('Review ', 'Schválit ') + o.n, act: 'krHomeReview', k: pn ? pn[0].name : '' };
      }
    }
    if (!r && typeof homeNotes === 'function') { const n = (homeNotes() || []).find(x => x.id !== 'keiro'); if (n) r = { c: n.c || '#9fd6e8', lab: L('Now', 'Teď'), t: n.t, sub: n.s || '', btn: n.btn, act: n.act, k: '', id: n.id }; }
    if (!r) return null;
    return '<div class="a3wp a2-tint" style="--c:' + r.c + '"><span class="a2-lab a3wpl" style="color:color-mix(in oklab,' + r.c + ' 45%,var(--mw))"><span class="a2-dot' + (r.pulse ? ' a2-pulse' : '') + '" style="--c:' + r.c + '"></span><span>' + esc(r.lab) + '</span></span><b class="a2-d a3wpt">' + esc(r.t) + '</b>' + (r.sub ? '<span class="a2-t2 a3wps">' + esc(r.sub) + '</span>' : '')
      + (r.btn ? '<button class="a2-btn a3wpb" data-a="' + r.act + '" data-k="' + esc(r.k) + '"' + (r.id ? ' data-id="' + esc(r.id) + '"' : '') + '>' + esc(r.btn) + '</button>' : '') + '</div>';
  }
  function cardsPage() {
    const rows = cardRows(5);
    return '<div class="a3wp a3wrows"><div class="a3sh" style="padding:0"><span class="a2-lab">' + esc(L('Cards · this week', 'Karty · tento týden')) + '</span><button class="a2-t2" data-a="tab" data-k="spaces">Spaces ›</button></div><div class="a3wrl">'
      + (rows.length ? rows.join('') : '<button class="a3kr" data-a="newCard"><span class="a3plus">' + ico('plus', 16, 2) + '</span><b>' + esc(t('newCard')) + '</b></button>') + '</div></div>';
  }
  function ideasPage() {
    const ideas = ideasList(); const ni = ideas.length; if (!ni) return null;
    return '<div class="a3wp"><div class="a3sh" style="padding:0"><span class="a2-lab">' + esc(L('New ideas', 'Nové nápady')) + ' · ' + ni + '</span><button class="a2-t2" data-a="tab" data-k="board">Board ›</button></div><div class="a3wid">'
      + ideas.slice(0, 3).map(m => '<button class="a3widt" data-a="viewMoment" data-id="' + m.id + '"><span class="a3widi" style="' + ideaBg(m) + '">' + (m.kind === 'note' ? '<span class="a3idn">' + esc(m.note || '') + '</span>' : '') + '</span><span class="a3idc2">' + esc(ideaTitle(m)) + '</span></button>').join('') + '</div></div>';
  }
  function widgetStack(M, isDesk) {
    const pages = [];
    const sf = S.studioOn ? studioFacts() : null;
    if (sf && (sf.ups.length || sf.busy.length || sf.ready.length)) pages.push(['a3st', '<div class="a3wp" role="button" data-a="a3StOpen"><span class="a2-lab a3wpl" style="color:var(--stl)"><span class="a2-dot a2-pulse" style="--c:' + STC + '"></span><span>Aurora Studio</span></span><b class="a2-d a3wpt">' + esc(sf.ready.length && !sf.busy.length && !sf.ups.length ? L('Your cut is ready', 'Střih je hotový') : L('Cutting your video…', 'Stříhám tvoje video…')) + '</b><span class="a2-t2 a3wps">' + esc(studioNext(sf)) + '</span><span class="a3lbar" style="margin-top:6px"><i style="width:' + (sf.ready.length && !sf.busy.length ? 100 : Math.max(8, sf.ups[0] ? sf.ups[0].pct || 0 : Math.round((Math.max(0, ST_ORDER.indexOf(sf.busy[0].stage || 'start')) + .5) / ST_ORDER.length * 100))) + '%"></i></span><button class="a2-btn a3wpb" data-a="a3StOpen">' + esc(sf.ready.length && !sf.busy.length ? L('Pick the opening', 'Vybrat začátek') : L('Open Studio', 'Otevřít Studio')) + '</button></div>']);
    const n = nowPage(); if (n) pages.push(['a3now', n]);
    if (!isDesk) { pages.push(['a3cards', cardsPage()]); const i = ideasPage(); if (i) pages.push(['a3ideas', i]); }
    /* the app's own widgets stay in the stack after the canvas ones (news from shared cards, evening, the week, tips) */
    let own = { order: [], html: [] }; try { own = stackCards(M); } catch (e) {}
    own.order.forEach((k, j) => { if (k === 'board' || k === 'keiro') return; pages.push([k, own.html[j]]); });
    H19.order = pages.map(x => x[0]); H19.news = own.news;
    return '<section class="hstack a3stack a2-in" id="hstack" style="--i:2"><div class="hst" id="hst" tabindex="0" aria-label="' + esc(L('Overview, swipe up or down', 'Přehled, posuň nahoru nebo dolů')) + '">'
      + pages.map(([k, h]) => '<div class="hcard a2-glass' + (k.startsWith('a3') ? ' a3hc' : ' a3own') + '" data-k="' + k + '"' + (k === 'a3now' ? ' style="--c:' + ((h.match(/--c:([^";]+)/) || [])[1] || 'transparent') + '"' : '') + '>' + h + '</div>').join('')
      + '</div><div class="hdots">' + pages.map((_, k) => '<i' + (k === H19.idx ? ' class="on"' : '') + '></i>').join('') + '</div></section>';
  }
  function homePhone() {
    const M = homeModel();
    return '<div class="a2 a3p a3home">'
      + pHead(logo(), '<button class="a2-icon" style="width:40px;height:40px" data-a="openSettings" aria-label="' + esc(t('settings')) + '">' + SUN + '</button>')
      + todayCard(M, false) + widgetStack(M) + '</div>';
  }

  /* ================= HOME · computer ================= */
  function dayRow(i, d, nextId) {
    const on = isDone(i, d); const c = hasCol(i) ? itemColor(i) : 'rgba(var(--wr),.4)';
    const sub = [i.date && i.date < d && !i.repeat ? dayShort(i.date) : (i.time || L('any time', 'kdykoli')), cardName(i)].filter(Boolean).join(' · ');
    return '<div class="a3dr' + (on ? ' done' : '') + '" role="button" data-a="openItem" data-id="' + i.id + '"><span class="a3bar" style="background:' + c + (i.id === nextId ? ';box-shadow:0 0 10px ' + c : '') + '"></span><div class="a3dt"><span' + (i.id === nextId ? ' style="font-weight:600"' : '') + '>' + esc(i.t) + '</span><span class="a2-t3">' + esc(sub) + '</span></div>' + check(i, d, hasCol(i) ? itemColor(i) : '#f4ecdc') + '</div>';
  }
  function groupRow(g, d) {
    const all = g.all || monthItems(g.card.id); const dn = all.filter(i => isDone(i, d)).length;
    return '<div class="a3dr' + (dn >= all.length ? ' done' : '') + '" role="button" data-a="openCard" data-id="' + g.card.id + '"><span class="a3bar" style="background:' + g.card.color + '"></span><div class="a3dt"><span>' + esc(g.card.name) + '</span><span class="a2-t3">' + esc(L('Monthly · ', 'Měsíčně · ') + dn + '/' + all.length) + '</span></div><span class="a2-t2 a2-num" style="font-size:13px">' + dn + '/' + all.length + '</span></div>';
  }
  const nowLine = M => '<div class="a3nl"><b class="a2-num">' + mtime(M.nm) + '</b><span class="a2-now"></span><i></i></div>';
  function dayList(M, day, nextId) {
    const its = itemsOn(day); const od = day === T() ? overdueItems() : [];
    let rows = '';
    if (od.length) rows += '<span class="a2-lab a3fb">' + esc(L('From before', 'Z dřívějška')) + '</span>' + od.map(i => dayRow(i, i.date, null)).join('');
    let placed = day !== T();
    groupMonthly(its, day).forEach(i => { if (!placed && !i.grp && (!i.time || tmin(i.time) > M.nm)) { rows += nowLine(M); placed = true; } rows += i.grp ? groupRow(i, day) : dayRow(i, day, nextId); });
    if (!placed && its.length) rows += nowLine(M);
    if (!its.length && !od.length) rows += '<div class="a2-t3 a3empty">' + esc(t('emptyDay')) + '</div>';
    return rows;
  }
  function weekPills(day, act) {
    return weekDays(day).map(d => { const on = d === day; return '<button class="' + (on ? 'a3wd on' : 'a2-well a3wd') + (d === T() && !on ? ' td' : '') + '" data-a="' + act + '" data-d="' + d + '"><span class="a2-lab">' + esc(WD[lang()][dow(d)]) + '</span><b class="a2-num">' + dOf(d).getDate() + '</b></button>'; }).join('');
  }
  function cardRows(max) {
    const ks = keiroCards().map(k => '<button class="a3kr" data-a="krOpen" data-k="' + esc(k.k) + '">' + ring(30, k.f, k.color, 5) + '<b>' + esc(k.name) + '</b><span class="a2-t2 a2-num"><b class="a2-d">' + k.n + '</b> ' + esc(L('wait', 'čeká')) + '</span></button>');
    const cs_ = S.cards.slice().sort((a, b) => score(b) - score(a)).slice(0, Math.max(2, max - ks.length)).map(c => { const v = cardVal(c); return '<button class="a3kr" data-a="openCard" data-id="' + c.id + '">' + ring(30, v.f, c.color, 5) + '<b>' + esc(c.name) + '</b><span class="a2-t2 a2-num"><b class="a2-d">' + v.big + '</b> ' + esc(v.unit.trim()) + '</span></button>'; });
    return ks.concat(cs_).slice(0, max);
  }
  function homeDesk() {
    const M = homeModel(); const day = V.deskDay || T(); const nx = M.nextAny;
    const greet = (() => { const h = new Date().getHours(); return h < 11 ? L('Good morning', 'Dobré ráno') : h < 18 ? L('Good afternoon', 'Dobrý den') : L('Good evening', 'Dobrý večer'); })();
    const col1 = '<div class="a3col a3c1">' + todayCard(M, true) + widgetStack(M, true) + '</div>';
    const col2 = '<div class="a2-glass a2-in a3col2" style="--i:4"><div class="a3wk">' + weekPills(day, 'dHomeDay') + '</div><div class="a3list">' + dayList(M, day, nx && nx.id) + '</div>'
      + '<button class="a2-btn ghost a3w" data-a="add" data-date="' + day + '">+ ' + esc(day === T() ? L('Add to Today', 'Přidat na dnešek') : L('Add to ', 'Přidat na ') + dayName(day).toLowerCase()) + '</button></div>';
    const rows = cardRows(6);
    const ideas = ideasList();
    const col3 = '<div class="a3col"><div class="a2-glass a2-in a3cards" style="--i:5"><div class="a3sh"><span class="a2-lab">' + esc(L('Cards · this week', 'Karty · tento týden')) + '</span><button class="a2-t2" data-a="tab" data-k="spaces">Spaces ›</button></div>'
      + (rows.length ? rows.join('') : '<button class="a3kr" data-a="newCard"><span class="a3plus">' + ico('plus', 16, 2) + '</span><b>' + esc(t('newCard')) + '</b></button>') + '</div>'
      + '<div class="a2-glass a2-in a3idc" style="--i:6"><div class="a3sh"><span class="a2-lab">' + esc(L('New ideas', 'Nové nápady')) + ' · ' + ideas.length + '</span><button class="a2-t2" data-a="tab" data-k="board">Board ›</button></div>'
      + (ideas.length ? '<div class="a3id2">' + ideas.slice(0, 2).map(m => '<button class="a3idt" data-a="viewMoment" data-id="' + m.id + '"><span class="a3idi" style="' + ideaBg(m) + '">' + (m.kind === 'video' ? '<span class="a2-icon" style="width:36px;height:36px">' + ico('play', 14, 2) + '</span>' : m.kind === 'note' ? '<span class="a3idn">' + esc(m.note || '') + '</span>' : '') + '</span><span class="a3idc2">' + esc(ideaTitle(m)) + '</span></button>').join('') + '</div>'
        : '<button class="a2-btn ghost a3w" style="margin-top:auto" data-a="add" data-mode="note">+ ' + esc(L('Add an idea', 'Hodit nápad')) + '</button>') + '</div></div>';
    return '<main class="dmain a2 a3d a3dhome"><div class="a2-in a3greet" style="--i:1"><b class="a2-d">' + esc(greet) + '</b><span class="a2-t2">' + esc(dLongX(T())) + '</span></div><div class="a3g3">' + col1 + col2 + col3 + '</div></main>';
  }
  const dLongX = d => { const x = dOf(d); return cs() ? ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'][dow(d)] + ' ' + x.getDate() + '. ' + ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'][x.getMonth()] : x.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); };


  /* ================= SPACES · one anatomy: kicker · name + ring · one view · next step ================= */
  function nextOf(c) {
    const d = T();
    try {
      if (c.type === 'project') { const ps = projectStats(c.id); const n = ps.next; return n ? { t: n.t, w: n.time || (n.date ? (n.date === d ? L('today', 'dnes') : n.date < d ? L('from ', 'od ') + dayShort(n.date) : dayShort(n.date)) : '') } : null; }
      const its = cardItems(c.id); const nx = its.filter(i => occurs(i, d)).find(i => !isDone(i, d)) || its.find(i => !i.repeat && !i.done) || (c.type === 'habit' ? its.find(i => i.repeat) : null);
      return nx ? { t: nx.t, w: nx.time || (occurs(nx, d) ? L('today', 'dnes') : (c.type === 'month' ? whenLabel(nx, d) : '')) } : null;
    } catch (e) { return null; }
  }
  function kickText(c) {
    if (c.type === 'habit') return t('habit') + ' · ' + goalText(goalOf(c));
    if (c.type === 'month') return L('Monthly · ', 'Měsíčně · ') + winText(c.win);
    if (c.deadline) { const n = daysBetween(T(), c.deadline); return t('project') + ' · ' + (n < 0 ? L('overdue', 'po termínu') : n === 0 ? L('due today', 'dnes termín') : n + ' ' + L(n === 1 ? 'day left' : 'days left', plural(n, 'den', 'dny', 'dní'))); }
    return t('project');
  }
  const kick = (txt, c) => '<span class="a2-lab a3kk"><span class="a2-dot" style="--c:' + c + '"></span><span>' + esc(txt) + '</span></span>';
  function keiroFacts(k) {
    const kx = KX(); return kx.inP(k.k || null, () => { const f = kx.F(), p = kx.parts(), pr = k.k ? kx.proj(k.k) : null;
      const sch = (f.scheduled || []).filter(z => +new Date(z.when) > Date.now()).length;
      const mins = p.left != null ? Math.max(1, Math.ceil(p.left / 60000)) : null;
      return { rv: (f.review || []).length, out: pr && pr.max_per_day != null ? (+pr.today || 0) + '/' + pr.max_per_day : String((f.stats_today || {}).approved || 0), sch, send: p.todo.length, mins, hot: p.hot || p.urg }; });
  }
  const srcOf = c => { if (!c.src) return null; try { const o = JSON.parse(localStorage.getItem('src:' + c.id) || 'null'); return o && o.data ? o.data : null; } catch (e) { return null; } };
  const kf = n => { n = +n || 0; const a = Math.abs(n); return a >= 1e6 ? (Math.round(n / 1e5) / 10) + 'M' : a >= 1e4 ? Math.round(n / 1e3) + 'k' : a >= 1e3 ? (Math.round(n / 100) / 10) + 'k' : String(Math.round(n * 100) / 100); };
  const KL = { Subscribers: ['Subscribers', 'Odběratelé'], Views: ['Views', 'Zhlédnutí'], Videos: ['Videos', 'Videa'], Rows: ['Rows', 'Řádky'], Followers: ['Followers', 'Sledující'] };
  const klab = l => KL[l] ? L(KL[l][0], KL[l][1]) : l;
  const monthDone = c => { const ms = monthStats(c, T()); return ms.total && ms.done >= ms.total; };
  function squares(c, big) {
    const d = T();
    if (c.type === 'habit') { const w = habitWeek(c.id), td = dow(d); return '<div class="' + (big ? 'a3sq7' : 'a3sq') + '">' + w.map((on, k) => '<span class="a2-pop" style="--i:' + (k + 2) + ';' + (on ? 'background:' + c.color : k === td ? 'box-shadow:inset 0 0 0 ' + (big ? 2 : 1.5) + 'px var(--cream)' : 'background:rgba(var(--wr),.12)') + '"></span>').join('') + '</div>'; }
    const ms = monthStats(c, d); return '<div class="' + (big ? 'a3sq7 m' : 'a3sq') + '">' + ms.its.slice(0, big ? 14 : 9).map((it, k) => '<span class="a2-pop" style="--i:' + (k + 2) + ';' + (isDone(it, d) ? 'background:' + c.color : 'background:rgba(var(--wr),.12)') + '"></span>').join('') + '</div>';
  }
  function segs(c, big) {
    const ps = projectStats(c.id); const n = Math.min(big ? 10 : 8, ps.total); if (!n) return ''; const on = ps.total ? Math.round(ps.done / ps.total * n) : 0;
    return '<div class="' + (big ? 'a3sg2' : 'a3sg') + '">' + Array.from({ length: n }, (_, k) => '<span style="background:' + (k < on ? c.color : 'rgba(var(--wr),.14)') + '"></span>').join('') + '</div>';
  }
  function spaceList() {
    let ord = []; try { ord = JSON.parse(localStorage.getItem('spOrder') || '[]') || []; } catch (e) {}
    const pos = k => { const i = ord.indexOf(k); return i < 0 ? 1e6 : i; };
    const f = V.deckFilter || 'all';
    const ks = f === 'all' || f === 'project' ? keiroCards().map((k, i) => ({ k, key: 'k:' + k.k, i })) : [];
    const cs_ = filteredCards().map((c, i) => ({ c, key: 'c:' + c.id, i: 100 + i }));
    if (S.studioOn && (f === 'all' || f === 'project')) ks.push({ s: true, key: 's:studio', i: 50 });
    return ks.concat(cs_).sort((a, b) => pos(a.key) - pos(b.key) || a.i - b.i);
  }
  function spacePhoneCard(x, i) {
    if (x.s) return studioPhoneCard(i);
    if (x.k) { const k = x.k, fa = keiroFacts(k);
      const body = fa.send ? '<div class="a2-well a3wl"><span class="a2-dot' + (fa.hot ? ' a2-pulse' : '') + '" style="--c:#ee5a85"></span><span class="a3wlt">' + esc(L('Send link to campaign', 'Odeslat odkaz do kampaně')) + '</span>' + (fa.mins != null ? '<span class="a3wlm">' + fa.mins + ' min</span>' : '<span class="a3wlm">' + fa.send + '</span>') + '</div>' : '';
      return '<div class="a2-glass a2-tint a2-in a3sc" role="button" style="--i:' + i + ';--c:' + k.color + '" data-a="krOpen" data-k="' + esc(k.k) + '"><div class="a3sch"><div class="a3scn">' + kick(L('Project · Clips', 'Projekt · Klipy'), k.color) + '<b class="a2-d">' + esc(k.name) + '</b>' + (!fa.send ? '<span class="a2-t2" style="font-size:14px">' + (fa.rv ? fa.rv + ' ' + esc(L(fa.rv === 1 ? 'clip to review' : 'clips to review', plural(fa.rv, 'klip ke schválení', 'klipy ke schválení', 'klipů ke schválení'))) : esc(L('Nothing to review', 'Nic ke schválení'))) + '</span>' : '') + '</div>' + ring(56, k.f, k.color, i, k.n, 16) + '</div>' + body + '</div>'; }
    const c = x.c, v = cardVal(c), nx = nextOf(c);
    const view = c.type === 'project' ? segs(c) : squares(c); const sd = srcOf(c);
    const k3 = sd ? (sd.kpis || []).filter(k => k && k.value != null).slice(0, 3) : [];
    const foot = k3.length && !view ? '<div class="a3scf a3kp">' + k3.map(k => '<span><b class="a2-num">' + esc(kf(k.value)) + '</b> ' + esc(klab(k.label)) + '</span>').join('') + '</div>'
      : c.type === 'month' && monthDone(c) ? '<div class="a3scf">' + view + '<span class="a2-t2">' + esc(L('All done this month ✓', 'Tento měsíc hotovo ✓')) + '</span></div>'
      : view || nx ? '<div class="a3scf">' + view + '<span class="a2-t2">' + (nx ? esc(nx.t + (nx.w ? ' · ' + nx.w : '')) : '') + '</span></div>' : '<div class="a3scf"><span class="a2-t2">' + esc(L('No steps yet', 'Zatím žádný krok')) + '</span></div>';
    return '<div class="a2-glass a2-tint a2-in a3sc" role="button" style="--i:' + i + ';--c:' + c.color + '" data-a="openCard" data-id="' + c.id + '"><div class="a3sch"><div class="a3scn">' + kick(kickText(c), c.color) + '<b class="a2-d">' + esc(c.name) + '</b></div>' + ring(56, v.f, c.color, i, v.v, v.v.length > 4 ? 12 : 15) + '</div>' + foot + '</div>';
  }
  function spacePhoneHalf(x, i) {
    if (x.s) return studioPhoneCard(i);
    if (x.k) { const k = x.k; return '<div class="a2-glass a2-tint a2-in a3sh2" role="button" style="--i:' + i + ';--c:' + k.color + '" data-a="krOpen" data-k="' + esc(k.k) + '">' + kick(t('project'), k.color) + '<div class="a3shr"><b class="a2-d">' + esc(k.name) + '</b><b class="a2-num">' + k.n + '</b></div><span class="a2-t2">' + esc(L('to review', 'ke schválení')) + '</span></div>'; }
    const c = x.c, v = cardVal(c), nx = nextOf(c);
    return '<div class="a2-glass a2-tint a2-in a3sh2" role="button" style="--i:' + i + ';--c:' + c.color + '" data-a="openCard" data-id="' + c.id + '">' + kick(c.type === 'habit' ? t('habit') : c.type === 'month' ? L('Monthly', 'Měsíčně') : t('project'), c.color) + '<div class="a3shr"><b class="a2-d">' + esc(c.name) + '</b><b class="a2-num">' + esc(v.v) + '</b></div><span class="a2-t2">' + esc(nx ? nx.t + (nx.w ? ' · ' + nx.w : '') : L('No steps yet', 'Zatím žádný krok')) + '</span></div>';
  }
  function spacesSeg(act) {
    const f = V.deckFilter || 'all'; const n = S.cards.length + (f === 'all' ? keiroCards().length : 0);
    return '<div class="a2-seg">' + [['all', t('all') + ' · ' + (S.cards.length + keiroCards().length + (S.studioOn ? 1 : 0))], ['habit', t('habits')], ['project', t('projects')]].map(([k, l]) => '<button class="' + (f === k ? 'on' : '') + '" data-a="' + act + '" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div>';
  }
  /* phone: our swipe deck, one tall card per space, in the canvas look */
  function spacesPhone() {
    const list = spaceList();
    const cards = list.map((x, k) => spaceDeskCard(x, 2 + k).replace('class="a2-glass a2-tint a2-in a3dc"', 'class="a2-glass a2-tint a2-in a3dc a3dk"'));
    cards.push('<button class="a2-glass a2-in a3dc a3dk a3new" style="--i:' + (2 + list.length) + '" data-a="newCard"><span class="a3plus" style="width:56px;height:56px">' + ico('plus', 24, 1.8) + '</span><b class="a2-d" style="font-size:26px">' + esc(t('newCard')) + '</b><span class="a2-t2">' + esc(t('newCardSub')) + '</span></button>');
    return '<div class="a2 a3p a3spaces">' + pHead('<b class="a2-d" style="font-size:44px">Spaces</b>', '<button class="a2-icon" data-a="newCard" aria-label="' + esc(t('newCard')) + '">' + ico('plus', 20, 2) + '</button>')
      + '<div class="a2-in" style="--i:1;padding:0 2px 4px">' + spacesSeg('deckFilter') + '</div>'
      + '<div class="a3deck" id="a3deck">' + cards.join('') + '</div><div class="a3dots" id="a3dots">' + cards.map((_, k) => '<i class="' + (k === (V.deckIdx || 0) ? 'on' : '') + '"></i>').join('') + '</div></div>';
  }
  /* v2061 · Spaces on the phone as a Wallet: strips on top, the card that needs you open at the bottom,
     the rest peeking under it. Scrolling walks through the deck; done cards sit at the very top, dimmed. */
  function urg(x) {
    try {
      if (x.s) { const f = studioFacts(); return f.ready.length ? 0 : f.busy.length || f.ups.length ? 1 : 2; }
      if (x.k) { const fa = keiroFacts(x.k); return fa.send || fa.rv ? 0 : 2; }
      const c = x.c, d = T();
      if (c.type === 'month' && monthDone(c)) return 3;
      if (c.type === 'project') { const ps = projectStats(c.id); if (ps.total && ps.done >= ps.total) return 3; if (c.deadline && daysBetween(d, c.deadline) <= 3) return 0; }
      if (c.type === 'habit') { const v = cardVal(c); if (v.f >= 1) return 3; }
      const its = typeof cardItems === 'function' ? cardItems(c.id) : []; if (its.some(i => occurs(i, d) && !isDone(i, d))) return 0;
      return nextOf(c) ? 1 : 2;
    } catch (e) { return 2; }
  }
  const URG = () => [L('Waiting for you', 'Čeká na tebe'), L('Running', 'Běží'), L('Calm', 'V klidu'), L('Done', 'Hotovo')];
  function walletCard(x, r) {
    const tag = '<span class="a3wbg">' + esc(URG()[r]) + '</span>';
    const nxl = (txt, w) => '<div class="a3wnx"><span class="a2-lab">' + esc(t('nextStep')) + '</span><span>' + esc(txt) + (w ? ' · ' + esc(w) : '') + '</span></div>';
    if (x.s) { const f = studioFacts();
      return '<div class="a3wc u' + r + '" style="--c:' + STC + '" data-a="a3StOpen"><div class="a3wch"><b>Aurora Studio</b><span class="a2-num">' + f.left + '/' + f.daily + '</span></div><div class="a3wcb">' + tag + '<b class="a2-d a3wbig">' + (f.ups.length + f.busy.length) + ' <small>' + esc(L('in progress', 'rozpracováno')) + '</small></b>' + nxl(studioNext(f)) + '</div></div>'; }
    if (x.k) { const k = x.k, fa = keiroFacts(k);
      return '<div class="a3wc u' + r + '" style="--c:' + k.color + '" data-a="krOpen" data-k="' + esc(k.k) + '"><div class="a3wch"><b>' + esc(k.name) + '</b><span class="a2-num">' + (fa.rv ? fa.rv + ' ' + esc(L('to review', 'k review')) : esc(fa.out)) + '</span></div><div class="a3wcb">' + tag + '<b class="a2-d a3wbig">' + fa.rv + ' <small>' + esc(L(fa.rv === 1 ? 'clip to review' : 'clips to review', plural(fa.rv, 'klip ke schválení', 'klipy ke schválení', 'klipů ke schválení'))) + '</small></b>'
        + '<div class="a3w3">' + [[fa.out, L('out today', 'dnes venku')], [fa.sch, L('scheduled', 'naplánováno')], [fa.send, L('to send', 'k odeslání')]].map(([n, l]) => '<div class="a2-well"><b class="a2-d a2-num">' + esc(String(n)) + '</b><div>' + esc(l) + '</div></div>').join('') + '</div></div></div>'; }
    const c = x.c, v = cardVal(c), nx = nextOf(c);
    const bigv = '<b class="a2-d a3wbig">' + esc(v.v) + ' <small>' + esc(c.type === 'habit' ? L('this week', 'tento týden') : c.type === 'month' ? L('this month', 'tento měsíc') : L('open', 'otevřené')) + '</small></b>';
    let mid = c.type === 'habit' || c.type === 'month' ? bigv + squares(c, true) : c.deadline ? '<b class="a2-d a3wbig">' + Math.max(0, daysBetween(T(), c.deadline)) + ' <small>' + esc(L('days to deadline', 'dní do termínu')) + '</small></b>' : bigv + segs(c, true);
    mid = mid.split('background:' + c.color).join('background:#fff').split('rgba(var(--wr),.12)').join('rgba(255,255,255,.24)').split('rgba(var(--wr),.14)').join('rgba(255,255,255,.24)');
    const bg = c.bgImg ? ';--img:url(' + c.bgImg + ')' : '';
    return '<div class="a3wc u' + r + (c.bgImg ? ' img' : '') + '" style="--c:' + c.color + bg + '" data-a="openCard" data-id="' + c.id + '"><div class="a3wch"><b>' + esc(c.name) + '</b><span class="a2-num">' + esc(v.v) + '</span></div><div class="a3wcb">' + tag + mid + (nx ? nxl(nx.t, nx.w) : '') + '</div></div>';
  }
  function spacesPhone() {
    const list = spaceList().map((x, i) => ({ x, r: urg(x), i }));
    /* most urgent last (it opens at the bottom), done first (top, dimmed) */
    list.sort((a, b) => b.r - a.r || b.i - a.i);
    const cards = list.map(o => walletCard(o.x, o.r)).join('');
    return '<div class="a2 a3p a3spaces a3wal-p">' + pHead('<b class="a2-d" style="font-size:44px">Spaces</b>', '<button class="a2-icon" data-a="newCard" aria-label="' + esc(t('newCard')) + '">' + ico('plus', 20, 2) + '</button>')
      + '<div class="a3wal" id="a3wal"><div class="a3wst"><div class="a3wseg">' + spacesSeg('deckFilter') + '</div><div class="a3wdeck">' + (cards || '<button class="a2-glass a3ndr" data-a="newCard"><span>' + esc(t('newCard')) + '</span><span class="a2-t2">+</span></button>') + '</div></div></div></div>';
  }
  function bindWallet(scr) {
    const wal = scr.querySelector('#a3wal'); if (!wal) return; const st = wal.querySelector('.a3wst'), deck = wal.querySelector('.a3wdeck'); const cs = [...deck.querySelectorAll('.a3wc')]; const n = cs.length; if (!n) return;
    const STEP = 96; let H = 0, T0 = 0, sH = 44, PK = 7;
    const size = () => {
      const segH = st.querySelector('.a3wseg').offsetHeight + 10;
      const top = parseFloat(getComputedStyle(st).top) || 0; T0 = top;
      H = Math.max(300, scr.clientHeight - top - segH - (parseFloat(getComputedStyle(scr.querySelector('.a3p')).paddingBottom) || 92));
      deck.style.height = H + 'px'; wal.style.height = (H + segH + (n - 1) * STEP) + 'px';
      sH = Math.max(14, Math.min(58, (H - 300 - 3 * PK) / Math.max(1, n - 1)));
    };
    const lay = A => { /* positions for an integer active index A (0 = top of the deck) */
      const out = []; const pileN = n - 1 - A; const pile = Math.min(3, pileN) * PK; const E = H - A * sH - pile;
      for (let i = 0; i < n; i++) {
        if (i < A) out.push({ y: i * sH, h: E, s: 1, z: i + 1, ex: 0 });
        else if (i === A) out.push({ y: A * sH, h: E, s: 1, z: 50, ex: 1 });
        else { const k = Math.min(3, i - A); out.push({ y: A * sH + k * PK, h: E, s: 1 - k * .045, z: 40 - k, ex: 0, hide: i - A > 3 }); }
      }
      return out;
    };
    const paint = () => {
      const p = Math.max(0, Math.min(n - 1, (scr.scrollTop - Math.max(0, wal.offsetTop - T0)) / STEP));
      const a = (n - 1) - p; const A0 = Math.floor(a), A1 = Math.min(n - 1, A0 + 1), f = a - A0;
      const L0 = lay(A0), L1 = lay(A1);
      cs.forEach((el, i) => { const x = L0[i], y = L1[i]; const Y = x.y + (y.y - x.y) * f, Hh = x.h + (y.h - x.h) * f, Sc = x.s + (y.s - x.s) * f, ex = x.ex + (y.ex - x.ex) * f;
        el.style.transform = 'translate3d(0,' + Y.toFixed(1) + 'px,0) scale(' + Sc.toFixed(3) + ')'; el.style.height = Hh.toFixed(0) + 'px'; el.style.zIndex = f < .5 ? x.z : y.z; el.style.setProperty('--ex', ex.toFixed(2)); el.style.opacity = (x.hide && y.hide) ? 0 : 1; el.classList.toggle('act', ex > .5); });
    };
    size(); paint(); requestAnimationFrame(() => { size(); paint(); });
    if (scr._walOff) scr._walOff();
    let raf = 0; const onS = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); }; scr.addEventListener('scroll', onS, { passive: true });
    /* a strip is a way to get there; only the open card opens */
    deck.addEventListener('click', e => { const el = e.target.closest('.a3wc'); if (!el || el.classList.contains('act')) return; e.stopPropagation(); e.preventDefault();
      const i = cs.indexOf(el); const top = Math.max(0, wal.offsetTop - T0) + ((n - 1) - i) * STEP; scr.scrollTo({ top, behavior: RM ? 'auto' : 'smooth' }); haptic && haptic(); }, true);
    /* settle on a card after a fling */
    let st2 = 0; const onE = () => { clearTimeout(st2); if (scr._tch) return; st2 = setTimeout(() => { const base = Math.max(0, wal.offsetTop - T0); const p = (scr.scrollTop - base) / STEP; if (p < -.2 || p > n - .8) return; const k = Math.round(p); if (Math.abs(p - k) > .02) scr.scrollTo({ top: base + k * STEP, behavior: RM ? 'auto' : 'smooth' }); }, 160); }; scr.addEventListener('scroll', onE, { passive: true });
    let ro = null; try { ro = new ResizeObserver(() => { size(); paint(); }); ro.observe(scr); } catch (e) {}
    scr._walOff = () => { scr.removeEventListener('scroll', onS); scr.removeEventListener('scroll', onE); clearTimeout(st2); cancelAnimationFrame(raf); ro && ro.disconnect(); };
  }
  function bindDeck(el) {
    const d = el.querySelector('#a3deck'), dots = el.querySelector('#a3dots'); if (!d) return;
    const n = d.children.length, i0 = Math.min(V.deckIdx || 0, n - 1);
    const at = k => { const c = d.children[k]; return c ? c.offsetLeft - (d.clientWidth - c.clientWidth) / 2 : 0; };
    requestAnimationFrame(() => { d.scrollLeft = at(i0); });
    let raf = 0; d.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const mid = d.scrollLeft + d.clientWidth / 2; let best = 0, bd = 1e9; [...d.children].forEach((c, k) => { const dd = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid); if (dd < bd) { bd = dd; best = k; } }); if (best !== V.deckIdx) { V.deckIdx = best; dots && [...dots.children].forEach((x, k) => x.classList.toggle('on', k === best)); } }); }, { passive: true });
  }
  function spaceDeskCard(x, i) {
    const col = x.s ? STC : x.k ? x.k.color : x.c.color; let h = spaceDeskCard0(x, i);
    if (!col || h.indexOf('a3dc"') < 0) return h;
    h = h.split(col).join('#fff').split('--c:#fff').join('--c:' + col).split('rgba(var(--wr),.12)').join('rgba(255,255,255,.24)').split('rgba(var(--wr),.14)').join('rgba(255,255,255,.24)');
    const img = x.c && x.c.bgImg ? ' img" style="--img:url(' + x.c.bgImg + ');' : null;
    h = h.replace('a3dc"', 'a3dc a3fc u' + urg(x) + '"'); if (img) h = h.replace('a3fc u' + urg(x) + '" style="', 'a3fc u' + urg(x) + img);
    return h;
  }
  function spaceDeskCard0(x, i) {
    if (x.s) return studioPhoneCard(i);
    const nxt = (lab, txt, w, col) => '<div class="a3nxs"><span class="a2-lab" style="color:color-mix(in oklab,' + col + ' 55%,var(--mw))">' + esc(lab) + '</span><span>' + esc(txt) + (w ? ' <span class="a2-t2">· ' + esc(w) + '</span>' : '') + '</span></div>';
    if (x.k) { const k = x.k, fa = keiroFacts(k);
      const wells = '<div class="a3w3">' + [[fa.out, L('out today', 'dnes venku')], [fa.sch, L('scheduled', 'naplánováno')], [fa.send, L('to send', 'k odeslání')]].map(([n, l]) => '<div class="a2-well"><b class="a2-d a2-num">' + esc(String(n)) + '</b><div class="a2-t2">' + esc(l) + '</div></div>').join('') + '</div>';
      const foot = fa.send ? '<div class="a3nxs r"><span class="a2-dot' + (fa.hot ? ' a2-pulse' : '') + '" style="--c:#ee5a85"></span><span>' + esc(L('Send link to campaign', 'Odeslat odkaz do kampaně')) + '</span>' + (fa.mins != null ? '<b>' + fa.mins + ' min</b>' : '') + '</div>'
        : nxt(t('nextStep'), fa.rv ? L('Review ' + fa.rv + ' clips', 'Schválit ' + fa.rv + ' ' + plural(fa.rv, 'klip', 'klipy', 'klipů')) : L('Nothing waiting', 'Nic nečeká'), '', k.color);
      return '<div class="a2-glass a2-tint a2-in a3dc" role="button" style="--i:' + i + ';--c:' + k.color + '" data-a="krOpen" data-k="' + esc(k.k) + '"><div class="a3dch">' + kick(L('Project · Clips', 'Projekt · Klipy'), k.color) + (fa.send ? '<span class="a3nowb">' + esc(L('NOW', 'TEĎ')) + '</span>' : '') + '</div><div class="a3dcn"><b class="a2-d">' + esc(k.name) + '</b>' + ring(64, k.f, k.color, i, k.n, 18) + '</div>' + wells + foot + '</div>'; }
    const c = x.c, v = cardVal(c), nx = nextOf(c);
    let mid = '';
    if (c.type === 'habit' || c.type === 'month') mid = squares(c, true);
    else if (c.deadline) { const n = Math.max(0, daysBetween(T(), c.deadline)); mid = '<div class="a3dl"><b class="a2-d a2-num">' + n + '</b><span class="a2-t2">' + esc(L(n === 1 ? 'day to deadline' : 'days to deadline', plural(n, 'den do termínu', 'dny do termínu', 'dní do termínu'))) + '</span></div>'; }
    else mid = segs(c, true);
    const sd = srcOf(c); const k3 = sd ? (sd.kpis || []).filter(k => k && k.value != null).slice(0, 3) : [];
    if (k3.length && (!mid || !projectStats(c.id).total)) mid = '<div class="a3w3">' + k3.map(k => '<div class="a2-well"><b class="a2-d a2-num">' + esc(kf(k.value)) + '</b><div class="a2-t2">' + esc(klab(k.label)) + '</div></div>').join('') + '</div>';
    else if (c.src && !mid) mid = '<div class="a3dl"><span class="a2-t2">' + esc(L('Fed by a link', 'Napojeno na odkaz')) + '</span></div>';
    const ps = c.type === 'project' ? projectStats(c.id) : null;
    const showRing = !(c.type === 'project' && !ps.total);
    return '<div class="a2-glass a2-tint a2-in a3dc" role="button" style="--i:' + i + ';--c:' + c.color + '" data-a="openCard" data-id="' + c.id + '"><div class="a3dch">' + kick(kickText(c).replace(/ · \d+ (days? left|dn[yí]|den)$/, c.deadline ? ' · ' + dayShort(c.deadline) : ''), c.color) + '</div><div class="a3dcn"><b class="a2-d">' + esc(c.name) + '</b>' + (showRing ? ring(64, v.f, c.color, i, v.v, 16) : '') + '</div>' + mid
      + (nx ? nxt(t('nextStep'), nx.t, nx.w, c.color) : c.type === 'month' && monthDone(c) ? '<div class="a3nxs"><span class="a2-t2" style="font:500 15px/1.2 Inter">' + esc(L('All done this month ✓', 'Tento měsíc hotovo ✓')) + '</span></div>' : '<div class="a3nxs"><button class="a2-btn ghost" style="height:38px;font-size:14px" data-a="add" data-card="' + c.id + '">+ ' + esc(L('First step', 'První krok')) + '</button></div>') + '</div>';
  }
  function spacesDesk() {
    const list = spaceList();
    const rows = Math.max(2, Math.ceil(list.length / 3));
    return '<main class="dmain a2 a3d a3dspaces' + (rows > 2 ? ' scr2' : '') + '"><div class="a2-in a3greet" style="--i:1;align-items:center;gap:20px"><b class="a2-d">Spaces</b>' + spacesSeg('dDeck') + '</div>'
      + '<div class="a3g3 a3sp" style="grid-template-rows:repeat(' + rows + ',minmax(' + (rows > 2 ? '300px' : '0') + ',1fr))">' + list.map((x, k) => spaceDeskCard(x, 2 + k)).join('')
      + (list.length % 3 ? '<button class="a2-glass a2-in a3dc a3new" style="--i:9" data-a="newCard"><span class="a3plus" style="width:56px;height:56px">' + ico('plus', 24, 1.8) + '</span><b class="a2-d" style="font-size:26px">' + esc(t('newCard')) + '</b><span class="a2-t2">' + esc(t('newCardSub')) + '</span></button>' : '') + '</div></main>';
  }


  /* ================= CARD · everything visible, the next step is the big button ================= */
  const whenTxt = (i, d) => { if (i.repeat) return i.time || (i.repeat === 'daily' ? L('daily', 'denně') : repText(i)); if (!i.date) return null; const k = daysBetween(T(), i.date); return (k === 0 ? L('Today', 'Dnes') : k === 1 ? L('Tomorrow', 'Zítra') : k === -1 ? L('Yesterday', 'Včera') : dayShort(i.date)) + (i.time ? ' ' + i.time : ''); };
  function taskRow(i, d, c, opts) {
    const dd = i.repeat ? d : (i.date || d); const on = isDone(i, dd); const w = whenTxt(i, d);
    return '<div class="a3tr' + (on ? ' done' : '') + '">' + check(i, dd, c.color, 30) + '<button class="a3trt" data-a="openItem" data-id="' + i.id + '">' + esc(i.t) + '</button>'
      + (w ? '<span class="a2-t2 a3trw">' + esc(w) + '</span>' : '<button class="a3when" data-a="when" data-id="' + i.id + '">+ ' + esc(L('when', 'kdy')) + '</button>') + '</div>';
  }
  const addLine = (c, ph) => '<div class="a3tr a3add"><span class="a3addc">+</span><input class="a3addi" data-card="' + c.id + '" enterkeyhint="done" autocomplete="off" placeholder="' + esc(ph) + '" aria-label="' + esc(t('addTask')) + '"></div>';
  function bindAdd(root) {
    (root || document).querySelectorAll('.a3addi:not([data-b])').forEach(inp => {
      inp.dataset.b = 1;
      inp.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || e.isComposing) return; e.preventDefault();
        const v = inp.value.trim(); if (!v) return; const c = cardById(inp.dataset.card); if (!c) return;
        const p = NL(v); const it = { id: uid(), t: stripSpans(v, p.spans) || v, card: c.id, created: T() };
        if (p.date) it.date = p.date; if (p.time) { it.time = p.time; it.dur = p.dur || 45; it.remind = S.push && S.push.def != null ? S.push.def : 10; }
        if (p.repeat) { it.repeat = p.repeat; if (p.repeat === 'days') it.days = p.days; it.doneDates = []; if (!it.date) it.date = T(); }
        else if (c.type === 'month' && !p.date) Object.assign(it, { repeat: 'monthly', doneDates: [], date: T() });
        S.items.push(it); if (typeof useCount === 'function') useCount('adds'); save(); haptic();
        toast(esc(it.date || it.repeat ? t('planned', it.repeat ? repText(it) : dayName(it.date) + (it.time ? ' ' + it.time : '')) : t('undated')));
        render(); setTimeout(() => { const n = document.querySelector('.a3addi[data-card="' + c.id + '"]'); n && n.focus({ preventScroll: true }); }, 60);
      });
    });
  }
  const statTile = (lab, n, unit, big) => '<div class="a2-glass a3st' + (big ? ' d' : '') + '"><span class="a2-lab">' + esc(lab) + '</span><div><b class="a2-d a2-num">' + esc(String(n)) + '</b>' + (unit ? '<span class="a2-t2">' + esc(unit) + '</span>' : '') + '</div></div>';
  function cardHead(c, isDesk) {
    const k = c.type === 'project' && c.deadline ? t('project') + ' · ' + L('deadline ', 'termín ') + dayShort(c.deadline) : kickText(c);
    const ch = c.sh && typeof chOfCard === 'function' ? chOfCard(c) : null; const mem = ch && typeof members === 'function' ? members(ch) : [];
    const av = mem.length > 1 && typeof avStack === 'function' ? avStack(mem, isDesk ? 40 : 34) : '';
    const kt = k + (c.sh ? ' · ' + L('Together', 'Spolu') : '');
    if (isDesk) return '<div class="a2-in a3ctit" style="--i:1"><b class="a2-d">' + esc(c.name) + '</b>' + kick(kt, c.color) + (av ? '<span class="a3av">' + av + '</span>' : '') + '</div>';
    return '<div class="a3hd a2-in" style="--i:0;padding:0 4px"><button class="a2-icon" data-a="closeCard" aria-label="' + esc(L('Back', 'Zpět')) + '">' + ico('back', 20, 2.2) + '</button><span class="a3hdr">' + (c.sh ? '<button class="a2-chip" style="height:44px" data-a="spInvite" data-id="' + c.id + '">' + ico('users', 16, 2) + esc(L('Invite', 'Pozvat')) + '</button>' : '') + '<button class="a2-icon" data-a="a3Blocks" aria-label="' + esc(L('Edit blocks', 'Upravit bloky')) + '"' + (V.blkEdit === c.id ? ' style="background:var(--cream);color:var(--oncr)"' : '') + '>' + (V.blkEdit === c.id ? TICK.replace('width="20" height="20"', 'width="18" height="18"').replace('#1b2228', 'currentColor') : ico('board', 18, 2)) + '</button><button class="a2-icon" data-a="editCard" aria-label="' + esc(t('editCard')) + '">' + ico('more', 20, 2) + '</button></span></div>'
      + '<div class="a2-in a3cti" style="--i:1">' + kick(kt, c.color) + '<div class="a3ctn"><b class="a2-d" style="font-size:' + (c.name.length > 12 ? 40 : 56) + 'px">' + esc(c.name) + '</b>' + av + '</div></div>';
  }
  function weekCard(c, isDesk) {
    const d = T(), w = habitWeek(c.id), n = w.filter(Boolean).length, g = goalOf(c), td = dow(d); const set = cardDaySet(c.id);
    const lw = [0, 1, 2, 3, 4, 5, 6].filter(j => set.has(addD(addD(weekStart(d), -7), j))).length; const pc = Math.round(Math.min(1, n / g) * 100);
    const dark = 'color-mix(in oklab,' + c.color + ' 30%,#0b1a12)';
    const pills = w.map((on, k) => '<span class="a2-pop" style="--i:' + (k + 2) + ';' + (on ? 'background:' + c.color + ';color:' + dark : k === td ? 'box-shadow:inset 0 0 0 2px var(--cream)' : 'background:rgba(var(--wr),.1);color:var(--t2);font-weight:600') + '">' + WD1[lang()][k] + '</span>').join('');
    return '<div class="a2-glass a2-tint a2-in a3wkc' + (isDesk ? ' d' : '') + '" style="--i:2;--c:' + c.color + '"><div class="a3wkh"><div class="a3wkn"><span class="a2-lab">' + esc(L('This week', 'Tento týden')) + '</span><div><b class="a2-d a2-num">' + n + '</b><span class="a2-t2">/ ' + g + (isDesk ? ' ' + L('days', plural(g, 'den', 'dny', 'dní')) : '') + '</span></div><span class="a2-t2 a3sm">' + esc(L('last week ', 'minulý týden ') + lw + (isDesk ? ' · ' + L('goal ', 'cíl ') + goalText(g) : '')) + '</span></div>'
      + '<button class="a3bring" data-a="editGoal" aria-label="' + esc(t('goal')) + '">' + ring(isDesk ? 150 : 112, n / g, c.color, 2) + '<span class="a3bri"><b class="a2-num">' + (n >= g ? '✓' : pc + '%') + '</b><span class="a2-t2">' + esc(n >= g ? L('goal met', 'cíl splněn') : isDesk ? L('weekly goal', 'týdenní cíl') : L('goal', 'cíl')) + '</span></span></button></div>'
      + '<div class="a3pills">' + pills + '</div></div>';
  }
  function rhythmCard(c, isDesk) {
    const d = T(), set = cardDaySet(c.id), ws = addD(weekStart(d), -21); let cells = '', got = 0; const byDow = [0, 0, 0, 0, 0, 0, 0];
    for (let k = 0; k < 28; k++) { const x = addD(ws, k); const on = set.has(x); const n = on ? completionsOn(x, c.id) : 0; if (on && x <= d) { got++; byDow[k % 7]++; }
      cells += '<span class="a2-pop" style="--i:' + k + ';' + (x === d ? 'box-shadow:inset 0 0 0 2px var(--cream)' + (on ? ';background:' + c.color : '') : on ? 'background:' + (n > 1 ? c.color : 'color-mix(in oklab,' + c.color + ' 72%,#0b1a12)') : 'background:rgba(var(--wr),.1)') + '"></span>'; }
    const best = Math.max(...byDow); const bd = best ? WD[lang()][byDow.indexOf(best)] : '–'; const wk = habitWeek(c.id).filter(Boolean).length;
    return '<div class="a2-glass a2-in a3rh' + (isDesk ? ' d' : '') + '" style="--i:' + (isDesk ? 3 : 4) + '"><div class="a3rhg">' + cells + '</div><div class="a3rht"><span class="a2-lab">' + esc(isDesk ? L('Rhythm · 4 weeks', 'Rytmus · 4 týdny') : L('4 weeks', '4 týdny')) + '</span><div><b class="a2-d a2-num">' + got + '</b><span class="a2-t2">/ 28</span></div><span class="a2-t2 a3sm">' + esc(L('best day ', 'nejlepší den ') + bd + (isDesk ? ' · ' + wk + L(' good days this week', ' dobrých dní tento týden') : '')) + '</span></div></div>';
  }
  function momGrid(c, n) {
    const ms = cardMoments(c.id).slice(0, n || 3);
    return ms.map(m => { const u = thumb(m); return u ? '<button class="a3mo" style="background:#14202a url(' + u + ') center/cover" data-a="viewMoment" data-id="' + m.id + '"></button>' : '<button class="a2-well a3mo n" data-a="viewMoment" data-id="' + m.id + '"><span>' + esc((m.note || ideaTitle(m)).slice(0, 90)) + '</span><span class="a2-t3">' + esc(m.d ? dayShort(m.d) : '') + '</span></button>'; }).join('');
  }
  function cardLists(c) {
    const d = T();
    const todays = c.type === 'month' ? monthItems(c.id).slice().sort((a, b) => (isDone(a, d) ? 1 : 0) - (isDone(b, d) ? 1 : 0)) : cardItems(c.id).filter(i => occurs(i, d) || (!i.repeat && i.date && i.date < d && !i.done));
    const doneToday = c.type === 'project' ? cardItems(c.id).filter(i => !i.repeat && i.done && i.doneOn === d && !todays.includes(i)) : [];
    const open = cardItems(c.id).filter(i => !todays.includes(i) && !doneToday.includes(i) && (c.type === 'month' ? false : (i.repeat ? true : !i.done))).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    const doneOld = cardItems(c.id).filter(i => !i.repeat && i.done && !doneToday.includes(i) && !todays.includes(i));
    return { todays, doneToday, open, doneOld };
  }
  function projNext(c, isDesk) {
    const ps = projectStats(c.id), nx = ps.next; if (!nx) return '';
    const d = nx.date || T(); const w = nx.date ? (nx.date === T() ? L('today', 'dnes') : nx.date < T() ? L('late', 'po termínu') : dayName(nx.date).toLowerCase()) : L('no day', 'bez dne');
    return '<div class="a2-glass a2-tint a2-in a3nxp' + (isDesk ? ' d' : '') + '" style="--i:2;--c:' + c.color + '"><button class="a3nxb" style="box-shadow:0 0 0 ' + (isDesk ? 8 : 6) + 'px color-mix(in oklab,' + c.color + ' 18%,transparent),0 10px 24px -8px rgba(0,0,0,.5)" data-a="toggle" data-id="' + nx.id + '" data-d="' + d + '" aria-label="' + esc(t('done')) + '"><span style="box-shadow:inset 0 0 0 ' + (isDesk ? 3 : 2.5) + 'px ' + c.color + '"></span></button>'
      + '<button class="a3nxt" data-a="openItem" data-id="' + nx.id + '"><span class="a2-lab" style="color:color-mix(in oklab,' + c.color + ' 55%,var(--mw))">' + esc(t('nextStep') + ' · ' + w + (nx.time ? ' ' + nx.time : '')) + '</span><b class="a2-d">' + esc(nx.t) + '</b></button></div>';
  }
  function noDayRow(c, isDesk) {
    const ps = projectStats(c.id); if (!ps.noDay) return ''; const it = cardItems(c.id).find(i => !i.repeat && !i.done && !i.date); if (!it) return '';
    const txt = ps.noDay === 1 ? L('1 task has no day yet', '1 úkol ještě nemá den') : L(ps.noDay + ' tasks have no day yet', ps.noDay + ' ' + plural(ps.noDay, 'úkol', 'úkoly', 'úkolů') + ' ještě nemá den');
    return '<div class="a2-glass a2-in a3ndr" style="--i:' + (isDesk ? 4 : 5) + '"><span>' + esc(txt + (isDesk ? L('. Give it one this week?', '. Dáš mu den tento týden?') : '')) + '</span><button class="a2-btn" style="height:' + (isDesk ? 40 : 38) + 'px;padding:0 14px;font-size:14px" data-a="when" data-id="' + it.id + '">' + esc(t('pickDay')) + '</button></div>';
  }
  function toolTiles(c, isDesk) {
    if (c.type !== 'project') return '';
    const tile = (icon, b, s2, act) => '<button class="a2-glass a3tool' + (isDesk ? ' d' : '') + '" data-a="' + act + '" data-id="' + c.id + '"><span class="a2-icon">' + ico(icon, isDesk ? 18 : 16, 2) + '</span><span class="a3toolt"><b>' + esc(b) + '</b><span class="a2-t2">' + esc(s2) + '</span></span></button>';
    if (c.src) return '';
    return '<div class="a2-in a3tools one' + (isDesk ? ' d' : '') + '" style="--i:6">' + (c.src ? '' : tile('link', isDesk ? L('Connect a source', 'Připojit zdroj') : L('Source', 'Zdroj'), isDesk ? L('Paste a link, Aurora builds the view', 'Vlož odkaz, Aurora postaví přehled') : L('paste a link', 'vlož odkaz'), 'a3src')) + '</div>';
  }
  /* together cards: only the people (no news feed on the card) */
  const together = c => c.sh ? '<div class="a3sp2">' + (typeof spoluPeople === 'function' ? spoluPeople(c) : '') + '</div>' : '';
  /* ================= CARD BLOCKS · every card type has its blocks; you switch on what you want to see (kept per card) ================= */
  const MONF = () => cs() ? ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'] : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const BL = () => ({
    habit: [['week', 'L', 1, L('This week', 'Tento týden')], ['tasks', 'R', 1, L('Today & tasks', 'Dnes a úkoly')], ['rhythm', 'L', 1, L('Rhythm · 4 weeks', 'Rytmus · 4 týdny')], ['monthcal', 'L', 0, L('Month in the calendar', 'Měsíc v kalendáři')], ['stats', 'R', 1, L('Streak & records', 'Série a rekordy')], ['moments', 'R', 1, t('moments')], ['note', 'R', 0, L('Note', 'Poznámka')]],
    project: [['next', 'L', 1, t('nextStep')], ['nums', 'L', 1, L('Numbers', 'Čísla')], ['tasks', 'R', 1, t('tasks')], ['noday', 'L', 1, L('Tasks without a day', 'Úkoly bez dne')], ['timeline', 'L', 0, L('Timeline to the deadline', 'Časová osa do termínu')], ['tools', 'L', 1, L('Source', 'Zdroj')], ['moments', 'R', 1, t('moments')], ['note', 'R', 0, L('Note', 'Poznámka')]],
    month: [['month', 'L', 1, L('This month', 'Tento měsíc')], ['items', 'R', 1, L('Items', 'Položky')], ['window', 'L', 1, L('Payment window', 'Okno plateb')], ['history', 'L', 0, L('Last 6 months', 'Posledních 6 měsíců')], ['nextm', 'R', 0, L('Next month', 'Další měsíc')], ['moments', 'R', 0, t('moments')], ['note', 'R', 0, L('Note', 'Poznámka')]]
  });
  function blocksOf(c) { const list = (BL()[c.type] || BL().project).slice(); if (c.sh) list.push(['people', 'R', 1, L('People', 'Lidé')]); return list; }
  const blkOn = (c, b) => c.blocks && b[0] in c.blocks ? !!c.blocks[b[0]] : !!b[2];
  /* v2059 · blocks: sizes S/M/L in a grid, "Edit" mode like iPhone widgets */
  const DSZ = { week: 'M', rhythm: 'M', monthcal: 'S', tasks: 'M', stats: 'M', moments: 'M', note: 'S', people: 'S', next: 'M', nums: 'M', noday: 'M', timeline: 'M', tools: 'M', month: 'M', items: 'M', window: 'M', history: 'M', nextm: 'S' };
  /* on the phone only blocks that really have a half-width layout may be Small */
  const PS = { moments: 1, note: 1, next: 1, nextm: 1, nums: 1 };
  const pSize = (c, id) => { const z = bSize(c, id, false); return z === 'S' && PS[id] ? 'S' : 'L'; };
  const bSize = (c, id, isDesk) => (c.bsize && c.bsize[id]) || (isDesk ? DSZ[id] || 'M' : 'L');
  function orderedBlocks(c) { const all = blocksOf(c); const ord = (c.border || []).filter(id => all.some(b => b[0] === id)); all.forEach(b => { if (!ord.includes(b[0])) ord.push(b[0]); }); return ord.map(id => all.find(b => b[0] === id)); }
  ACT.a3Blocks = () => { const c = cardById(V.card); if (!c) return; V.blkEdit = V.blkEdit === c.id ? null : c.id; haptic(); render(); };
  ACT.a3BkSize = el => { const c = cardById(V.card); if (!c) return; c.bsize = Object.assign({}, c.bsize || {}); c.bsize[el.dataset.id] = el.dataset.k; save(); haptic(); render(); };
  ACT.a3BkOff = el => { const c = cardById(V.card); if (!c) return; c.blocks = Object.assign({}, c.blocks || {}); c.blocks[el.dataset.id] = false; save(); haptic(); render(); };
  ACT.a3BkOn = el => { const c = cardById(V.card); if (!c) return; c.blocks = Object.assign({}, c.blocks || {}); c.blocks[el.dataset.id] = true; save(); haptic(); render(); };
  function blockGrid(c, isDesk) {
    const ed = V.blkEdit === c.id; let k = 2; const ord = orderedBlocks(c);
    const SZ = isDesk ? ['S', 'M', 'L'] : ['S', 'L'];
    const items = ord.filter(b => blkOn(c, b)).map(b => { let sz = isDesk ? bSize(c, b[0], true) : pSize(c, b[0]);
      const ctl = ed ? '<div class="a3bkc"><span class="a3grip" data-grip="' + b[0] + '" aria-label="' + esc(L('Move', 'Přesunout')) + '">⋮⋮</span><span class="a3bkn">' + esc(b[3]) + '</span><span class="a3szs">' + SZ.map(z => '<button class="' + (z === sz ? 'on' : '') + '" data-a="a3BkSize" data-id="' + b[0] + '" data-k="' + z + '">' + z + '</button>').join('') + '</span><button class="a3bkx" data-a="a3BkOff" data-id="' + b[0] + '" aria-label="' + esc(L('Hide', 'Skrýt')) + '">×</button></div>' : '';
      return '<div class="a3bk sz-' + sz + (ed ? ' ed' : '') + '" data-bk="' + b[0] + '">' + ctl + tagBlk(blockHTML(c, b[0], isDesk), b[0], Math.min(9, k++)) + '</div>'; }).join('');
    const hidden = ord.filter(b => !blkOn(c, b));
    const add = ed ? '<div class="a3bk sz-L a3bkadd"><span class="a2-lab">' + esc(L('Add a block', 'Přidat blok')) + '</span><div class="a3bka">' + (hidden.map(b => '<button class="a2-chip" data-a="a3BkOn" data-id="' + b[0] + '">+ ' + esc(b[3]) + '</button>').join('') || '<span class="a2-t3">' + esc(L('All blocks are on.', 'Všechny bloky jsou zapnuté.')) + '</span>') + '</div></div>' : '';
    const empty = !items && !ed ? '<button class="a2-glass a3ndr" data-a="a3Blocks"><span>' + esc(L('All blocks are off.', 'Všechny bloky jsou vypnuté.')) + '</span><span class="a2-t2">' + esc(L('Edit', 'Upravit')) + ' ›</span></button>' : '';
    const bgo = ed ? bgOpt(c) : '';
    if (!isDesk && ed) return bgo + phoneEdit(c, ord);
    return bgo + '<div class="a3bg' + (isDesk ? ' d' : '') + (ed ? ' editing' : '') + '" data-card="' + c.id + '">' + items + add + empty + '</div>';
  }
  /* v2063 · phone edit: the real card, small, on top; one plain list under it (drag, Small / Large, eye) */
  function phoneEdit(c, ord) {
    const shown = ord.filter(b => blkOn(c, b)); let k = 2;
    const prev = shown.map(b => { const sz = pSize(c, b[0]); return '<div class="a3bk sz-' + sz + '" data-bk="' + b[0] + '">' + tagBlk(blockHTML(c, b[0], false), b[0], Math.min(9, k++)) + '</div>'; }).join('');
    const rows = ord.map(b => { const on = blkOn(c, b); const sz = pSize(c, b[0]);
      return '<div class="a3er' + (on ? '' : ' off') + '" data-bk="' + b[0] + '"><span class="a3erg" data-egrip="' + b[0] + '" aria-label="' + esc(L('Move', 'Přesunout')) + '">⋮⋮</span><b>' + esc(b[3]) + '</b><span class="a3szb sm">' + [['S', L('Small', 'Malý')], ['L', L('Large', 'Velký')]].map(([z, l]) => '<button class="' + (z === sz ? 'on' : '') + '" data-a="a3BkSize" data-id="' + b[0] + '" data-k="' + z + '"' + (!on || (z === 'S' && !PS[b[0]]) ? ' disabled' : '') + '>' + esc(l) + '</button>').join('') + '</span><button class="a3ere" data-a="' + (on ? 'a3BkOff' : 'a3BkOn') + '" data-id="' + b[0] + '" aria-label="' + esc(on ? L('Hide', 'Skrýt') : L('Show', 'Ukázat')) + '">' + ico(on ? 'eye' : 'eyeOff', 18, 2) + '</button></div>'; }).join('');
    return '<div class="a2-glass a3epv"><div class="a3epz"><div class="a3bg" data-card="' + c.id + '">' + (prev || '<span class="a2-t2" style="padding:30px;display:block;text-align:center;font-size:30px">' + esc(L('No blocks', 'Žádné bloky')) + '</span>') + '</div></div></div><div class="a2-glass a3elist" data-card="' + c.id + '">' + rows + '</div>';
  }
  try { if (!IC.eye) IC.eye = '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'; if (!IC.eyeOff) IC.eyeOff = '<path d="M4 4l16 16M9.9 5.8A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M6.4 7.4A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 3.4-.7"/>'; } catch (e) {}
  function bindEditList(root) {
    const l = (root || document).querySelector('.a3elist:not([data-bd])'); if (!l) return; l.dataset.bd = 1;
    const z = (root || document).querySelector('.a3epz'); if (z) { const fitz = () => { z.parentNode.style.height = Math.round(z.offsetHeight * .34 + 24) + 'px'; }; fitz(); try { new ResizeObserver(fitz).observe(z); } catch (e) {} }
    l.addEventListener('pointerdown', e => { const gr = e.target.closest('[data-egrip]'); if (!gr) return; e.preventDefault(); const el = gr.closest('.a3er'); el.classList.add('drag'); try { gr.setPointerCapture(e.pointerId); } catch (er) {}
      const mv = ev => { const rows = [...l.querySelectorAll('.a3er')].filter(x => x !== el); const over = rows.find(x => { const r = x.getBoundingClientRect(); return ev.clientY >= r.top && ev.clientY <= r.bottom; }); if (!over) return; const r = over.getBoundingClientRect(); l.insertBefore(el, ev.clientY - r.top > r.height / 2 ? over.nextSibling : over); };
      const up = () => { gr.removeEventListener('pointermove', mv); gr.removeEventListener('pointerup', up); gr.removeEventListener('pointercancel', up); el.classList.remove('drag'); const c = cardById(l.dataset.card); if (!c) return; c.border = [...l.querySelectorAll('.a3er')].map(x => x.dataset.bk); save(); haptic(); render(); };
      gr.addEventListener('pointermove', mv); gr.addEventListener('pointerup', up); gr.addEventListener('pointercancel', up); });
  }
  ACT.a3BkSel = el => { V.blkSel = el.dataset.id; haptic(); render(); };
  /* card background: its own colour (default) or a photo */
  function bgOpt(c) {
    const k = c.bgImg ? 'photo' : 'color';
    return '<div class="a2-glass a3bgopt"><span class="a3bgsw" style="' + (c.bgImg ? 'background:url(' + c.bgImg + ') center/cover' : 'background:linear-gradient(160deg,' + c.color + ',color-mix(in oklab,' + c.color + ' 45%,#000))') + '"></span><b>' + esc(L('Card background', 'Pozadí karty')) + '</b><div class="a2-seg">' + [['color', L('Colour', 'Barva')], ['photo', L('Photo', 'Foto')]].map(([x, l]) => '<button class="' + (k === x ? 'on' : '') + '" data-a="a3CardBg" data-k="' + x + '">' + esc(l) + '</button>').join('') + '</div></div>';
  }
  ACT.a3CardBg = el => {
    const c = cardById(V.card); if (!c) return;
    if (el.dataset.k === 'color') { delete c.bgImg; save(); haptic(); render(); return; }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.cssText = 'position:fixed;left:-999px;top:0;opacity:0'; document.body.appendChild(inp); /* iOS only opens the picker for an input that is in the page */
    inp.onchange = () => { const f = inp.files && inp.files[0]; inp.remove(); if (!f) return; const img = new Image(); const u = URL.createObjectURL(f);
      img.onload = () => { /* crop to the shape of the card in Spaces (3:4), centred */ const W = 540, H = 720, sc = Math.max(W / img.width, H / img.height); const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        cv.getContext('2d').drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc); URL.revokeObjectURL(u); c.bgImg = cv.toDataURL('image/jpeg', .62); save(); haptic(); render(); };
      img.onerror = () => { URL.revokeObjectURL(u); toast(esc(L('This photo could not be read', 'Tuhle fotku se nepodařilo načíst'))); };
      img.src = u; };
    inp.click();
  };
  /* masonry: each block takes as many 4px rows as it is tall, so short blocks never leave holes */
  let masRO = null;
  function masonry(root) {
    const g = (root || document).querySelector('.a3bg'); if (!g) return; g.classList.add('mas');
    const fit = () => { [...g.children].forEach(el => { const ch = [...el.children].filter(x => !x.matches('.a3bksel,.a3bkm,.a3grip2')); const h = ch.reduce((a, x) => a + (x.offsetHeight || x.getBoundingClientRect().height), 0) + Math.max(0, ch.length - 1) * 8; el.style.gridRowEnd = 'span ' + Math.max(1, Math.ceil((h + 16) / 4)); }); };
    fit(); if (masRO) masRO.disconnect();
    try { masRO = new ResizeObserver(() => requestAnimationFrame(fit)); [...g.querySelectorAll('.a3bk > *')].forEach(x => masRO.observe(x)); } catch (e) {}
  }
  /* drag a block by its grip: live reorder in the grid, saved on release */
  function bindBlkDrag(root) {
    const g = (root || document).querySelector('.a3bg.editing:not([data-bd])'); if (!g) return; g.dataset.bd = 1;
    g.addEventListener('pointerdown', e => { const gr = e.target.closest('[data-grip]'); if (!gr) return; e.preventDefault();
      const el = gr.closest('.a3bk'); el.classList.add('drag'); gr.setPointerCapture && gr.setPointerCapture(e.pointerId);
      const mv = ev => { const over = document.elementsFromPoint(ev.clientX, ev.clientY).map(x => x.closest && x.closest('.a3bk')).find(x => x && x !== el && !x.classList.contains('a3bkadd') && x.parentNode === g); if (!over) return;
        const r = over.getBoundingClientRect(); const after = (ev.clientY - r.top) > r.height / 2 || (ev.clientX - r.left) > r.width * .66; g.insertBefore(el, after ? over.nextSibling : over); };
      const up = () => { gr.removeEventListener('pointermove', mv); gr.removeEventListener('pointerup', up); gr.removeEventListener('pointercancel', up); el.classList.remove('drag');
        const c = cardById(g.dataset.card); if (!c) return; const shown = [...g.querySelectorAll('.a3bk[data-bk]')].map(x => x.dataset.bk); const rest = orderedBlocks(c).map(b => b[0]).filter(id => !shown.includes(id)); c.border = shown.concat(rest); save(); haptic(); };
      gr.addEventListener('pointermove', mv); gr.addEventListener('pointerup', up); gr.addEventListener('pointercancel', up); });
  }
  /* new blocks */
  function monthCal(c, isDesk) {
    const d = T(), ym = d.slice(0, 7), n = dimOf(ym), set = cardDaySet(c.id), first = dow(ym + '-01'); let cells = '', got = 0;
    for (let k = 0; k < first; k++) cells += '<span></span>';
    for (let k = 1; k <= n; k++) { const x = ym + '-' + pad(k); const on = set.has(x); if (on) got++; cells += '<span class="a2-pop" style="--i:' + k + ';' + (on ? 'background:' + c.color + ';color:#0b1a12' : 'background:rgba(var(--wr),.08)') + (x === d ? ';box-shadow:inset 0 0 0 2px var(--cream)' : '') + (x > d ? ';opacity:.45' : '') + '">' + k + '</span>'; }
    return '<div class="a2-glass a2-in a3mcal' + (isDesk ? ' d' : '') + '"><div class="a3sh" style="padding:0"><span class="a2-lab">' + esc(MONF()[+ym.slice(5) - 1]) + '</span><span class="a2-t2 a2-num"><b style="color:var(--cream)">' + got + '</b> ' + esc(L('good days', 'dobrých dní')) + '</span></div><div class="a3mcg">' + WD1[lang()].map(w => '<i>' + w + '</i>').join('') + cells + '</div></div>';
  }
  function noteBlk(c) {
    return '<div class="a2-glass a2-in a3noteb"><span class="a2-lab">' + esc(L('Note', 'Poznámka')) + '</span><textarea id="a3note" class="a3ntx" data-card="' + c.id + '" rows="3" placeholder="' + esc(L('Anything to remember for this card…', 'Cokoli, co si chceš u karty pamatovat…')) + '">' + esc(c.note || '') + '</textarea></div>';
  }
  function bindNotes(root) {
    (root || document).querySelectorAll('.a3ntx:not([data-b])').forEach(x => { x.dataset.b = 1; const fit = () => { x.style.height = 'auto'; x.style.height = Math.max(72, x.scrollHeight) + 'px'; }; fit(); let tm = 0;
      x.addEventListener('input', () => { fit(); clearTimeout(tm); tm = setTimeout(() => { const c = cardById(x.dataset.card); if (c) { c.note = x.value; save(); } }, 400); }); });
  }
  function timelineBlk(c) {
    if (!c.deadline) return '<div class="a2-glass a2-in a3ndr"><span>' + esc(L('No deadline yet. Set one and the timeline appears.', 'Zatím bez termínu. Nastav ho a objeví se časová osa.')) + '</span><button class="a2-btn" style="height:38px;padding:0 14px;font-size:14px" data-a="editCard">' + esc(L('Set', 'Nastavit')) + '</button></div>';
    const a = c.created || T(), b = c.deadline, span = Math.max(1, daysBetween(a, b)); const pos = x => Math.max(0, Math.min(100, daysBetween(a, x) / span * 100));
    const its = cardItems(c.id).filter(i => !i.repeat && i.date);
    const dots = its.map(i => '<i style="left:' + pos(i.date).toFixed(1) + '%;background:' + (i.done ? c.color : 'transparent') + ';box-shadow:inset 0 0 0 2px ' + c.color + '" title="' + esc(i.t) + '"></i>').join('');
    const left = daysBetween(T(), b);
    return '<div class="a2-glass a2-in a3tln"><div class="a3sh" style="padding:0"><span class="a2-lab">' + esc(L('Timeline', 'Časová osa')) + '</span><span class="a2-t2">' + esc(left < 0 ? L('past the deadline', 'po termínu') : left + ' ' + L('days left', plural(left, 'den zbývá', 'dny zbývají', 'dní zbývá'))) + '</span></div>'
      + '<div class="a3tlb"><span class="a3tlf" style="width:' + pos(T()).toFixed(1) + '%;background:' + c.color + '"></span>' + dots + '<b style="left:' + pos(T()).toFixed(1) + '%"></b></div><div class="a3tld a2-t3"><span>' + esc(dayShort(a)) + '</span><span>' + esc(dayShort(b)) + '</span></div></div>';
  }
  function monthHero(c, isDesk) {
    const ms = monthStats(c, T());
    return '<div class="a2-glass a2-tint a2-in a3wkc' + (isDesk ? ' d' : '') + '" style="--i:2;--c:' + c.color + '"><div class="a3wkh"><div class="a3wkn"><span class="a2-lab">' + esc(L('This month', 'Tento měsíc')) + '</span><div><b class="a2-d a2-num">' + ms.done + '</b><span class="a2-t2">/ ' + ms.total + '</span></div><span class="a2-t2 a3sm">' + esc(monthLine(ms)) + '</span></div>' + ring(isDesk ? 150 : 112, ms.total ? ms.done / ms.total : 0, c.color, 2) + '</div>' + (isDesk ? squares(c, true) : '') + '</div>';
  }
  function windowBlk(c) {
    const d = T(), ym = d.slice(0, 7), n = dimOf(ym); const w = c.win || { from: 1, to: n }; const its = monthItems(c.id);
    const doneOn = {}; its.forEach(i => { const on = mDoneOn(i, d); if (on && on.slice(0, 7) === ym) doneOn[on] = (doneOn[on] || 0) + 1; });
    const a = w.last ? n : Math.min(w.from || 1, n), b = w.last ? n : Math.min(w.to || w.from || 1, n);
    let cells = ''; for (let k = 1; k <= n; k++) { const x = ym + '-' + pad(k); const inW = k >= a && k <= b; cells += '<span class="' + (inW ? 'w' : '') + (x === d ? ' td' : '') + '" style="' + (inW ? '--c:' + c.color : '') + '">' + (doneOn[x] ? '<em style="background:' + c.color + '">' + doneOn[x] + '</em>' : '') + '<small>' + k + '</small></span>'; }
    return '<div class="a2-glass a2-in a3win"><div class="a3sh" style="padding:0"><span class="a2-lab">' + esc(L('Payment window · ', 'Okno plateb · ') + winText(w)) + '</span><span class="a2-t2">' + esc(MONF()[+ym.slice(5) - 1]) + '</span></div><div class="a3wing">' + cells + '</div><span class="a2-t3" style="font-size:12px">' + esc(L('Number = how many items you finished that day.', 'Číslo = kolik položek jsi ten den odškrtl.')) + '</span></div>';
  }
  function historyBlk(c) {
    const its = monthItems(c.id); const now = dOf(T()); let cols = '';
    for (let k = 5; k >= 0; k--) { const dt = new Date(now.getFullYear(), now.getMonth() - k, 15); const ym = dt.getFullYear() + '-' + pad(dt.getMonth() + 1); const dd = ym + '-15';
      const act = its.filter(i => (i.date || i.created || '2000-01-01').slice(0, 7) <= ym); let dn = 0, ok = 0;
      act.forEach(i => { const key = mKey(i, dd); const on = (i.mDone || {})[key] || ((i.doneDates || []).includes(key) ? key : null); if (on) { dn++; if (on <= mRange(i, dd)[1]) ok++; } });
      const tot = act.length; const h = tot ? dn / tot : 0;
      cols += '<div class="a3hc2"><span class="a2-t3 a2-num">' + (tot ? dn + '/' + tot : '–') + '</span><div class="a3hbar"><i class="a2-grow" style="--i:' + (5 - k) + ';height:' + Math.max(4, h * 100).toFixed(0) + '%;background:' + (tot && ok === tot ? c.color : tot && dn ? 'color-mix(in oklab,' + c.color + ' 55%,#f2a541)' : 'rgba(var(--wr),.18)') + '"></i></div><span class="a2-t2">' + esc(MONF()[dt.getMonth()].slice(0, 3)) + '</span></div>'; }
    return '<div class="a2-glass a2-in a3hist"><div class="a3sh" style="padding:0"><span class="a2-lab">' + esc(L('Last 6 months', 'Posledních 6 měsíců')) + '</span><span class="a2-t3" style="font-size:12px">' + esc(L('full colour = all on time', 'plná barva = vše včas')) + '</span></div><div class="a3hg">' + cols + '</div></div>';
  }
  function nextMonthBlk(c) {
    const now = dOf(T()); const nx = new Date(now.getFullYear(), now.getMonth() + 1, 15); const its = monthItems(c.id);
    return '<div class="a2-glass a2-in a3nxm"><div class="a3sh" style="padding:0"><span class="a2-lab">' + esc(L('Next month · ', 'Další měsíc · ') + MONF()[nx.getMonth()]) + '</span><span class="a2-t2">' + its.length + ' ' + esc(L('items', plural(its.length, 'položka', 'položky', 'položek'))) + '</span></div><span class="a2-t2" style="font-size:14px">' + esc(L('Window ', 'Okno ') + winText(c.win || { from: 1, to: 31 })) + '</span><div class="a3pch">' + its.slice(0, 8).map(i => '<span class="a2-chip" style="height:30px;font-size:13px">' + esc(i.t) + '</span>').join('') + '</div></div>';
  }
  const momBlk = (c, isDesk) => { const mc = cardMoments(c.id); return '<div class="a2-glass a2-in a3moc">' + '<span class="a2-lab">' + esc(t('moments')) + ' · ' + mc.length + '</span>' + (mc.length ? '<div class="a3mog">' + momGrid(c, isDesk ? 3 : 3) + '</div>' : '<span class="a2-t3" style="font-size:14px">' + esc(L('Drop a photo, a link or a thought on the orb and pick this card.', 'Pusť fotku, odkaz nebo myšlenku na orb a vyber tuhle kartu.')) + '</span>') + '</div>'; };
  function blockHTML(c, id, isDesk) {
    const d = T(), L2 = cardLists(c), ps = projectStats(c.id), mc = cardMoments(c.id).length;
    switch (id) {
      case 'week': return weekCard(c, isDesk);
      case 'rhythm': return rhythmCard(c, isDesk);
      case 'monthcal': return monthCal(c, isDesk);
      case 'note': return noteBlk(c);
      case 'moments': return momBlk(c, isDesk);
      case 'people': return together(c);
      case 'stats': return '<div class="a2-in a3st3">' + statTile(t('streak'), streakOf(c.id), L('days', 'dní'), isDesk) + statTile(L('Best', 'Nejlepší'), bestStreak(c.id), L('days', 'dní'), isDesk) + statTile(isDesk ? MON[lang()][new Date().getMonth()] : t('moments'), isDesk ? monthCount(c.id) : mc, isDesk ? L('days', 'dní') : '', isDesk) + '</div>';
      case 'tasks':
        if (c.type === 'habit') return '<div class="a2-glass a2-in a3tl' + (isDesk ? ' d' : '') + '">' + (isDesk ? '<span class="a2-lab a3tlh">' + esc(L('Today', 'Dnes')) + '</span>' + (L2.todays.length ? L2.todays.map(i => taskRow(i, d, c)).join('') : '<div class="a3tr"><span class="a2-t3">' + esc(t('noTodayCard')) + '</span></div>') + '<span class="a2-lab a3tlh">' + esc(t('tasks')) + '</span>' + L2.open.map(i => taskRow(i, d, c)).join('') : L2.todays.concat(L2.open).map(i => taskRow(i, d, c)).join('')) + addLine(c, isDesk ? L('Add a task, e.g. quiz fri 2pm', 'Přidat úkol, např. test pá 14:00') : L('Add a task', 'Přidat úkol')) + '</div>';
        { const rows = L2.doneToday.concat(L2.todays, L2.open); const sd = V.showDone[c.id];
          return '<div class="a2-glass a2-in a3tl' + (isDesk ? ' d' : '') + '"><div class="a3tlh2"><span class="a2-lab">' + esc(t('tasks') + ' · ' + ps.open + ' ' + L('open', plural(ps.open, 'otevřený', 'otevřené', 'otevřených'))) + '</span>' + (L2.doneOld.length ? '<button class="a2-t2" data-a="toggleShowDone">' + ps.done + ' ' + esc(L('done', 'hotovo')) + '</button>' : '') + '</div>'
            + rows.map(i => taskRow(i, d, c)).join('') + (sd ? L2.doneOld.map(i => taskRow(i, d, c)).join('') : '') + addLine(c, isDesk ? L('Add a task, e.g. palette fri 2pm', 'Přidat úkol, např. paleta pá 14:00') : L('Add a task', 'Přidat úkol')) + '</div>'; }
      case 'next': return projNext(c, isDesk) || '<div class="a2-glass a2-in a3ndr"><span>' + esc(L('No next step. Add a task and it shows here.', 'Žádný další krok. Přidej úkol a objeví se tady.')) + '</span></div>';
      case 'nums': return '<div class="a2-in a3st3">' + statTile(L('Open', 'Otevřené'), ps.open, L('of ', 'z ') + ps.total, isDesk) + (c.deadline ? statTile(t('deadline'), Math.max(0, daysBetween(d, c.deadline)), L('days', 'dní'), isDesk) : '<button class="a2-glass a3st' + (isDesk ? ' d' : '') + '" data-a="editCard"><span class="a2-lab">' + esc(t('deadline')) + '</span><div><b class="a3set">' + esc(L('Set', 'Nastavit')) + '</b></div></button>') + statTile(t('moments'), mc, '', isDesk) + '</div>';
      case 'noday': return noDayRow(c, isDesk);
      case 'timeline': return timelineBlk(c);
      case 'tools': return '<div class="a2-in a3tools0"><i class="a3slot"></i>' + toolTiles(c, isDesk) + '</div>';
      case 'month': return monthHero(c, isDesk);
      case 'items': return '<div class="a2-glass a2-in a3tl' + (isDesk ? ' d' : '') + '">' + (isDesk ? '<span class="a2-lab a3tlh">' + esc(L('Items', 'Položky')) + '</span>' : '') + L2.todays.map(i => taskRow(i, d, c)).join('') + addLine(c, L('Add an item, e.g. Rent', 'Přidat položku, např. Nájem')) + '</div>';
      case 'window': return windowBlk(c);
      case 'history': return historyBlk(c);
      case 'nextm': return nextMonthBlk(c);
    }
    return '';
  }
  const tagBlk = (html, id, i) => html.replace(/^(\s*<\w+)([^>]*)>/, (m, a, attrs) => { const at = /style="/.test(attrs) ? attrs.replace(/style="([^"]*)"/, (q, st) => 'style="--i:' + i + ';' + st.replace(/--i:\d+;?/g, '') + '"') : attrs + ' style="--i:' + i + '"'; return a + ' data-blk="' + id + '"' + at + '>'; });
  function cardPhone(c) {
    return '<div class="a2 a3p a3card" style="--cc:' + c.color + '">' + cardHead(c, false) + blockGrid(c, false) + '</div>';
  }
  function cardDesk(c) {
    return '<main class="dmain a2 a3d a3dcard scr2" id="dCardMain" style="--cc:' + c.color + '">' + cardHead(c, true) + blockGrid(c, true) + '<i id="dCardTitle" hidden></i></main>';
  }
  /* the source / Studio panels other modules mount: keep the real ones, put them in our slot */
  function adoptPanels(root) {
    if (!root) return; const slot = root.querySelector('.a3slot'); if (!slot) return;
    root.querySelectorAll('.srcp, .stud').forEach(p => {
      if (p.classList.contains('srcadd') && !V.a3src) { p.remove(); return; }
      if (p.classList.contains('stud') && p.classList.contains('empty1')) { p.remove(); return; }
      p.classList.add('a2-glass'); slot.before(p);
    });
    if (V.a3src) { const ad = root.querySelector('.srcadd input'); ad && setTimeout(() => ad.focus(), 60); }
  }
  ACT.a3src = () => { V.a3src = !V.a3src; render(); };


  /* ================= KEIRO PROJECT (Lacy, Kai Cenat) · the canvas page on top, the working lists under it ================= */
  const PF = { instagram: 'IG', youtube: 'YT', tiktok: 'TT' };
  /* v2054 · the numbers belong to the project on screen: data loaded for another project is not used */
  const kKey = kx => { const pk = (kx.cur() || {}).name || ''; const d = kx.C.range || 7; return (kx.live() ? 'l' : 'demo') + d + pk; };
  const kData = kx => kx.ST().key === kKey(kx) ? kx.ST().data : null;
  function kStats(kx) {
    const D = kData(kx); const all = kx.clips(); const sentN = all.filter(g => g.sent).length, goneN = all.filter(g => g.gone).length;
    const pctS = (a, b) => b > 0 ? Math.round(a / b * 100) : null; const dec = v => v == null ? '–' : (Math.round(v * 10) / 10).toString().replace('.', cs() ? ',' : '.');
    const o = { views: null, vsub: '', appr: null, asub: '', ontime: null, osub: '', exp: 0, score: '–', ssub: '', days: [] };
    if (D) {
      o.views = D.views_total || 0; const bp = D.by_platform; o.vsub = bp ? 'IG ' + kx.kfmt(bp.instagram) + ' · YT ' + kx.kfmt(bp.youtube) + ' · TT ' + kx.kfmt(bp.tiktok) : '';
      o.appr = pctS(D.approved, D.reviewed); o.asub = D.reviewed ? (D.approved || 0) + L(' of ', ' z ') + D.reviewed + ' ' + L('decided', 'rozhodnutých') : L('nothing decided yet', 'zatím nic rozhodnuto');
      if (D.sent_on_time == null && D.expired == null) { o.ontime = pctS(sentN, sentN + goneN); o.exp = goneN; } else { o.ontime = pctS(D.sent_on_time, (D.sent_on_time || 0) + (D.expired || 0)); o.exp = D.expired || 0; }
      o.score = dec(D.avg_score_approved); o.ssub = L('clips in the period', 'klipy v období'); o.days = D.views_by_day || []; o.top = (D.top_clips || [])[0]; o.rr = D.reject_reasons ? D.reject_reasons.map(x => [x.note, x.count]) : null;
    } else { o.ontime = pctS(sentN, sentN + goneN); o.exp = goneN; }
    if (!o.rr) o.rr = Object.entries(kx.C.rj || {});
    o.osub = o.exp ? o.exp + ' ' + L('expired', 'propadlo') : L('nothing expired', 'nic nepropadlo');
    return o;
  }
  function kHead(kx) { const f = kx.F(), rec = ((f.automat || {}).recording || [])[0]; const off = kx.offline();
    let txt = off ? L('Laptop offline', 'Notebook offline') : rec ? L('Recording', 'Nahrává') + (rec.started_at || rec.since ? ' · ' + fmtMin(Math.max(1, Math.round((Date.now() - new Date(rec.started_at || rec.since)) / 60000))) : rec.streamer ? ' ' + rec.streamer : '') : (f.automat || {}).status === 'running' ? L('Running', 'Běží') : L('Idle', 'Stojí');
    return '<span class="a2-chip a3kst"><span class="a2-dot' + (rec || off ? ' a2-pulse' : '') + '" style="--c:' + (off ? '#ff8a8a' : rec ? '#ee5a85' : '#3fc483') + '"></span>' + esc(txt) + '</span>'; }
  function keiroPhone(el) {
    const kx = KX(); if (!kx || !el) return; const pr = kx.cur(); const col = kx.KC();
    const f = kx.F(), p = kx.parts(), rv = (f.review || []).length; const o = kStats(kx);
    if (kx.ST().key !== kKey(kx) && !kx.ST().busy) { const want = kKey(kx); kx.loadStats(true).then(() => { const k2 = KX(); if (V.keiro && !V.card && k2) { const e = $('#s-card'); if (e) k2.page(() => { if (kKey(k2) === want) keiroPhone(e); }); } }); }
    const mins = p.left != null ? Math.max(1, Math.ceil(p.left / 60000)) : null;
    const hero = p.todo.length ? '<div class="a2-glass a2-tint a2-in a3ks" style="--i:2;--c:#ee5a85"><div class="a3ksh"><span class="a2-lab" style="color:#ffb3c6">' + esc(L('Send to campaign · ', 'Odeslat do kampaně · ') + p.todo.length) + '</span>' + (mins != null ? '<span class="a3ksm">' + esc(L(mins + ' min left', 'zbývá ' + mins + ' min')) + '</span>' : '') + '</div><b class="a2-d">' + esc(p.first.hook || '') + '</b>'
      + '<div class="a3ksp">' + [...new Set((p.first.posts || []).map(x => x.platform))].map(k => '<span class="a2-chip" style="height:30px;font-size:12px">' + (PF[k] || k) + '</span>').join('') + '<button class="a2-btn" data-a="a3kSend">' + esc(L('Send now', 'Odeslat')) + '</button></div></div>' : '';
    const two = '<div class="a2-in a3k2" style="--i:3"><div class="a2-glass a3kb"><span class="a2-lab">' + esc(L('To review', 'Ke schválení')) + '</span><b class="a2-d a2-num">' + rv + '</b>' + (rv ? '<button class="a2-btn ghost" data-a="krReview">' + esc(L('Review ', 'Schválit ') + rv) + '</button>' : '<span class="a2-t2">' + esc(L('nothing waiting', 'nic nečeká')) + '</span>') + '</div>'
      + '<div class="a2-glass a3kb"><span class="a2-lab">' + esc(L('Releases', 'Vydání')) + '</span><b class="a2-d a2-num">' + p.rl.length + '</b><span class="a2-t2">' + esc(p.rl[0] ? L('next ', 'další ') + kx.hm(p.rl[0].when) : L('nothing scheduled', 'nic naplánovaného')) + '</span></div></div>';
    const days = o.days.slice(-7); const mx = Math.max(1, ...days.map(d => (d.instagram || 0) + (d.youtube || 0) + (d.tiktok || 0)));
    const bars = days.length ? days.map((d, k) => { const v = (d.instagram || 0) + (d.youtube || 0) + (d.tiktok || 0); const last = k === days.length - 1; return '<span class="a2-grow" style="--i:' + k + ';height:' + Math.max(4, v / mx * 100).toFixed(0) + '%;background:linear-gradient(180deg,' + (last ? '#bdf0ff,#ee5a85);box-shadow:0 0 18px rgba(238,90,133,.5)' : '#9ad8e8,#c9537a)') + '"></span>'; }).join('') : '<span class="a2-t3" style="align-self:center;font-size:13px">' + esc(kx.ST().busy || kx.ST().key !== kKey(kx) ? L('Loading…', 'Načítám…') : L('Views are not in yet', 'Zhlédnutí zatím nejsou')) + '</span>';
    const views = '<div class="a2-glass a2-in a3kv" style="--i:4"><div class="a3kvh"><span class="a2-lab">' + esc(L('Views · 7 days', 'Zhlédnutí · 7 dní')) + '</span><b class="a2-d a2-num">' + (o.views != null ? kx.kfmt(o.views) : '–') + '</b></div><div class="a3kbars">' + bars + '</div>'
      + '<div class="a3w3">' + [[o.appr != null ? o.appr + '%' : '–', L('approved', 'schváleno')], [o.ontime != null ? o.ontime + '%' : '–', L('on time', 'včas')], [o.score, L('avg score', 'prům. skóre')]].map(([n, l]) => '<div class="a2-well"><b class="a2-num" style="font:700 18px/1 Inter">' + esc(String(n)) + '</b><div class="a2-t2">' + esc(l) + '</div></div>').join('') + '</div></div>';
    const top = '<div class="a3hd a2-in" style="--i:0;padding:0 4px"><button class="a2-icon" data-a="krClose" aria-label="' + esc(L('Back', 'Zpět')) + '">' + ico('back', 20, 2.2) + '</button><span class="a3hdr">' + kHead(kx) + '<button class="a2-icon" data-a="krSettings" aria-label="' + esc(L('Settings', 'Nastavení')) + '">' + ico('gear', 18, 2) + '</button></span></div>'
      + '<div class="a2-in a3cti" style="--i:1">' + kick(L('Project · Clips', 'Projekt · Klipy'), col) + '<b class="a2-d" style="font-size:56px">' + esc(pr ? pr.name : 'Keiro') + '</b></div>';
    /* keep the working lists (send, releases, pool, done) from the old page under the canvas part */
    const sec = [...el.children].find(n => n.classList.contains('sec') && n.querySelector('.kblk')) || el.querySelector('.kblk') && el.querySelector('.kblk').closest('.sec');
    const foot = el.querySelector('.kfoot');
    const wrap = document.createElement('div'); wrap.className = 'a2 a3p a3keiro'; wrap.innerHTML = top + hero + two + views;
    if (sec) { sec.classList.add('a3kl'); wrap.appendChild(sec); } if (foot) wrap.appendChild(foot);
    el.classList.add('a3s'); el.innerHTML = ''; el.appendChild(wrap);
  }
  ACT.a3kSend = () => { const kx = KX(); if (!kx) return; (kx.KV.blk || (kx.KV.blk = {})).send = true; if (desk()) { ACT.krGoto({ dataset: { k: 'send' } }); return; } if (window.KR && KR.refresh) { const e = $('#s-card'); }
    const b = document.querySelector('#s-card .kblk[data-k="send"], #s-card [data-kb="send"]'); if (b) { if (!b.classList.contains('open')) { const h = b.querySelector('[data-a="krBlk"]'); h && h.click(); } setTimeout(() => { const b2 = document.querySelector('#s-card .kblk[data-k="send"], #s-card [data-kb="send"]') || b; b2.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80); } };
  function keiroDesk(m) {
    const kx = KX(); if (!kx || !m) return; const pr = kx.cur(); const f = kx.F(), p = kx.parts(), rv = (f.review || []).length; const o = kStats(kx); const d = kx.C.range || 7;
    if (kx.ST().key !== kKey(kx) && !kx.ST().busy) setTimeout(() => kx.loadStats(true), 0);
    const lists = m.querySelector('.kd2.even'); const mins = p.left != null ? Math.max(1, Math.ceil(p.left / 60000)) : null;
    const kpi = (lab, big, unit, sub, red, i) => '<div class="a2-glass a2-in a3kk4" style="--i:' + i + '"><span class="a2-lab">' + esc(lab) + '</span><div class="a3kkn"><b class="a2-d a2-num">' + esc(big) + '</b>' + (unit ? '<b class="a2-d" style="font-size:30px">' + unit + '</b>' : '') + '</div><span class="' + (red ? '' : 'a2-t2') + '" style="font-size:13px' + (red ? ';color:#ffb3c6' : '') + '">' + esc(sub) + '</span></div>';
    const rng = d === 1 ? L('today', 'dnes') : d + ' ' + L('days', 'dní');
    const k4 = kpi(L('Views · ', 'Zhlédnutí · ') + rng, o.views != null ? kx.kfmt(o.views) : '–', '', o.vsub || L('all networks', 'všechny sítě'), 0, 2) + kpi(L('Approved', 'Schváleno'), o.appr != null ? String(o.appr) : '–', o.appr != null ? '%' : '', o.asub, 0, 3)
      + kpi(L('Sent on time', 'Odesláno včas'), o.ontime != null ? String(o.ontime) : '–', o.ontime != null ? '%' : '', o.osub, o.exp > 0, 4) + kpi(L('Average score', 'Průměrné skóre'), o.score, '', o.ssub || L('no data yet', 'zatím bez dat'), 0, 5);
    const days = o.days.length > 14 ? o.days.slice(-14) : o.days; const mx = Math.max(1, ...days.map(x => (x.instagram || 0) + (x.youtube || 0) + (x.tiktok || 0)));
    const chart = days.length ? '<div class="a3kch" style="grid-template-columns:repeat(' + days.length + ',minmax(0,1fr))">' + days.map((x, k) => { const v = (x.instagram || 0) + (x.youtube || 0) + (x.tiktok || 0); const last = k === days.length - 1; const dd = x.date ? WD[lang()][dow(x.date)] : '';
        return '<div class="a3kcc"><' + (last ? 'b' : 'span class="a2-t2"') + ' class="a2-num" style="font-size:12px">' + kx.kfmt(v) + '</' + (last ? 'b' : 'span') + '><div class="a2-grow a3kcb" style="--i:' + k + ';height:' + Math.max(3, v / mx * 100).toFixed(0) + '%' + (last ? ';filter:drop-shadow(0 0 14px rgba(238,90,133,.5))' : '') + '"><span style="flex:' + (x.tiktok || 0) + ';background:' + (last ? '#bdf0ff' : '#9ad8e8') + '"></span><span style="flex:' + (x.youtube || 0) + ';background:' + (last ? '#f2c46e' : '#e0b05a') + '"></span><span style="flex:' + (x.instagram || 0) + ';background:' + (last ? '#ff6a92' : '#ee5a85') + '"></span></div><span class="a2-t2" style="font-size:12px">' + esc(dd) + '</span></div>'; }).join('') + '</div>'
      : '<div class="a3kwait"><b>' + esc(kx.ST().busy || kx.ST().key !== kKey(kx) ? L('Loading…', 'Načítám…') : L('No views yet', 'Zatím žádná zhlédnutí')) + '</b><span class="a2-t2">' + esc(L('The automat fetches views every 30 minutes.', 'Automat stahuje zhlédnutí každých 30 minut.')) + '</span></div>';
    const oldest = (f.review || []).map(x => x.created_at).filter(Boolean).sort()[0];
    const nrow = (n, t2, sub, btn, act, k, red, ghost) => '<div class="a3knr"><b class="a2-d a2-num"' + (red ? ' style="color:#ff8fad"' : '') + '>' + n + '</b><div><b>' + esc(t2) + '</b><span' + (red ? ' style="color:#ffb3c6"' : ' class="a2-t2"') + '>' + esc(sub) + '</span></div><button class="a2-btn' + (ghost ? ' ghost' : '') + '" data-a="' + act + '"' + (k ? ' data-k="' + k + '"' : '') + '>' + esc(btn) + '</button></div>';
    const now = nrow(p.todo.length, L('Send to campaign', 'Odeslat do kampaně'), p.todo.length ? (p.hot ? L('urgent · ', 'hoří · ') : '') + (mins != null ? L(mins + ' min left', 'zbývá ' + mins + ' min') : L('links waiting', 'odkazy čekají')) : L('nothing to send', 'nic k odeslání'), L('Send ', 'Odeslat ') + (p.todo.length || ''), 'krGoto', 'send', p.hot, !p.todo.length)
      + nrow(rv, L('To review', 'Ke schválení'), oldest ? L('oldest ', 'nejstarší ') + kx.ago(oldest) : L('nothing waiting', 'nic nečeká'), L('Review', 'Schválit'), rv ? 'krReview' : 'krGoto', rv ? '' : 'rel', false, true)
      + nrow(p.rl.length, L('Releases', 'Vydání'), p.rl[0] ? L('next ', 'další ') + kx.hm(p.rl[0].when) : L('nothing scheduled', 'nic naplánovaného'), L('Open', 'Otevřít'), 'krGoto', 'rel', false, true);
    const rr = o.rr.slice().sort((a, b) => b[1] - a[1]); const rmx = Math.max(1, ...rr.map(x => x[1])); const rsum = rr.reduce((a, x) => a + x[1], 0);
    const why = '<div class="a2-well a3kwhy"><span class="a2-lab">' + esc(L('Why you discard', 'Proč zahazuješ') + (rsum ? ' · ' + rsum : '')) + '</span>' + (rr.length ? rr.slice(0, 3).map((x, k) => '<div class="a3kwr"><span>' + esc(x[0]) + '</span><span class="a3kwb"><span class="a2-grow" style="--i:' + k + ';width:' + (x[1] / rmx * 100).toFixed(0) + '%;background:' + kx.KC() + '"></span></span><b>' + x[1] + '</b></div>').join('') : '<span class="a2-t2" style="font-size:13px">' + esc(L('Nothing discarded yet', 'Zatím nic nezahozeno')) + '</span>') + '</div>';
    const tc = o.top; const nr = p.rl[0];
    const strip = (lab, b, r) => '<div class="a2-glass a3kstrip"><span class="a2-lab">' + esc(lab) + '</span><b>' + esc(b) + '</b><span class="a2-t2 a2-num">' + esc(r) + '</span></div>';
    const hold = pr && kx.poolText(pr) ? '<span class="a2-chip">' + esc(kx.poolText(pr).replace(/^Pool: /, 'Pool ')) + '</span>' : '';
    const seg = '<div class="a2-seg" style="margin-left:auto">' + [[1, L('Today', 'Dnes')], [7, L('7 days', '7 dní')], [30, L('30 days', '30 dní')]].map(([k, l]) => '<button class="' + (d === k ? 'on' : '') + '" data-a="krRange" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div>';
    const html = '<div class="a2-in a3ktit" style="--i:1"><b class="a2-d">' + esc(pr ? pr.name : 'Keiro') + '</b>' + kHead(kx) + hold + seg + '</div>'
      + '<div class="a3k4">' + k4 + '</div>'
      + '<div class="a3kmid"><div class="a2-glass a2-in a3kchart" style="--i:6"><div class="a3kchh"><span class="a2-lab">' + esc(L('Views by day', 'Zhlédnutí po dnech')) + '</span><span class="a2-t2 a3kleg"><span><span class="a2-dot" style="--c:#ee5a85"></span>IG</span><span><span class="a2-dot" style="--c:#e0b05a"></span>YT</span><span><span class="a2-dot" style="--c:#9ad8e8"></span>TT</span></span></div>' + chart + '</div>'
      + '<div class="a2-glass a2-in a3know" style="--i:7"><span class="a2-lab" style="padding-bottom:8px">' + esc(L('Now · same as phone', 'Teď · stejné jako v mobilu')) + '</span>' + now + why + '</div></div>'
      + '<div class="a2-in a3k2s" style="--i:8">' + strip(L('Best clip', 'Nejlepší klip'), tc ? tc.hook || '' : '–', tc ? (tc.score != null ? '★ ' + tc.score + ' · ' : '') + kx.kfmt(tc.total || 0) : '') + strip(L('Next release', 'Další vydání'), nr ? nr.hook || '' : L('nothing scheduled', 'nic naplánovaného'), nr ? kx.hm(nr.when) + (nr.platform ? ' · ' + (PF[nr.platform] || nr.platform) : '') : '') + '</div>';
    m.className = 'dmain a2 a3d a3dkeiro scr2';
    m.innerHTML = html; if (lists) { lists.classList.add('a3klists'); m.appendChild(lists); }
  }
  window.A3K = { phone: el => { try { keiroPhone(el); } catch (e) { console.warn('a3 keiro', e); } }, desk: m => { try { keiroDesk(m); } catch (e) { console.warn('a3 keiro', e); } } };


  /* ================= BOARD · photos with a caption under them, notes as tinted glass ================= */
  function boardTile(m, i) {
    const c = m.card && cardById(m.card) ? cardById(m.card) : null; const col = c ? c.color : '';
    const dot = c ? '<span class="a2-dot" style="--c:' + col + '"></span>' : '';
    const plan = (m.planned && itemById(m.planned)) ? '<span class="a3bpl in">' + ico('cal', 11, 2.4) + esc(t('inPlan')) + '</span>' : m.sys === 'tutorial' ? '' : '<span class="a3bpl" role="button" data-a="tilePlan" data-id="' + m.id + '">+ ' + esc(L('Plan', 'Plán')) + '</span>';
    if (m.kind === 'note') return { h: 1.1 + Math.min(2, (m.note || '').length / 90), html: '<div class="a2-glass a2-tint a2-in a3bn" role="button" style="--i:' + i + ';--c:' + (col || '#c3d3da') + '" data-a="viewMoment" data-id="' + m.id + '">' + (dot || '<span class="a2-dot" style="--c:#c3d3da;box-shadow:none"></span>') + '<b class="a2-d">' + esc(m.note || '') + '</b><span class="a2-t2">' + esc([m.d ? dayShort(m.d) : '', c ? c.name : ''].filter(Boolean).join(' · ')) + '</span>' + (m.pin ? '<span class="a3bpin">' + ico('pin', 13, 2) + '</span>' : '') + '</div>' };
    let u = '', h = 1.3, inner = '';
    if (m.kind === 'link') { u = m.image || ''; h = u ? 1.4 : .9; inner = u ? '' : '<span class="a3blk">' + ico('link', 18, 2) + '<b>' + esc(m.site || '') + '</b></span>'; }
    else if (missingMedia(m)) { h = 1; inner = '<span class="a3blk">' + ico(m.kind === 'video' ? 'film' : 'photo', 22, 1.6) + '<b>' + esc(L('Coming from your other device', 'Načítá se z druhého zařízení')) + '</b></span>'; }
    else { u = thumb(m); const r = Math.max(.55, Math.min(1.8, +m.r || 1)); h = Math.max(.9, Math.min(1.9, 1 / r * 1.15)); }
    const isV = m.kind === 'video';
    const cap = m.kind === 'link' ? (m.title || m.url || '') : (m.note || '');
    const more = m.kind === 'photo' && m.more && m.more.length ? m.more.slice(0, 2) : null;
    const back = more ? more.map((x, k) => '<span class="a3sly s' + (k + 2) + '" style="background-image:url(' + esc(mediaNow(x.k)) + ')"></span>').reverse().join('') : '';
        return { h: h + (cap ? .25 : 0) + (more ? .08 : 0), html: '<div class="a2-in a3bt' + (more ? ' a3stk' : '') + '" style="--i:' + i + '"' + (more ? ' data-stk="' + m.id + '"' : '') + '>' + (more ? '<div class="a3stw" style="aspect-ratio:1/' + h.toFixed(2) + '">' + back : '') + '<button class="a3bimg' + (more ? ' s1' : '') + '" style="aspect-ratio:1/' + h.toFixed(2) + ';' + (u ? 'background:#14202a url(' + esc(u) + ') center/cover' : 'background:linear-gradient(160deg,#1f3a5f,#0e1b2e)') + '" data-a="viewMoment" data-id="' + m.id + '">' + inner
      + (isV && m.dur ? '<span class="a3bdur">' + Math.floor(m.dur / 60) + ':' + String(Math.round(m.dur % 60)).padStart(2, '0') + '</span>' : '') + (isV ? '<span class="a2-icon a3bplay">' + ico('play', 16, 2) + '</span><span class="a3bcut" role="button" data-a="stNew" data-mom="' + m.id + '" data-id="studio">' + ico('spark', 12, 2.2) + esc(L('Cut', 'Střih')) + '</span>' : '') + plan + (m.pin ? '<span class="a3bpin">' + ico('pin', 13, 2) + '</span>' : '') + (more ? '<span class="a3stn">' + (more.length + 1) + '</span>' : '') + '</button>' + (more ? '</div>' : '')
      + (cap ? '<span class="a3bcap">' + dot + '<span>' + esc(cap.split('\n')[0]) + '</span></span>' : '') + '</div>' };
  }
  function boardCols(ms, n) {
    const cols = Array.from({ length: n }, () => ({ h: 0, a: [] }));
    ms.forEach((m, k) => { const tl = boardTile(m, 2 + k); const c = cols.reduce((a, b) => b.h < a.h ? b : a); c.a.push(tl.html); c.h += tl.h + .1; });
    return '<div class="a3bgrid" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' + cols.map(c => '<div class="a3bcol">' + c.a.join('') + '</div>').join('') + '</div>';
  }
  function boardChips() {
    const f = V.boardFilter || 'all';
    const ch = (k, lab, n, col) => '<button class="a2-chip' + (f === k ? ' on' : '') + '" data-a="boardFilter" data-k="' + k + '">' + (col ? '<span class="a2-dot" style="--c:' + col + '"></span>' : '') + esc(lab) + ' <span class="a3cn">' + n + '</span></button>';
    const none = S.moments.filter(m => !m.card || !cardById(m.card)).length;
    return ch('all', t('all'), S.moments.length) + S.cards.map(c => [c, S.moments.filter(m => m.card === c.id).length]).filter(x => x[1] || f === x[0].id).map(([c, n]) => ch(c.id, c.name, n, c.color)).join('') + (none && none < S.moments.length ? ch('none', t('noCard'), none) : '');
  }
  const boardEmpty = () => '<div class="a2-glass a3bempty"><b>' + esc(S.moments.length ? L('Nothing matches.', 'Nic neodpovídá filtru.') : L('The board is empty', 'Board je prázdný')) + '</b><span class="a2-t2">' + esc(L('Hold the orb and drop it here, or tap it to add an idea.', 'Podrž orb a pusť ho sem, nebo na něj ťukni a přidej nápad.')) + '</span></div>';
  function boardPhone() {
    const ms = boardList();
    return '<div class="a2 a3p a3board">' + pHead('<b class="a2-d" style="font-size:44px">Board</b>', '<button class="a2-icon" data-a="boardSearch" aria-label="' + esc(t('search')) + '">' + ico(V.boardSearch ? 'x' : 'search', 19, 2) + '</button>')
      + (V.boardSearch ? '<div class="a2-glass a3srch a2-in" style="--i:1">' + ico('search', 17, 2) + '<input id="a3boardQ" type="search" placeholder="' + esc(t('searchPh')) + '" value="' + esc(V.boardQ || '') + '" autocomplete="off"></div>' : '')
      + '<div class="a2-in a3chips" style="--i:1">' + boardChips() + '</div><div id="a3bg">' + (ms.length ? boardCols(ms, 2) : boardEmpty()) + '</div></div>';
  }
  function boardDesk() {
    const ms = deskBoardList(); const ty = V.boardType || 'all'; const w = innerWidth; const n = Math.max(3, Math.min(6, Math.floor((w - 100) / 290)));
    const seg = '<div class="a2-seg" style="margin-left:auto;flex:none">' + [['all', L('All types', 'Všechno')], ['img', L('Images', 'Obrázky')], ['link', L('Links', 'Odkazy')], ['note', L('Notes', 'Poznámky')]].map(([k, l]) => '<button class="' + (ty === k ? 'on' : '') + '" data-a="a3BType" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div>';
    return '<main class="dmain a2 a3d a3dboard scr2"><div class="a2-in a3btit" style="--i:1"><b class="a2-d">Board</b><div class="a3chips">' + boardChips() + '</div>' + seg + '</div>'
      + (V.boardSearch ? '<div class="a2-glass a3srch" style="max-width:520px">' + ico('search', 17, 2) + '<input id="a3boardQ" type="search" placeholder="' + esc(t('searchPh')) + '" value="' + esc(V.boardQ || '') + '" autocomplete="off"></div>' : '')
      + '<div id="a3bg">' + (ms.length ? boardCols(ms, n) : boardEmpty()) + '</div>'
      + '<div id="dDrop" class="ddrop"><div><span class="ddi">' + ico('upload', 30, 1.8) + '</span><b>' + esc(L('Drop to add to Board', 'Pusť a přidá se na Board')) + '</b><span class="muted">' + esc(L('photos and videos from a folder', 'fotky a videa ze složky')) + '</span></div></div></main>';
  }
  ACT.a3BType = el => { V.boardType = el.dataset.k; deskRender(); };
  function bindBoard(root, isDesk) {
    const q = root.querySelector('#a3boardQ'); if (!q || q.dataset.b) return; q.dataset.b = 1;
    q.addEventListener('input', () => { V.boardQ = q.value; const ms = isDesk ? deskBoardList() : boardList(); const g = root.querySelector('#a3bg'); if (g) g.innerHTML = ms.length ? boardCols(ms, isDesk ? Math.max(2, Math.min(4, Math.floor((innerWidth - 120) / 330))) : 2) : boardEmpty(); });
    if (V.boardSearch && !q.value) setTimeout(() => q.focus(), 50);
  }


  /* ================= PLAN · list: the week, the day with a glowing now-line, no-day chips ================= */
  const pDay = x => new Date(x).toLocaleDateString('en-CA', { timeZone: 'Europe/Prague' });
  function keiroPlanRows(d) {
    const kx = KX(); if (!kx || !kx.C.on || !kx.C.feed) return [];
    const ps = kx.projs(); const list = ps.length ? ps.map(p => p.name) : [null];
    return list.map(n => kx.inP(n, () => { const rl = kx.rels().filter(s => !s.out && pDay(s.when) === d && (!n || !s.streamer || s.streamer.toLowerCase() === n.toLowerCase())); const p = kx.parts(); const send = d === T() ? p.todo.length : 0;
      if (!rl.length && !send) return null; const first = rl[0];
      return { name: n || 'Keiro', k: n || '', color: n ? kx.pcol(n) : kx.KC(), time: first ? kx.hm(first.when) : (p.first && p.first.due ? kx.hm(p.first.due) : null), rl: rl.length, send, next: first ? kx.hm(first.when) : '' }; })).filter(Boolean);
  }
  function keiroRow(k, timeCol) {
    const t1 = k.name + (k.rl ? ' · ' + k.rl + ' ' + L(k.rl === 1 ? 'release' : 'releases', plural(k.rl, 'vydání', 'vydání', 'vydání')) : '');
    const sub = [k.rl ? L('next ', 'další ') + k.next : '', k.send ? k.send + ' ' + L('to send', 'k odeslání') : ''].filter(Boolean).join(' · ');
    return '<div class="a3dr a3pr" role="button" data-a="krOpen" data-k="' + esc(k.k) + '">' + (timeCol ? '<span class="a3ptm a2-num">' + esc(k.time || '') + '</span>' : '') + '<span class="a3bar" style="background:' + k.color + '"></span><div class="a3dt"><span>' + esc(t1) + (timeCol && sub ? ' <span class="a2-t3 a3pts">· ' + esc(sub) + '</span>' : '') + '</span>' + (timeCol ? '' : '<span class="a2-t3">' + esc(sub) + '</span>') + '</div><span class="a2-chip" style="height:30px;font-size:13px">' + esc(L('Open', 'Otevřít')) + '</span></div>';
  }
  function planRow(i, d, nextId, timeCol) {
    if (!timeCol) return dayRow(i, d, nextId);
    const on = isDone(i, d); const c = hasCol(i) ? itemColor(i) : 'rgba(var(--wr),.4)'; const late = !i.repeat && i.date && i.date < d;
    return '<div class="a3dr a3pr' + (on ? ' done' : '') + '" role="button" data-a="openItem" data-id="' + i.id + '"><span class="a3ptm a2-num"' + (late ? ' style="color:#ffb08a"' : '') + '>' + esc(late ? WD[lang()][dow(i.date)] : i.time || L('any', 'kdy.')) + '</span><span class="a3bar" style="background:' + c + (i.id === nextId ? ';box-shadow:0 0 10px ' + c : '') + '"></span><div class="a3dt"><span' + (i.id === nextId ? ' style="font-weight:600"' : '') + '>' + esc(i.t) + (cardName(i) ? ' <span class="a2-t3 a3pts">· ' + esc(cardName(i)) + '</span>' : '') + '</span></div>' + check(i, d, hasCol(i) ? itemColor(i) : '#f4ecdc', 26) + '</div>';
  }
  function planDayList(day, timeCol) {
    const M = homeModel(); const its = itemsOn(day); const od = day === T() ? overdueItems() : []; const nextId = day === T() && M.nextAny ? M.nextAny.id : null;
    const ks = keiroPlanRows(day);
    const nl = '<div class="a3nl">' + (timeCol ? '<b class="a2-num a3ptm" style="font-size:12px">' + mtime(M.nm) + '</b>' : '<b class="a2-num">' + mtime(M.nm) + '</b>') + '<span class="a2-now"></span><i></i></div>';
    let rows = ''; if (od.length) rows += (timeCol ? '' : '<span class="a2-lab a3fb">' + esc(L('From before', 'Z dřívějška')) + '</span>') + od.map(i => planRow(i, day, null, timeCol)).join('');
    const ents = groupMonthly(its, day).map(i => ({ t: i.grp ? '99:98' : i.time || '99:99', h: i.grp ? groupRow(i, day) : planRow(i, day, nextId, timeCol) })).concat(ks.map(k => ({ t: k.time || '00:00', h: keiroRow(k, timeCol) })));
    ents.sort((a, b) => a.t < b.t ? -1 : a.t > b.t ? 1 : 0);
    let placed = day !== T(); const nmT = mtime(M.nm);
    ents.forEach(e => { if (!placed && e.t > nmT) { rows += nl; placed = true; } rows += e.h; });
    if (!placed && ents.length) rows += nl;
    if (!ents.length && !od.length) rows += '<div class="a2-t3 a3empty">' + esc(t('emptyDay')) + '</div>';
    return { rows, left: its.filter(i => !isDone(i, day)).length + od.length };
  }
  const dayTitle = d => (d === T() ? L('Today', 'Dnes') + ' · ' : d === addD(T(), 1) ? L('Tomorrow', 'Zítra') + ' · ' : '') + dayShort(d);
  const planSeg = (cur, act) => '<div class="a2-seg">' + [['list', t('list')], ['week', t('week')], ['month', L('Month', 'Měsíc')]].map(([k, l]) => '<button class="' + (cur === k ? 'on' : '') + '" data-a="' + act + '" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div>';
  function planPhone() {
    const day = V.planDay || T(); const ws = weekStart(day);
    const strip = [0, 1, 2, 3, 4, 5, 6].map(k => { const d = addD(ws, k); const on = d === day; const cols = [...new Set(itemsOn(d).map(i => hasCol(i) ? itemColor(i) : 'rgba(var(--wr),.5)'))].slice(0, 3);
      return '<button class="a3ps' + (on ? ' on a2-pop' : '') + (d === T() && !on ? ' td' : '') + '" data-a="planDay" data-d="' + d + '"><span>' + esc(WD[lang()][k]) + '</span><b class="a2-num">' + dOf(d).getDate() + '</b><i>' + cols.map(c => '<em style="background:' + c + '"></em>').join('') + '</i></button>'; }).join('');
    const L1 = planDayList(day, false); const nd = undatedItems();
    return '<div class="a2 a3p a3plan">' + pHead('<b class="a2-d" style="font-size:44px">Plan</b>', planSeg('list', 'planMode'))
      + '<div class="a2-glass a2-in a3pstrip" style="--i:1"><button class="a3pw" data-a="a3Week" data-k="-1" aria-label="' + esc(L('Previous week', 'Předchozí týden')) + '">' + ico('chevL', 14, 2.4) + '</button>' + strip + '<button class="a3pw r" data-a="a3Week" data-k="1" aria-label="' + esc(L('Next week', 'Další týden')) + '">' + ico('chev', 14, 2.4) + '</button></div>'
      + '<div class="a2-glass a2-in a3pday" style="--i:2"><div class="a3pdh"><b class="a2-d">' + esc(dayTitle(day)) + '</b><span class="a2-t2 a2-num"><b style="color:var(--cream)">' + L1.left + '</b> ' + esc(L('left', 'zbývá')) + '</span></div>' + L1.rows
      + '<button class="a2-btn ghost a3w" style="margin-top:8px" data-a="add" data-date="' + day + '">+ ' + esc(day === T() ? L('Add to Today', 'Přidat na dnešek') : L('Add to ', 'Přidat na ') + dayName(day).toLowerCase()) + '</button></div>'
      + (nd.length ? '<div class="a2-glass a2-in a3pnd" style="--i:3"><span class="a2-lab">' + esc(L('No day yet · ', 'Bez dne · ') + nd.length + L(' · tap to give it a day', ' · ťukni a dej mu den')) + '</span><div class="a3pch">' + nd.map(i => '<button class="a2-chip" data-a="when" data-id="' + i.id + '">' + (hasCol(i) ? '<span class="a2-dot" style="--c:' + itemColor(i) + '"></span>' : '') + esc(i.t) + '</button>').join('') + '</div></div>' : '')
      + '</div>';
  }
  ACT.a3Week = el => { const k = +el.dataset.k; if (desk()) { V.a3pday = addD(V.a3pday || T(), 7 * k); deskRender(); } else { V.planDay = addD(V.planDay || T(), 7 * k); V.planWeek = weekStart(V.planDay); renderPlan(); } };
  ACT.a3PDay = el => { V.a3pday = el.dataset.d === T() ? null : el.dataset.d; deskRender(); };
  ACT.a3PMode = el => { const k = el.dataset.k; if (k === 'list') DESK.mode = 'list'; else { DESK.mode = k; } deskRender(true); };
  function weekBlk(ws) {
    let tot = 0, dn = 0; const per = {};
    for (let k = 0; k < 7; k++) { const d = addD(ws, k); itemsOn(d).forEach(i => { const ok = isDone(i, d); tot++; if (ok) dn++; const key = i.card && cardById(i.card) ? i.card : '_'; const x = per[key] || (per[key] = { t: 0, d: 0 }); x.t++; if (ok) x.d++; }); }
    const rows = Object.keys(per).sort((a, b) => per[b].t - per[a].t).slice(0, 5).map(k => { const c = k === '_' ? null : cardById(k); const x = per[k]; const col = c ? c.color : '#c3d3da';
      return '<div class="a3wbr"><span class="a2-dot" style="--c:' + col + '"></span><b>' + esc(c ? c.name : L('Other', 'Ostatní')) + '</b><span class="a3wbt"><i style="width:' + Math.round(x.d / x.t * 100) + '%;background:' + col + '"></i></span><span class="a2-t2 a2-num">' + x.d + '/' + x.t + '</span></div>'; }).join('');
    return '<div class="a2-glass a2-in a3wblk" style="--i:3"><div class="a3wbh"><div><span class="a2-lab">' + esc(L('This week', 'Tento týden')) + '</span><div class="a3wbn"><b class="a2-d a2-num">' + dn + '</b><span class="a2-t2">/ ' + tot + ' ' + esc(L('done', 'hotovo')) + '</span></div></div>' + ring(84, tot ? dn / tot : 0, '#f4ecdc', 3) + '</div>' + (rows || '<span class="a2-t3">' + esc(L('Nothing planned this week yet.', 'Na tenhle týden zatím nic.')) + '</span>') + '</div>';
  }
  function planDesk() {
    const day = V.a3pday || T(); const ws = weekStart(day), we = addD(ws, 6);
    const rng = dOf(ws).getDate() + (dOf(ws).getMonth() === dOf(we).getMonth() ? '' : ' ' + MON[lang()][dOf(ws).getMonth()].toLowerCase()) + ' – ' + dOf(we).getDate() + ' ' + (cs() ? ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'][dOf(we).getMonth()] : MON.en[dOf(we).getMonth()]);
    const strip = [0, 1, 2, 3, 4, 5, 6].map(k => { const d = addD(ws, k); const on = d === day; const its = itemsOn(d); const dn = its.filter(i => isDone(i, d)).length; const lf = its.length - dn;
      const bars = its.slice(0, 4).map(i => '<em style="background:' + (isDone(i, d) || d >= T() ? (hasCol(i) ? itemColor(i) : (on ? 'rgba(27,34,40,.35)' : 'rgba(var(--wr),.45)')) : 'color-mix(in oklab,' + (hasCol(i) ? itemColor(i) : 'var(--mw)') + ' 35%,transparent)') + (on && !isDone(i, d) && d === T() ? ';opacity:.35' : '') + '"></em>').join('');
      const st = !its.length ? '' : d === T() ? dn + ' ' + L('of ', 'z ') + its.length : d < T() ? (lf ? lf + ' ' + L('left', 'zbývá') : dn + ' ' + L('done', 'hotovo')) : its.length + ' ' + L('planned', 'v plánu');
      return '<button class="a3pd' + (on ? ' on' : '') + (d === T() && !on ? ' td' : '') + '" data-a="a3PDay" data-d="' + d + '"><span>' + esc(WD[lang()][k] + ' ' + dOf(d).getDate()) + '</span><i>' + bars + '</i><small' + (d < T() && lf ? ' style="color:#ffb08a"' : '') + '>' + esc(st) + '</small></button>'; }).join('');
    const L1 = planDayList(day, true); const nd = undatedItems(); const tm = addD(day, 1); const tmi = itemsOn(tm);
    return '<main class="dmain a2 a3d a3dplan"><div class="a2-in a3greet" style="--i:1;align-items:center"><b class="a2-d">Plan</b><span class="a2-t2">' + esc(rng) + '</span><span style="flex:1"></span>' + planSeg('list', 'a3PMode') + '</div>'
      + '<div class="a2-glass a2-in a3pdstrip" style="--i:2"><button class="a3pw" data-a="a3Week" data-k="-1">' + ico('chevL', 14, 2.4) + '</button>' + strip + '<button class="a3pw r" data-a="a3Week" data-k="1">' + ico('chev', 14, 2.4) + '</button></div>'
      + '<div class="a3pg"><div class="a2-glass a2-in a3pday d" style="--i:3"><div class="a3pdh"><b class="a2-d">' + esc(dayTitle(day)) + '</b><span class="a2-t2 a2-num"><b style="color:var(--cream)">' + L1.left + '</b> ' + esc(L('left', 'zbývá')) + '</span></div><div class="a3list">' + L1.rows + '</div>'
      + '<button class="a2-btn ghost a3w" style="margin-top:auto;flex:none" data-a="add" data-date="' + day + '">+ ' + esc(day === T() ? L('Add to Today', 'Přidat na dnešek') : L('Add to ', 'Přidat na ') + dayName(day).toLowerCase()) + '</button></div>'
      + '<div class="a3col">' + weekBlk(ws) + '<div class="a2-glass a2-in a3pnd d" style="--i:4"><span class="a2-lab">' + esc(L('No day yet · ', 'Bez dne · ') + nd.length) + '</span>' + (nd.length ? '<div class="a3pch v">' + nd.slice(0, 8).map(i => '<button class="a2-chip" data-a="when" data-id="' + i.id + '">' + (hasCol(i) ? '<span class="a2-dot" style="--c:' + itemColor(i) + '"></span>' : '') + '<span>' + esc(i.t) + '</span></button>').join('') + '</div><span class="a2-t3" style="font-size:13px">' + esc(L('Tap one to give it a day', 'Ťukni a dej mu den')) + '</span>' : '<span class="a2-t3" style="font-size:14px">' + esc(L('Everything has a day.', 'Všechno má svůj den.')) + '</span>') + '</div>'
      + '<div class="a2-glass a2-in a3ptm2" style="--i:5"><span class="a2-lab" style="padding-bottom:8px">' + esc(dayTitle(tm)) + '</span>' + (tmi.length ? tmi.slice(0, 7).map(i => '<div class="a3dr" role="button" data-a="openItem" data-id="' + i.id + '"><span class="a3bar" style="height:26px;background:' + (hasCol(i) ? itemColor(i) : 'rgba(var(--wr),.4)') + '"></span><span class="a3dt"><span style="font-size:15px">' + esc(i.t) + '</span></span><span class="a2-t3" style="font-size:13px">' + esc(i.time || (i.repeat === 'daily' ? L('daily', 'denně') : L('any', 'kdykoli'))) + '</span></div>').join('') : '<span class="a2-t3" style="font-size:14px">' + esc(t('emptyDay')) + '</span>') + '</div></div></div></main>';
  }


  /* ================= SETTINGS · five groups, the Look page with wallpapers and motion ================= */
  const WL = [['aurora', 'Aurora', 'linear-gradient(180deg,#7aa9b8,#163c63 55%,#7c3324)'], ['dusk', L('Dusk', 'Soumrak'), 'linear-gradient(180deg,#c58c6a,#5a3b5e 55%,#1d1b33)'], ['forest', L('Forest', 'Les'), 'linear-gradient(180deg,#4f8a7a,#1d3b3a 55%,#0f1d1c)'], ['mono', 'Mono', 'linear-gradient(180deg,#5a6068,#24282d 55%,#131518)']];
  const wallKey = () => (S.a3wall || 'aurora');
  const tg = on => '<span class="a3tg' + (on ? ' on' : '') + '"><i></i></span>';
  const srow2 = (act, label, right, extra) => '<button class="a3sr" data-a="' + act + '"' + (extra || '') + '><span class="a3srl">' + label + '</span><span class="a3srr">' + right + '</span></button>';
  const chev = '<span class="a2-t2">›</span>';
  function motionSeg() { const l = S.a2motion || 'full'; return '<div class="a2-seg a3mseg">' + [['full', L('Full', 'Plný')], ['calm', L('Calm', 'Klidný')], ['off', L('Off', 'Vypnuto')]].map(([k, x]) => '<button class="' + (l === k ? 'on' : '') + '" data-a="a3Motion" data-k="' + k + '">' + esc(x) + '</button>').join('') + '</div>'; }
  ACT.a3Blur = el => { S.blur = +el.dataset.k; S.a3blur = 1; save(); applyLook(); renderSettings(); };
  ACT.a3Motion = el => { if (ACT.a2Motion) ACT.a2Motion(el); else { S.a2motion = el.dataset.k; save(); } renderSettings(); };
  ACT.a3Wall = el => { const k = el.dataset.k; if (k === 'photo') { const again = S.a3wall === 'photo'; S.a3wall = 'photo'; save(); if (!S.wallKey || again) { $('#wallIn').click(); return; } S.wall = 'photo'; applyLook(); wall(); renderSettings(); return; } S.a3wall = k; if (S.wall === 'photo') S.wall = 'aurora'; save(); applyLook(); wall(); renderSettings(); };
  ACT.a3Still = () => { S.a3still = !S.a3still; save(); wall(); renderSettings(); };
  ACT.a3Set = el => { V.a3set = el.dataset.k; V.settingsPage = 'main'; renderSettings(); };
  ACT.a3LabPage = () => { V.settingsPage = 'a3lab'; renderSettings(); $('#s-settings').scrollTop = 0; };
  function accRow(big) {
    const init = ((S.name || '').trim() || (typeof accOn === 'function' && accOn() && S.acc && S.acc.login) || 'A').charAt(0).toUpperCase();
    return '<button class="a2-glass a2-in a3acc' + (big ? '' : ' m') + '" style="--i:1" data-a="accPage"><span class="a3avt">' + esc(init) + '</span><span class="a3acct"><b>' + esc(S.name || t('yourName')) + '</b><span class="a2-t2">' + esc(typeof accOn === 'function' && accOn() ? '@' + S.acc.login + ' · Aurora Lab' : L('No account · create or log in', 'Bez účtu · vytvořit nebo přihlásit')) + '</span></span>' + chev + '</button>';
  }
  function lookRows(isDesk) {
    const wk = wallKey(); const w = WL.find(x => x[0] === wk);
    if (!isDesk) return srow2('lookPage', '<span class="a3wsw" style="background:' + (w ? w[2] : 'url(' + (S.wallKey ? mediaNow(S.wallKey) : 'wall.jpg') + ') center/cover') + '"></span><span class="a3srt">' + esc(t('appearance')) + '<small class="a2-t2">' + esc((S.mode === 'light' ? L('Light', 'Světlý') : L('Dark', 'Tmavý')) + ' · ' + (w ? w[1] : L('Photo', 'Fotka'))) + '</small></span>', chev)
      + '<div class="a3sr col"><span class="a3srl">' + esc(L('Motion', 'Pohyb')) + '</span>' + motionSeg() + '</div>';
    return lookPanel();
  }
  function lookPanel() {
    const wk = wallKey(); const grain = S.a3grain != null ? S.a3grain : .16;
    const tiles = WL.map(([k, l, bg], i) => '<button class="a3wt" data-a="a3Wall" data-k="' + k + '"><span class="a2-pop" style="--i:' + i + ';background:' + bg + (wk === k ? ';box-shadow:0 0 0 3px var(--cream)' : '') + '"></span><span class="' + (wk === k ? '' : 'a2-t2') + '">' + esc(l) + '</span></button>').join('')
      + '<button class="a3wt" data-a="a3Wall" data-k="photo"><span class="a2-pop" style="--i:4;' + (S.wallKey ? 'background:url(' + mediaNow(S.wallKey) + ') center/cover' : 'background:rgba(var(--wr),.08)') + (wk === 'photo' ? ';box-shadow:0 0 0 3px var(--cream)' : '') + '">' + (S.wallKey ? '' : ico('plus', 20, 1.8)) + '</span><span class="' + (wk === 'photo' ? '' : 'a2-t2') + '">' + esc(L('Your photo', 'Vlastní fotka')) + '</span></button>';
    const bl = S.blur ?? 12, bk = bl <= 4 ? 0 : bl <= 24 ? 12 : 40;
    const blurRow = wk === 'photo' ? '<div class="a2-well a3lw"><div><b>' + esc(L('Photo blur', 'Rozmazání fotky')) + '</b></div><div class="a2-seg">' + [[0, L('Sharp', 'Ostré')], [12, L('Soft', 'Jemné')], [40, L('Strong', 'Silné')]].map(([k, l]) => '<button class="' + (bk === k ? 'on' : '') + '" data-a="a3Blur" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div></div>' : '';
    return '<div class="a3lk"><span class="a2-lab">' + esc(t('wallpaper')) + '</span><div class="a3wts">' + tiles + '</div></div>' + blurRow
      + '<div class="a2-well a3lw"><div><b>' + esc(L('Motion', 'Pohyb')) + '</b></div>' + motionSeg() + '</div>'
      + '<div class="a2-well a3lw"><div><b>' + esc(L('Mode', 'Režim')) + '</b></div><div class="a2-seg"><button class="' + (S.mode !== 'light' ? 'on' : '') + '" data-a="setMode" data-k="dark">' + esc(L('Dark', 'Tmavý')) + '</button><button class="' + (S.mode === 'light' ? 'on' : '') + '" data-a="setMode" data-k="light">' + esc(L('Light', 'Světlý')) + '</button></div></div>'
      + '<button class="a2-well a3lw" data-a="a3Still"><div><b>' + esc(L('Living wallpaper', 'Živá tapeta')) + '</b></div>' + tg(!S.a3still) + '</button>'
      + '<div class="a2-well a3lw"><div><b>' + esc(L('Grain', 'Zrno')) + '</b></div><input type="range" class="a3rng" id="a3grain" min="0" max="0.4" step="0.02" value="' + grain + '" aria-label="' + esc(L('Grain', 'Zrno')) + '"></div>' + orbPanel();
  }
  function setGroups() {
    const k = typeof KCFG === 'function' ? KCFG() : (KX() ? KX().C : {}); const kOn = k && k.on;
    const srcN = S.cards.filter(c => c.src).length;
    const st = window.STUDIO && STUDIO.ST; const sync = S.labSync ? (S.labSync.state === 'err' ? L('Problem', 'Problém') : L('Linked', 'Propojeno')) : L('Not linked', 'Nepropojeno');
    return [
      ['acc', L('Account', 'Účet'), srow2('syncPage', esc(L('Phone and computer', 'Telefon a počítač')), '<span class="a2-t2">' + esc(sync) + ' ›</span>') + srow2('joinCodeSheet', esc(L('Card invitation', 'Pozvánka do karty')), chev) + (innerWidth >= 700 ? srow2('layoutSheet', esc(L('Layout', 'Rozložení')), '<span class="a2-t2">' + esc(typeof layoutLabel === 'function' ? layoutLabel() : '') + ' ›</span>') : '')],
      ['look', L('Look', 'Vzhled'), null],
      ['notif', L('Notifications', 'Notifikace'), srow2('notifPage', esc(L('Reminders for plans', 'Připomínky k plánům')), '<span class="a2-t2">' + esc(S.push && S.push.on ? L('On', 'Zap') : L('Off', 'Vyp')) + ' ›</span>') + srow2('toggleNudges', esc(t('nudges')), tg(S.nudges)) + srow2('toggleWeekly', esc(L('Sunday: your week', 'Neděle: tvůj týden')), tg(S.weekly))],
      ['tools', L('Tools', 'Nástroje'), srow2('srcSetup', esc(L('Sources', 'Zdroje')), '<span class="a2-t2">' + esc(srcN ? srcN + ' ' + L('connected', plural(srcN, 'připojený', 'připojené', 'připojených')) : L('Link reader', 'Čtečka odkazů')) + ' ›</span>') + srow2('keiroSettings', esc(L('Automation', 'Automatizace')), '<span style="color:' + (kOn ? 'var(--okc)' : 'var(--t2)') + '">' + esc(kOn ? L('On', 'Zap') : L('Off', 'Vyp')) + ' ›</span>')
        + (st && st.daily ? '<div class="a3sr col"><div class="a3srh"><span class="a3srl">Studio · ' + esc(L('videos today', 'videa dnes')) + '</span><span class="a2-t2 a2-num"><b style="color:var(--cream)">' + (st.used || 0) + '</b> / ' + st.daily + '</span></div><span class="a3bar2"><span class="a2-grow" style="width:' + Math.min(100, (st.used || 0) / st.daily * 100).toFixed(0) + '%"></span></span></div>' : '')],
      ['help', L('Help', 'Pomoc'), srow2('a3Check', esc(L('Connection check', 'Kontrola spojení')), chev) + srow2('feedback', esc(L('Send feedback', 'Napsat feedback')), chev) + srow2('tutorial', esc(L('How Aurora works', 'Jak Aurora funguje')), '<span class="a2-t2">1 min ›</span>') + srow2('pickLang', esc(t('language')), '<span class="a2-t2">' + esc(t('lang_' + S.lang)) + ' ›</span>') + srow2('exportData', esc(t('backup')), chev) + srow2('restoreData', esc(t('restore')), chev)]
    ];
  }
  function settingsPhone() {
    const g = setGroups(); let h = '<div class="a2 a3p a3setp">' + '<div class="a3hd a2-in" style="--i:0;justify-content:flex-start;gap:14px;padding:0 4px"><button class="a2-icon" data-a="closeSettings" aria-label="' + esc(L('Back', 'Zpět')) + '">' + ico('back', 20, 2.2) + '</button><b class="a2-d" style="font-size:40px">' + esc(t('settings')) + '</b></div>' + accRow(false);
    g.forEach(([k, lab, rows], i) => { h += '<span class="a2-lab a3sl2">' + esc(lab) + '</span><div class="a2-glass a2-in a3grp" style="--i:' + (2 + i) + '">' + (k === 'look' ? lookRows(false) : rows) + '</div>'; });
    return h + '<button class="a2-in a3foot" style="--i:8" data-a="a3LabPage">Aurora 2.0 · Lab ' + esc(L('tools', 'nástroje')) + ' ›</button></div>';
  }
  function settingsDesk(oldGrp) {
    const g = setGroups(); const cur = oldGrp || V.a3set || 'look'; const grp = g.find(x => x[0] === cur) || g[1];
    const st = window.STUDIO && STUDIO.ST;
    const menu = '<div class="a2-glass a2-in a3smenu" style="--i:2">' + accRow(true).replace('a3acc"', 'a3acc d"') + g.map(([k, lab]) => '<button class="a3mi' + (k === cur ? ' on' : '') + '" data-a="a3Set" data-k="' + k + '"><span>' + esc(lab) + '</span>' + (k === 'tools' && st && st.daily ? '<span class="a2-t3 a2-num">Studio ' + (st.used || 0) + '/' + st.daily + '</span>' : '') + '</button>').join('') + '<button class="a3mi foot" data-a="a3LabPage">Aurora 2.0 · Lab ' + esc(L('tools', 'nástroje')) + ' ›</button></div>';
    const panel = oldGrp ? '<div class="a2-glass a3spanel a3oldp"></div>' : '<div class="a2-glass a2-in a3spanel" style="--i:3"><b class="a2-d" style="font-size:32px">' + esc(grp[1]) + '</b>' + (grp[0] === 'look' ? lookPanel() : '<div class="a3grp d">' + grp[2] + '</div>') + '</div>';
    return '<div class="a2 a3dset"><div class="a3dsh a2-in" style="--i:1"><b class="a2-d">' + esc(t('settings')) + '</b><button class="a2-icon" data-a="closeSettings" aria-label="' + esc(L('Close', 'Zavřít')) + '">' + ico('x', 18, 2.2) + '</button></div><div class="a3dsg">' + menu + panel + '</div></div>';
  }
  function labPage() {
    const rows = srow2('labPull', esc(L('Pull data from the beta again', 'Znovu stáhnout data z bety')), chev) + srow2('installInfo', esc(t('install')), chev) + srow2('tipsToggle', esc(L('Tips on Home', 'Tipy na Domově')), tg(!S.tipsOff)) + srow2('coachReset', esc(L('Show the hints again', 'Ukázat nápovědu znovu')), chev) + srow2('promo', esc(L('Aurora in 26 s', 'Aurora za 26 s')), chev) + '<button class="a3sr red" data-a="deleteAll"><span class="a3srl">' + esc(t('deleteAll')) + '</span></button>';
    return '<div class="a2 a3p a3setp"><div class="a3hd a2-in" style="--i:0;justify-content:flex-start;gap:14px;padding:0 4px"><button class="a2-icon" data-a="settingsBack" aria-label="' + esc(L('Back', 'Zpět')) + '">' + ico('back', 20, 2.2) + '</button><b class="a2-d" style="font-size:36px">Lab</b></div><div class="a2-glass a2-in a3grp" style="--i:1">' + rows + '</div><div class="a2-t3 a3ver">' + esc(t('ver', VERSION)) + ' · ' + S.cards.length + ' ' + esc(t('cards')) + ' · ' + S.items.length + ' items · ' + S.moments.length + ' ' + esc(t('moments').toLowerCase()) + '</div></div>';
  }
  function lookPhone() {
    return '<div class="a2 a3p a3setp"><div class="a3hd a2-in" style="--i:0;justify-content:flex-start;gap:14px;padding:0 4px"><button class="a2-icon" data-a="settingsBack" aria-label="' + esc(L('Back', 'Zpět')) + '">' + ico('back', 20, 2.2) + '</button><b class="a2-d" style="font-size:36px">' + esc(t('appearance')) + '</b></div><div class="a2-glass a2-in a3spanel m" style="--i:1">' + lookPanel() + '</div></div>';
  }
  function bindSettings(el) {
    const g = el.querySelector('#a3grain'); if (g) { g.addEventListener('input', () => { S.a3grain = +g.value; wall(); }); g.addEventListener('change', () => save()); }
  }


  /* ================= AURORA STUDIO · one space for all videos (upload, say what you want, Aurora cuts) ================= */
  const STC = '#5fd0cf';
  const STD = () => window.STUDIO || null;
  function studioFacts() {
    const st = STD(); const ST = st ? st.ST : { jobs: [], ups: {}, daily: 5, used: 0 };
    const ups = Object.values(ST.ups || {}); const jobs = ST.jobs || [];
    const busy = jobs.filter(j => st && st.busy(j)); const ready = jobs.filter(j => j.status === 'ready'); const done = jobs.filter(j => j.status === 'final');
    const left = Math.max(0, (ST.daily || 5) - (ST.used || 0));
    return { st, ST, ups, jobs, busy, ready, done, left, daily: ST.daily || 5, used: ST.used || 0, signed: !!(st && st.signed()) };
  }
  function studioNext(f) {
    if (!f.signed) return L('Sign in to cut videos', 'Přihlas se a stříhej');
    if (f.ups.length) return f.ups[0].state === 'error' ? L('Upload stopped · tap to see why', 'Nahrávání se zastavilo · ťukni pro detail') : L('Uploading ', 'Nahrávám ') + (f.ups[0].pct || 0) + ' %';
    if (f.busy.length) return L('Cutting ', 'Stříhám ') + (f.busy[0].prompt || f.busy[0].name || '');
    if (f.ready.length) return L('Pick an opening · ', 'Vyber začátek · ') + (f.ready[0].prompt || f.ready[0].name || '');
    return L('Upload a video, say what you want', 'Nahraj video, řekni co chceš');
  }
  function studioPhoneCard(i) {
    const f = studioFacts();
    return '<div class="a2-glass a2-tint a2-in a3dc a3dk" role="button" style="--i:' + i + ';--c:' + STC + '" data-a="a3StOpen"><div class="a3dch">' + kick(L('Studio · video cut', 'Studio · střih videa'), STC) + (f.busy.length || f.ups.length ? '<span class="a3nowb" style="background:rgba(95,208,207,.2);color:var(--stl)">' + esc(L('CUTTING', 'STŘÍHÁ')) + '</span>' : '') + '</div>'
      + '<div class="a3dcn"><b class="a2-d" style="font-size:clamp(26px,7.6vw,38px)">Aurora Studio</b>' + ring(64, f.used / f.daily, STC, i, f.left + '/' + f.daily, 15) + '</div>'
      + '<div class="a3w3">' + [[f.ups.length + f.busy.length, L('in progress', 'rozpracováno')], [f.ready.length, L('to pick', 'k výběru')], [f.done.length, L('done', 'hotovo')]].map(([n, l]) => '<div class="a2-well"><b class="a2-d a2-num">' + n + '</b><div class="a2-t2">' + esc(l) + '</div></div>').join('') + '</div>'
      + '<div class="a3nxs"><span class="a2-lab" style="color:var(--stl)">' + esc(t('nextStep')) + '</span><span>' + esc(studioNext(f)) + '</span></div></div>';
  }

  /* what is happening right now, so you can see it works: steps, a moving bar, time running */
  const ST_ORDER = ['start', 'download', 'transcript', 'plan', 'cut', 'render', 'upload'];
  const ST_TXT = { start: ['Waking up the cutter', 'Startuju střižnu'], download: ['Getting your video', 'Beru tvoje video'], transcript: ['Listening to what is said', 'Poslouchám, co se říká'], plan: ['Reading what you want', 'Čtu, co chceš'], cut: ['Cutting the pauses', 'Stříhám pauzy'], render: ['Rendering the video', 'Renderuju video'], upload: ['Almost done', 'Skoro hotovo'] };
  const liq = (pc, cls) => '<span class="a3liq' + (cls ? ' ' + cls : '') + '" style="--h:' + Math.max(8, Math.min(100, pc)) + '%"><span class="a3lqw">' + '<svg viewBox="0 0 240 16" preserveAspectRatio="none"><path d="M0 8 Q15 0 30 8 T60 8 T90 8 T120 8 T150 8 T180 8 T210 8 T240 8 V16 H0Z"/></svg>' + '<svg class="b" viewBox="0 0 240 16" preserveAspectRatio="none"><path d="M0 8 Q15 0 30 8 T60 8 T90 8 T120 8 T150 8 T180 8 T210 8 T240 8 V16 H0Z"/></svg>' + '</span></span>';
  const mmss = ms => { const s2 = Math.max(0, Math.round(ms / 1000)); return Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0'); };
  function liveRow(j) {
    const k = Math.max(0, ST_ORDER.indexOf(j.stage || (j.status === 'queued' ? '' : 'start')));
    const queued = j.status === 'queued' || j.status === 'final-queued';
    const pc = queued ? 4 : Math.max(j.pct || 0, Math.round((k + .5) / ST_ORDER.length * 100));
    const txt = queued ? L('In the queue · starts in a moment', 'Ve frontě · za chvíli začne') : L(...(ST_TXT[j.stage] || ST_TXT.start));
    const since = j.created ? Date.now() - (+j.created || Date.parse(j.created)) : 0;
    return '<button class="a3live a3vsl" data-a="stOpen" data-id="' + j.id + '">' + liq(pc) + '<span class="a3vtx"><b class="a2-d">' + esc(txt) + '</b><span class="a3vsub">' + esc(j.prompt || j.name || 'Video') + (queued ? '' : ' · ' + L('step ', 'krok ') + (k + 1) + '/' + ST_ORDER.length) + (since > 0 ? ' · ' + mmss(since) : '') + '</span></span></button>';
  }
  function upRow(u) {
    const err = u.state === 'error';
    return '<button class="a3live a3vsl' + (err ? ' err' : '') + '" data-a="stUp" data-id="' + u.id + '">' + (err ? '' : liq(u.pct || 0, 'up')) + '<span class="a3vtx"><span class="a2-lab">' + esc(L('Uploading', 'Nahrávám')) + '</span><b class="a2-d">' + esc(err ? L('Upload stopped', 'Nahrávání se zastavilo') : u.state === 'offline' ? L('Waiting for internet', 'Čekám na internet') : (u.pct || 0) + ' %') + '</b><span class="a3vsub">' + esc(err ? u.err : (u.prompt || u.name)) + '</span></span></button>';
  }
  setInterval(() => { if ((V.studio || V.stv) && document.querySelector('.a3live')) { try { window.A3S && A3S.paint(); } catch (e) {} } }, 1000);


  /* a quick check of the way to the cutter: is the server there, does it know your account */
  const DIAG = { at: 0, srv: null, acc: null, msg: '' };
  async function studioDiag(force) {
    const st = STD(); if (!st || (!force && Date.now() - DIAG.at < 60000)) return; DIAG.at = Date.now(); DIAG.srv = DIAG.acc = null; DIAG.msg = '';
    try { const r = await fetch(st.base() + '/ping', { cache: 'no-store' }); const j = await r.json().catch(() => null); DIAG.srv = r.ok && j && j.ok; if (!DIAG.srv) DIAG.msg = 'ping ' + r.status; } catch (e) { DIAG.srv = false; DIAG.msg = L('server not reachable', 'server nedostupný') + ' · ' + st.base().replace(/^https?:\/\//, ''); }
    if (DIAG.srv) { try { await st.api('/jobs'); DIAG.acc = true; } catch (e) { DIAG.acc = false; DIAG.msg = (e.status || '') + ' ' + (e.message || ''); } }
    window.A3S && A3S.paint();
  }
  ACT.a3StDiag = () => { studioDiag(true); };
  /* one tap: is every connection alive? Read-only checks, nothing is written anywhere */
  ACT.a3Check = () => {
    const R = {}; const rows = [['srv', L('Aurora server', 'Server Aurory')], ['beta', L('Your beta account', 'Tvůj účet z bety')], ['lab', L('Phone and computer', 'Telefon a počítač')], ['notif', L('Notifications', 'Notifikace')], ['studio', 'Studio']];
    const paint = el => { const b = el.querySelector('#a3ck'); if (!b) return; b.innerHTML = rows.map(([k, lab]) => { const x = R[k]; const ic = !x ? '<span class="a3ckw"></span>' : x[0] === 1 ? '<span class="a3cko">✓</span>' : x[0] === 0 ? '<span class="a3ckx">!</span>' : '<span class="a3ckn">–</span>';
      return '<div class="a3ckr">' + ic + '<span class="a3ckt"><b>' + esc(lab) + '</b><span class="a2-t2">' + esc(x ? x[1] : L('checking…', 'kontroluju…')) + '</span></span></div>'; }).join(''); };
    const errTxt = e => (e && e.status ? e.status + ' · ' : '') + ((e && e.message) || String(e)).slice(0, 90);
    const pull = cr => syncApi('/s/pull', { sp: cr.sp, secret: cr.secret, since: Number.MAX_SAFE_INTEGER, sinceK: '' });
    openSheet({ title: L('Connection check', 'Kontrola spojení'), right: L('Again', 'Znovu'), cls: 'a3cksheet',
      body: '<p class="a3blp">' + esc(L('Checks every connection, writes nothing. Send a screenshot if something is red.', 'Projde všechna spojení, nic nezapisuje. Když něco svítí červeně, pošli screenshot.')) + '</p><div id="a3ck" class="a3ckl"></div><p class="a2-t3 a3ckv">Lab v2069 · ' + esc(pushBase().replace(/^https:\/\//, '')) + '</p>',
      mount: el => { paint(el); const run = async () => {
        const set = (k, v) => { R[k] = v; paint(el); };
        try { const r = await fetch(pushBase() + '/', { cache: 'no-store' }); const j = await r.json().catch(() => null); set('srv', r.ok && j && j.sync ? [1, L('running', 'běží')] : [0, 'http ' + r.status]); } catch (e) { set('srv', [0, L('not reachable', 'nedostupný') + ' · ' + errTxt(e)]); }
        if (!S.sync || !S.sync.sp) set('beta', [2, L('not signed in', 'nepřihlášeno')]); else { try { await pull(S.sync); set('beta', [1, L('accepted', 'přijatý')]); } catch (e) { set('beta', [0, (e.status === 403 ? L('server does not know this account', 'server tenhle účet nezná') + ' · ' : '') + errTxt(e)]); } }
        if (!S.labSync || !S.labSync.sp) set('lab', [2, L('not linked yet', 'zatím nepropojeno')]); else { try { await pull(S.labSync); const ago = S.labSync.last ? Math.round((Date.now() - S.labSync.last) / 60000) : null; set('lab', [1, L('linked', 'propojeno') + (ago != null ? ' · ' + L('last ', 'naposled ') + (ago < 1 ? L('now', 'teď') : ago + ' min') : '')]); } catch (e) { set('lab', [0, (e.status === 403 ? L('link no longer valid', 'propojení už neplatí') + ' · ' : '') + errTxt(e)]); } }
        try { const sup = typeof pushSupport === 'function' ? pushSupport() : 'no'; const perm = 'Notification' in window ? Notification.permission : 'none'; let sub = false; try { const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('sw')), 3000))]); sub = !!(await reg.pushManager.getSubscription()); } catch (e) {}
          const p = S.push || {}; set('notif', sup !== 'ok' ? [0, sup === 'install' ? L('add Aurora to the Home Screen first', 'nejdřív přidej Auroru na plochu') : L('not supported in this browser', 'tenhle prohlížeč je neumí')] : !p.on ? [2, L('off', 'vypnuté') + ' · ' + L('permission ', 'povolení ') + perm] : perm !== 'granted' ? [0, L('blocked in system settings', 'zablokované v nastavení systému')] : !sub ? [0, L('this device is not subscribed', 'zařízení není přihlášené k odběru')] : p.err ? [0, p.err] : [1, L('on', 'zapnuté') + (p.synced ? ' · ' + L('plan sent ', 'plán odeslaný ') + Math.round((Date.now() - p.synced) / 60000) + ' min' : '')]); } catch (e) { set('notif', [0, errTxt(e)]); }
        const st = STD(); if (!st) set('studio', [2, L('off', 'vypnuté')]); else { try { const r = await fetch(st.base() + '/ping', { cache: 'no-store' }); const j = await r.json(); if (!j.ok) throw new Error('ping ' + r.status); if (!S.sync || !S.sync.sp) set('studio', [2, L('server runs · sign in first', 'server běží · nejdřív se přihlas')]); else { try { await st.api('/jobs'); set('studio', [1, L('server and account OK', 'server i účet OK')]); } catch (e) { set('studio', [0, errTxt(e) + (j.acct && j.acct.indexOf('ok') !== 0 ? ' · ' + L('server cannot reach accounts: ', 'server se nedovolá k účtům: ') + j.acct : '')]); } } } catch (e) { set('studio', [0, L('server not reachable', 'server nedostupný') + ' · ' + errTxt(e)]); } }
      }; run(); el._run = () => { Object.keys(R).forEach(k => delete R[k]); paint(el); run(); }; },
      onSave: () => { const el = document.querySelector('.a3cksheet'); el && el._run ? el._run() : 0; } });
  };
  function diagRow() {
    if (DIAG.srv === null && !DIAG.at) return '';
    const ok = DIAG.srv && DIAG.acc; const wait = DIAG.srv === null || (DIAG.srv && DIAG.acc === null);
    return '<button class="a2-glass a2-in a3ndr a3diag" style="--i:5" data-a="a3StDiag"><span>' + (wait ? esc(L('Checking the connection…', 'Kontroluju spojení…')) : ok ? '✓ ' + esc(L('Server and account OK', 'Server i účet v pořádku')) : '⚠︎ ' + esc((DIAG.srv ? L('Server OK, account not accepted', 'Server běží, účet nepřijal') : L('Studio server not reachable', 'Studio server neodpovídá')) + (DIAG.msg ? ' · ' + DIAG.msg : ''))) + '</span><span class="a2-t2">' + esc(L('Check again', 'Znovu')) + '</span></button>';
  }

  function studioPage(isDesk) {
    /* v2059 · the garage: what is on the lift, the tool shelf, the finished cuts */
    const f = studioFacts(); const st = f.st;
    const head = isDesk ? '<div class="a2-in a3ctit a3gh" style="--i:1"><div>' + kick('Aurora Studio', STC) + '<b class="a2-d">' + esc(L('Garage', 'Garáž')) + '</b></div></div>'
      : '<div class="a3hd a2-in" style="--i:0;padding:0 4px"><button class="a2-icon" data-a="a3StClose" aria-label="' + esc(L('Back', 'Zpět')) + '">' + ico('back', 20, 2.2) + '</button></div><div class="a2-in a3cti" style="--i:1">' + kick('Aurora Studio', STC) + '<b class="a2-d" style="font-size:52px">' + esc(L('Garage', 'Garáž')) + '</b></div>';
    if (!f.signed) return (isDesk ? '<main class="dmain a2 a3d a3dcard scr2 a3dstudio">' : '<div class="a2 a3p a3studio">') + head + '<div class="a2-glass a2-tint a2-in a3sth" style="--i:2;--c:' + STC + '"><b class="a2-d" style="font-size:28px">' + esc(L('Sign in first', 'Nejdřív se přihlas')) + '</b><span class="a2-t2 a3sts">' + esc(L('Studio cuts on the server, so it needs your Aurora account.', 'Studio stříhá na serveru, potřebuje tvůj účet v Auroře.')) + '</span><button class="a2-btn a3w" data-a="a3StLogin">' + esc(L('Sign in', 'Přihlásit se')) + '</button></div>' + diagRow() + (isDesk ? '</main>' : '</div>');
    const today = '<div class="a2-glass a2-tint a2-in a3gtoday" style="--i:2;--c:' + STC + '"><div><span class="a2-lab">' + esc(L('Today', 'Dnes')) + '</span><div class="a3gnum"><b class="a2-d a2-num">' + f.left + '</b><span class="a2-t2">/ ' + f.daily + ' ' + esc(L('videos', 'videí')) + '</span></div><span class="a3pips">' + Array.from({ length: f.daily }, (_, k) => '<i class="' + (k < f.used ? 'u' : '') + '"></i>').join('') + '</span></div>' + (isDesk ? '' : '<button class="a2-btn a3w" data-a="stNew" data-id="studio">' + ico('plus', 16, 2.4) + esc(L('New video', 'Nové video')) + '</button>') + '</div>';
    const rowsA = f.ups.map(u => upRow(u)).concat(f.busy.map(j => liveRow(j)), f.ready.map(j => st.rowJob(j)));
    const lift = '<div class="a2-glass a2-in a3glift" style="--i:3"><span class="a2-lab a3tlh">' + esc(L('On the lift', 'Na zvedáku')) + (rowsA.length ? ' · ' + rowsA.length : '') + '</span>' + (rowsA.length ? rowsA.join('') : '<div class="a3gempty"><span class="a3gjack"></span><span class="a2-t2">' + esc(L('Empty', 'Prázdno')) + '</span></div>') + '</div>';
    const T2 = [['cut', L('Cut', 'Střih'), L('ready', 'připraveno'), 1, '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 8 20 18M8.5 16 20 6"/>'],
      ['cap', L('Captions', 'Titulky'), L('in every cut', 'v každém střihu'), 1, '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 15h4M13 15h4M7 11h10"/>'],
      ['cover', L('Cover', 'Cover'), L('soon', 'brzy'), 0, '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 15 3-3 5 5"/><circle cx="15" cy="8" r="1.5"/>'],
      ['music', L('Music', 'Hudba'), L('soon', 'brzy'), 0, '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>']];
    const shelf = '<div class="a2-glass a2-in a3gshelf" style="--i:4"><span class="a2-lab a3tlh">' + esc(L('Tools', 'Nástroje')) + '</span><div class="a3gtools">' + T2.map(x => x[3] ? '<button class="a3gtool on" data-a="stNew" data-id="studio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">' + x[4] + '</svg><span><b>' + esc(x[1]) + '</b></span></button>' : '<div class="a3gtool soon" aria-disabled="true"><span><small>' + esc(L('Soon', 'Brzy')) + '</small><b>' + esc(x[1]) + '</b></span></div>').join('') + '</div></div>';
    const rowsB = f.jobs.filter(j => !st.busy(j) && j.status !== 'ready').slice(0, 12).map(j => st.rowJob(j));
    const done = !rowsB.length ? '' : '<div class="a2-glass a2-in a3stl" style="--i:5"><span class="a2-lab a3tlh">' + esc(L('Finished', 'Hotové')) + (rowsB.length ? ' · ' + rowsB.length : '') + '</span>' + (rowsB.length ? rowsB.join('') : '<span class="a2-t3 a3ste">' + esc(L('Your finished cuts park here.', 'Hotové střihy tu zaparkují.')) + '</span>') + '</div>';
    const tip = DIAG.srv === false || DIAG.acc === false ? diagRow() : '';
    if (isDesk) return '<main class="dmain a2 a3d a3dcard scr2 a3dstudio">' + head + '<div class="a3gg"><div class="a3col">' + lift + shelf + '</div><div class="a3col">' + today + done + tip + '</div></div></main>';
    return '<div class="a2 a3p a3studio">' + head + today + lift + shelf + done + tip + '</div>';
  }

  function openStudio() {
    S.studioOn = true; save();
    const st = STD(); if (st && st.signed()) { st.load(true); studioDiag(true); }
    if (desk()) { V.stv = true; V.card = null; V.kd = false; V.tab = 'spaces'; deskRender(true); return; }
    const el = $('#s-card'); V.studio = true; el.classList.add('a3s'); el.classList.remove('out'); el.classList.add('on'); el.scrollTop = 0;
    $('#nav').classList.add('away'); document.body.classList.add('navless'); el.innerHTML = studioPage(false); if (window.FX) FX.enter(el);
  }
  function closeStudio() {
    if (desk()) { V.stv = false; deskRender(true); return; }
    V.studio = false; const el = $('#s-card'); $('#nav').classList.remove('away'); document.body.classList.remove('navless');
    el.classList.add('out'); setTimeout(() => { if (!V.studio && !V.card && !V.keiro) { el.classList.remove('on', 'out'); el.innerHTML = ''; } }, 330); RENDER[V.tab]();
  }
  ACT.a3StOpen = () => openStudio();
  ACT.a3StClose = () => closeStudio();
  ACT.a3StLogin = () => { if (V.studio) closeStudio(); openSettings(); ACT.accPage && ACT.accPage(); };
  window.A3S = { paint: () => {
    try {
      if (V.studio && !desk()) { const el = $('#s-card'); const y = el.scrollTop; el.innerHTML = studioPage(false); el.firstElementChild && el.firstElementChild.classList.add('a3noanim'); el.scrollTop = y; }
      else if (V.stv && desk()) { const m = $('#desk main.a3dstudio'); if (m) { const y = m.scrollTop; m.outerHTML = studioPage(true); const m2 = $('#desk main.a3dstudio'); if (m2) { m2.classList.add('a3noanim'); m2.scrollTop = y; } } }
      else if ((V.tab === 'spaces' || V.tab === 'home') && !V.card && !V.keiro && !V.kd && S.studioOn && !(typeof SH !== 'undefined' && SH.open)) { if (desk()) deskRender(); else RENDER[V.tab](); }
    } catch (e) {}
  }, open: openStudio };

  /* ================= the computer's top bar: aurora · pill nav with the orb · Ask or add · settings ================= */
  function topDesk() {
    const cur = V.card || V.keiro || V.kd || V.stv ? 'spaces' : V.tab;
    const a = k => '<button class="a2-chip' + (cur === k ? ' on' : '') + '" data-a="tab" data-k="' + k + '">' + esc(t(k)) + '</button>';
    const left = V.stv ? '<div class="a3logo a3back"><button class="a2-icon" data-a="a3StClose" aria-label="' + esc(L('Back', 'Zpět')) + '">' + ico('back', 20, 2.2) + '</button><span class="a2-t2">Spaces</span></div>' : V.kd ? '<div class="a3logo a3back"><button class="a2-icon" data-a="krClose" aria-label="' + esc(L('Back', 'Zpět')) + '">' + ico('back', 20, 2.2) + '</button><span class="a2-t2">Spaces</span></div>' : V.card && cardById(V.card) ? '<div class="a3logo a3back"><button class="a2-icon" data-a="closeCard" aria-label="' + esc(L('Back', 'Zpět')) + '">' + ico('back', 20, 2.2) + '</button><span class="a2-t2">Spaces</span></div>' : '<button class="a3logo" data-a="tab" data-k="home"><b class="a2-d">aurora</b></button>';
    const cardR = V.card && cardById(V.card); const shR = cardR && cardR.sh;
    return '<header class="dtop a2 a3top a2-in" style="--i:0">' + left
      + '<nav class="a2-glass l2 a3pill dnav" aria-label="' + esc(L('Sections', 'Sekce')) + '">' + a('home') + a('spaces') + a('board') + a('plan') + '</nav>'
      + '<div class="a3tr">' + right() + '</div></header>';
    function right() {
      const set = '<button class="a2-icon" data-a="openSettings" aria-label="' + esc(t('settings')) + '"><span id="syncDot" class="sdot"></span>' + SUN + '</button>';
      if (cardR) return '<button class="a2-chip' + (V.blkEdit === V.card ? ' on' : '') + '" style="height:44px" data-a="a3Blocks">' + (V.blkEdit === V.card ? esc(L('Done', 'Hotovo')) : ico('board', 16, 2) + esc(L('Edit', 'Upravit'))) + '</button>' + (shR ? '<button class="a2-chip" style="height:44px" data-a="spInvite" data-id="' + cardR.id + '">' + ico('users', 16, 2) + esc(L('Invite', 'Pozvat')) + '</button>' : '') + '<button class="a2-icon" data-a="editCard" aria-label="' + esc(t('editCard')) + '">' + ico('more', 20, 2) + '</button>';
      if (V.stv) return STD() && STD().signed() ? '<button class="a2-btn" data-a="stNew" data-id="studio">+ ' + esc(L('New video', 'Nové video')) + '</button>' : '';
      if (V.kd) { const kx = KX(); const n = kx ? kx.page(() => (kx.F().review || []).length) : 0; return '<button class="a2-btn" data-a="krReview"' + (n ? '' : ' disabled') + '>' + esc(L('Review ', 'Schválit ') + n) + '</button>'; }
      if (V.tab === 'board' && !V.card) return '<button class="a2-icon" data-a="boardSearch" aria-label="' + esc(t('search')) + '">' + ico(V.boardSearch ? 'x' : 'search', 19, 2) + '</button>' + set;
      if (V.tab === 'spaces') return '<button class="a2-btn" data-a="newCard">+ ' + esc(t('newCard')) + '</button>' + set;
      return '<button class="a2-chip a3ask" data-a="cmdk">' + esc(L('Ask or add…', 'Zeptej se nebo přidej…')) + (navigator.maxTouchPoints > 1 ? '' : ' <b>' + (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl ') + 'K</b>') + '</button>' + set;
    }
  }

  /* ---------------- the slider: drag the knob to the end = done ---------------- */
  function bindSliders(root) {
    (root || document).querySelectorAll('.a3sl:not([data-b])').forEach(sl => {
      sl.dataset.b = 1; const kn = sl.querySelector('.a3kn'); let x0 = null, dx = 0, max = 0;
      const end = ok => { sl.classList.remove('drag');
        if (ok) { kn.style.transition = 'transform .26s var(--out)'; kn.style.transform = 'translateX(' + max + 'px)'; sl.style.setProperty('--p', 1); sl.classList.add('ok'); haptic();
          const card = sl.closest('.a3today');
          setTimeout(() => { card && card.classList.add('leave'); }, 300);
          setTimeout(() => { const i = itemById(sl.dataset.id); if (i) { setDone(i, T(), true); V.a3enter = Date.now(); toast(esc(t('completed', i.t)), { label: t('undo'), fn: () => { setDone(i, T(), false); render(); } }); render(); } }, 560); }
        else { sl.classList.add('back'); kn.style.transition = 'transform .45s var(--spring)'; kn.style.transform = ''; sl.style.setProperty('--p', 0); setTimeout(() => { kn.style.transition = ''; sl.classList.remove('back'); }, 470); }
        x0 = null; };
      kn.addEventListener('pointerdown', e => { x0 = e.clientX; dx = 0; max = sl.clientWidth - kn.offsetWidth - 8; kn.setPointerCapture(e.pointerId); sl.classList.add('drag'); e.preventDefault(); });
      kn.addEventListener('pointermove', e => { if (x0 == null) return; dx = Math.max(0, Math.min(max, e.clientX - x0)); kn.style.transform = 'translateX(' + dx + 'px)'; sl.style.setProperty('--p', (dx / max).toFixed(3)); });
      kn.addEventListener('pointerup', () => { if (x0 == null) return; end(dx > max * .72); });
      kn.addEventListener('pointercancel', () => x0 != null && end(false));
      kn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { max = sl.clientWidth - kn.offsetWidth - 8; end(true); } }); kn.tabIndex = 0;
    });
  }

  /* ================= wiring ================= */
  const A3 = window.A3 = { ring, check, arc, cardVal, keiroCards, ideasList, ideaBg, ideaTitle, thumb, dayRow, dayList, weekPills, pHead, logo, SUN, TICK, L, plural, score, nowRow, bindSliders, topDesk, dLongX, fmtMin, cardName, groupRow };
  A3.pages = { homePhone, homeDesk, spacesPhone, spacesDesk };
  Object.assign(A3, { cardPhone, cardDesk, taskRow, addLine, bindAdd, statTile, whenTxt, srcOf, kf, klab, monthDone, nextOf, kickText, kick, keiroFacts, squares, segs, spaceList });

  /* the wallpaper of the canvas: living aurora blobs (Aurora · Dusk · Forest · Mono) */
  function wall() {
    const bg = document.getElementById('bg'); if (!bg) return;
    let w = document.getElementById('a3wall');
    if (!w) { w = document.createElement('div'); w.id = 'a3wall'; w.className = 'a2-wall'; w.setAttribute('aria-hidden', 'true'); w.innerHTML = '<i class="b1"></i><i class="b2"></i><i class="b4"></i><i class="b3"></i><i class="b5"></i><i class="grain"></i>'; bg.appendChild(w); }
    const k = S && S.a3wall || 'aurora'; w.dataset.k = k; document.body.classList.toggle('a3photo', k === 'photo' && !!(S && S.wallKey));
    document.body.classList.toggle('a3still', !!(S && S.a3still));
    w.style.setProperty('--grain', S && S.a3grain != null ? S.a3grain : .16);
  }
  A3.wall = wall;

  /* ================= AI orb · v2059: soft light that moves like a symbiont (liquid, reaches out, melts back) ================= */
  const ORB_PRE = [['aurora', 'Aurora', ['#ff3fd2', '#4d5cff', '#46e6ff']], ['sunset', L('Sunset', 'Západ'), ['#f2a541', '#e9557c', '#8b6cf0']], ['forest', L('Forest', 'Les'), ['#3ecf8e', '#1d7a8c', '#c8f2a0']], ['ice', L('Ice', 'Led'), ['#cfe9ff', '#7aa8ff', '#ffffff']], ['sym', L('Symbiote', 'Symbiont'), ['#0b0b10', '#3a3a48', '#f4f4f8']], ['fire', L('Fire', 'Oheň'), ['#ff2a2a', '#ff8a3d']]];
  const orbCols = () => (S && Array.isArray(S.orbCols) && S.orbCols.length ? S.orbCols : ORB_PRE[0][2]).slice(0, 3);
  window.A3ORB = () => orbPaint();
  function orbPaint() { const c = orbCols(); const R = document.documentElement.style; R.setProperty('--o1', c[0]); R.setProperty('--o2', c[1] || c[0]); R.setProperty('--o3', c[2] || c[1] || c[0]); }
  const SYM = { list: [], raf: 0, t0: performance.now() };
  function symMake(host) {
    if (host.querySelector('.symo')) return; host.classList.add('sym'); const uid2 = 'sg' + Math.random().toString(36).slice(2, 7);
    host.insertAdjacentHTML('beforeend', '<svg class="symo" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="' + uid2 + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--o1)"/><stop offset=".5" style="stop-color:var(--o2)"/><stop offset="1" style="stop-color:var(--o3)"/></linearGradient>'
      + '<filter id="' + uid2 + 'g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="3.6" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/><feGaussianBlur stdDeviation=".5"/></filter>'
      + '<radialGradient id="' + uid2 + 'h"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>'
      + '<g filter="url(#' + uid2 + 'g)" fill="url(#' + uid2 + ')"></g><circle class="symh" r="13" fill="url(#' + uid2 + 'h)"/></svg>');
    const svg = host.querySelector('.symo'), g = svg.querySelector('g'), NS = 'http://www.w3.org/2000/svg';
    const mk = r => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', r); g.appendChild(c); return c; };
    const o = { host, svg, grad: svg.querySelector('linearGradient'), hl: svg.querySelector('.symh'), main: mk(27), sats: [] };
    for (let i = 0; i < 6; i++) o.sats.push({ a: Math.random() * 6.28, w: (.3 + Math.random() * .5) * (i % 2 ? 1 : -1), base: 9 + Math.random() * 8, amp: 4 + Math.random() * 12, f: .5 + Math.random() * 1.1, ph: Math.random() * 6.28, r: 7 + Math.random() * 5, x: 50, y: 50, el: mk(9) });
    SYM.list.push(o); if (!SYM.raf) SYM.raf = requestAnimationFrame(symTick);
  }
  function symTick(now) {
    SYM.raf = 0; SYM.list = SYM.list.filter(o => o.host.isConnected); if (!SYM.list.length) return;
    const off = document.body.classList.contains('a2-off') || document.hidden; const mv = { calm: .55, live: 1, wild: 1.8 }[(S && S.orbMove) || 'live'] || 1;
    const think = document.body.classList.contains('thinking') ? 2.3 : 1; const t = (now - SYM.t0) / 1000 * mv * (off ? 0 : 1);
    SYM.list.forEach(o => { const big = o.host.classList.contains('big'), sp = think * (big ? 1 : 1);
      const cx = 50 + Math.sin(t * .35) * 2, cy = 50 + Math.cos(t * .42) * 2, mr = 27 + Math.sin(t * 1.4 * sp) * 1.8 + Math.sin(t * .6) * 1.2;
      o.main.setAttribute('cx', cx); o.main.setAttribute('cy', cy); o.main.setAttribute('r', mr);
      o.sats.forEach(q => { q.a += q.w * .012 * mv * think * (off ? 0 : 1); const d = q.base + Math.max(0, Math.sin(t * q.f * sp + q.ph)) * q.amp * (big ? 1.35 : 1);
        const tx = cx + Math.cos(q.a) * d, ty = cy + Math.sin(q.a) * d; q.x += (tx - q.x) * .18; q.y += (ty - q.y) * .18;
        q.el.setAttribute('cx', q.x); q.el.setAttribute('cy', q.y); q.el.setAttribute('r', q.r * (1 + .22 * Math.sin(t * q.f * 1.7 + q.ph))); });
      o.hl.setAttribute('cx', cx - 9 + Math.sin(t * .8) * 3); o.hl.setAttribute('cy', cy - 11 + Math.cos(t * .7) * 3);
      o.grad.setAttribute('gradientTransform', 'rotate(' + (t * 28 % 360) + ' .5 .5)'); });
    SYM.raf = requestAnimationFrame(symTick);
  }
  function symScan() { document.querySelectorAll('.orbv').forEach(symMake); }
  ACT.a3OrbPre = el => { const p = ORB_PRE.find(x => x[0] === el.dataset.k); if (!p) return; S.orbCols = p[2].slice(); save(); orbPaint(); renderSettings(); };
  ACT.a3OrbN = () => { const c = orbCols().slice(); if (c.length > 1) c.pop(); else c.push('#4d5cff', '#46e6ff'); S.orbCols = c; save(); orbPaint(); renderSettings(); };
  ACT.a3OrbMove = el => { S.orbMove = el.dataset.k; save(); renderSettings(); };
  function orbPanel() {
    const c = orbCols(), mvk = (S && S.orbMove) || 'live';
    return '<div class="a2-well a3lw a3orbp"><div style="flex:1;min-width:0"><b>' + esc(L('AI orb', 'AI orb')) + '</b>'
      + '<div class="a3ocs">' + c.map((x, i) => '<label class="a3oc" style="--sw:' + x + '"><input type="color" value="' + x + '" data-oc="' + i + '" aria-label="' + esc(L('Colour ', 'Barva ') + (i + 1)) + '"><span></span></label>').join('') + '<button class="a2-icon a3ocn" data-a="a3OrbN" aria-label="' + esc(c.length > 1 ? L('One colour less', 'O barvu méně') : L('More colours', 'Víc barev')) + '">' + (c.length > 1 ? '−' : '+') + '</button><span class="orbv a3oprev"></span></div>'
      + '<div class="a3opre">' + ORB_PRE.map(p => '<button class="a2-chip" data-a="a3OrbPre" data-k="' + p[0] + '"><span class="a3odot" style="background:linear-gradient(135deg,' + p[2].join(',') + ')"></span>' + esc(p[1]) + '</button>').join('') + '</div>'
      + '<div class="a2-seg" style="margin-top:10px">' + [['calm', L('Calm', 'Klidný')], ['live', L('Alive', 'Živý')], ['wild', L('Wild', 'Divoký')]].map(([k, l]) => '<button class="' + (mvk === k ? 'on' : '') + '" data-a="a3OrbMove" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div></div></div>';
  }
  function bindOrbPanel(root) { (root || document).querySelectorAll('[data-oc]:not([data-b])').forEach(inp => { inp.dataset.b = 1; inp.addEventListener('input', () => { const c = orbCols().slice(); c[+inp.dataset.oc] = inp.value; S.orbCols = c; orbPaint(); inp.parentNode.style.setProperty('--sw', inp.value); }); inp.addEventListener('change', save); }); symScan(); }

  /* animate a page only when you arrive on it, never on a re-render of the same page */
  let NAV = 0, CNAV = 0;
  function settle(el, key) { if (!el) return; const same = el.dataset.a3k === key; el.classList.toggle('a3noanim', same); el.dataset.a3k = key; }
  const OLDG = { notif: 'notif', acc: 'acc', sync: 'acc', labsync: 'acc', keiro: 'tools' };
  function wrapOld(el) {
    const pg = V.settingsPage || 'main'; if (!(pg in OLDG) || !V.settingsOpen) return;
    if (!desk()) { el.classList.remove('a3s'); el.classList.add('a3old'); return; }
    if (el.querySelector(':scope > .a3dset')) return;
    const nodes = [...el.childNodes]; if (!nodes.length) return;
    el.classList.add('a3s', 'a3noanim'); el.classList.remove('a3old'); document.body.classList.add('a3setbig');
    el.innerHTML = settingsDesk(OLDG[pg]); const pn = el.querySelector('.a3oldp'); pn && pn.append(...nodes);
  }
  /* v2061 · header stays: back + actions float on top, the title folds into a small pill when you scroll */
  function heads(root) {
    if (desk()) return;
    (root || document).querySelectorAll('.a3p:not(.a3home) > .a3hd:not(.a3fh)').forEach(hd => {
      hd.classList.add('a3fh'); const p = hd.parentNode;
      if (!p.querySelector(':scope > .a3edge')) p.insertAdjacentHTML('afterbegin', '<div class="a3edge" aria-hidden="true"></div>');
      const own = hd.querySelector(':scope > b.a2-d'); if (own) { hd.classList.add('a3hown'); p.classList.add('a3pown'); return; } const nxt = p.querySelector(':scope > .a3cti b.a2-d, :scope > .a3cti .a3ctn b.a2-d');
      const txt = ((own || nxt || {}).textContent || '').trim(); if (!txt) return;
      const back = hd.querySelector('[data-a="closeCard"],[data-a="closeSettings"],[data-a="settingsBack"],[data-a="a3StClose"],[data-a="krClose"]');
      hd.insertAdjacentHTML('beforeend', '<span class="a3tpill' + (back ? ' bk' : '') + '" aria-hidden="true">' + esc(txt) + '</span>');
      const pill = hd.lastElementChild; const right = hd.querySelector(':scope > .a3hdr') || (hd.children.length > 2 ? hd.children[hd.children.length - 2] : null);
      requestAnimationFrame(() => { const rw = right && right !== pill && right !== back && !right.matches('b') ? right.offsetWidth : 0; pill.style.maxWidth = Math.max(80, hd.clientWidth - (back ? 56 : 0) - rw - 14) + 'px'; });
    });
  }
  document.addEventListener('scroll', e => { const s = e.target; if (!s || !s.classList || !s.classList.contains('scr')) return; const p = s.querySelector(':scope > .a3p'); if (!p) return; const y = s.scrollTop; p.classList.toggle('a3sc1', y > 4); p.classList.toggle('a3scd', y > 52); underFade(s, p); }, { capture: true, passive: true });
  /* Home stack: the page that leaves shrinks and fades a little, so a half-way swipe still reads as one stack */
  function stackFx(root) {
    const sc = root.querySelector('#hst'); if (!sc || sc._fx) return; sc._fx = 1;
    const go = () => { const h = sc.clientHeight + 12; [...sc.children].forEach((c, i) => { const d = (i * h - sc.scrollTop) / h; const a = Math.min(1, Math.abs(d)); c.style.transform = d < 0 ? 'scale(' + (1 - a * .08).toFixed(3) + ')' : ''; c.style.opacity = (1 - a * .55).toFixed(2); c.style.transformOrigin = '50% 100%'; }); };
    let r = 0; sc.addEventListener('scroll', () => { cancelAnimationFrame(r); r = requestAnimationFrame(go); }, { passive: true }); requestAnimationFrame(go);
  }
  /* photo stacks on the Board: they lean out a little, fan on press, and stay inside their own tile */
  function fan(el, o) {
    const G = window.gsap, a = el.querySelector('.s2'), b = el.querySelector('.s3'), f = el.querySelector('.s1'); if (!f) return;
    el.classList.toggle('fan', !!o);
    const P = o ? [[-4, 0, -3], [10, -4, 5], [20, -6, 10]] : [[0, 0, 0], [5, -4, 3], [10, -8, 6]];
    [[f, P[0]], [a, P[1]], [b, P[2]]].forEach(([x, p], i) => { if (!x) return; if (G && !RM) G.to(x, { xPercent: p[0], yPercent: p[1], rotation: p[2], duration: .45, ease: 'back.out(1.6)', delay: o ? i * .03 : 0, overwrite: true }); else x.style.transform = 'translate(' + p[0] + '%,' + p[1] + '%) rotate(' + p[2] + 'deg)'; });
  }
  document.addEventListener('pointerenter', e => { const s2 = e.target.closest && e.target.closest('.a3stk'); if (s2 && e.pointerType === 'mouse') fan(s2, true); }, true);
  document.addEventListener('pointerleave', e => { const s2 = e.target.closest && e.target.closest('.a3stk'); if (s2 && e.pointerType === 'mouse') fan(s2, false); }, true);
  document.addEventListener('pointerdown', e => { const s2 = e.target.closest && e.target.closest('.a3stk'); if (s2 && e.pointerType !== 'mouse') { fan(s2, true); setTimeout(() => fan(s2, false), 700); } }, true);
  function install() {
    orbPaint(); setTimeout(symScan, 300); try { new MutationObserver(() => { if (document.querySelector('.orbv:not(.sym)')) symScan(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    /* photo wallpaper: the computer no longer forces a heavy blur; old heavy blur values settle on "Soft" once */
    try { deskAutoBlur = function () { return false; }; } catch (e) {}
    if (S && !S.a3blur) { if (S.blur == null || S.blur > 24) S.blur = 12; S.a3blur = 1; }
    /* own photo: after a new photo lands, switch the canvas wallpaper off at once */
    try { const _al = applyLook; applyLook = function () { const r = _al.apply(this, arguments); try { if (S && S.wall === 'photo' && S.wallKey) S.a3wall = 'photo'; wall(); } catch (e) {} return r; }; } catch (e) {}
    /* old settings pages fill in late (Automation loads first): wrap them whenever they land */
    try { const se = $('#s-settings'); se && new MutationObserver(() => { if (V.settingsOpen && (V.settingsPage || 'main') in OLDG) wrapOld(se); }).observe(se, { childList: true }); } catch (e) {}
    try { const _cc = closeCard; closeCard = function () { V.blkEdit = null; return _cc.apply(this, arguments); }; } catch (e) {}
    document.body.classList.add('a3', 'a3boot'); setTimeout(() => document.body.classList.remove('a3boot'), 1400);
    let hq = 0; try { new MutationObserver(() => { if (hq) return; hq = requestAnimationFrame(() => { hq = 0; heads(); }); }).observe($('#app') || document.body, { childList: true, subtree: true }); } catch (e) {}
    /* phone pages */
    const _home = renderHome;
    renderHome = function () {
      if (desk()) return _home.apply(this, arguments);
      const el = $('#s-home'); el.classList.add('a3s'); settle(el, 'home' + NAV); el.innerHTML = homePhone(); bindSliders(el); try { h19Mount(el, true); } catch (e) {} stackFx(el); auraFromCards && auraFromCards(null);
    };
    RENDER.home = renderHome;
    const _sp = renderSpaces;
    renderSpaces = function () {
      if (desk()) return _sp.apply(this, arguments);
      const el = $('#s-spaces'); el.classList.add('a3s');
      /* the wallet is scroll-driven: never rebuild it under a finger, and keep the scroll position through a rebuild */
      if (el._walBusy && Date.now() - el._walBusy < 900) { clearTimeout(el._walLater); el._walLater = setTimeout(() => { if (V.tab === 'spaces' || $('#s-spaces.on')) renderSpaces(); }, 950); return; }
      const keep = el.scrollTop, oldH = el.querySelector('#a3wal') && el.querySelector('#a3wal').style.height; const html = spacesPhone();
      if (el._walHtml === html && el.querySelector('#a3wal')) return; el._walHtml = html;
      settle(el, 'spaces' + NAV); el.innerHTML = html; if (oldH) el.querySelector('#a3wal') && (el.querySelector('#a3wal').style.height = oldH); bindWallet(el); el.scrollTop = keep;
      if (!el._walL) { el._walL = 1; const busy = () => { el._walBusy = Date.now(); }; el.addEventListener('scroll', busy, { passive: true }); el.addEventListener('touchstart', busy, { passive: true }); el.addEventListener('touchmove', busy, { passive: true }); el.addEventListener('touchstart', () => { el._tch = 1; }, { passive: true }); const up = () => { el._tch = 0; el.dispatchEvent(new Event('scroll')); }; el.addEventListener('touchend', up, { passive: true }); el.addEventListener('touchcancel', up, { passive: true }); } auraFromCards && auraFromCards(null);
    };
    RENDER.spaces = renderSpaces;
    const _rb = renderBoard;
    renderBoard = function () {
      if (desk()) return _rb.apply(this, arguments);
      const el = $('#s-board'); el.classList.add('a3s'); settle(el, 'board' + NAV); el.innerHTML = boardPhone(); bindBoard(el, false); auraFromCards && auraFromCards(null);
    };
    RENDER.board = renderBoard;
    const _rp = renderPlan;
    renderPlan = function () {
      const el = $('#s-plan');
      if (desk() || V.planMode !== 'list') { el && el.classList.remove('a3s'); return _rp.apply(this, arguments); }
      el.classList.add('a3s'); settle(el, 'plan' + NAV); el.innerHTML = planPhone(); auraFromCards && auraFromCards(null);
    };
    RENDER.plan = renderPlan;
    const _rs = renderSettings;
    renderSettings = function () {
      const el = $('#s-settings'); const pg = V.settingsPage || 'main';
      document.body.classList.toggle('a3setbig', !!V.settingsOpen && desk() && (pg === 'main' || pg === 'look'));
      if (pg !== 'main' && pg !== 'look' && pg !== 'a3lab') { const r = _rs.apply(this, arguments); wrapOld(el); return r; }
      el.classList.remove('a3old'); settle(el, 's:' + pg + (V.a3set || '') + NAV);
      if (pg === 'look' && desk()) { V.settingsPage = 'main'; V.a3set = 'look'; }
      el.classList.add('a3s'); el.innerHTML = pg === 'a3lab' ? labPage() : pg === 'look' && !desk() ? lookPhone() : desk() ? settingsDesk() : settingsPhone(); bindSettings(el); bindOrbPanel(el);
    };
    const _cs = closeSettings; closeSettings = function () { document.body.classList.remove('a3setbig'); return _cs.apply(this, arguments); };
    const _rc = renderCard;
    renderCard = function () {
      const r = _rc.apply(this, arguments);
      if (desk()) return r;
      const c = V.card && cardById(V.card); const el = $('#s-card'); if (!c || !el) { el && el.classList.remove('a3s'); return r; }
      const keep = [...el.querySelectorAll('.srcp, .stud')];
      el.classList.add('a3s'); settle(el, 'c:' + c.id + CNAV); el.innerHTML = cardPhone(c);
      const slot = el.querySelector('.a3slot'); keep.forEach(p => slot ? slot.before(p) : null); adoptPanels(el); bindAdd(el); bindNotes(el); bindBlkDrag(el); bindEditList(el); masonry(el);
      return r;
    };
    /* computer pages */
    deskTop = topDesk;
    deskHome = homeDesk;
    deskSpaces = function () { return V.stv ? studioPage(true) : spacesDesk(); };
    deskBoard = boardDesk;
    const _dp = deskPlan;
    if (!DESK.mode || DESK.mode === 'week') DESK.mode = 'list';
    deskPlan = function () { if (DESK.mode === 'list') return planDesk(); const h = _dp.apply(this, arguments); return h.replace(/<div class="seg frost"><button class="[^"]*" data-a="dPlanMode" data-k="week">[\s\S]*?<\/div>/, planSeg(DESK.mode, 'a3PMode').replace('a2-seg', 'a2-seg a3oldseg')); };
    const _dc = deskCard, _dcm = deskCardMount;
    deskCard = function () { const c = cardById(V.card); return c ? cardDesk(c) : _dc(); };
    deskCardMount = function () { const c = cardById(V.card); if (c) return; return _dcm(); };
    const _dr = deskRender;
    deskRender = function (a) { _dr.apply(this, arguments); const d = $('#desk'); if (d && DESK.on) { d.classList.add('a3desk'); const dk = [V.card || '', V.tab, V.kd || '', V.stv ? 's' : '', DESK.mode, NAV, CNAV].join('|'); const mn = d.querySelector('main'); mn && mn.classList.toggle('a3noanim', d.dataset.a3k === dk); d.dataset.a3k = dk; const hd = d.querySelector('.a3top'); hd && d.dataset.seen && hd.classList.add('a3noanim'); d.dataset.seen = 1; bindNotes(d); bindBlkDrag(d); if (V.card) masonry(d); bindSliders(d); bindAdd(d); if (V.tab === 'board' && !V.card) bindBoard(d, true); if (V.card) adoptPanels(d.querySelector('#dCardMain')); } };
    const _go = go; go = function (tab) { if (tab !== V.tab) NAV++; if (V.studio && !desk()) { V.studio = false; $('#nav').classList.remove('away'); document.body.classList.remove('navless'); const el = $('#s-card'); if (!V.card) { el.classList.remove('on', 'out'); el.innerHTML = ''; } } V.stv = false; return _go.apply(this, arguments); };
    const _oc = openCard; openCard = function () { CNAV++; V.blkEdit = null; V.stv = false; if (V.studio) { V.studio = false; } return _oc.apply(this, arguments); };
    if (ACT.stNew && !ACT.stNew._a3) { const _sn = ACT.stNew; ACT.stNew = function (el) { S.studioOn = true; save(); return _sn.apply(this, arguments); }; ACT.stNew._a3 = 1; }
    setTimeout(() => { const st = STD(); if (st && S && S.studioOn && st.signed()) st.load(true); }, 1500);
    wall();
    if (S && S.onboarded) { if (desk()) deskRender(); else render(); }
  }
  /* v2069 · the top area is its own zone: whatever scrolls up to it fades out before it reaches the title (nothing is drawn over the page) */
  function underFade(s, p) {
    if (desk() || s._uf) return; s._uf = requestAnimationFrame(() => {
      s._uf = 0; const hd = p.querySelector(':scope > .a3hd'); if (!hd) return;
      const on = s.scrollTop > 4, cut = hd.getBoundingClientRect().bottom + 2;
      for (const k of p.children) {
        if (k === hd || k.classList.contains('a3edge') || k.classList.contains('a3wal')) continue;
        const r = on ? k.getBoundingClientRect() : null;
        if (r && r.height && r.top < cut && r.bottom > 0) { const n = Math.round(cut - r.top), m = 'linear-gradient(to bottom, transparent ' + n + 'px, #000 ' + (n + 18) + 'px)'; k.style.webkitMaskImage = m; k.style.maskImage = m; k._ufm = 1; }
        else if (k._ufm) { k.style.webkitMaskImage = ''; k.style.maskImage = ''; k._ufm = 0; }
      }
    });
  }
  /* v2069 · motion engine: tabs and card pages move on GSAP; the top area never takes part */
  const TABS = ['home', 'spaces', 'board', 'plan'];
  function kids(scr) { const p = scr && scr.querySelector(':scope > .a3p'); if (!p) return []; return [...p.children].filter(k => !k.matches('.a3hd,.a3edge,.a3tpill') && k.offsetHeight && k.getBoundingClientRect().top < innerHeight); }
  function motion() {
    const G = window.gsap; if (!G || RM || motion.on) return; motion.on = 1; document.body.classList.add('a3g');
    const go0 = window.go;
    window.go = function (tab) {
      const from = V.tab, was = !!V.card || !!V.settingsOpen; go0(tab);
      if (desk() || was || from === tab) return;
      const d = Math.sign(TABS.indexOf(tab) - TABS.indexOf(from)) || 1, ks = kids(document.getElementById('s-' + tab)).slice(0, 8); if (!ks.length) return;
      G.killTweensOf(ks); G.fromTo(ks, { x: 26 * d, opacity: 0 }, { x: 0, opacity: 1, duration: .42, ease: 'power3.out', stagger: .035, overwrite: true, clearProps: 'transform,opacity' });
    };
    const oc0 = window.openCard;
    window.openCard = function (id) {
      oc0(id); if (desk()) return;
      const ks = kids(document.getElementById('s-card')).slice(0, 8); if (!ks.length) return;
      G.fromTo(ks, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'power3.out', stagger: .045, delay: .08, overwrite: true, clearProps: 'transform,opacity' });
    };
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(motion, 50));
  A3.install = install;
  document.addEventListener('DOMContentLoaded', () => setTimeout(install, 0));
})();
