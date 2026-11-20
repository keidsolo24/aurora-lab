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
    kLoading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/keiro.js?v=2019'; s.onload = () => res(window.KR); s.onerror = rej; document.head.appendChild(s); });
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
    const sg = src.querySelector('.grp'); if (sg) sg.insertAdjacentHTML('beforeend', '<button class="srow" data-a="srcLink"><span class="ci" style="width:30px;height:30px;border-radius:15px">' + ico('plus', 15, 2.2) + '</span><span class="tx">' + esc(L('Connect a source', 'Připojit zdroj')) + '<small>' + esc(L('Paste a link to what you run', 'Vlož odkaz na to, co provozuješ')) + '</small></span><span class="r">' + ico('chev', 14, 2.4) + '</span></button>');
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
  ACT.ncRun = () => after(() => openCardSheet(null, blankCard('project')));

  /* ---------- Paste a link: Aurora says what it is. Reading the sources themselves comes next; nothing is faked. ---------- */
  function linkKind(raw) {
    let u; try { u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : 'https://' + raw); } catch (e) { return null; }
    const h = u.hostname.replace(/^www\./, '').toLowerCase(), p = u.pathname; if (!h.includes('.')) return null;
    const first = (p.split('/').filter(Boolean)[0] || '').replace(/^@/, '');
    if (/(^|\.)youtube\.com$|^youtu\.be$/.test(h)) return { k: 'youtube', label: L('YouTube channel', 'YouTube kanál'), name: /^@/.test(p.slice(1)) ? first : '', soon: true, will: L('subscribers, views and your latest videos', 'odběratele, zhlédnutí a poslední videa') };
    if (h === 'docs.google.com' && /^\/spreadsheets\//.test(p)) return { k: 'sheet', label: 'Google Sheet', name: '', soon: true, will: L('your numbers as a chart and rows with a date in Plan', 'tvoje čísla jako graf a řádky s datem v Plan') };
    if (h === 'calendar.google.com' || /\.ics$/i.test(p) || u.protocol === 'webcal:') return { k: 'calendar', label: L('Calendar', 'Kalendář'), name: '', soon: true, will: L('its events in Plan', 'jeho události v Plan') };
    if (/\.ts\.net$/.test(h) || /^\/api(\/|$)/.test(p)) return { k: 'own', label: L('Own automation', 'Vlastní automatizace'), name: h.split('.')[0], own: true };
    const nm = h.split('.').slice(-2, -1)[0] || h; return { k: 'other', host: h, label: nm.charAt(0).toUpperCase() + nm.slice(1), name: first, soon: false };
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
            + (k.own ? '<button class="pbtn cr press" data-a="srcAdv">' + esc(L('Set up the connection', 'Nastavit připojení')) + '</button>' : '<button class="pbtn cr press" id="lkGo">' + esc(L('Create the project for now', 'Zatím založit projekt')) + '</button>') + '</div>';
          const go = out.querySelector('#lkGo'); if (go) go.onclick = () => { try { const w = JSON.parse(localStorage.getItem('srcWant') || '[]'); w.push({ k: k.k, host: k.host || k.k, at: Date.now() }); localStorage.setItem('srcWant', JSON.stringify(w.slice(-50))); } catch (e) {} const c = blankCard('project'); c.name = k.name || k.label; after(() => openCardSheet(null, c)); };
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
})();
