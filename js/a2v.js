/* Aurora 2 · v2052 · the app drawn from the "Aurora 2 · před a po" canvas.
   The phone screens are rebuilt from the canvas markup (aurora2 classes: glass, tint, lab, display type, wells,
   rings, checks, the orb). Data and actions stay the app's own (data-a → ACT). Old renderers still run first,
   so every hook (Lab, Keiro, sources, Studio) keeps working; on the phone their output is replaced by the canvas
   layout, and the few nodes the hooks add are carried over. Loaded last. */
(function () {
  const cs = () => (typeof lang === 'function' ? lang() : 'en') === 'cs';
  const L = (en, cz) => cs() ? cz : en;
  const desk = () => typeof DESK !== 'undefined' && DESK.on;
  const level = () => (typeof S !== 'undefined' && S && S.a2motion) || 'full';

  /* ---------- icons, drawn as on the canvas ---------- */
  const sv = (w, body, fill) => '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" ' + (fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"') + ' aria-hidden="true">' + body + '</svg>';
  const I = window.A2I = {
    gear: sv(18, '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'),
    plus: sv(20, '<path d="M12 5v14M5 12h14"/>'),
    back: sv(20, '<path d="M15 5l-7 7 7 7"/>'),
    more: sv(20, '<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>', true),
    search: sv(20, '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    home: sv(22, '<path d="M4 10.5 12 4l8 6.5V20H15v-6H9v6H4z"/>'),
    spaces: sv(22, '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>'),
    board: sv(22, '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
    plan: sv(22, '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
    play: sv(14, '<path d="M8 5v14l11-7z"/>', true),
    tick: c => '<svg viewBox="0 0 30 30" aria-hidden="true"><path d="M9 15.5l4 4 8-9" fill="none" stroke="' + (c || '#10221a') + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    users: sv(16, '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.6.2 4.4 1.8 5 4.8"/>')
  };
  /* display size for long names, so they never break the line */
  const FS = window.A2FS = (s, base) => { const n = String(s || '').length; return n <= 8 ? base : n <= 11 ? Math.round(base * .82) : n <= 15 ? Math.round(base * .66) : Math.round(base * .54); };
  /* a number that counts up when the page arrives */
  const N = window.A2N = (n, size, extra) => Number.isInteger(+n) && +n >= 0 && +n < 100000 ? '<b class="a2-d a2-num a2-count" style="--to:' + (+n) + ';font-size:' + size + 'px' + (extra || '') + '"></b>' : '<b class="a2-d a2-num" style="font-size:' + size + 'px' + (extra || '') + '">' + esc(String(n)) + '</b>';
  /* the ring: track + progress, drawn in */
  function ring(px, frac, c, sw, glow, inner) {
    const r = px === 46 || px === 34 ? 16 : 23, vb = r === 16 ? 40 : 56, cx = vb / 2;
    const off = Math.round(100 - Math.max(0, Math.min(1, frac || 0)) * 100);
    return '<div class="v-ring" style="width:' + px + 'px;height:' + px + 'px"><svg class="a2-ring" width="' + px + '" height="' + px + '" viewBox="0 0 ' + vb + ' ' + vb + '" aria-hidden="true"><circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="' + sw + '"/>'
      + (frac > 0 ? '<circle class="p" cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + c + '" stroke-width="' + sw + '" pathLength="100" transform="rotate(-90 ' + cx + ' ' + cx + ')" style="--off:' + off + (glow ? ';filter:drop-shadow(0 0 6px ' + c + 'b3)' : '') + '"/>' : '') + '</svg>' + (inner != null ? '<b class="a2-num v-rin">' + inner + '</b>' : '') + '</div>';
  }
  const lab = (c, txt, extra) => '<span class="a2-lab v-kick"' + (extra || '') + '><span class="a2-dot" style="--c:' + c + '"></span>' + esc(txt) + '</span>';
  const WD7 = () => cs() ? ['P', 'Ú', 'S', 'Č', 'P', 'S', 'N'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const isLab = () => !!(window.AUR_NS && /lab/i.test(String(window.AUR_NS)));

  /* ---------- the living wallpaper, the nav with the orb in the middle ---------- */
  function wall() {
    const bg = document.getElementById('bg'); if (!bg || bg.querySelector('.a2-wall')) return;
    bg.insertAdjacentHTML('beforeend', '<div class="a2-wall"><i class="b1"></i><i class="b2"></i><i class="b4"></i><i class="b3"></i><i class="b5"></i><i class="grain"></i></div>');
  }
  function nav() {
    const bar = document.querySelector('#nav .bar'), plus = document.getElementById('plusBtn'); if (!bar || !plus) return;
    const ic = { home: I.home, spaces: I.spaces, board: I.board, plan: I.plan };
    bar.querySelectorAll('.tab').forEach(b => { const k = b.dataset.k; if (ic[k] && !b.dataset.v) { b.dataset.v = '1'; const sp = b.querySelector('span'); b.innerHTML = ic[k] + (sp ? sp.outerHTML : ''); } });
    const sp = bar.querySelector('.tab[data-k="spaces"]'); if (sp && plus.parentNode !== bar) sp.after(plus);
    bar.classList.add('a2-glass', 'l2');
    /* + and the AI orb are two things again: + in the bar adds straight away, the orb floats on its own (tap = AI menu, hold = drop it on something) */
    fixPlus();
    const f = document.getElementById('orbFab'); if (f) f.classList.add('v-ai');
  }

  /* the orb script dresses #plusBtn as the orb; here it stays a plain + that adds straight away */
  function fixPlus() {
    const plus = document.getElementById('plusBtn'); if (!plus) return;
    if (plus.dataset.v2 && !plus.classList.contains('aorb') && plus.querySelector('.v-pi')) return;
    const n = plus.cloneNode(false); n.className = 'plus press v-plusb'; n.dataset.v2 = '1'; n.removeAttribute('style');
    n.innerHTML = '<span class="v-pi">' + sv(26, '<path d="M12 5v14M5 12h14"/>').replace('stroke-width="1.9"', 'stroke-width="2.4"') + '</span><span class="orbv" hidden></span>';
    n.setAttribute('aria-label', t('addIt'));
    n.addEventListener('click', e => { e.stopPropagation(); const ctx = {}; if (V.tab === 'board') ctx.mode = 'note'; if (V.tab === 'plan' && V.planMode === 'list') ctx.date = V.planDay; if (V.card) ctx.card = V.card; openAdd(ctx); });
    plus.replaceWith(n);
  }
  /* ---------- motion: Full / Calm / Off, and only on arrival ---------- */
  const _animate = Element.prototype.animate;
  Element.prototype.animate = function (k, o) { if (level() === 'off') { o = typeof o === 'number' ? 1 : Object.assign({}, o || {}, { duration: 1, delay: 0 }); } return _animate.call(this, k, o); };
  function applyMotion() { const b = document.body; if (!b) return; b.classList.toggle('a2-calm', level() === 'calm'); b.classList.toggle('a2-off', level() === 'off'); b.classList.toggle('wallphoto', typeof S !== 'undefined' && !!S && S.wall === 'photo'); }
  const seen = {};
  /* a page animates in when it is new (another tab, another card); re-renders after a tap stay still */
  function arrive(el, key) {
    const k = key + '|' + (seen.n || 0); const first = el._a2k !== key;
    el._a2k = key; el.classList.toggle('v-still', !first || level() !== 'full');
    if (first && level() === 'full') { el.classList.remove('v-go'); void el.offsetWidth; el.classList.add('v-go'); clearTimeout(el._a2t); el._a2t = setTimeout(() => { el.classList.add('v-still'); el.classList.remove('v-go'); }, 2600); }
    return k;
  }

  /* ================= HOME ================= */
  function arcHTML(M) {
    const p = m => Math.max(0, Math.min(100, (m - 360) / 1080 * 100));
    const A = 'M20 168 A150 150 0 0 1 320 168';
    let s = '<svg class="v-arc" viewBox="0 0 340 178" aria-hidden="true"><path d="' + A + '" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/>';
    const now = p(M.nm);
    if (now > 0) s += '<path d="' + A + '" fill="none" stroke="rgba(244,236,220,.85)" stroke-width="3" pathLength="100" stroke-dasharray="' + now.toFixed(1) + ' 100" stroke-linecap="round"/>';
    M.arcs.forEach((a, k) => { const a1 = p(a.s), a2 = Math.max(a1 + 1.2, p(Math.min(1440, a.e))); s += '<path class="v-arci" data-a="openItem" data-id="' + a.id + '" d="' + A + '" fill="none" stroke="' + a.c + '" stroke-opacity="' + (a.st === 'past' || a.st === 'done' ? .5 : 1) + '" stroke-width="7" pathLength="100" stroke-dasharray="' + (a2 - a1).toFixed(1) + ' 100" stroke-dashoffset="' + (-a1).toFixed(1) + '" stroke-linecap="round"' + (a.st === 'next' ? ' style="filter:drop-shadow(0 0 6px ' + a.c + 'b3)"' : '') + '/>'; });
    if (M.nm >= 360 && M.nm <= 1440) { const ang = Math.PI - now / 100 * Math.PI, x = 170 + 150 * Math.cos(ang), y = 168 - 150 * Math.sin(ang); s += '<circle class="v-nowd" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7" fill="#f4ecdc"/>'; }
    return s + '</svg>';
  }
  function centerOf(M) {
    const nx = M.nextAny; const card = nx && nx.card && cardById(nx.card) ? cardById(nx.card) : null;
    const chip = nx ? [nx.time || '', card ? card.name : ''].filter(Boolean).join(' · ') : '';
    if (nx && nx.time) {
      const s = tmin(nx.time), e = s + (nx.dur || 45);
      if (s <= M.nm && M.nm < e) return { k: L('Now · ', 'Teď · ') + fmtDur(e - M.nm) + L(' left', ''), t: shortT(nx.t), chip, c: itemColor(nx) };
      if (e <= M.nm) return { k: L('Still open · was ', 'Ještě nehotové · bylo ') + nx.time, t: shortT(nx.t), chip: card ? card.name : '', c: itemColor(nx) };
      return { k: L('Next · ', 'Další · ') + (s - M.nm < 600 ? fmtDur(s - M.nm).replace(/^0:/, '') + ' min' : L('at ', 'v ') + nx.time), t: shortT(nx.t), chip, c: itemColor(nx) };
    }
    if (nx) return { k: L('Next · any time', 'Další · kdykoli'), t: shortT(nx.t), chip: card ? card.name : '', c: itemColor(nx) };
    if (M.list.length) return { k: '', t: L('All done', 'Hotovo'), chip: M.doneN + ' / ' + M.list.length + ' ✓', c: '#3fc483' };
    return { k: '', t: L('Free day', 'Volný den'), chip: '', c: '#93acb8' };
  }
  function homeTiles() {
    const out = [];
    const kn = window.KR && KR.cardList && KR.statsOf ? KR.cardList() : [];
    kn.slice(0, 2).forEach(k => { const st = KR.statsOf(k.name === 'Keiro' ? null : k.name); if (!st) return; out.push({ a: 'krOpen', k: k.name === 'Keiro' ? '' : k.name, c: st.color || k.color, name: st.name, frac: st.outOf ? st.out / st.outOf : (st.review ? .6 : 1), n: st.review }); });
    const d = T();
    const score = c => (itemsOn(d).some(i => i.card === c.id && !isDone(i, d)) ? 100 : 0) + (c.type === 'habit' ? 20 + streakOf(c.id) : 0) + (c.deadline ? Math.max(0, 30 - daysBetween(d, c.deadline)) : 0);
    S.cards.slice().sort((a, b) => score(b) - score(a)).slice(0, 4 - out.length).forEach(c => {
      if (c.type === 'habit') { const n = habitWeek(c.id).filter(Boolean).length, g = goalOf(c); out.push({ id: c.id, c: c.color, name: c.name, frac: n / g, v: n + '/' + g }); }
      else if (c.type === 'month') { const ms = monthStats(c, d); out.push({ id: c.id, c: c.color, name: c.name, frac: ms.total ? ms.done / ms.total : 0, v: ms.done + '/' + ms.total }); }
      else { const ps = projectStats(c.id); out.push({ id: c.id, c: c.color, name: c.name, frac: ps.total ? ps.done / ps.total : 0, v: c.deadline ? Math.max(0, daysBetween(d, c.deadline)) + 'd' : String(ps.open) }); }
    });
    return out;
  }
  function tileHTML(o, i) {
    const inner = o.n != null ? '<b class="a2-num a2-count" style="--to:' + o.n + ';font-size:14px"></b>' : esc(o.v);
    return '<button class="a2-glass a2-tint a2-in v-ht press" style="--i:' + (4 + i) + ';--c:' + o.c + '" ' + (o.a ? 'data-a="krOpen" data-k="' + esc(o.k) + '"' : 'data-a="openCard" data-id="' + o.id + '"') + '>'
      + ring(46, o.frac, o.c, 4, false, o.n != null ? inner : '<span style="font-size:' + (String(o.v).length > 4 ? 10.5 : 12) + 'px">' + inner + '</span>') + '<span class="v-htn">' + esc(o.name) + '</span></button>';
  }
  function nowRow() {
    const kn = window.KR && KR.now ? KR.now() : null;
    if (kn && (kn.urgent || kn.n)) return { c: kn.red || kn.kind === 'send' ? '#ee5a85' : '#a983f7', k: kn.s, t: kn.t, btn: kn.kind === 'send' ? L('Send', 'Odeslat') : kn.kind === 'off' ? L('Fix', 'Opravit') : L('Review', 'Schválit') + (kn.n ? ' ' + kn.n : ''), act: kn.act, pulse: !!kn.urgent };
    const ns = typeof homeNotes === 'function' ? homeNotes() : [];
    const n = ns.find(x => x.id !== 'keiro');
    if (n) return { c: n.c || '#a983f7', k: n.s, t: n.t, btn: n.btn, act: n.act, x: n.x };
    const at = typeof accTip === 'function' ? accTip() : null;
    if (at) return { c: '#5fd0cf', k: L('Phone and computer', 'Telefon a počítač'), t: L('Create your account', 'Vytvoř si účet'), btn: L('Create', 'Vytvořit'), act: 'accTipGo', x: 'accTipX' };
    return null;
  }
  function ideas() {
    const ms = S.moments.filter(m => !(m.planned && itemById(m.planned)));
    const wk = addD(T(), -7), fresh = ms.filter(m => (m.d || '') >= wk);
    const show = fresh.length ? fresh : ms; if (!show.length) return { n: 0, th: [] };
    return { n: show.length, fresh: !!fresh.length, th: show.slice().sort((a, b) => (b.d || '').localeCompare(a.d || '')).slice(0, 3) };
  }
  function thumbBg(m) {
    const u = typeof momThumb === 'function' ? momThumb(m) : (m.thumb ? mediaNow(m.thumb) : m.img ? mediaNow(m.img) : '');
    if (u) return 'background:center/cover url(' + u + ')';
    if (m.kind === 'note') return 'background:#f1e9da';
    return 'background:linear-gradient(160deg,' + cardColor(m.card) + '88,#0e1b2e)';
  }
  function slideHTML(nx) {
    if (!nx) return '<button class="a2-btn ghost press v-add" data-a="add" data-ctx="today">' + esc(L('+ Add for today', '+ Přidat na dnešek')) + '</button>';
    return '<div class="a2-well a2-shimmer v-slide" data-id="' + nx.id + '"><span class="v-knob">' + sv(20, '<path d="M5 12.5l4.5 4.5L19 7.5"/>').replace('stroke-width="1.9"', 'stroke-width="2.4"') + '</span><span class="v-sll">' + esc(L('Slide to done', 'Posuň pro hotovo')) + '</span></div>';
  }
  function bindSlide(w) {
    if (!w) return; const k = w.querySelector('.v-knob'); let x0 = 0, dx = 0, on = false;
    const max = () => w.clientWidth - k.offsetWidth - 8;
    const set = v => { k.style.transform = 'translateX(' + v + 'px)'; w.style.setProperty('--p', (v / Math.max(1, max())).toFixed(3)); };
    k.addEventListener('pointerdown', e => { on = true; x0 = e.clientX; dx = 0; try { k.setPointerCapture(e.pointerId); } catch (_) {} k.style.transition = 'none'; e.stopPropagation(); });
    k.addEventListener('pointermove', e => { if (on) { dx = Math.max(0, Math.min(max(), e.clientX - x0)); set(dx); } });
    const end = () => { if (!on) return; on = false; k.style.transition = '';
      if (dx > max() * .7) { set(max()); w.classList.add('done'); try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} const el = document.createElement('span'); el.dataset.id = w.dataset.id; setTimeout(() => ACT.homeDone(el), 240); } else set(0); };
    k.addEventListener('pointerup', end); k.addEventListener('pointercancel', end);
    w.addEventListener('click', e => { if (e.target.closest('.v-knob')) return; k.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(30px)' }, { transform: 'translateX(0)' }], { duration: 560, easing: 'cubic-bezier(.34,1.56,.64,1)' }); });
  }
  function homePhone() {
    const el = $('#s-home'); const M = homeModel(); const C = centerOf(M); const nx = M.nextAny;
    const tiles = homeTiles(), nr = nowRow(), id = ideas();
    const tsz = C.t.length > 16 ? 24 : C.t.length > 12 ? 28 : C.t.length > 8 ? 34 : 46;
    let h = '<div class="v-page v-home">'
      + '<div class="v-top a2-in" style="--i:0"><div class="v-logo"><b class="a2-d">aurora</b>' + (isLab() ? '<span class="v-labtag">LAB</span>' : '') + '</div><button class="a2-icon press" style="width:40px;height:40px" data-a="openSettings" aria-label="' + esc(t('settings')) + '">' + I.gear + '</button></div>'
      + '<div class="a2-glass a2-in v-today" style="--i:1"><div class="v-sb"><b class="a2-d" style="font-size:24px">' + esc(t('today')) + '</b><span class="a2-t2 a2-num" style="font-size:13px">' + esc(dayShort(M.d)) + (M.list.length ? ' · <b style="color:var(--cream)">' + M.doneN + '</b> ' + esc(L('of', 'z')) + ' ' + M.list.length : '') + '</span></div>'
      + '<div class="v-arcw">' + arcHTML(M) + '<button class="v-ctr press" ' + (nx ? 'data-a="openItem" data-id="' + nx.id + '"' : 'data-a="orbTap"') + '>' + (C.k ? '<span class="a2-lab">' + esc(C.k) + '</span>' : '') + '<b class="a2-d" style="font-size:' + tsz + 'px">' + esc(C.t) + '</b>' + (C.chip ? '<span class="a2-chip" style="height:26px;font-size:12px"><span class="a2-dot" style="--c:' + C.c + '"></span>' + esc(C.chip) + '</span>' : '') + '</button></div>'
      + slideHTML(nx) + '</div>';
    if (nr) h += '<div class="a2-glass a2-tint a2-in v-now" style="--i:2;--c:' + nr.c + '"><div class="v-nowt"><span class="a2-lab" style="color:color-mix(in oklab,' + nr.c + ' 45%,#fff)"><span class="a2-dot' + (nr.pulse ? ' a2-pulse' : '') + '" style="--c:' + nr.c + '"></span>' + esc(nr.k || '') + '</span><b>' + esc(nr.t || '') + '</b></div><button class="a2-btn press" style="height:40px;padding:0 16px;font-size:14px" data-a="' + nr.act + '">' + esc(nr.btn || 'OK') + '</button></div>';
    h += '<div class="v-sb v-cap a2-in" style="--i:3"><span class="a2-lab">' + esc(L('Cards · this week', 'Karty · tento týden')) + '</span><button class="a2-t2 v-lnk" data-a="tab" data-k="spaces">Spaces ›</button></div>'
      + '<div class="v-tiles">' + tiles.map(tileHTML).join('') + (tiles.length < 4 ? '<button class="a2-glass a2-in v-ht v-htnew press" style="--i:7" data-a="newCard">' + '<div class="v-ring v-plus">' + I.plus + '</div><span class="v-htn">' + esc(t('newCard')) + '</span></button>' : '') + '</div>';
    if (id.n) h += '<button class="a2-glass a2-in v-ideas press" style="--i:8" data-a="tab" data-k="board"><span class="v-th">' + id.th.map(m => '<i style="' + thumbBg(m) + '"></i>').join('') + '</span><span class="v-idt">' + esc(id.fresh ? L(id.n + (id.n === 1 ? ' new idea' : ' new ideas'), id.n + (id.n === 1 ? ' nový nápad' : id.n < 5 ? ' nové nápady' : ' nových nápadů')) : L(id.n + (id.n === 1 ? ' idea' : ' ideas'), id.n + (id.n === 1 ? ' nápad' : id.n < 5 ? ' nápady' : ' nápadů'))) + '</span><span class="a2-t2" style="font-size:13px">Board ›</span></button>';
    el.innerHTML = h + '</div>';
    el._arcs = M.arcs;
    arrive(el, 'home');
    bindSlide(el.querySelector('.v-slide'));
  }

  /* ================= SPACES ================= */
  function nextOf(c) {
    const d = T();
    if (c.type === 'project') { const ps = projectStats(c.id); return ps.next ? { t: ps.next.t, w: ps.next.time || (ps.next.date ? (ps.next.date === d ? L('today', 'dnes') : dayShort(ps.next.date)) : '') } : null; }
    if (c.type === 'month') { const ms = monthStats(c, d); const o = ms.its.find(i => !isDone(i, d)); return o ? { t: o.t, w: '' } : null; }
    const its = cardItems(c.id).filter(i => occurs(i, d)); const nx = its.find(i => !isDone(i, d)) || cardItems(c.id).find(i => !i.done && !i.repeat);
    return nx ? { t: nx.t, w: nx.time || '' } : null;
  }
  function spModels() {
    const d = T(), out = [];
    const f = V.deckFilter || 'all';
    if ((f === 'all' || f === 'project') && window.KR && KR.cardList && KR.statsOf) KR.cardList().forEach(k => { const st = KR.statsOf(k.name === 'Keiro' ? null : k.name); if (!st) return; out.push({ kr: true, k: k.name === 'Keiro' ? '' : k.name, st, c: st.color || k.color, urg: (st.unsent ? 300 : 0) + (st.review ? 150 + st.review : 0) }); });
    filteredCards().forEach(c => { const todo = itemsOn(d).filter(i => i.card === c.id && !isDone(i, d)).length; out.push({ card: c, c: c.color, urg: todo * 40 + (c.deadline ? Math.max(0, 20 - daysBetween(d, c.deadline)) : 0) + (c.type === 'habit' ? 10 : 0) }); });
    return out.map((x, i) => [x, i]).sort((a, b) => b[0].urg - a[0].urg || a[1] - b[1]).map(x => x[0]);
  }
  function spCard(o, i) {
    const d = T();
    if (o.kr) {
      const st = o.st;
      const kick = L('Project · Keiro', 'Projekt · Keiro');
      const body = st.unsent ? '<div class="a2-well v-wellrow"><span class="a2-dot a2-pulse" style="--c:#ee5a85"></span><span class="v-wt">' + esc(L('Send link to campaign', 'Odeslat odkaz do kampaně')) + '</span><span class="v-pk">' + st.unsent + '</span></div>'
        : '<span class="a2-t2 v-sub">' + esc(st.review ? L(st.review + (st.review === 1 ? ' clip to review' : ' clips to review'), st.review + (st.review === 1 ? ' klip ke schválení' : st.review < 5 ? ' klipy ke schválení' : ' klipů ke schválení')) : st.next ? L('Next release ', 'Další vydání ') + st.next.when : L('Nothing waiting', 'Nic nečeká')) + '</span>';
      return '<button class="a2-glass a2-tint a2-in v-sc press" style="--i:' + (2 + i) + ';--c:' + o.c + '" data-a="krOpen" data-k="' + esc(o.k) + '"><div class="v-sch"><div class="v-scn">' + lab(o.c, kick) + '<b class="a2-d" style="font-size:' + FS(st.name, 30) + 'px">' + esc(st.name) + '</b></div>' + ring(56, st.outOf ? st.out / st.outOf : (st.review ? .6 : 1), o.c, 5, true, '<span class="a2-count" style="--to:' + st.review + ';font-size:16px"></span>') + '</div>' + body + '</button>';
    }
    const c = o.card, nx = nextOf(c); let kick, frac, val, row;
    if (c.type === 'habit') {
      const w = habitWeek(c.id), g = goalOf(c), n = w.filter(Boolean).length, td = dow(d); frac = n / g; val = n + '/' + g;
      kick = L('Habit · ', 'Návyk · ') + goalText(g) + (c.sh ? L(' · together', ' · spolu') : '');
      row = '<div class="v-sbr"><div class="v-sq">' + w.map((on, k) => '<span style="' + (on ? 'background:' + c.color : k === td ? 'box-shadow:inset 0 0 0 1.5px var(--cream)' : 'background:rgba(255,255,255,.12)') + '"></span>').join('') + '</div><span class="a2-t2 v-nx">' + esc(nx ? nx.t + (nx.w ? ' · ' + nx.w : '') : '') + '</span></div>';
    } else if (c.type === 'month') {
      const ms = monthStats(c, d); frac = ms.total ? ms.done / ms.total : 0; val = ms.done + '/' + ms.total;
      kick = (cs() ? 'Měsíčně · ' : 'Monthly · ') + winText(c.win) + (c.sh ? L(' · together', ' · spolu') : '');
      row = '<div class="v-sbr"><div class="v-seg">' + ms.its.slice(0, 8).map(i => '<span style="background:' + (isDone(i, d) ? c.color : 'rgba(255,255,255,.14)') + '"></span>').join('') + '</div><span class="a2-t2 v-nx">' + esc(nx ? nx.t : ms.total ? L('All done this month', 'Tento měsíc hotovo') : '') + '</span></div>';
    } else {
      const ps = projectStats(c.id); frac = ps.total ? ps.done / ps.total : 0; val = ps.done + '/' + ps.total;
      const dl = c.deadline ? daysBetween(d, c.deadline) : null;
      kick = L('Project', 'Projekt') + (dl != null ? ' · ' + (dl >= 0 ? L(dl + ' days left', 'zbývá ' + dl + ' dní') : L(-dl + ' days late', -dl + ' dní po termínu')) : '');
      const seg = Math.min(8, ps.total), on = ps.total ? Math.round(ps.done / ps.total * seg) : 0;
      row = '<div class="v-sbr"><div class="v-seg">' + Array.from({ length: seg }, (_, k) => '<span style="background:' + (k < on ? c.color : 'rgba(255,255,255,.14)') + '"></span>').join('') + '</div><span class="a2-t2 v-nx">' + esc(nx ? nx.t : L('No tasks yet', 'Zatím bez úkolů')) + '</span></div>';
    }
    return '<button class="a2-glass a2-tint a2-in v-sc press" style="--i:' + (2 + i) + ';--c:' + c.color + '" data-a="openCard" data-id="' + c.id + '"><div class="v-sch"><div class="v-scn">' + lab(c.color, kick) + '<b class="a2-d" style="font-size:' + FS(c.name, 30) + 'px">' + esc(c.name) + '</b></div>' + ring(56, frac, c.color, 5, frac > 0, '<span style="font-size:' + (val.length > 4 ? 13 : 15) + 'px">' + esc(val) + '</span>') + '</div>' + row + '</button>';
  }
  function spSmall(o, i) {
    const c = o.card; const nx = c ? nextOf(c) : null; const st = o.st;
    const name = c ? c.name : st.name, col = o.c;
    const v = c ? (c.type === 'habit' ? habitWeek(c.id).filter(Boolean).length + '/' + goalOf(c) : c.type === 'month' ? monthStats(c).done + '/' + monthStats(c).total : projectStats(c.id).done + '/' + projectStats(c.id).total) : String(st.review);
    return '<button class="a2-glass a2-tint a2-in v-ss press" style="--i:' + (2 + i) + ';--c:' + col + '" ' + (c ? 'data-a="openCard" data-id="' + c.id + '"' : 'data-a="krOpen" data-k="' + esc(o.k) + '"') + '>' + lab(col, c ? (c.type === 'habit' ? L('Habit', 'Návyk') : c.type === 'month' ? L('Monthly', 'Měsíčně') : L('Project', 'Projekt')) : 'Keiro') + '<div class="v-sb"><b class="a2-d" style="font-size:' + FS(name, 24) + 'px">' + esc(name) + '</b><b class="a2-num" style="font:700 15px/1 Inter">' + esc(v) + '</b></div><span class="a2-t2" style="font-size:13px">' + esc(nx ? nx.t + (nx.w ? ' · ' + nx.w : '') : '') + '</span></button>';
  }
  function spacesPhone() {
    const el = $('#s-spaces'); const ms = spModels(); const f = V.deckFilter || 'all';
    const seg = [['all', L('All · ', 'Vše · ') + (S.cards.length + (window.KR && KR.cardList ? KR.cardList().length : 0))], ['habit', L('Habits', 'Návyky')], ['project', L('Projects', 'Projekty')]];
    let h = '<div class="v-page v-spaces"><div class="v-top a2-in" style="--i:0"><b class="a2-d" style="font-size:44px">' + esc(t('spaces')) + '</b><button class="a2-icon press" data-a="newCard" aria-label="' + esc(t('newCard')) + '">' + I.plus + '</button></div>'
      + '<div class="a2-in" style="--i:1;padding:0 2px 4px"><div class="a2-seg">' + seg.map(([k, l]) => '<span role="button" class="' + (f === k ? 'on' : '') + '" data-a="deckFilter" data-k="' + k + '">' + esc(l) + '</span>').join('') + '</div></div>';
    if (!ms.length) h += '<div class="a2-glass a2-in v-empty" style="--i:2"><b class="a2-d" style="font-size:26px">' + esc(t('newCard')) + '</b><span class="a2-t2">' + esc(t('cardsEmpty')) + '</span><button class="a2-btn press" data-a="newCard">' + esc(t('addCard')) + '</button></div>';
    const big = ms.length > 5 ? ms.slice(0, 4) : ms, small = ms.length > 5 ? ms.slice(4) : [];
    h += big.map(spCard).join('');
    if (small.length) h += '<div class="v-g2">' + small.map((o, i) => spSmall(o, i + 4)).join('') + '</div>';
    el.innerHTML = h + '</div>';
    arrive(el, 'spaces' + f);
  }

  /* ================= CARD ================= */
  function rowHTML(i, d, c, opt) {
    opt = opt || {}; const on = isDone(i, d); const col = c ? c.color : itemColor(i);
    let right;
    if (!i.repeat && !i.date && !on) right = '<button class="v-when" data-a="when" data-id="' + i.id + '">' + esc(L('+ when', '+ kdy')) + '</button>';
    else right = '<span class="a2-t2 v-rr">' + esc(i.repeat === 'daily' ? L('daily', 'denně') : whenLabel(i, d) || '') + '</span>';
    return '<div class="v-row' + (on ? ' done' : '') + '" role="button" data-a="openItem" data-id="' + i.id + '"><button class="a2-check' + (on ? ' done' : '') + '" style="--c:' + col + '" data-a="toggle" data-id="' + i.id + '" data-d="' + d + '" aria-label="' + esc(t('done')) + '" aria-pressed="' + on + '">' + I.tick(on ? '#10221a' : 'transparent') + '</button><span class="v-rt">' + esc(i.t) + '</span>' + right + '</div>';
  }
  function addLine(c) {
    const isM = c.type === 'month';
    return '<div class="v-row v-addl"><span class="v-addc">+</span><input id="addTaskIn" enterkeyhint="done" autocomplete="off" placeholder="' + esc(isM ? L('Add an item, e.g. Rent', 'Přidat položku, např. Nájem') : L('Add a task, e.g. quiz fri 2pm', 'Přidat úkol, např. test pá 14:00')) + '" aria-label="' + esc(t('addTask')) + '"><button class="a2-btn v-addgo" id="addTaskGo" hidden aria-label="' + esc(t('addIt')) + '">↵</button></div>';
  }
  function bindAdd(el, c) {
    const inp = el.querySelector('#addTaskIn'), go2 = el.querySelector('#addTaskGo'); if (!inp) return;
    const addIt = () => {
      const v = inp.value.trim(); if (!v) return; const p = NL(v); const it = { id: uid(), t: stripSpans(v, p.spans) || v, card: c.id, created: T() };
      if (p.date) it.date = p.date; if (p.time) { it.time = p.time; it.dur = p.dur || 45; it.remind = S.push && S.push.def != null ? S.push.def : 10; }
      if (p.repeat) { it.repeat = p.repeat; if (p.repeat === 'days') it.days = p.days; it.doneDates = []; if (!it.date) it.date = T(); }
      else if (c.type === 'month' && !p.date) { Object.assign(it, { repeat: 'monthly', doneDates: [], date: T() }); }
      S.items.push(it); if (typeof useCount === 'function') useCount('adds'); save();
      const y = el.scrollTop; renderCard(); el.scrollTop = y; const ni = $('#addTaskIn'); ni && ni.focus({ preventScroll: true }); haptic();
      toast(esc(it.date || it.repeat ? t('planned', it.repeat ? repText(it) : dayName(it.date) + (it.time ? ' ' + it.time : '')) : t('undated')));
    };
    inp.addEventListener('input', () => { go2.hidden = !inp.value.trim(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addIt(); } });
    go2.addEventListener('click', e => { e.preventDefault(); addIt(); });
  }
  const statT = (lb, n, sm, i) => '<div class="a2-glass v-st"><span class="a2-lab">' + esc(lb) + '</span><div class="v-stn">' + N(n, 32) + (sm ? '<span class="a2-t2" style="font-size:13px">' + esc(sm) + '</span>' : '') + '</div></div>';
  function heat28(c, d) {
    const start = addD(weekStart(d), -21); let h = '', good = 0; const cnt = {}; const set = cardDaySet(c.id);
    for (let k = 0; k < 28; k++) { const x = addD(start, k); const n = completionsOn(x, c.id); if (x <= d && n) { good++; cnt[dow(x)] = (cnt[dow(x)] || 0) + 1; }
      const bg = x > d ? 'rgba(255,255,255,.05)' : n >= 2 ? 'color-mix(in oklab,' + c.color + ' 70%,#000)' : n ? c.color : 'rgba(255,255,255,.1)';
      h += '<span class="a2-pop"' + (x <= d ? ' role="button" data-a="heatTap" data-d="' + x + '"' : '') + ' style="--i:' + k + ';' + (x === d ? 'box-shadow:inset 0 0 0 2px var(--cream);background:' + (n ? c.color : 'transparent') : 'background:' + bg) + '"></span>'; }
    const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    const span = Math.min(28, daysBetween(start, d) + 1);
    return '<div class="a2-glass a2-in v-heat" style="--i:4"><div class="v-hg">' + h + '</div><div class="v-hs"><span class="a2-lab">' + esc(L('4 weeks', '4 týdny')) + '</span><div class="v-stn">' + N(good, 48) + '<span class="a2-t2" style="font-size:15px">/ ' + span + '</span></div>' + (best ? '<span class="a2-t2" style="font-size:13px">' + esc(L('best day ', 'nejlepší den ') + WD[lang()][+best[0]]) + '</span>' : '') + '</div></div>';
  }
  function cardPhone(keep) {
    const el = $('#s-card'); const c = cardById(V.card); if (!c) return;
    const d = T(); const sch = c.sh && typeof chOfCard === 'function' ? chOfCard(c) : null;
    const kickT = c.type === 'habit' ? L('Habit · ', 'Návyk · ') + goalText(goalOf(c)) : c.type === 'month' ? (cs() ? 'Měsíčně · ' : 'Monthly · ') + winText(c.win) : L('Project', 'Projekt') + (c.deadline ? L(' · deadline ', ' · termín ') + dayShort(c.deadline) : '');
    let h = '<div class="v-page v-card"><div class="v-top a2-in" style="--i:0"><button class="a2-icon press" data-a="closeCard" aria-label="' + esc(L('Back', 'Zpět')) + '">' + I.back + '</button><span style="display:flex;gap:8px">'
      + (sch ? '<button class="a2-chip press" style="height:44px" data-a="spInvite" data-id="' + c.id + '">' + I.users + esc(L('Invite', 'Pozvat')) + '</button>' : '') + '<button class="a2-icon press" data-a="editCard" aria-label="' + esc(t('editCard')) + '">' + I.more + '</button></span></div>'
      + '<div class="v-title a2-in" style="--i:1">' + lab(c.color, kickT + (sch ? L(' · together', ' · spolu') : '')) + '<div class="v-tn"><b class="a2-d" style="font-size:' + FS(c.name, 56) + 'px">' + esc(c.name) + '</b>' + (sch && typeof avStack === 'function' ? avStack(members(sch), 34) : '') + '</div></div>';
    const ms = cardMoments(c.id);
    if (c.type === 'habit') {
      const w = habitWeek(c.id), g = goalOf(c), n = w.filter(Boolean).length, td = dow(d);
      const lw = [0, 1, 2, 3, 4, 5, 6].filter(j => cardDaySet(c.id).has(addD(addD(weekStart(d), -7), j))).length;
      const pct = Math.min(100, Math.round(n / g * 100));
      h += '<div class="a2-glass a2-tint a2-in v-hero" style="--i:2;--c:' + c.color + '"><div class="v-sb"><div class="v-col"><span class="a2-lab">' + esc(L('This week', 'Tento týden')) + '</span><div class="v-stn">' + N(n, 84) + '<span class="a2-t2" style="font-size:20px">/ ' + g + '</span></div>' + (c.created && c.created < weekStart(d) ? '<span class="a2-t2" style="font-size:13px">' + esc(L('last week ', 'minulý týden ') + lw) + '</span>' : '') + '</div>'
        + '<div class="v-big"><svg class="a2-ring" width="112" height="112" viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="46" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="9"/>' + (n ? '<circle class="p" cx="56" cy="56" r="46" fill="none" stroke="' + c.color + '" stroke-width="9" pathLength="100" transform="rotate(-90 56 56)" style="--off:' + (100 - pct) + ';filter:drop-shadow(0 0 10px ' + c.color + 'b3)"/>' : '') + '</svg><div class="v-bigt"><b class="a2-num">' + (n >= g ? '✓' : pct + '%') + '</b><span class="a2-t2">' + esc(n >= g ? L('goal met', 'splněno') : L('goal', 'cíl')) + '</span></div></div></div>'
        + '<div class="v-days">' + w.map((on, k) => '<span class="a2-pop" role="button" data-a="heatTap" data-d="' + addD(weekStart(d), k) + '" style="--i:' + k + ';' + (on ? 'background:' + c.color + ';color:#0f2a1c;font-weight:700' : k === td ? 'box-shadow:inset 0 0 0 2px var(--cream);color:var(--cream)' : k > td ? 'background:rgba(255,255,255,.05);color:var(--t3)' : 'background:rgba(255,255,255,.1);color:var(--t2)') + '">' + WD7()[k] + '</span>').join('') + '</div></div>';
      const its = cardItems(c.id).filter(i => i.repeat || !i.done).sort((a, b) => (occurs(b, d) ? 1 : 0) - (occurs(a, d) ? 1 : 0));
      h += '<div class="a2-glass a2-in v-list" style="--i:3">' + its.map(i => rowHTML(i, occurs(i, d) ? d : (i.date || d), c)).join('') + addLine(c) + '</div>';
      h += heat28(c, d);
      h += '<div class="v-g3 a2-in" style="--i:5">' + statT(t('streak'), streakOf(c.id), L('days', 'dní')) + statT(L('Best', 'Nejlíp'), bestStreak(c.id), L('days', 'dní')) + statT(t('moments'), ms.length) + '</div>';
    } else if (c.type === 'month') {
      const st = monthStats(c, d); const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
      h += '<div class="a2-glass a2-tint a2-in v-hero" style="--i:2;--c:' + c.color + '"><div class="v-sb"><div class="v-col"><span class="a2-lab">' + esc(L('This month', 'Tento měsíc')) + '</span><div class="v-stn">' + N(st.done, 84) + '<span class="a2-t2" style="font-size:20px">/ ' + st.total + '</span></div><span class="a2-t2" style="font-size:13px">' + esc(st.left ? (d > st.b ? L('late since ', 'po termínu od ') : L('due ', 'do ')) + winText(c.win) : L('all done this month', 'tento měsíc hotovo')) + '</span></div>'
        + '<div class="v-big"><svg class="a2-ring" width="112" height="112" viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="46" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="9"/>' + (st.done ? '<circle class="p" cx="56" cy="56" r="46" fill="none" stroke="' + c.color + '" stroke-width="9" pathLength="100" transform="rotate(-90 56 56)" style="--off:' + (100 - pct) + ';filter:drop-shadow(0 0 10px ' + c.color + 'b3)"/>' : '') + '</svg><div class="v-bigt"><b class="a2-num">' + (st.total && !st.left ? '✓' : pct + '%') + '</b><span class="a2-t2">' + esc(L('paid', 'hotovo')) + '</span></div></div></div>'
        + '<div class="v-mbars">' + st.bars.map((b, k) => '<span class="a2-grow" style="--i:' + k + '"><i style="height:' + (b.v == null ? 6 : Math.max(8, Math.round(b.v * 100))) + '%;background:' + (b.v == null ? 'rgba(255,255,255,.08)' : k === 5 ? c.color : 'color-mix(in oklab,' + c.color + ' 55%,transparent)') + '"></i><small>' + esc(MONS[lang()][+b.ym.slice(5, 7) - 1]) + '</small></span>').join('') + '</div></div>';
      const its = monthItems(c.id).slice().sort((a, b) => (isDone(a, d) ? 1 : 0) - (isDone(b, d) ? 1 : 0)); const extra = cardItems(c.id).filter(i => !i.repeat && !i.done);
      h += '<div class="a2-glass a2-in v-list" style="--i:3">' + its.concat(extra).map(i => rowHTML(i, i.repeat ? d : (i.date || d), c)).join('') + addLine(c) + '</div>';
      h += '<div class="v-g3 a2-in" style="--i:4">' + statT(L('Left', 'Zbývá'), st.left) + statT(L('On time', 'Včas'), st.onTime, L('months', 'měs.')) + statT(t('moments'), ms.length) + '</div>';
    } else {
      const ps = projectStats(c.id); const nx = ps.next; const dl = c.deadline ? daysBetween(d, c.deadline) : null;
      if (nx) { const nd = nx.date || d; h += '<div class="a2-glass a2-tint a2-in v-next" style="--i:2;--c:' + c.color + '"><button class="v-nbtn press" style="--c:' + c.color + '" data-a="toggle" data-id="' + nx.id + '" data-d="' + nd + '" aria-label="' + esc(t('done')) + '"><span></span></button><div class="v-col" role="button" data-a="openItem" data-id="' + nx.id + '"><span class="a2-lab" style="color:color-mix(in oklab,' + c.color + ' 55%,#fff)">' + esc(L('Next step', 'Další krok') + (whenLabel(nx, nd) ? ' · ' + whenLabel(nx, nd) : '')) + '</span><b class="a2-d" style="font-size:' + (nx.t.length > 22 ? 21 : 26) + 'px;letter-spacing:-.02em">' + esc(nx.t) + '</b></div></div>'; }
      else h += '<button class="a2-glass a2-tint a2-in v-next press" style="--i:2;--c:' + c.color + '" data-a="add" data-card="' + c.id + '"><span class="v-nbtn" style="--c:' + c.color + '">+</span><div class="v-col"><span class="a2-lab">' + esc(L('Next step', 'Další krok')) + '</span><b class="a2-d" style="font-size:24px">' + esc(t('noTasksYet')) + '</b></div></button>';
      h += '<div class="v-g3 a2-in" style="--i:3">' + statT(t('open'), ps.open, L('of ', 'z ') + ps.total)
        + '<button class="a2-glass v-st press" data-a="editCard"><span class="a2-lab">' + esc(t('deadline')) + '</span><div class="v-stn">' + (dl == null ? '<b class="a2-d" style="font-size:18px;color:#ffc77a">' + esc(L('Set', 'Nastavit')) + '</b>' : N(Math.abs(dl), 32) + '<span class="a2-t2" style="font-size:13px">' + esc(dl < 0 ? L('days late', 'dní po') : L('days', 'dní')) + '</span>') + '</div></button>' + statT(t('moments'), ms.length) + '</div>';
      const open = cardItems(c.id).filter(i => !i.repeat && !i.done && i !== nx).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
      const reps = cardItems(c.id).filter(i => i.repeat);
      const doneL = cardItems(c.id).filter(i => !i.repeat && i.done).sort((a, b) => (b.doneOn || '').localeCompare(a.doneOn || '')).slice(0, V.showDone[c.id] ? 50 : 2);
      h += '<div class="a2-glass a2-in v-list" style="--i:4">' + doneL.map(i => rowHTML(i, i.date || d, c)).join('') + reps.map(i => rowHTML(i, d, c)).join('') + open.map(i => rowHTML(i, i.date || d, c)).join('') + addLine(c) + '</div>';
      if (ps.noDay) { const nd = cardItems(c.id).find(i => !i.repeat && !i.done && !i.date); h += '<div class="a2-glass a2-in v-hint" style="--i:5"><span class="a2-orb" style="width:34px;height:34px"></span><span class="v-wt">' + esc(ps.noDay === 1 ? L('1 task has no day yet', '1 úkol nemá den') : L(ps.noDay + ' tasks have no day yet', ps.noDay + ' úkoly nemají den')) + '</span><button class="a2-btn press" style="height:38px;padding:0 14px;font-size:14px" data-a="when" data-id="' + nd.id + '">' + esc(t('pickDay')) + '</button></div>'; }
      h += '<div class="v-tools a2-in" style="--i:6"></div>';
    }
    if (ms.length) h += '<div class="a2-in v-moms" style="--i:7"><div class="v-sb v-cap"><span class="a2-lab">' + esc(t('moments')) + ' · ' + ms.length + '</span><button class="a2-t2 v-lnk" data-a="add" data-card="' + c.id + '" data-mode="photo">+ ' + esc(L('Add', 'Přidat')) + '</button></div><div class="v-mrow">' + ms.slice(0, 8).map(m => '<button class="v-mt press" data-a="viewMoment" data-id="' + m.id + '" style="' + thumbBg(m) + '">' + (m.kind === 'note' ? '<span>' + esc((m.note || '').slice(0, 40)) + '</span>' : '') + '</button>').join('') + '</div></div>';
    h += '<div class="a2-glass a2-in v-note" style="--i:8"><span class="a2-lab">' + esc(t('note')) + '</span><textarea class="cn" id="cardNote" placeholder="' + esc(t('notePh')) + '" aria-label="' + esc(t('note')) + '">' + esc(c.note || '') + '</textarea></div>';
    el.innerHTML = h + '<div class="v-spolu"></div></div>';
    /* what the hooks drew (source panel, Studio, shared-card news and people) moves into the new page */
    const tools = el.querySelector('.v-tools'); (keep || []).forEach(n => { if (tools && (n.classList.contains('srcp') || n.classList.contains('stud'))) tools.appendChild(n); else el.querySelector('.v-spolu').appendChild(n); });
    if (tools && !tools.children.length) tools.remove();
    arrive(el, 'card' + c.id);
    bindAdd(el, c);
    const ta = $('#cardNote'); let nt = null; const setNote = () => { if (c.note === ta.value) return; c.note = ta.value; if (c.sh) { c.noteBy = meId(); c.noteAt = Date.now(); } save(); };
    ta.addEventListener('input', () => { clearTimeout(nt); nt = setTimeout(setNote, 300); }); ta.addEventListener('blur', setNote);
    const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.max(70, ta.scrollHeight) + 'px'; }; ta.addEventListener('input', fit); requestAnimationFrame(fit);
    if (typeof setAura === 'function') setAura([c.color, c.color, '#6f8cff']);
  }

  /* ================= SETTINGS (main page) ================= */
  const srow = (a, l, r, extra) => '<button class="v-srow press" data-a="' + a + '"' + (extra || '') + '><span class="v-sl">' + esc(l) + '</span><span class="a2-t2 v-sr">' + (r || '') + ' ›</span></button>';
  const tgl = (a, l, on) => '<button class="v-srow press" data-a="' + a + '" aria-pressed="' + !!on + '"><span class="v-sl">' + esc(l) + '</span><span class="v-tg' + (on ? ' on' : '') + '"><i></i></span></button>';
  function settingsPhone(old) {
    const el = $('#s-settings'); const has = a => !!old.querySelector('[data-a="' + a + '"]');
    const nm = (S.name || '').trim() || (typeof ACC !== 'undefined' && ACC.name) || L('You', 'Ty');
    const acc = old.querySelector('.acct'); const accSub = acc ? (acc.querySelector('small') || {}).textContent || '' : '';
    const k = typeof KCFG === 'function' ? KCFG() : (() => { try { return JSON.parse(localStorage.getItem('keiro') || '{}'); } catch (e) { return {}; } })();
    const lv = level();
    const wallName = { aurora: 'Aurora', photo: L('Photo', 'Fotka') }[S.wall] || (S.wall ? S.wall[0].toUpperCase() + S.wall.slice(1) : 'Aurora');
    let h = '<div class="v-page v-set"><div class="v-top a2-in" style="--i:0;justify-content:flex-start;gap:14px"><button class="a2-icon press" data-a="closeSettings" aria-label="' + esc(L('Back', 'Zpět')) + '">' + I.back + '</button><b class="a2-d" style="font-size:40px">' + esc(t('settings')) + '</b></div>'
      + '<button class="a2-glass a2-in v-me press" style="--i:1" data-a="' + (has('accPage') ? 'accPage' : 'syncPage') + '"><span class="v-av">' + esc(nm.slice(0, 1).toUpperCase()) + '</span><span class="v-col"><b>' + esc(nm) + '</b><span class="a2-t2" style="font-size:13px">' + esc(accSub || L('Account, phone and computer', 'Účet, telefon a počítač')) + '</span></span><span class="a2-t2">›</span></button>'
      + '<span class="a2-lab v-gl">' + esc(L('Look', 'Vzhled')) + '</span><div class="a2-glass a2-in v-grp" style="--i:2"><button class="v-srow press" data-a="lookPage" style="height:60px"><span class="v-sw"></span><span class="v-col"><span class="v-sl">' + esc(L('Appearance', 'Vzhled')) + '</span><span class="a2-t2" style="font-size:12px">' + esc((S.mode === 'light' ? L('Light', 'Světlý') : L('Dark', 'Tmavý')) + ' · ' + wallName) + '</span></span><span class="a2-t2">›</span></button>'
      + '<div class="v-srow v-mot"><span class="v-sl">' + esc(L('Motion', 'Pohyb')) + '</span><div class="a2-seg" style="display:flex">' + [['full', L('Full', 'Plný')], ['calm', L('Calm', 'Klidný')], ['off', L('Off', 'Vypnuto')]].map(([x, l]) => '<span role="button" class="' + (lv === x ? 'on' : '') + '" data-a="a2Motion" data-k="' + x + '">' + esc(l) + '</span>').join('') + '</div></div>'
      + srow('pickLang', L('Language', 'Jazyk'), cs() ? 'Čeština' : 'English') + '</div>'
      + '<span class="a2-lab v-gl">' + esc(L('Notifications', 'Upozornění')) + '</span><div class="a2-glass a2-in v-grp" style="--i:3">'
      + srow('notifPage', L('Reminders for plans', 'Připomínky plánů'), S.push && S.push.on ? L('On', 'Zapnuto') : L('Off', 'Vypnuto'))
      + tgl('toggleNudges', L('Helpful nudges', 'Užitečné postrčení'), S.nudges) + tgl('toggleWeekly', L('Sunday: your week', 'Neděle: tvůj týden'), S.weekly) + '</div>'
      + '<span class="a2-lab v-gl">' + esc(L('Tools', 'Nástroje')) + '</span><div class="a2-glass a2-in v-grp" style="--i:4">'
      + (has('srcAll') ? srow('srcAll', L('Sources', 'Zdroje'), '') : '')
      + '<button class="v-srow press" data-a="keiroSettings"><span class="v-sl">Keiro</span><span class="v-sr" style="color:' + (k.on ? '#7fe3ad' : 'var(--t2)') + '">' + esc(k.on ? L('On', 'Zapnuto') : L('Off', 'Vypnuto')) + ' ›</span></button>'
      + (has('labPull') ? srow('labPull', L('Pull data from the beta', 'Stáhnout data z bety'), '') : '')
      + '</div>'
      + '<span class="a2-lab v-gl">' + esc(L('Account & help', 'Účet a pomoc')) + '</span><div class="a2-glass a2-in v-grp" style="--i:5">'
      + srow('syncPage', L('Phone and computer', 'Telefon a počítač'), typeof syncOn === 'function' && syncOn() ? L('Linked', 'Propojeno') : L('Not linked', 'Nepropojeno'))
      + (has('joinCodeSheet') ? srow('joinCodeSheet', L('Card invitation', 'Pozvánka do karty'), '') : '')
      + (has('tutorial') ? srow('tutorial', L('How Aurora works', 'Jak Aurora funguje'), L('video', 'video')) : has('promo') ? srow('promo', L('How Aurora works', 'Jak Aurora funguje'), L('video', 'video')) : '')
      + (has('feedback') ? srow('feedback', L('Feedback', 'Zpětná vazba'), '') : '') + '</div>'
      + '<span class="a2-lab v-gl">' + esc(L('Data', 'Data')) + '</span><div class="a2-glass a2-in v-grp" style="--i:6">'
      + srow('exportData', L('Back up', 'Zálohovat'), '') + srow('restoreData', L('Restore from backup', 'Obnovit ze zálohy'), '')
      + (has('importOld') ? srow('importOld', L('Load from old Aurora', 'Načíst ze staré Aurory'), '') : '')
      + '<button class="v-srow press" data-a="deleteAll"><span class="v-sl" style="color:#ff9a8f">' + esc(L('Delete everything', 'Smazat všechno')) + '</span></button></div>'
      + '<div class="a2-in v-ver" style="--i:7"><button class="a2-t3 press" style="font-size:12px" data-a="a2AllSet">Aurora 2.0' + (isLab() ? ' · Lab' : '') + ' · v2052 · ' + esc(L('All settings', 'Všechna nastavení')) + ' ›</button></div></div>';
    el.innerHTML = h;
    arrive(el, 'settings');
  }
  ACT.a2AllSet = () => { V.settingsPage = 'all'; renderSettings(); $('#s-settings').scrollTop = 0; };
  ACT.a2Motion = el => { S.a2motion = el.dataset.k; save(); applyMotion(); if (V.settingsOpen) renderSettings(); };

  /* ================= BOARD (header + filters as on the canvas; the masonry is restyled) ================= */
  function boardPhone() {
    const el = $('#s-board'); const hdr = el.querySelector(':scope > .hdr'); const chips = el.querySelector(':scope > .chips');
    if (hdr) hdr.outerHTML = '<div class="v-top v-btop a2-in" style="--i:0"><b class="a2-d" style="font-size:44px">Board</b><button class="a2-icon press" data-a="boardSearch" aria-label="' + esc(L('Search', 'Hledat')) + '">' + I.search + '</button></div>';
    if (chips) {
      chips.classList.add('v-bchips');
      chips.querySelectorAll('[data-a="boardFilter"]').forEach(b => {
        const k = b.dataset.k; const n = k === 'all' ? S.moments.length : k === 'none' ? S.moments.filter(m => !m.card || !cardById(m.card)).length : S.moments.filter(m => m.card === k).length;
        b.className = 'a2-chip press' + (V.boardFilter === k ? ' on' : '');
        if (!b.querySelector('.v-n')) b.insertAdjacentHTML('beforeend', ' <span class="v-n">' + n + '</span>');
        if (!n && V.boardFilter !== k && k !== 'all') b.remove();
        else if (k === 'none' && n === S.moments.length && V.boardFilter !== k) b.remove();
      });
    }
    el.querySelectorAll('.masonry .mt.note').forEach(n => { const c = n.style.getPropertyValue('--c'); n.classList.add('a2-glass', 'a2-tint'); if (c) n.style.setProperty('--c', c); });
    arrive(el, 'board');
  }

  /* ================= wire it in ================= */
  function install() {
    document.body.classList.add('a2', 'a2v');
    wall(); nav(); applyMotion();
    /* Home */
    const _h = renderHome; renderHome = function () { const r = _h.apply(this, arguments); if (!desk()) try { homePhone(); } catch (e) { console.error('a2v home', e); } return r; };
    /* Spaces (not while reordering) */
    const _s = renderSpaces; renderSpaces = function () { const r = _s.apply(this, arguments); if (!desk() && !V.spEdit) try { spacesPhone(); } catch (e) { console.error('a2v spaces', e); } return r; };
    /* Card: keep what hooks inserted (source panel, Studio, shared news/people) */
    const _c = renderCard; renderCard = function () {
      const r = _c.apply(this, arguments); if (desk() || !V.card) return r;
      try { const el = $('#s-card'); const keep = [...el.querySelectorAll('.srcp, .stud, .spnews, .sppl, .sppeople')].filter((n, i, a) => !a.some(m => m !== n && m.contains(n))); keep.forEach(n => n.remove()); cardPhone(keep); } catch (e) { console.error('a2v card', e); }
      return r;
    };
    /* Settings: the main page is the canvas one; sub-pages keep their content, restyled */
    const _st = renderSettings; renderSettings = function () {
      const r = _st.apply(this, arguments); if (desk() || (V.settingsPage && V.settingsPage !== 'main')) return r;
      try { const el = $('#s-settings'); const old = document.createElement('div'); old.innerHTML = el.innerHTML; settingsPhone(old); } catch (e) { console.error('a2v settings', e); }
      return r;
    };
    const _b = renderBoard; renderBoard = function () { const r = _b.apply(this, arguments); if (!desk()) try { boardPhone(); } catch (e) { console.error('a2v board', e); } return r; };
    const _p = renderPlan; renderPlan = function () {
      if (!desk() && window.KR && KR._C) { const c = KR._C(); if (c.layer && c.layer !== 'me') c.layer = 'me'; }
      const r = _p.apply(this, arguments); if (!desk()) { const el = $('#s-plan'); el.classList.add('v-plan'); const t1 = el.querySelector(':scope > .hdr .t1'); if (t1) t1.className = 'a2-d v-pt'; el.querySelectorAll('.seg.frost').forEach(s => s.classList.add('a2-seg')); arrive(el, 'plan' + V.planMode); }
      return r;
    };
    RENDER.home = renderHome; RENDER.spaces = renderSpaces; RENDER.board = renderBoard; RENDER.plan = renderPlan;
    /* the bar's icons come back after a language switch */
    if (typeof buildNav === 'function') { const _bn = buildNav; buildNav = function () { const r = _bn.apply(this, arguments); nav(); return r; }; }
  }
  install();
  if (window.FX && FX.enter) { const _e = FX.enter; FX.enter = function (root, o) { const l = level(); if (l === 'off') return; return _e(root, l === 'calm' ? Object.assign({}, o || {}, { noStagger: true }) : o); }; }
  document.addEventListener('DOMContentLoaded', () => { nav(); wall(); applyMotion(); if (typeof S !== 'undefined' && S && S.onboarded && !desk()) { try { render(); } catch (e) {} } });
  setTimeout(nav, 800);
  const nv = document.getElementById('nav'); if (nv) new MutationObserver(() => fixPlus()).observe(nv, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
})();
