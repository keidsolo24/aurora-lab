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
  const _push = syncPush;
  syncPush = async function () { return SY.lab ? _push() : 0; };   // only the Lab's own space is ever written to
  const _now = syncNow;
  syncNow = async function (o) { if (SY.labAllow) return _now(o); if (S.labSync) return labSyncNow(); return false; };

  /* ---------- the Lab's own link: phone ↔ computer, both ways. The beta account is only read from. ----------
     S.labSync is a second sync space. For one run it takes the place of S.sync, with its own snapshot. */
  const _sl = snapLoad, _ss = snapSave;
  snapLoad = async function () { const k = SY.lab ? 'syncsnap:lab' : 'syncsnap'; if (SY.snap && SY.snapK === k) return SY.snap; try { SY.snap = (await DB.get('kv', k)) || {}; } catch (e) { SY.snap = {}; } SY.snapK = k; return SY.snap; };
  snapSave = async function () { try { await DB.set('kv', SY.snapK || 'syncsnap', SY.snap); } catch (e) {} };
  if (typeof accSeen === 'function') { const _as = accSeen; accSeen = async function (f) { if (SY.lab) return; return _as(f); }; }
  syncSchedule = function (ms = 2500) { if (!syncOn() && !S.labSync) return; clearTimeout(SY.timer); SY.timer = setTimeout(() => syncNow(), ms); };
  async function labRun(fn) {
    if (!S.labSync) return false; if (SY.busy) { SY.again = true; return false; }
    const beta = S.sync; S.sync = S.labSync; SY.lab = true; SY.snap = null;
    try { return await fn(); }
    finally { S.labSync = S.sync; S.sync = beta; SY.lab = false; SY.snap = null; SY.snapK = null; await rawSave(); if (V.settingsOpen && V.settingsPage === 'labsync') renderSettings(); }
  }
  async function labSyncNow() { return labRun(() => _now()); }
  async function labApi(path, body) { return syncApi(path, body); }
  async function labCreate() {
    const j = await labApi('/s/new', {});
    S.labSync = { sp: j.sp, secret: j.secret, dev: (S.labSync && S.labSync.dev) || uid(), cur: { r: 0, k: '' }, state: 'ok' };
    SY.snap = null; try { await DB.set('kv', 'syncsnap:lab', {}); } catch (e) {} await rawSave();
    await labSyncNow(); return labCode();
  }
  async function labCode() { const j = await labApi('/s/code', { sp: S.labSync.sp, secret: S.labSync.secret }); S.labSync.code = j.code; S.labSync.codeExp = j.exp; await rawSave(); return j; }
  async function labJoin(code) {
    const j = await labApi('/s/join', { code });
    S.labSync = { sp: j.sp, secret: j.secret, dev: uid(), cur: { r: 0, k: '' }, state: 'ok' };
    try { await DB.set('kv', 'syncsnap:lab', {}); } catch (e) {} await rawSave();
    await labRun(async () => { await syncPull(); return _now(); });   // theirs first, then ours go up
    save(); applyLook(); render();
  }
  const labAgo = () => { const l = S.labSync && S.labSync.last; if (!l) return ''; const m = Math.round((Date.now() - l) / 60000); return m < 1 ? L('just now', 'právě teď') : m < 60 ? m + ' min' : Math.round(m / 60) + ' h'; };
  function labSyncPage() {
    const on = !!S.labSync, st = !on ? 'off' : S.labSync.state === 'err' ? 'err' : 'ok';
    let h = '<div class="hdr"><button class="cb frost press" data-a="settingsBack" aria-label="' + esc(L('Back', 'Zpět')) + '">' + ico('back', 20, 2.2) + '</button><span></span></div><h1 class="t1" style="margin-bottom:18px">' + esc(L('Phone and computer', 'Telefon a počítač')) + '</h1>'
      + '<section class="nstat frost' + (st === 'ok' ? ' on' : '') + '"><span class="ni">' + ico('sync', 22, 1.9) + '</span><span class="tx"><b>' + esc(!on ? L('Only on this device', 'Jen v tomhle zařízení') : st === 'err' ? L('Problem', 'Problém') : L('Linked', 'Propojeno')) + '</b><small>'
      + esc(!on ? L('Link your phone and computer and they keep the same plans, cards and ideas.', 'Propoj telefon a počítač a budou mít stejné plány, karty a nápady.') : st === 'err' ? (S.labSync.err || L('Offline, will retry', 'Bez spojení, zkusím znovu')) : L('Last sync ', 'Poslední synchronizace ') + labAgo()) + '</small></span></section>';
    if (!on) {
      h += '<div class="sec"><span class="cap">' + esc(L('First device', 'První zařízení')) + '</span><section class="grp frost solid"><button class="srow" data-a="labSyncCreate"><span class="tx">' + esc(L('Create a link', 'Vytvořit propojení')) + '<small>' + esc(L('You get a code for the other device', 'Dostaneš kód pro druhé zařízení')) + '</small></span><span class="r">' + ico('chev', 14, 2.4) + '</span></button></section></div>'
        + '<div class="sec"><span class="cap">' + esc(L('Second device', 'Druhé zařízení')) + '</span><section class="frost solid" style="border-radius:24px;padding:14px 16px"><div class="fld in" style="padding:12px 14px"><input id="labCodeIn" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" placeholder="' + esc(L('Code from the first device', 'Kód z prvního zařízení')) + '" style="width:100%;border:0;outline:0;background:none;font:600 20px/1.2 Inter;letter-spacing:.08em;color:var(--ink)"></div><button class="pbtn cr press" style="width:100%;margin-top:10px" data-a="labSyncJoin">' + esc(L('Link', 'Propojit')) + '</button></section></div>';
    } else {
      const code = S.labSync.code && S.labSync.codeExp > Date.now() ? S.labSync.code : '';
      h += '<div class="sec"><span class="cap">' + esc(L('Add your other device', 'Přidat druhé zařízení')) + '</span><section class="frost solid" style="border-radius:24px;padding:18px">'
        + (code ? '<div style="font:800 40px/1 \'Bricolage Grotesque\';letter-spacing:.08em;text-align:center;padding:6px 0 4px">' + esc(code) + '</div><div class="muted" style="text-align:center;font:400 13px/1.45 Inter;margin-top:8px">' + esc(L('On the other device: Settings → Phone and computer → enter the code.', 'Na druhém zařízení: Nastavení → Telefon a počítač → zadej kód.')) + '</div>'
          : '<button class="pbtn cr press" style="width:100%" data-a="labSyncCode">' + ico('plus', 18, 2.4) + esc(L('Show code', 'Ukázat kód')) + '</button>') + '</section></div>'
        + '<div class="sec"><section class="grp frost solid"><button class="srow" data-a="labSyncNow">' + esc(L('Sync now', 'Synchronizovat teď')) + '<span class="r">' + ico('sync', 15, 2) + '</span></button><button class="srow red" data-a="labSyncLeave">' + esc(L('Unlink this device', 'Odpojit toto zařízení')) + '</button></section></div>';
    }
    h += '<div class="muted" style="font:400 12.5px/1.5 Inter;margin:14px 6px 0">' + esc(L('This link is only for your Lab. Your beta account is never changed; the Lab only reads from it (Lab → Pull data from the beta).', 'Tohle propojení je jen pro tvůj Lab. Účet z bety se nikdy nemění, Lab z něj jen čte (Lab → Stáhnout data z bety).')) + '</div>';
    return h;
  }
  ACT.labSyncCreate = async () => { try { toast(esc(L('Creating the link…', 'Vytvářím propojení…'))); await labCreate(); renderSettings(); } catch (e) { toast(esc(L('Server is not answering', 'Server neodpovídá'))); } };
  ACT.labSyncCode = async () => { try { await labCode(); renderSettings(); } catch (e) { toast(esc(L('Server is not answering', 'Server neodpovídá'))); } };
  ACT.labSyncJoin = async () => { const i = $('#labCodeIn'), c = i ? i.value.trim().toUpperCase() : ''; if (!c) { i && i.focus(); return; } try { toast(esc(L('Linking…', 'Propojuju…'))); await labJoin(c); renderSettings(); toast(esc(L('Linked · same data on both', 'Propojeno · stejná data na obou'))); } catch (e) { toast(esc(e.status === 404 || e.status === 400 ? L('That code does not work', 'Ten kód nefunguje') : L('Server is not answering', 'Server neodpovídá'))); } };
  ACT.labSyncNow = async () => { await labSyncNow(); toast(esc(L('Synced', 'Synchronizováno'))); };
  ACT.labSyncLeave = () => confirmSheet(L('Unlink this device? Its data stays, it just stops syncing.', 'Odpojit toto zařízení? Data v něm zůstanou, jen se přestanou synchronizovat.'), L('Unlink', 'Odpojit'), async () => { S.labSync = null; try { await DB.set('kv', 'syncsnap:lab', {}); } catch (e) {} save(); renderSettings(); });
  ACT.syncPage = () => { V.settingsPage = 'labsync'; renderSettings(); $('#s-settings').scrollTop = 0; };
  setTimeout(() => { if (S && S.labSync) labSyncNow(); }, 1200);
  setInterval(() => { if (S && S.labSync && !document.hidden) labSyncNow(); }, 60000);
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
    kLoading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/keiro.js?v=2022'; s.onload = () => res(window.KR); s.onerror = rej; document.head.appendChild(s); });
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
    if (V.settingsPage === 'labsync') { const el = $('#s-settings'); el.innerHTML = labSyncPage(); const i = $('#labCodeIn'); if (i) i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ACT.labSyncJoin(); } }); return; }
    _set();
    if (V.settingsPage !== 'main') return;
    const el = $('#s-settings'); const first = el.querySelector('.sec'); if (!first) return;
    const at = S.labPulled ? new Date(S.labPulled).toLocaleString(cs() ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const k = KCFG();
    const box = document.createElement('div');
    box.innerHTML = '<div class="sec"><span class="cap">Lab</span><section class="grp frost solid">'
      + '<button class="srow" data-a="labPull"><span class="ci" style="width:30px;height:30px;border-radius:15px;border:0;background:rgba(255,207,92,.16);color:#ffcf5c">' + ico('download', 15, 2) + '</span><span class="tx">' + esc(L('Pull data from the beta again', 'Znovu stáhnout data z bety')) + '<small>' + esc(syncOn() ? (at ? L('Last copy ', 'Poslední kopie ') + at : L('Logged in', 'Přihlášeno')) : L('Log in with your beta account', 'Přihlas se účtem z bety')) + ' · ' + esc(L('nothing goes back', 'zpátky nic nejde')) + '</small></span></button></section></div>'
      + '<div class="sec"><span class="cap">DLC</span><section class="grp frost solid"><button class="srow" data-a="keiroSettings"><span class="kdlc">' + ico('film', 15, 2.2) + '</span><span class="tx">' + esc(L('Own automation', 'Vlastní automatizace')) + '<small>' + esc(k.on ? (window.KR ? KR.statusLine() : L('On', 'Zapnuto')) : L('Off · clip automat', 'Vypnuto · klipovací automat')) + '</small></span><span class="r">' + ico('chev', 15, 2.2) + '</span></button></section></div>';
    while (box.firstChild) first.parentNode.insertBefore(box.firstChild, first);
    regroup(el);
  };
  /* ---------- Settings in six groups: You · Look · Notifications · Sources · About · Lab ----------
     The rows are the app's own (same handlers), only regrouped; the long tails fold behind one row. */
  function regroup(el) {
    const secOf = a => { const r = el.querySelector('[data-a="' + a + '"]'); return r ? r.closest('.sec') : null; };
    const all = [...el.querySelectorAll(':scope > .sec')]; if (all.length < 6) return;
    const lab = secOf('labPull'), src = secOf('keiroSettings'), beta = secOf('feedback'), look = secOf('lookPage'), you = secOf('syncPage'), notif = secOf('notifPage'), home = secOf('toggleNudges'), video = secOf('promo');
    if (!lab || !src || !look || !you || !notif) return;
    const known = new Set([lab, src, beta, look, you, notif, home, video]), rest = all.filter(x => !known.has(x));
    const data = rest.length ? rest[rest.length - 1] : null, general = rest.slice(0, -1);
    const anchor = all[all.length - 1].nextSibling, parent = all[0].parentNode;
    const cap = (x, t2) => { const c = x.querySelector('.cap'); if (c) c.textContent = t2; };
    cap(you, L('You', 'Ty')); cap(look, L('Look', 'Vzhled')); cap(notif, L('Notifications', 'Notifikace')); cap(src, L('Sources', 'Zdroje'));
    if (home) { const g = notif.querySelector('.grp'), hg = home.querySelector('.grp'); if (g && hg) { while (hg.firstChild) g.appendChild(hg.firstChild); home.remove(); } }
    const sr = you.querySelector('[data-a="syncPage"] .tx'); if (sr) sr.innerHTML = esc(L('Phone and computer', 'Telefon a počítač')) + '<small>' + esc(S.labSync ? (S.labSync.state === 'err' ? L('Problem · tap to see', 'Problém · ťukni pro detail') : L('Linked · last sync ', 'Propojeno · naposledy ') + (labAgo() || '–')) : L('Not linked yet · same data on both', 'Zatím nepropojeno · stejná data na obou')) + '</small>';
    const sg = src.querySelector('.grp'); if (sg) sg.insertAdjacentHTML('beforeend', '<button class="srow" data-a="srcSetup"><span class="ci" style="width:30px;height:30px;border-radius:15px">' + ico('sync', 15, 2.2) + '</span><span class="tx">' + esc(L('Link reader', 'Čtečka odkazů')) + '<small>' + esc(L('Reads public links for project cards', 'Čte veřejné odkazy pro projekty')) + '</small></span><span class="r">' + ico('chev', 14, 2.4) + '</span></button>');
    if (sg) sg.insertAdjacentHTML('beforeend', '<button class="srow" data-a="srcLink"><span class="ci" style="width:30px;height:30px;border-radius:15px">' + ico('plus', 15, 2.2) + '</span><span class="tx">' + esc(L('Connect a source', 'Připojit zdroj')) + '<small>' + esc(L('Paste a link to what you run', 'Vlož odkaz na to, co provozuješ')) + '</small></span><span class="r">' + ico('chev', 14, 2.4) + '</span></button>');
    const fold = (key, capHTML, icon, title, sub, secs) => {
      const open = !!(V.setOpen && V.setOpen[key]), w = document.createElement('div'); w.className = 'sec';
      w.innerHTML = (capHTML ? '<span class="cap">' + capHTML + '</span>' : '') + '<section class="grp frost solid"><button class="srow" data-a="setFold" data-k="' + key + '" aria-expanded="' + open + '"><span class="ci" style="width:30px;height:30px;border-radius:15px">' + ico(icon, 15, 2) + '</span><span class="tx">' + esc(title) + '<small>' + esc(sub) + '</small></span><span class="r setchev' + (open ? ' on' : '') + '">' + ico('chev', 14, 2.4) + '</span></button></section><div class="setfold"' + (open ? '' : ' hidden') + '></div>';
      const f = w.querySelector('.setfold'); secs.forEach(x => x && f.appendChild(x)); return w;
    };
    const about = fold('about', esc(L('About', 'O appce')), 'heart', L('Help, videos & feedback', 'Nápověda, videa a zpětná vazba'), 'Aurora 2 Lab', [beta, video, ...general]);
    cap(lab, 'Lab'); const lc = lab.querySelector('.cap'); if (lc) lc.innerHTML = '<span style="display:flex;justify-content:space-between"><span>Lab</span><span style="opacity:.6;text-transform:none;letter-spacing:0">' + esc(L('only in your Lab', 'jen v tvém Labu')) + '</span></span>';
    const dfold = data ? fold('data', '', 'download', L('Data on this device', 'Data v tomhle zařízení'), L('Export · restore · delete', 'Export · obnova · smazání'), [data]) : null;
    [you, look, notif, src, about, lab, dfold].forEach(x => x && parent.insertBefore(x, anchor));
  }
  ACT.setFold = el => { const k = el.dataset.k, sc = $('#s-settings'), y = sc.scrollTop; V.setOpen = V.setOpen || {}; V.setOpen[k] = !V.setOpen[k]; renderSettings(); sc.scrollTop = y; if (V.setOpen[k]) { const f = sc.querySelector('[data-k="' + k + '"]'); if (f) f.closest('.sec').scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' }); } };

  /* ---------- New card: one question first ---------- */
  function newCardChooser() {
    const opt = (a, c, t2, s2, ex) => '<button class="ncopt frost solid press" data-a="' + a + '"><span class="cap" style="color:' + c + '">' + esc(ex) + '</span><b>' + esc(t2) + '</b><span>' + esc(s2) + '</span></button>';
    openSheet({ title: t('newCard'), body: opt('ncDo', 'var(--green)', L('Something I do', 'Něco, co dělám'), L('A habit or something that comes back every month. You tick it off yourself.', 'Návyk nebo něco, co se vrací každý měsíc. Odškrtáváš sám.'), L('Habit · Monthly', 'Návyk · Měsíčně'))
      + opt('ncRun', '#b18cff', L('Something I run', 'Něco, co řídím'), L('A project with tasks and a deadline.', 'Projekt s úkoly a termínem.'), L('Project', 'Projekt'))
      + '<button class="nclink press" data-a="srcLink">' + ico('plus', 14, 2.4) + esc(L('Or paste a link to what you run', 'Nebo vlož odkaz na to, co provozuješ')) + '</button>' });
  }
  const blankCard = type => ({ id: null, name: '', type, color: COLORS[S.cards.length % COLORS.length], deadline: null, goal: 7, step: '', who: 'me', with: [], tile: null, win: null, items: [], tpl: null });
  const after = fn => { closeSheet(true); setTimeout(fn, 320); };
  ACT.ncDo = () => after(() => openCardSheet(null));
  /* Something I run: name, deadline, and optionally a link to what it is. Nothing else. */
  function runSheet(pre) {
    const R = { name: (pre && pre.name) || '', dl: null, link: (pre && pre.link) || '', k: null, data: null }; let ln0 = () => R.link;
    const dls = [[null, L('None', 'Bez termínu')], [7, L('1 week', 'Týden')], [30, L('1 month', 'Měsíc')], ['pick', L('Pick', 'Vybrat')]];
    openSheet({ title: L('Something I run', 'Něco, co řídím'), right: L('Create', 'Vytvořit'), rightDisabled: !R.name, cls: 'runsheet',
      body: '<div class="fld in big kname rn"><input id="rnName" maxlength="60" autocomplete="off" enterkeyhint="done" placeholder="' + esc(L('e.g. KEID channel, Studio Lumen', 'např. KEID kanál, Studio Lumen')) + '" value="' + esc(R.name) + '" aria-label="' + esc(L('Name', 'Název')) + '"></div>'
        + '<span class="cap rncap">' + esc(L('Deadline', 'Termín')) + '</span><div class="seg frost rnseg" role="group">' + dls.map(([k, l], i) => '<button data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '">' + esc(l) + '</button>').join('') + '</div><input id="rnDate" type="date" class="rndate" hidden aria-label="' + esc(L('Deadline date', 'Datum termínu')) + '">'
        + '<span class="cap rncap">' + esc(L('Numbers from somewhere? · optional', 'Čísla odněkud? · nepovinné')) + '</span><div class="fld in lkf"><input id="rnLink" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(L('Paste a link to your channel, sheet…', 'Vlož odkaz na kanál, tabulku…')) + '" value="' + esc(R.link) + '" aria-label="' + esc(L('Link', 'Odkaz')) + '"></div><div id="rnOut" class="rnout" aria-live="polite"></div>'
        + '<p class="rnfoot">' + esc(L('Tasks you add later in the card. A name is enough to start.', 'Úkoly přidáš potom v kartě. Na začátek stačí název.')) + '</p>',
      dirty: () => R.name.trim(),
      onSave: () => {
        if (!R.name.trim()) return;
        if (R.k && !R.k.own && !R.data) { try { const w = JSON.parse(localStorage.getItem('srcWant') || '[]'); w.push({ k: R.k.k, host: R.k.host || R.k.k, at: Date.now() }); localStorage.setItem('srcWant', JSON.stringify(w.slice(-50))); } catch (e) {} }
        K = blankCard('project'); K.name = R.name.trim(); K.deadline = R.dl; const lk = R.k && !R.k.own ? ln0() : '';
        const before = new Set(S.cards.map(c => c.id)); saveCardSheet();
        const nc = S.cards.find(c => !before.has(c.id)); if (nc && lk) { nc.src = { url: lk, kind: R.k.k }; if (R.data) srcPut(nc.id, { at: Date.now(), data: R.data }); save(); if (V.card === nc.id) { if (isDeskV()) deskRender(); else renderCard(); } }
      },
      mount: el => {
        const nm = el.querySelector('#rnName'), save = $('#sheetSave'), seg = [...el.querySelectorAll('.rnseg button')], dt = el.querySelector('#rnDate'), ln = el.querySelector('#rnLink'), out = el.querySelector('#rnOut');
        const upd = () => { if (save) save.disabled = !R.name.trim(); };
        nm.addEventListener('input', () => { R.name = nm.value; upd(); });
        seg.forEach(b => b.onclick = () => { const v = dls[+b.dataset.i][0]; seg.forEach(x => x.classList.toggle('on', x === b)); dt.hidden = v !== 'pick'; if (v === 'pick') { dt.min = T(); dt.focus(); try { dt.showPicker && dt.showPicker(); } catch (e) {} R.dl = dt.value || null; } else R.dl = v ? addD(T(), v) : null; });
        dt.addEventListener('change', () => { R.dl = dt.value || null; });
        ln0 = () => ln.value.trim(); let tm = null, seq = 0;
        const line = (dot, b, rest) => '<span class="rnl"><i style="background:' + dot + '"></i><b>' + esc(b) + '</b>' + (rest ? ' · ' + esc(rest) : '') + '</span>';
        const show = () => { const v = ln.value.trim(); R.k = v ? linkKind(v) : null; R.data = null; const k = R.k; clearTimeout(tm);
          if (!v) { out.innerHTML = ''; return; }
          if (!k) { out.innerHTML = '<span class="rnl">' + esc(L('That does not look like a link yet', 'Tohle ještě nevypadá jako odkaz')) + '</span>'; return; }
          if (k.own) { out.innerHTML = line('#8be0b0', L('Own automation', 'Vlastní automatizace'), L('set it up in Settings → Sources', 'nastavíš v Settings → Sources')); return; }
          if (!R.name.trim() && k.name) { R.name = k.name; nm.value = k.name; upd(); }
          out.innerHTML = line('#f0c46b', L('Reading…', 'Čtu…'), k.label);
          const my = ++seq; tm = setTimeout(async () => { const r = await srcRead(v); if (my !== seq) return;
            if (r.data) { R.data = r.data; const d = r.data; out.innerHTML = line('#8be0b0', L('Found: ', 'Nalezeno: ') + d.title, srcSummary(d)); if (!R.name.trim() || R.name === k.name) { R.name = d.title; nm.value = d.title; upd(); } }
            else out.innerHTML = line(r.setup ? '#f0c46b' : '#ff8a8a', r.setup ? L('The link reader is not set up yet', 'Čtečka odkazů ještě není nastavená') : L('Could not read it', 'Nepodařilo se přečíst'), r.setup ? L('the card is created now and fills in once it is', 'karta se založí hned a naplní se, až bude') : r.msg); }, 450); };
        ln.addEventListener('input', show); if (R.link) show();
        if (!('ontouchstart' in window)) setTimeout(() => nm.focus(), 350);
      } });
  }
  ACT.ncRun = () => after(() => runSheet());

  /* ---------- Paste a link: Aurora says what it is. Reading the sources themselves comes next; nothing is faked. ---------- */
  function linkKind(raw) {
    let u; try { u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : 'https://' + raw); } catch (e) { return null; }
    const h = u.hostname.replace(/^www\./, '').toLowerCase(), p = u.pathname; if (!h.includes('.')) return null;
    const first = (p.split('/').filter(Boolean)[0] || '').replace(/^@/, '');
    if (/(^|\.)youtube\.com$|^youtu\.be$/.test(h)) return { k: 'youtube', label: L('YouTube channel', 'YouTube kanál'), name: /^@/.test(p.slice(1)) ? first : '', soon: true, will: L('subscribers, views and your latest videos', 'odběratele, zhlédnutí a poslední videa') };
    if (h === 'docs.google.com' && /^\/spreadsheets\//.test(p)) return { k: 'sheet', label: 'Google Sheet', name: '', soon: true, will: L('your numbers as a chart and rows with a date in Plan', 'tvoje čísla jako graf a řádky s datem v Plan') };
    if (h === 'calendar.google.com' || /\.ics$/i.test(p) || u.protocol === 'webcal:') return { k: 'calendar', label: L('Calendar', 'Kalendář'), name: '', soon: true, will: L('its events in Plan', 'jeho události v Plan') };
    if (/\.ts\.net$/.test(h) || /^\/api(\/|$)/.test(p)) return { k: 'own', label: L('Own automation', 'Vlastní automatizace'), name: h.split('.')[0], own: true };
    if (h === 'github.com') return { k: 'github', label: 'GitHub', name: p.split('/').filter(Boolean).slice(0, 2).join('/'), soon: true };
    const nm = h.split('.').slice(-2, -1)[0] || h; return { k: 'other', host: h, label: nm.charAt(0).toUpperCase() + nm.slice(1), name: /instagram|tiktok|notion|facebook|twitter|^x$/.test(nm) ? first : '', soon: true };
  }
  function linkSheet() {
    openSheet({ title: L('Connect a source', 'Připojit zdroj'), body: '<p class="lkp">' + esc(L('Paste a link to what you run. Your channel, your sheet, your calendar.', 'Vlož odkaz na to, co provozuješ. Kanál, tabulku, kalendář.')) + '</p>'
      + '<div class="fld in big lkf"><input id="lkUrl" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="youtube.com/@you" aria-label="' + esc(L('Link', 'Odkaz')) + '"><button class="pbtn ghost press" id="lkPaste">' + esc(L('Paste', 'Vložit')) + '</button></div>'
      + '<div id="lkOut" class="lko" aria-live="polite"></div><button class="nclink press" data-a="srcAdv">' + esc(L('Advanced · my own automation', 'Pokročilé · vlastní automatizace')) + '</button>',
      mount: el => {
        const inp = el.querySelector('#lkUrl'), out = el.querySelector('#lkOut');
        const show = () => { const v = inp.value.trim(); if (!v) { out.innerHTML = ''; return; } const k = linkKind(v);
          if (!k) { out.innerHTML = '<div class="lkr"><b>' + esc(L('That does not look like a link yet', 'Tohle ještě nevypadá jako odkaz')) + '</b></div>'; return; }
          out.innerHTML = '<div class="lkr frost solid"><span class="cap" style="color:' + (k.own ? '#8be0b0' : k.soon ? '#f0c46b' : 'var(--ink3)') + '">' + esc(k.own ? L('Works today', 'Funguje už dnes') : k.soon ? L('Recognised · coming next', 'Poznáno · přijde v dalším updatu') : L('Not readable yet', 'Zatím neumím přečíst')) + '</span><b>' + esc(k.label + (k.name ? ' · ' + k.name : '')) + '</b><span>'
            + esc(k.own ? L('A script or bot of yours. Aurora connects to it with this address and a PIN.', 'Tvůj skript nebo bot. Aurora se k němu připojí touhle adresou a PINem.') : k.soon ? L('Aurora will show ', 'Aurora ukáže ') + k.will + L('. Reading it is not built yet.', '. Čtení ještě není postavené.') : L('Aurora cannot read ', 'Aurora zatím neumí číst ') + k.label + L(' yet. Your interest is noted on this device.', '. Tvůj zájem si poznamenám v tomhle zařízení.')) + '</span>'
            + (k.own ? '<button class="pbtn cr press" data-a="srcAdv">' + esc(L('Set up the connection', 'Nastavit připojení')) + '</button>' : '<button class="pbtn cr press" id="lkGo">' + esc(L('Create the project', 'Založit projekt')) + '</button>') + '</div>';
          const go = out.querySelector('#lkGo'); if (go) go.onclick = () => { try { const w = JSON.parse(localStorage.getItem('srcWant') || '[]'); w.push({ k: k.k, host: k.host || k.k, at: Date.now() }); localStorage.setItem('srcWant', JSON.stringify(w.slice(-50))); } catch (e) {} after(() => runSheet({ name: k.name || '', link: inp.value.trim() })); };
        };
        inp.addEventListener('input', show); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const go = out.querySelector('#lkGo'); if (go) go.click(); } });
        el.querySelector('#lkPaste').onclick = async () => { try { const tx = await navigator.clipboard.readText(); if (tx) { inp.value = tx.trim(); show(); } } catch (e) { inp.focus(); toast(esc(L('Hold the field and choose Paste', 'Podrž pole a zvol Vložit'))); } };
        if (!('ontouchstart' in window)) setTimeout(() => inp.focus(), 350);
      } });
  }
  ACT.srcLink = () => { if (SH.open) after(linkSheet); else linkSheet(); };
  ACT.srcAdv = () => { closeSheet(true); if (!V.settingsOpen) openSettings(); ACT.keiroSettings(); };
  document.addEventListener('DOMContentLoaded', () => { ACT.newCard = el => { if (el && el._suppress && Date.now() - el._suppress < 500) return; newCardChooser(); }; });

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

  /* ================= Sources: a project reads numbers from a public link =================
     The link reader is a small Worker (aurora-reader.js). Its address defaults to the same Cloudflare account as the push server. */
  const SRC_DEFAULT = 'https://aurora-reader.keidaurora.workers.dev';
  const srcBase = () => { try { return (localStorage.getItem('srcServer') || SRC_DEFAULT).replace(/\/+$/, ''); } catch (e) { return SRC_DEFAULT; } };
  const srcGet = id => { try { return JSON.parse(localStorage.getItem('src:' + id) || 'null'); } catch (e) { return null; } };
  function srcPut(id, o) { try { localStorage.setItem('src:' + id, JSON.stringify(o)); } catch (e) {} if (o.data && o.data.kpis && o.data.kpis[0]) { try { const h = JSON.parse(localStorage.getItem('srch:' + id) || '{}'); h[T()] = o.data.kpis[0].value; const ks = Object.keys(h).sort().slice(-90); const n = {}; ks.forEach(k => n[k] = h[k]); localStorage.setItem('srch:' + id, JSON.stringify(n)); } catch (e) {} } }
  async function srcRead(url, fresh) {
    try {
      const r = await fetch(srcBase() + '/read?url=' + encodeURIComponent(url) + (fresh ? '&fresh=1' : ''), { cache: 'no-store' });
      let j = null; try { j = await r.json(); } catch (e) {}
      if (r.ok && j && !j.error) return { data: j };
      return { msg: (j && j.message) || L('The reader answered ', 'Čtečka odpověděla ') + r.status, code: j && j.error };
    } catch (e) { return { setup: true, msg: L('The link reader is not reachable', 'Čtečka odkazů není dostupná') }; }
  }
  const kf = n => { n = +n || 0; const a = Math.abs(n); return a >= 1e9 ? (Math.round(n / 1e8) / 10) + 'B' : a >= 1e6 ? (Math.round(n / 1e5) / 10) + 'M' : a >= 1e4 ? Math.round(n / 1e3) + 'k' : a >= 1e3 ? (Math.round(n / 100) / 10) + 'k' : String(Math.round(n * 100) / 100); };
  function srcSummary(d) { const k = (d.kpis || [])[0]; return [d.sub, k ? kf(k.value) + ' ' + k.label.toLowerCase() + (k.text ? ' · ' + k.text : '') : ''].filter(Boolean).join(' · '); }
  const ago2 = iso => { if (!iso) return ''; const t = +new Date(iso); if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); if (m < 0) { const d = Math.round(-m / 1440); return d < 1 ? L('today', 'dnes') : L('in ', 'za ') + d + L(' d', ' d'); } return m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' d'; };
  const KIND = { youtube: 'YouTube', sheet: 'Google Sheet', calendar: L('Calendar', 'Kalendář'), github: 'GitHub', feed: 'RSS', podcast: 'Podcast' };
  const busy = new Set();
  async function srcRefresh(c, fresh) {
    if (!c || !c.src || busy.has(c.id)) return; busy.add(c.id); const st = srcGet(c.id) || {}; srcPut(c.id, Object.assign({}, st, { loading: true }));
    paintSrc(c.id);
    const r = await srcRead(c.src.url, fresh); busy.delete(c.id);
    if (r.data) srcPut(c.id, { at: Date.now(), data: r.data }); else srcPut(c.id, Object.assign({}, st, { loading: false, err: r.msg, setup: !!r.setup, errAt: Date.now() }));
    paintSrc(c.id);
  }
  const stale = c => { const st = srcGet(c.id); return !st || !st.at || Date.now() - st.at > 15 * 60000; };
  function paintSrc(id) {
    if (V.card === id) { if (isDeskV()) { const m = $('#dCardMain'); if (m) mountSrc(m, true); } else { const el = $('#s-card'); if (el) mountSrc(el, false); } }
    if (V.tab === 'spaces' && !V.card) spacesSrc();
  }
  function series(c, d) {
    if (d.series && d.series.points && d.series.points.length > 1) return { label: d.series.label, pts: d.series.points };
    try { const h = JSON.parse(localStorage.getItem('srch:' + c.id) || '{}'), ks = Object.keys(h).sort(); if (ks.length > 1) return { label: (d.kpis[0] || {}).label || '', pts: ks.map(k => ({ date: k, value: h[k] })) }; } catch (e) {}
    return null;
  }
  /* ---- what the numbers say: plain sentences computed on the device, each can become a task ---- */
  const short = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1).trim() + '…' : t; };
  const days = iso => (Date.now() - +new Date(iso)) / 864e5;
  function insights(c, d) {
    const out = [], it = (d.items || []).filter(x => x.value != null && x.date);
    const add = (t, tone, task) => out.push({ t, tone: tone || '', task: task || '' });
    if (d.kind === 'youtube' && it.length) {
      const tot = it.reduce((a, x) => a + x.value, 0), avg = tot / it.length;
      const best = it.reduce((a, x) => x.value > a.value ? x : a, it[0]), r = best.value / (avg || 1);
      if (r >= 1.3) add(L('“' + short(best.title, 42) + '” has ' + (Math.round(r * 10) / 10) + '× the recent average.', '„' + short(best.title, 42) + '“ má ' + String(Math.round(r * 10) / 10).replace('.', ',') + '× víc než průměr.'), 'up', L('Make another video like “' + short(best.title, 30) + '”', 'Natočit další video jako „' + short(best.title, 30) + '“'));
      const last = days(it[0].date), n30 = it.filter(x => days(x.date) <= 30).length;
      if (last > 7) add(L('No new video for ' + Math.floor(last) + ' days.', Math.floor(last) + ' dní nic nového.'), 'down', L('Plan the next video', 'Naplánovat další video'));
      else add(L('Last video ' + ago2(it[0].date) + ' ago · ' + n30 + ' in 30 days, about ' + (Math.round(n30 / 30 * 7 * 10) / 10) + ' a week.', 'Poslední video před ' + ago2(it[0].date) + ' · ' + n30 + ' za 30 dní, zhruba ' + String(Math.round(n30 / 30 * 7 * 10) / 10).replace('.', ',') + ' týdně.'), '');
      const settled = it.filter(x => days(x.date) >= 2), rec = settled.slice(0, 5), old = settled.slice(5);
      if (rec.length >= 3 && old.length >= 3) { const ar = rec.reduce((a, x) => a + x.value, 0) / rec.length, ao = old.reduce((a, x) => a + x.value, 0) / old.length, p = Math.round((ar / (ao || 1) - 1) * 100);
        if (p <= -15) add(L('The latest videos get ' + (-p) + ' % fewer views than the earlier ones.', 'Poslední videa mají o ' + (-p) + ' % méně zhlédnutí než ta dřívější.'), 'down', L('Look at what changed in the latest videos', 'Projít, co se v posledních videích změnilo'));
        else if (p >= 15) add(L('The latest videos get ' + p + ' % more views than the earlier ones.', 'Poslední videa mají o ' + p + ' % víc zhlédnutí než ta dřívější.'), 'up'); }
      return out.slice(0, 3);
    }
    const sr = d.series && d.series.points && d.series.points.length > 2 ? d.series : null;
    if (sr) { const p = sr.points, a2 = p[Math.max(0, p.length - 8)].value, b2 = p[p.length - 1].value, ch = a2 ? Math.round((b2 / a2 - 1) * 100) : 0;
      if (ch) add(sr.label + ' ' + (ch > 0 ? '+' : '') + ch + ' % ' + L('over the last ' + Math.min(7, p.length - 1) + ' rows.', 'za posledních ' + Math.min(7, p.length - 1) + ' řádků.'), ch > 0 ? 'up' : 'down'); }
    const ev = (d.events || [])[0];
    if (ev) add(L('Next: ' + short(ev.title, 40) + ' · ' + ago2(ev.when) + '.', 'Další: ' + short(ev.title, 40) + ' · ' + ago2(ev.when) + '.'), '', L('Prepare: ', 'Připravit: ') + short(ev.title, 40));
    else if (d.kind === 'calendar') add(L('Nothing planned in the calendar.', 'V kalendáři nic naplánovaného.'), 'down', L('Plan something for this week', 'Naplánovat něco na tento týden'));
    const li = (d.items || []).find(x => x.date);
    if (li && (d.kind === 'feed' || d.kind === 'podcast' || d.kind === 'github')) { const g = days(li.date);
      if (g > 14) add(L('Nothing new for ' + Math.floor(g) + ' days.', Math.floor(g) + ' dní nic nového.'), 'down', d.kind === 'podcast' ? L('Record the next episode', 'Natočit další díl') : L('Write the next post', 'Napsat další příspěvek'));
      else add(L('Latest: ' + short(li.title, 40) + ' · ' + ago2(li.date) + ' ago.', 'Nejnovější: ' + short(li.title, 40) + ' · před ' + ago2(li.date) + '.'), ''); }
    return out.slice(0, 3);
  }
  const askGet = id => { try { return JSON.parse(localStorage.getItem('srca:' + id) || 'null'); } catch (e) { return null; } };
  const askCfg = () => { try { return { pin: localStorage.getItem('srcAskPin') || '', model: localStorage.getItem('srcAskModel') || 'sonnet', effort: localStorage.getItem('srcAskEffort') || 'low' }; } catch (e) { return { pin: '', model: 'sonnet', effort: 'low' }; } };
  const MNAME = { sonnet: 'Claude Sonnet', opus: 'Claude Opus', haiku: 'Claude Haiku' };
  const asking = new Set();
  function sayHTML(c, d) {
    const ins = insights(c, d), A = askGet(c.id), cfg = askCfg(), busyA = asking.has(c.id);
    const row = (x, i) => '<div class="say' + (x.tone ? ' ' + x.tone : '') + '" style="--i:' + i + '"><i></i><span>' + esc(x.t) + '</span>' + (x.task ? '<button class="saytask press" data-a="srcTask" data-id="' + c.id + '" data-t="' + esc(x.task) + '" aria-label="' + esc(L('Add as a task: ', 'Přidat jako úkol: ') + x.task) + '">' + ico('plus', 13, 2.4) + '</button>' : '') + '</div>';
    const ai = A && A.lines && A.lines.length ? '<div class="sayai"><span class="cap">' + esc((MNAME[A.mk] || 'Claude') + ' · ' + new Date(A.at).toLocaleTimeString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' })) + '</span>' + A.lines.map((t, i) => row({ t, tone: '' }, i)).join('') + (A.task ? row({ t: '→ ' + A.task, tone: 'ai', task: A.task }, A.lines.length) : '') + '</div>' : A && A.err ? '<p class="sayerr">' + esc(A.err) + '</p>' : '';
    const btn = cfg.pin ? '<button class="pbtn ghost press askbtn' + (busyA ? ' busy' : '') + '" data-a="srcAsk" data-id="' + c.id + '"' + (busyA ? ' disabled' : '') + '>' + ico('spark', 15, 2.2) + esc(busyA ? L('Aurora is thinking…', 'Aurora přemýšlí…') : A && A.lines ? L('Ask again', 'Zeptat se znovu') : L('Ask Aurora', 'Zeptej se Aurory')) + '</button>'
      : '<button class="lnk asksetup" data-a="srcSetup">' + esc(L('Ask Aurora · set up Claude', 'Zeptej se Aurory · nastavit Claude')) + '</button>';
    return (ins.length ? ins.map(row).join('') : '<p class="muted saynone">' + esc(L('Nothing stands out yet.', 'Zatím nic nevyčnívá.')) + '</p>') + ai + '<div class="askrow">' + btn + '</div>';
  }
  /* bars in the same style as the clipping page; best bar full colour, average as a dashed line */
  function bars(pts, col, avg) {
    const n = pts.length, W = 760, H = 170, step = (W - 40) / n, bw = Math.min(40, step * .62), mx = Math.max(1, ...pts.map(p => p.value));
    const every = n > 16 ? 5 : n > 9 ? 2 : 1, hiV = Math.max(...pts.map(p => p.value));
    const ay = avg ? H + 12 - avg / mx * (H - 14) : 0;
    return '<svg class="kch" viewBox="0 0 ' + W + ' 215" role="img">' + (avg ? '<line x1="16" x2="' + (W - 16) + '" y1="' + ay.toFixed(1) + '" y2="' + ay.toFixed(1) + '" class="kavg"/><text x="' + (W - 18) + '" y="' + (ay - 7).toFixed(1) + '" text-anchor="end" class="kcl">' + esc(L('avg ', 'průměr ') + kf(avg)) + '</text>' : '') + pts.map((p, i) => {
      const x = 20 + i * step + (step - bw) / 2, h = Math.max(2, p.value / mx * (H - 14)), y = H + 12 - h;
      return '<g class="kcb" style="--i:' + i + '"><rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + Math.min(6, bw / 4).toFixed(1) + '" fill="' + col + '" opacity="' + (p.value === hiV ? 1 : .55) + '"><title>' + esc((p.title ? p.title + ' · ' : '') + kf(p.value)) + '</title></rect></g>'
        + (i % every === 0 || i === n - 1 ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H + 34) + '" text-anchor="middle" class="kcl">' + esc(p.label) + '</text>' : '')
        + (n <= 16 ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 8).toFixed(1) + '" text-anchor="middle" class="kct" style="--i:' + i + '">' + kf(p.value) + '</text>' : '');
    }).join('') + '</svg>';
  }
  const dm = iso => { const t = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso); return t.getDate() + '.' + (t.getMonth() + 1) + '.'; };
  function chartOf(c, d) {
    const sr = series(c, d);
    if (sr && d.kind !== 'youtube') return { cap: sr.label + ' · ' + L('by day', 'po dnech'), svg: bars(sr.pts.slice(-30).map(p => ({ label: dm(p.date), value: p.value })), c.color) };
    const it = (d.items || []).filter(x => x.value != null);
    if (it.length > 1) { const pts = it.slice().reverse().map(x => ({ label: dm(x.date), value: x.value, title: x.title })); return { cap: L('Views per video · latest ', 'Zhlédnutí na video · posledních ') + it.length, svg: bars(pts, c.color, it.reduce((a, x) => a + x.value, 0) / it.length) }; }
    return null;
  }
  function tiles(d) {
    const k = (d.kpis || []).slice();
    if (d.kind === 'youtube' && d.sub) { const m = d.sub.match(/^([\d.,]+\s?[KMB]?)/i); if (m) k.unshift({ label: L('Subscribers', 'Odběratelé'), raw: m[1].replace(/\s/g, ''), text: L('public count', 'veřejný počet') }); }
    return k.slice(0, 4);
  }
  const updated = st => st.at ? new Date(st.at).toLocaleTimeString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  function srcPanel(c, desk) {
    const st = srcGet(c.id) || {}, d = st.data, col = c.color, kn = KIND[(d && d.kind) || c.src.kind] || L('Link', 'Odkaz');
    const ref = '<button class="cb frost press srcr' + (st.loading ? ' spin' : '') + '" data-a="srcRefresh" data-id="' + c.id + '" aria-label="' + esc(L('Refresh', 'Obnovit')) + '">' + ico('sync', desk ? 18 : 16, 2.2) + '</button>';
    if (!d) {
      const msg = st.loading || !st.errAt ? L('Reading ', 'Čtu ') + c.src.url.replace(/^https?:\/\//, '').slice(0, 48) + '…' : st.err || L('Could not read it', 'Nepodařilo se přečíst');
      return '<section class="srcp frost solid' + (desk ? ' desk' : '') + '" data-src="' + c.id + '"><div class="srch"><span class="srck"><i style="background:' + col + '"></i>' + esc(kn) + '</span>' + ref + '</div><div class="srce"><b>' + esc(st.setup ? L('The link reader is not set up yet', 'Čtečka odkazů ještě není nastavená') : st.errAt && !st.loading ? L('Could not read the link', 'Odkaz se nepodařilo přečíst') : L('Getting the numbers…', 'Načítám čísla…')) + '</b><span>' + esc(st.setup ? L('One-time setup, about 5 minutes.', 'Jednorázové nastavení, asi 5 minut.') : msg) + '</span>' + (st.setup ? '<button class="pbtn cr press" data-a="srcSetup">' + esc(L('Set it up', 'Nastavit')) + '</button>' : st.errAt && !st.loading ? '<button class="pbtn ghost press" data-a="srcRefresh" data-id="' + c.id + '">' + esc(L('Try again', 'Zkusit znovu')) + '</button>' : '') + '</div></section>';
    }
    const img = (u, cls) => u ? '<img class="' + cls + '" src="' + esc(u) + '" onerror="this.style.visibility=\'hidden\'" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="' + cls + '"></span>';
    const T4 = tiles(d), ch = chartOf(c, d), it = d.items || [], avg = it.filter(x => x.value != null).reduce((a, x, _, A) => a + x.value / A.length, 0);
    const tile = (k, i) => '<section class="pn frost solid kkpi" style="--i:' + i + '"><span class="cap">' + esc(k.label) + '</span><div class="kkn">' + esc(k.raw || kf(k.value)) + '</div><span class="muted ksubl">' + esc(k.text || '') + '</span></section>';
    const say = '<section class="pn frost solid saypn" style="--c:' + col + '"><div class="ph2"><span class="cap">' + esc(L('Aurora says', 'Aurora říká')) + '</span><span class="muted">' + esc(L('tap + to make it a task', '+ udělá z toho úkol')) + '</span></div><div class="saybox" data-say="' + c.id + '">' + sayHTML(c, d) + '</div></section>';
    const best = d.best ? '<a class="pn frost solid bestpn" href="' + esc(d.best.url) + '" target="_blank" rel="noopener">' + img(d.best.thumb, 'bthumb') + '<span class="cap">' + esc(L('Best of the latest', 'Nejlepší z posledních')) + '</span><b>' + esc(d.best.title) + '</b><span class="bnum"><em style="color:' + col + '">' + kf(d.best.value) + '</em> ' + esc(L('views', 'zhlédnutí')) + (avg ? ' · ' + String(Math.round(d.best.value / avg * 10) / 10).replace('.', lang() === 'cs' ? ',' : '.') + '× ' + esc(L('average', 'průměr')) : '') + '</span></a>' : '';
    const evs = (d.events || []).length ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('Coming up', 'Chystá se')) + '</span><span class="muted">' + d.events.length + '</span></div>' + d.events.slice(0, 6).map(x => { const dt = new Date(x.when.length === 10 ? x.when + 'T12:00:00' : x.when); return '<div class="srcit"><span class="srcd"><b>' + dt.getDate() + '.' + (dt.getMonth() + 1) + '.</b>' + (x.when.length > 10 ? '<small>' + dt.toLocaleTimeString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) + '</small>' : '') + '</span><span class="tx"><b>' + esc(x.title) + '</b><small>' + esc(ago2(x.when)) + '</small></span></div>'; }).join('') + '</section>' : '';
    const vsA = v => { if (v == null || !avg) return ''; const r = v / avg; return '<span class="vsa"><span class="khl"><i style="width:' + Math.min(100, r / 2 * 100).toFixed(0) + '%;background:' + (r >= 1 ? col : 'rgba(243,234,216,.35)') + '"></i></span><b class="' + (r >= 1.15 ? 'up' : r <= .85 ? 'down' : '') + '">' + (r >= 1 ? '+' : '') + Math.round((r - 1) * 100) + ' %</b></span>'; };
    const hasV = it.some(x => x.value != null);
    const table = it.length ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(d.itemsLabel || L('Latest', 'Poslední')) + '</span><span class="muted">' + esc(hasV ? L('vs average', 'proti průměru') : it.length + '') + '</span></div><table class="ktb srctb"><tbody>' + it.slice(0, desk ? 8 : 5).map(x => '<tr><td><a class="srcrow" href="' + esc(x.url || d.url || '#') + '" target="_blank" rel="noopener">' + (x.thumb ? img(x.thumb, 'sth') : '') + '<span><b>' + esc(x.title) + '</b><small class="muted">' + esc(x.date ? ago2(x.date) : '') + '</small></span></a></td>' + (hasV ? '<td class="vnum">' + kf(x.value) + '</td>' + (desk ? '<td class="vs">' + vsA(x.value) + '</td>' : '') : '') + '</tr>').join('') + '</tbody></table></section>' : '';
    const chart = ch ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(ch.cap) + '</span><span class="muted">' + esc(d.kind === 'youtube' ? L('history grows from today', 'historie roste od dneška') : '') + '</span></div>' + ch.svg + '</section>' : '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('Over time', 'V čase')) + '</span></div><div class="kwait"><b>' + esc(L('The chart grows from today', 'Graf poroste od dneška')) + '</b><span>' + esc(L('Aurora keeps one number a day.', 'Aurora si každý den uloží jedno číslo.')) + '</span></div></section>';
    const head = '<div class="sdh"><div class="dgrp">' + (d.image ? '<img class="sav" src="' + esc(d.image) + '" onerror="this.remove()" alt="" referrerpolicy="no-referrer">' : '') + '<span class="kdst"><i style="background:' + col + ';box-shadow:none"></i>' + esc(kn) + '</span><span class="kdst"><i></i>' + esc(L('Live · ', 'Živě · ') + updated(st)) + '</span><a class="kdst press" href="' + esc(d.url || c.src.url) + '" target="_blank" rel="noopener">' + esc(L('Open', 'Otevřít')) + ' ' + ico('arrow', 12, 2.4) + '</a></div>' + ref + '</div>';
    if (desk) return '<div class="srcp sdash desk fx-go" data-src="' + c.id + '" style="--c:' + col + '">' + head
      + '<div class="kd4">' + T4.map(tile).join('') + '</div>'
      + '<div class="kd2">' + chart + say + '</div>'
      + (table || best || evs ? '<div class="kd2">' + (table || '<span></span>') + (best || evs || '<span></span>') + '</div>' : '') + '</div>';
    return '<section class="srcp sdash mob fx-go" data-src="' + c.id + '" style="--c:' + col + '">' + head
      + '<div class="kd4 m">' + T4.map(tile).join('') + '</div>' + say + (ch ? chart : '') + best + table + evs + '</section>';
  }
  ACT.srcTask = el => { const c = cardById(el.dataset.id); if (!c) return; const t3 = el.dataset.t; S.items.push({ id: uid(), t: t3, card: c.id, date: T(), created: T() }); save(); haptic && haptic(); toast(esc(L('Added for today', 'Přidáno na dnes')) + ' · ' + esc(short(t3, 34))); if (V.card === c.id) { if (isDeskV()) { const m = $('#desk'), y = m ? m.scrollTop : 0; deskRender(); if (m) m.scrollTop = y; } else { const e3 = $('#s-card'), y = e3.scrollTop; renderCard(); e3.scrollTop = y; } } };
  ACT.srcAsk = async el => {
    const c = cardById(el.dataset.id); if (!c || asking.has(c.id)) return; const st = srcGet(c.id), d = st && st.data; if (!d) return; const cfg = askCfg();
    asking.add(c.id); repaintSay(c);
    const data = { kind: d.kind, title: d.title, sub: d.sub, kpis: d.kpis, items: (d.items || []).slice(0, 15).map(x => ({ title: x.title, date: x.date, value: x.value })), events: (d.events || []).slice(0, 8), series: d.series ? d.series.points.slice(-30) : null, computed: insights(c, d).map(x => x.t), today: T() };
    let o;
    try { const r = await fetch(srcBase() + '/ask', { method: 'POST', headers: { 'content-type': 'text/plain', 'x-aurora-pin': cfg.pin }, body: JSON.stringify({ name: c.name, lang: lang(), model: cfg.model, effort: cfg.effort, data }) }); const j = await r.json().catch(() => null);
      o = r.ok && j && j.lines ? { at: Date.now(), lines: j.lines, task: j.task, mk: cfg.model } : { at: Date.now(), err: j && j.error === 'pin' ? L('Wrong PIN, check it in Settings → Sources → Link reader.', 'Špatný PIN, zkontroluj ho v Settings → Sources → Čtečka odkazů.') : j && j.error === 'noai' ? L('Claude is not set up on the reader yet.', 'Na čtečce ještě není nastavený Claude.') : (j && j.message) || L('Aurora could not answer.', 'Aurora neodpověděla.') }; }
    catch (e) { o = { at: Date.now(), err: L('The link reader is not reachable.', 'Čtečka odkazů není dostupná.') }; }
    try { localStorage.setItem('srca:' + c.id, JSON.stringify(o)); } catch (e) {}
    asking.delete(c.id); repaintSay(c);
  };
  function repaintSay(c) { const st = srcGet(c.id); document.querySelectorAll('.saybox[data-say="' + c.id + '"]').forEach(b => { b.innerHTML = sayHTML(c, st.data); }); }
  function addPanel(c, desk) {
    return '<section class="srcp srcadd frost solid' + (desk ? ' desk' : '') + '" data-src="' + c.id + '"><span class="cap">' + esc(L('Numbers from somewhere?', 'Čísla odněkud?')) + '</span><div class="fld in lkf"><input class="srcin" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(L('Paste a link to your channel, sheet, calendar…', 'Vlož odkaz na kanál, tabulku, kalendář…')) + '" aria-label="' + esc(L('Link', 'Odkaz')) + '"><button class="pbtn cr press srcgo" data-id="' + c.id + '">' + esc(L('Connect', 'Připojit')) + '</button></div></section>';
  }
  function mountSrc(root, desk) {
    const c = cardById(V.card); if (!c || c.type !== 'project' || !root) return;
    const old = root.querySelector('.srcp'); const html = c.src ? srcPanel(c, desk) : addPanel(c, desk);
    if (old) { if (old.classList.contains('srcadd') && !c.src && document.activeElement && old.contains(document.activeElement)) return; old.outerHTML = html; }
    else if (desk) { const t2 = root.querySelector('#dCardTitle'); if (!t2) return; t2.insertAdjacentHTML('afterend', html); }
    else { const after = root.querySelector('.cnote') || root.querySelector('.cname'); if (!after) return; after.insertAdjacentHTML('afterend', html); }
    const p = root.querySelector('.srcp'); const go = p && p.querySelector('.srcgo');
    if (go) { const inp = p.querySelector('.srcin'); const run = () => { const v = inp.value.trim(), k = v && linkKind(v); if (!k) { inp.focus(); return; } if (k.own) { ACT.srcAdv(); return; } c.src = { url: v, kind: k.k }; save(); mountSrc(root, desk); srcRefresh(c, true); };
      go.onclick = run; inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } }); }
    if (c.src && stale(c) && !busy.has(c.id)) { const st = srcGet(c.id); if (!st || !st.errAt || Date.now() - st.errAt > 60000) srcRefresh(c); }
  }
  ACT.srcRefresh = el => { const c = cardById(el.dataset.id); if (c) srcRefresh(c, true); };
  /* Spaces: the card's subtitle becomes the source's numbers */
  function spacesSrc() {
    S.cards.filter(c => c.src).forEach(c => { const st = srcGet(c.id); if (stale(c) && !busy.has(c.id) && (!st || !st.errAt || Date.now() - st.errAt > 300000)) setTimeout(() => srcRefresh(c), 400);
      if (!st || !st.data) return; const t3 = srcSummary(st.data);
      document.querySelectorAll('#deck > .spc[data-id="' + c.id + '"] .sub, #desk .dcard[data-id="' + c.id + '"] .dsub').forEach(n => { n.textContent = t3; n.classList.add('srcsub'); });
      document.querySelectorAll('#s-spaces .stack > .lrow[data-id="' + c.id + '"] .tx small').forEach(n => { n.textContent = (KIND[st.data.kind] || '') + ' · ' + t3; }); });
  }
  /* hook the card page and Spaces on phone and computer */
  const _rc = renderCard; renderCard = function () { _rc(); if (!isDeskV()) mountSrc($('#s-card'), false); };
  document.addEventListener('DOMContentLoaded', () => {
    const _rs = renderSpaces; renderSpaces = function () { _rs(); if (!V.spEdit) spacesSrc(); }; if (typeof RENDER !== 'undefined') RENDER.spaces = renderSpaces;
    if (typeof deskRender === 'function') { const _d = deskRender; deskRender = function (a) { _d(a); if (!isDeskV()) return; if (V.card) mountSrc($('#dCardMain'), true); else if (V.tab === 'spaces') spacesSrc(); }; }
  });
  setInterval(() => { if (!document.hidden && S && S.cards) S.cards.filter(c => c.src && stale(c)).slice(0, 3).forEach(c => srcRefresh(c)); }, 10 * 60000);

  /* one-time setup of the link reader */
  function srcSetupSheet() {
    openSheet({ title: L('Link reader', 'Čtečka odkazů'), body: '<p class="lkp">' + esc(L('A small program on your Cloudflare account that reads public links for Aurora. Set it up once, it then works for every card and device.', 'Malý program na tvém Cloudflare účtu, který čte veřejné odkazy pro Auroru. Nastavíš ho jednou a pak funguje pro všechny karty a zařízení.')) + '</p>'
      + '<span class="cap">' + esc(L('Address', 'Adresa')) + '</span><div class="fld in lkf" style="margin-top:8px"><input id="srcUrl" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(srcBase()) + '"><button class="pbtn ghost press" id="srcTest">' + esc(L('Test', 'Otestovat')) + '</button></div><div id="srcSt" class="rnout"></div>'
      + '<p class="rnfoot" style="text-align:left">' + esc(L('If you named the Worker “aurora-reader”, the address is already right.', 'Když jsi Worker pojmenoval „aurora-reader“, adresa už sedí.')) + '</p>'
      + '<span class="cap" style="display:block;margin-top:22px">' + esc(L('Ask Aurora · Claude', 'Zeptej se Aurory · Claude')) + '</span><p class="lkp" style="margin-top:6px">' + esc(L('Optional. Needs your Anthropic API key saved on the reader in Cloudflare, plus a PIN you choose. Type the same PIN here.', 'Nepovinné. Na čtečce v Cloudflare musí být tvůj Anthropic API klíč a PIN, který si zvolíš. Sem napiš stejný PIN.')) + '</p>'
      + '<div class="fld in lkf"><input id="srcPin" type="password" inputmode="numeric" autocomplete="off" placeholder="' + esc(L('PIN', 'PIN')) + '" value="' + esc(askCfg().pin) + '"></div>'
      + '<div class="seg frost rnseg" id="srcModel" style="margin-top:12px">' + [['sonnet', 'Sonnet'], ['opus', 'Opus']].map(([k, l]) => '<button data-k="' + k + '" class="' + (askCfg().model === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>'
      + '<div class="seg frost rnseg" id="srcEffort" style="margin-top:8px">' + [['low', L('Quick', 'Rychle')], ['medium', L('Deeper', 'Důkladněji')]].map(([k, l]) => '<button data-k="' + k + '" class="' + (askCfg().effort === k ? 'on' : '') + '">' + esc(l) + '</button>').join('') + '</div>'
      + '<p class="rnfoot" style="text-align:left">' + esc(L('Sonnet + Quick costs the least. Opus thinks harder and costs more.', 'Sonnet + Rychle stojí nejméně. Opus přemýšlí víc a stojí víc.')) + '</p>',
      right: L('Save', 'Uložit'), onSave: () => { const v = $('#srcUrl').value.trim(); try { if (!v || v === SRC_DEFAULT) localStorage.removeItem('srcServer'); else localStorage.setItem('srcServer', v); localStorage.setItem('srcAskPin', $('#srcPin').value.trim()); const m = $('#srcModel .on'), e2 = $('#srcEffort .on'); if (m) localStorage.setItem('srcAskModel', m.dataset.k); if (e2) localStorage.setItem('srcAskEffort', e2.dataset.k); } catch (e) {} closeSheet(true); S.cards.filter(c => c.src).forEach(c => srcRefresh(c, true)); if (V.settingsOpen) renderSettings(); },
      mount: el => { el.querySelectorAll('#srcModel button,#srcEffort button').forEach(b => b.onclick = () => { b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
        el.querySelector('#srcTest').onclick = async () => { const st = el.querySelector('#srcSt'), base = el.querySelector('#srcUrl').value.trim().replace(/\/+$/, ''); st.innerHTML = '<span class="rnl">' + esc(L('Testing…', 'Testuju…')) + '</span>';
        try { const j = await (await fetch(base + '/ping', { cache: 'no-store' })).json(); st.innerHTML = j && j.ok ? '<span class="rnl"><i style="background:#8be0b0"></i><b>' + esc(L('Works', 'Funguje')) + '</b> · v' + j.v + ' · ' + esc(j.ask ? L('Claude ready', 'Claude připravený') : L('Claude not set up', 'Claude nenastavený')) + '</span>' : '<span class="rnl"><i style="background:#ff8a8a"></i><b>' + esc(L('Not a reader', 'Tohle není čtečka')) + '</b></span>'; }
        catch (e) { st.innerHTML = '<span class="rnl"><i style="background:#ff8a8a"></i><b>' + esc(L('Not reachable', 'Nedostupné')) + '</b> · ' + esc(L('check the address and that you pressed Deploy', 'zkontroluj adresu a že jsi dal Deploy')) + '</span>'; } }; } });
  }
  ACT.srcSetup = () => { if (SH.open) after(srcSetupSheet); else srcSetupSheet(); };
})();
