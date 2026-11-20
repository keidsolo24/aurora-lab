/* Aurora Lab · keidsolo24.github.io/aurora-lab/
   A private test copy of the beta. Storage is already separate (see the AUR_NS block in index.html).
   - Logging in pulls your beta data once. Nothing is ever sent back: no sync push, no writes to shared cards.
   - "Pull again" in Settings refreshes the copy from the beta.
   - DLC: Keiro (js/keiro.js) is loaded only once it is switched on. Its data lives in its own key ("keiro"). */
(function () {
  if (!window.AUR_NS) return;           // only ever active in the Lab copy
  window.LAB = true;
  document.documentElement.classList.add('lab');
  const cs = () => lang() === 'cs';
  const L = (en, c) => (cs() ? c : en);

  /* ---------- copy mode: pull only ---------- */
  SY.labAllow = false;
  syncPush = async function () {};
  const _now = syncNow;
  syncNow = async function (o) { if (!SY.labAllow) return false; return _now(o); };
  const _att = syncAttach;
  syncAttach = async function (sp, secret, mode) {
    SY.labAllow = true;
    try { return await _att(sp, secret, mode); }
    finally { SY.labAllow = false; S.labPulled = Date.now(); save(); }
  };
  const _ch = chApi;
  chApi = async function (ch, path, body) { if (path === '/s/push') return {}; return _ch(ch, path, body); };
  ACT.labPull = async () => {
    if (!syncOn()) { toast(esc(L('Log in with your beta account first', 'Nejdřív se přihlas účtem z bety'))); return; }
    toast(esc(L('Pulling from the beta…', 'Stahuju z bety…')));
    SY.labAllow = true;
    try { await _now(); S.labPulled = Date.now(); save(); toast(esc(L('Same as the beta now', 'Teď stejné jako beta'))); }
    catch (e) { toast(esc(L('Server is not answering', 'Server neodpovídá'))); }
    finally { SY.labAllow = false; render(); }
  };

  /* ---------- DLC: load Keiro only when it is on ---------- */
  window.KCFG = function () { try { return JSON.parse(localStorage.getItem('keiro') || 'null') || {}; } catch (e) { return {}; } };
  let kLoading = null;
  window.keiroLoad = function () {
    if (window.KR) return Promise.resolve(window.KR);
    if (kLoading) return kLoading;
    kLoading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/keiro.js?v=2014'; s.onload = () => res(window.KR); s.onerror = rej; document.head.appendChild(s); });
    return kLoading;
  };
  if (KCFG().on) keiroLoad().then(() => { if (S) render(); }).catch(() => {});

  /* ---------- hooks into the existing screens ---------- */
  const _home = renderHome;
  renderHome = function () { _home(); labBadge(); };
  /* Home: Keiro is one widget in the stack. While something is urgent it goes first, otherwise it sits after the first card. */
  let kUrg = '';
  function withWidget(r) {
    const w = window.KR && KR.widget ? KR.widget() : null; if (!w) { kUrg = ''; return r; }
    const at = w.urgent ? 0 : Math.min(1, r.order.length);
    r.order.splice(at, 0, 'keiro'); r.html.splice(at, 0, w.html);
    const key = w.urgent ? w.kind : ''; if (key && key !== kUrg && typeof H19 !== 'undefined') H19.idx = 0;   /* newly urgent → show it */
    kUrg = key; return r;
  }

  /* ---------- FX: things arrive instead of just appearing ----------
     On entering a screen (tab, card, Keiro, a desktop page): sections rise in one after another, numbers count up,
     rings draw themselves, bars grow. Only on entering, never on a plain re-render. Off with "reduce motion". */
  window.FX = (function () {
    const EASE = 'cubic-bezier(.2,.8,.2,1)';
    const WRAP = '.stack,.sec,.dcards,.kd4,.kd2,.deck,.stat3,.khold';
    const NUMS = '.num,.dring>span,.ringw>span,.kkn,.kbn,.kq>b,.kd3 b,.ktb td,.krb>b';
    function count(el) {
      const tn = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.nodeValue)); if (!tn) return;
      const m = tn.nodeValue.match(/^(\D{0,2})(\d+(?:[.,]\d+)?)([\s\S]*)$/); if (!m) return;
      const end = parseFloat(m[2].replace(',', '.')); if (!(end > 0)) return;
      const dec = (m[2].split(/[.,]/)[1] || '').length, comma = m[2].includes(','), full = tn.nodeValue;
      const t0 = performance.now(), dur = 520 + Math.min(480, end * 8);
      const step = t => { if (!tn.isConnected) return; const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); let v = (end * e).toFixed(dec); if (comma) v = v.replace('.', ','); tn.nodeValue = p < 1 ? m[1] + v + m[3] : full; if (p < 1) requestAnimationFrame(step); };
      tn.nodeValue = m[1] + (0).toFixed(dec).replace('.', comma ? ',' : '.') + m[3]; requestAnimationFrame(step);
    }
    function enter(root, o) {
      if (!root || RM) return; o = o || {};
      if (!o.noStagger) {
        const out = []; [...root.children].forEach(c => { if (c.matches(WRAP)) out.push(...c.children); else out.push(c); });
        const vh = innerHeight; out.filter(k => { const r = k.getBoundingClientRect(); return r.height && r.top < vh && !k.matches('.hdr,.dtop,#nav,script,style'); }).slice(0, 16).forEach((k, i) => {
          k.style.setProperty('--fxi', i); k.classList.remove('fx-in'); void k.offsetWidth; k.classList.add('fx-in');
          setTimeout(() => k.classList.remove('fx-in'), 1500);
        });
      }
      root.querySelectorAll(NUMS).forEach(count);
      root.querySelectorAll('path.rarc').forEach(p => { try { const len = p.getTotalLength(); p.animate([{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }], { duration: 900, easing: EASE }); } catch (e) {} });
      root.querySelectorAll('.pt2 .pb,.khl>i,.mprog>i').forEach((b, i) => { try { b.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 700, delay: Math.min(i, 8) * 50, easing: EASE, fill: 'backwards' }); b.style.transformOrigin = '0 50%'; } catch (e) {} });
      root.querySelectorAll('.dwk i.on,.hc i[style]').forEach((b, i) => { try { b.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 380, delay: Math.min(i, 40) * 12, easing: EASE, fill: 'backwards' }); } catch (e) {} });
      root.classList.remove('fx-go'); void root.offsetWidth; root.classList.add('fx-go'); clearTimeout(root._fx); root._fx = setTimeout(() => root.classList.remove('fx-go'), 1800);
    }
    return { enter, count };
  })();
  /* everything is loaded by now: put the widget into the stack and hook the "entering a screen" moments */
  document.addEventListener('DOMContentLoaded', () => {
    const isDesk = () => typeof DESK !== 'undefined' && DESK.on;
    if (typeof stackCards === 'function') { const _sc = stackCards; stackCards = function (M) { return withWidget(_sc(M)); }; }
    if (typeof deskRender === 'function') { const _dr = deskRender; deskRender = function (a) { if (V.spEdit && isDesk()) return; _dr(a); const d = $('#desk'); if (window.KR && KR.deskHook && isDesk()) KR.deskHook(d); if (isDesk() && V.tab === 'spaces' && !V.card && !V.kd) spApply(d.querySelector('.dcards'), '.dcard'); if (a === true && isDesk()) FX.enter(d.querySelector('main.dmain'), { noStagger: true }); }; }
    const _g = go; go = function (tab) { const was = V.tab, card = V.card, kd = V.kd; V.kd = false; V.spEdit = false; V.spDragging = false; _g(tab); if (!isDesk() && (was !== tab || card)) FX.enter($('#s-' + tab)); };
    const _oc = openCard; openCard = function (id) { _oc(id); if (isDesk()) FX.enter($('#desk main.dmain'), { noStagger: true }); else FX.enter($('#s-card')); };
    setTimeout(() => { if (S && S.onboarded) { if (isDesk()) FX.enter($('#desk main.dmain'), { noStagger: true }); else FX.enter($('#s-' + V.tab)); } }, 900);
  });
  const _spaces = renderSpaces;
  /* ---------- Spaces: your own order of cards (this device). Keys: c:<card id>, k:<Keiro project>. ---------- */
  const spGet = () => { try { return JSON.parse(localStorage.getItem('spOrder') || '[]') || []; } catch (e) { return []; } };
  const spKey = n => n.dataset.id ? 'c:' + n.dataset.id : n.matches('.kspc,.kspace,.kdc') ? 'k:' + (n.dataset.k || '') : '';
  function spApply(box, sel) {
    const ord = spGet(); if (!box || !ord.length) return;
    const items = [...box.querySelectorAll(':scope > ' + sel)].filter(n => spKey(n)); if (items.length < 2) return;
    const anchor = items[items.length - 1].nextSibling, pos = n => { const i = ord.indexOf(spKey(n)); return i < 0 ? 1e6 : i; };
    items.map((n, i) => [n, pos(n), i]).sort((x, y) => x[1] - y[1] || x[2] - y[2]).forEach(x => box.insertBefore(x[0], anchor));
  }
  function spList() {
    const all = S.cards.map(c => ({ k: 'c:' + c.id, name: c.name, sub: c.type === 'habit' ? t('habit') : c.type === 'month' ? (lang() === 'cs' ? 'Měsíčně' : 'Monthly') : t('project'), color: c.color })).concat(window.KR && KR.cardList ? KR.cardList() : []);
    const ord = spGet(), pos = x => { const i = ord.indexOf(x.k); return i < 0 ? 1e6 : i; };
    return all.map((x, i) => [x, pos(x), x.k[0] === 'k' ? 1e5 : i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
  }
  /* ---------- Edit mode, like the iPhone home screen: hold a card → cards shrink into a grid and wiggle → drag → Hotovo ---------- */
  const isDeskV = () => typeof DESK !== 'undefined' && DESK.on;
  const cs2 = () => lang() === 'cs';
  function spSave(keys) {
    const full = spList().map(x => x.k), set = new Set(keys), slots = full.map((k, i) => set.has(k) ? i : -1).filter(i => i >= 0);
    const out = full.slice(); slots.forEach((i, j) => { out[i] = keys[j]; });
    keys.filter(k => !full.includes(k)).forEach(k => out.push(k));
    try { localStorage.setItem('spOrder', JSON.stringify(out)); } catch (e) {}
  }
  const scrollParent = el => { for (let n = el.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n).overflowY; if (o === 'auto' || o === 'scroll') return n; } return document.scrollingElement; };
  /* drag inside a grid: the item follows the finger, the others slide out of the way (FLIP) */
  function spDrag(grid, sel) {
    if (grid._spd) return; grid._spd = 1;
    let it = null, gx = 0, gy = 0, lock = 0, sc = null, pid = null;
    const items = () => [...grid.querySelectorAll(':scope > ' + sel)];
    const follow = e => { const g = grid.getBoundingClientRect(); it.style.transform = 'translate(' + (e.clientX - g.left - gx - it.offsetLeft) + 'px,' + (e.clientY - g.top - gy - it.offsetTop) + 'px)'; };
    grid.addEventListener('pointerdown', e => {
      if (!V.spEdit || it) return; const n = e.target.closest(sel); if (!n || n.parentElement !== grid) return;
      it = n; pid = e.pointerId; const g = grid.getBoundingClientRect(); gx = e.clientX - g.left - n.offsetLeft; gy = e.clientY - g.top - n.offsetTop; sc = scrollParent(grid);
      n.classList.add('spdrag'); V.spDragging = true; try { n.setPointerCapture(pid); } catch (x) {} haptic(); e.preventDefault();
    });
    grid.addEventListener('pointermove', e => {
      if (!it || e.pointerId !== pid) return; follow(e);
      const sr = sc.getBoundingClientRect ? sc.getBoundingClientRect() : { top: 0, bottom: innerHeight };
      if (e.clientY < Math.max(sr.top, 0) + 70) sc.scrollTop -= 10; else if (e.clientY > Math.min(sr.bottom, innerHeight) - 70) sc.scrollTop += 10;
      if (Date.now() < lock) return;
      const all = items(), others = all.filter(x => x !== it);
      const tg = others.find(x => { const r = x.getBoundingClientRect(); return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; });
      if (!tg) return;
      const first = new Map(others.map(x => [x, x.getBoundingClientRect()]));
      grid.insertBefore(it, all.indexOf(it) < all.indexOf(tg) ? tg.nextSibling : tg);
      others.forEach(x => { const a = first.get(x), b = x.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top; if ((dx || dy) && !RM) try { x.animate([{ translate: dx + 'px ' + dy + 'px' }, { translate: '0 0' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' }); } catch (z) {} });
      follow(e); lock = Date.now() + 200; haptic();
    });
    const end = e => {
      if (!it || (e && e.pointerId !== pid)) return; const n = it; it = null; V.spDragging = false;
      const t0 = n.style.transform; n.style.transform = ''; n.classList.remove('spdrag');
      if (t0 && !RM) try { n.animate([{ transform: t0 }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }); } catch (z) {}
    };
    grid.addEventListener('pointerup', end); grid.addEventListener('pointercancel', end);
  }
  function spEditView() {
    const el = $('#s-spaces'), rows = spList(), list = V.spacesMode === 'list';
    el.innerHTML = '<div class="hdr"><h1 class="t1">' + esc(t('spaces')) + '</h1><button class="pbtn cr press spdone" data-a="spDone">' + esc(cs2() ? 'Hotovo' : 'Done') + '</button></div>'
      + '<p class="sphint">' + esc(cs2() ? 'Chyť kartu a přetáhni ji na nové místo.' : 'Grab a card and drag it to a new spot.') + '</p>'
      + '<div class="spgrid' + (list ? ' list' : '') + '" id="spgrid">' + rows.map((r, i) => '<div class="spt frost solid" data-k="' + esc(r.k) + '" style="--c:' + r.color + ';--j:' + i + '"><span class="led" style="--c:' + r.color + '"></span><b>' + esc(r.name) + '</b><small>' + esc(r.sub) + '</small></div>').join('') + '</div>';
    spDrag($('#spgrid'), '.spt');
  }
  function spEnter() {
    if (V.spEdit) return; V.spEdit = true; V.spJust = Date.now(); haptic();
    if (isDeskV()) {
      const g = $('#desk .dcards'); if (!g) { V.spEdit = false; return; }
      g.classList.add('spedit'); [...g.children].forEach((n, i) => n.style.setProperty('--j', i));
      const h = $('#desk .dph'); if (h) [...h.children].forEach(c => { if (c.tagName === 'BUTTON') c.hidden = true; }); if (h && !h.querySelector('.spdone')) h.insertAdjacentHTML('beforeend', '<button class="pbtn cr press spdone" data-a="spDone">' + esc(cs2() ? 'Hotovo' : 'Done') + '</button>');
      spDrag(g, '.dcard[data-id],.dcard.kdc');
    } else spEditView();
  }
  function spDone() {
    if (!V.spEdit) return;
    const g = isDeskV() ? $('#desk .dcards') : $('#spgrid');
    if (g) spSave([...g.children].map(n => n.dataset.k && n.classList.contains('spt') ? n.dataset.k : spKey(n)).filter(Boolean));
    V.spEdit = false; V.spDragging = false; V.spJust = Date.now();
    if (isDeskV()) { deskRender(); FX.enter($('#desk main.dmain'), { noStagger: true }); } else { V.deckIdx = 0; renderSpaces(); FX.enter($('#s-spaces')); }
  }
  ACT.spDone = () => spDone();
  ACT.spOrder = () => spEnter();
  /* hold to enter edit mode (phone: deck and list; computer: the card grid) */
  document.addEventListener('DOMContentLoaded', () => {
    const CARD = '#s-spaces #deck > .spc, #s-spaces .stack > .lrow, #desk .dcards > .dcard';
    let lp = null, x0 = 0, y0 = 0;
    const cancel = () => { clearTimeout(lp); lp = null; };
    document.addEventListener('pointerdown', e => {
      if (V.spEdit || V.tab !== 'spaces' || V.card || V.kd || V.keiro) return; const n = e.target.closest(CARD); if (!n || !spKey(n)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      x0 = e.clientX; y0 = e.clientY; cancel(); lp = setTimeout(() => { lp = null; spEnter(); }, 480);
    }, true);
    document.addEventListener('pointermove', e => { if (lp && Math.hypot(e.clientX - x0, e.clientY - y0) > 9) cancel(); }, true);
    document.addEventListener('pointerup', cancel, true); document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('scroll', cancel, true);
    /* no click after the hold, no card opening while editing */
    document.addEventListener('click', e => {
      if (V.spJust && Date.now() - V.spJust < 650) { e.preventDefault(); e.stopPropagation(); return; }
      if (V.spEdit && !e.target.closest('.spdone')) { const inG = e.target.closest('#spgrid,.spedit'); e.preventDefault(); e.stopPropagation(); if (!inG && !e.target.closest('#desk .dph,#s-spaces .hdr')) spDone(); }
    }, true);
    document.addEventListener('contextmenu', e => { if (e.target.closest(CARD + ',.spt')) e.preventDefault(); }, true);
    document.addEventListener('keydown', e => { if (V.spEdit && (e.key === 'Escape' || e.key === 'Enter')) spDone(); });
  });
  renderSpaces = function () {
    if (V.spEdit && !isDeskV()) { if (!V.spDragging) spEditView(); return; }
    _spaces(); const el = $('#s-spaces'); if (window.KR) KR.spacesHook(el);
    spApply(el.querySelector('#deck'), '.spc'); spApply(el.querySelector('.stack'), '.lrow');
  };
  function labBadge() { const h = $('#s-home .hdr .logo'); if (h && !h.nextElementSibling?.classList.contains('labtag')) h.insertAdjacentHTML('afterend', '<span class="labtag">LAB</span>'); }

  /* 2.0 week (checklist 03 · Týden): one row per day with the day's things as chips, today highlighted.
     Tap a day → that day in the list, tap a chip → the item. Desktop keeps its own week. */
  const _plan = renderPlan;
  renderPlan = function () {
    _plan();
    if (V.planMode === 'list' && window.KR) KR.planHook($('#s-plan'));
    if (V.planMode !== 'week' || document.body.classList.contains('desk')) return;
    const el = $('#s-plan'); const g = el.querySelector('.wgrid'); if (!g) return;
    const sum = g.querySelector('.wg-sum'); const hint = g.nextElementSibling;
    let rows = '';
    for (let k = 0; k < 7; k++) {
      const d = addD(V.planWeek, k); const its = itemsOn(d); const isT = d === T(); const past = d < T();
      const shown = its.slice(0, isT ? 5 : 4);
      rows += '<div class="wk2r' + (isT ? ' td' : '') + (past ? ' past' : '') + '"><button class="wk2d press" data-a="openDay" data-d="' + d + '"><b>' + esc(WD[lang()][k]) + ' ' + dOf(d).getDate() + '</b>' + (isT ? '<span class="cap">' + esc(L('today', 'dnes')) + '</span>' : '') + '</button><div class="wk2c">'
        + (shown.length ? shown.map(i => '<button class="chip in press' + (isDone(i, d) ? ' dn' : '') + '" data-a="openItem" data-id="' + i.id + '"><span class="dot" style="--c:' + itemColor(i) + '"></span>' + (i.time ? '<span class="muted">' + i.time + '</span>' : '') + '<span class="t">' + esc(i.t) + '</span></button>').join('')
          + (its.length > shown.length ? '<button class="wk2m press" data-a="openDay" data-d="' + d + '">+' + (its.length - shown.length) + '</button>' : '')
          : '<span class="wk2f">' + esc(L('free', 'volno')) + '</span>') + '</div></div>';
    }
    const sec = document.createElement('section'); sec.className = 'wk2 frost solid';
    sec.innerHTML = (sum ? '<div class="wg-sum">' + sum.innerHTML + '</div>' : '') + rows;
    g.replaceWith(sec); if (hint && !hint.matches('section')) hint.remove();
  };
  const _set = renderSettings;
  renderSettings = function () {
    if (V.settingsPage === 'keiro') { keiroLoad().then(() => KR.settingsPage($('#s-settings'))); return; }
    _set();
    if (V.settingsPage !== 'main') return;
    const el = $('#s-settings'); const first = el.querySelector('.sec'); if (!first) return;
    const at = S.labPulled ? new Date(S.labPulled).toLocaleString(cs() ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const k = KCFG();
    const box = document.createElement('div');
    box.innerHTML = '<div class="sec"><span class="cap">Lab</span><section class="grp frost solid">'
      + '<button class="srow" data-a="labPull"><span class="ci" style="width:30px;height:30px;border-radius:15px;border:0;background:rgba(255,207,92,.16);color:#ffcf5c">' + ico('download', 15, 2) + '</span><span class="tx">' + esc(L('Pull data from the beta again', 'Znovu stáhnout data z bety')) + '<small>' + esc(syncOn() ? (at ? L('Last copy ', 'Poslední kopie ') + at : L('Logged in', 'Přihlášeno')) : L('Log in with your beta account', 'Přihlas se účtem z bety')) + ' · ' + esc(L('nothing goes back', 'zpátky nic nejde')) + '</small></span></button></section></div>'
      + '<div class="sec"><span class="cap">DLC</span><section class="grp frost solid"><button class="srow" data-a="keiroSettings"><span class="kdlc">' + ico('film', 15, 2.2) + '</span><span class="tx">Keiro<small>' + esc(k.on ? (window.KR ? KR.statusLine() : L('On', 'Zapnuto')) : L('Off · clip automat', 'Vypnuto · klipovací automat')) + '</small></span><span class="r">' + ico('chev', 15, 2.2) + '</span></button></section></div>';
    while (box.firstChild) first.parentNode.insertBefore(box.firstChild, first);
  };
  /* Notifications in the Lab: only Keiro (release times). Normal reminders stay with the beta, so nothing comes twice. */
  reminderList = function () { return window.KR && KCFG().on ? KR.pushList() : []; };
  const _dl = openDeepLink;
  openDeepLink = function (href) {
    let k = null; try { k = new URL(href, location.href).searchParams.get('keiro'); } catch (e) {}
    if (!k) return _dl(href);
    keiroLoad().then(() => { if (SH.open) closeSheet(true); if (V.settingsOpen) closeSettings(true); go('spaces'); ACT.krOpen && ACT.krOpen(); });
  };
  { const q = new URLSearchParams(location.search); if (q.get('keiro')) setTimeout(() => { if (S && S.onboarded) openDeepLink(location.href); }, 600); }
  ACT.keiroSettings = () => { V.settingsPage = 'keiro'; renderSettings(); $('#s-settings').scrollTop = 0; };
})();
