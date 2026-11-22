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
    kLoading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/keiro.js?v=2044'; s.onload = () => res(window.KR); s.onerror = rej; document.head.appendChild(s); });
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
  /* Spaces on the computer: the last row is always full (the "new card" tile takes what is left), and "All · n" counts every card shown */
  function fillGrid(d) {
    const g = d && d.querySelector('.dcards'); if (!g) return;
    g.querySelectorAll('.dnew').forEach(x => x.remove());
    const items = [...g.children], cols = getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length || 4, rem = items.length % cols;
    if (rem) g.insertAdjacentHTML('beforeend', '<button class="pn dcard dnew press" data-a="newCard" style="grid-column:span ' + (cols - rem) + '"><span class="ci" style="width:56px;height:56px;border-radius:28px">' + ico('plus', 24, 1.8) + '</span><b>' + esc(t('newCard')) + '</b><span class="muted">' + esc(t('newCardSub')) + '</span></button>');
    const all = d.querySelector('[data-a="dDeck"][data-k="all"]'); if (all && (V.deckFilter || 'all') === 'all') all.textContent = t('all') + ' · ' + items.length;
  }
  function fixCount() { const dk = [...document.querySelectorAll('#deck > .spc[data-id], #deck > .kspc')]; dk.forEach((el, i) => { const m = el.querySelector(':scope > .h > .muted'); if (m && /^\d+ \/ \d+$/.test(m.textContent.trim())) m.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(dk.length).padStart(2, '0'); }); const n = document.querySelectorAll('#s-spaces .stack > .lrow:not([data-a="newCard"]), #s-spaces .stack > .kspc, #deck > .spc[data-id], #deck > .kspc').length; const all = document.querySelector('#s-spaces [data-a="deckFilter"][data-k="all"]'); if (all && n && (V.deckFilter || 'all') === 'all') all.textContent = t('all') + ' · ' + n; }
  /* everything is loaded by now: put the widget into the stack and hook the "entering a screen" moments */
  document.addEventListener('DOMContentLoaded', () => {
    const isDesk = () => typeof DESK !== 'undefined' && DESK.on;
    if (typeof stackCards === 'function') { const _sc = stackCards; stackCards = function (M) { return withWidget(_sc(M)); }; }
    if (typeof deskRender === 'function') { const _dr = deskRender; deskRender = function (a) { if (V.spEdit && isDesk()) return; _dr(a); const d = $('#desk'); if (window.KR && KR.deskHook && isDesk()) KR.deskHook(d); if (isDesk() && V.tab === 'spaces' && !V.card && !V.kd) spApply(d.querySelector('.dcards'), '.dcard'); if (isDesk() && V.tab === 'spaces' && !V.card && !V.kd) fillGrid(d); if (a === true && isDesk()) FX.enter(d.querySelector('main.dmain'), { noStagger: true }); }; }
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
      body: '<span class="cap rncap" style="margin-top:2px">' + esc(L('Connect numbers · optional', 'Připojit čísla · nepovinné')) + '</span><div class="fld in lkf rnlk">' + ico('sync', 16, 2.2) + '<input id="rnLink" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(L('Paste a link · youtube.com/@name, a Google Sheet…', 'Vlož odkaz · youtube.com/@jmeno, Google tabulka…')) + '" value="' + esc(R.link) + '" aria-label="' + esc(L('Link', 'Odkaz')) + '"></div>'
        + '<div class="rnsrc">' + ['YouTube', 'Google Sheets', L('Calendar', 'Kalendář'), 'GitHub', L('Blog · Podcast', 'Blog · Podcast')].map(x => '<span>' + esc(x) + '</span>').join('') + '</div><div id="rnOut" class="rnout" aria-live="polite"></div>'
        + '<span class="cap rncap">' + esc(L('Name', 'Název')) + '</span><div class="fld in big kname rn"><input id="rnName" maxlength="60" autocomplete="off" enterkeyhint="done" placeholder="' + esc(L('e.g. KEID channel, Studio Lumen', 'např. KEID kanál, Studio Lumen')) + '" value="' + esc(R.name) + '" aria-label="' + esc(L('Name', 'Název')) + '"></div>'
        + '<div id="rnDl"><span class="cap rncap">' + esc(L('Deadline · only if it ends', 'Termín · jen když to končí')) + '</span><div class="seg frost rnseg" role="group">' + dls.map(([k, l], i) => '<button data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '">' + esc(l) + '</button>').join('') + '</div><input id="rnDate" type="date" class="rndate" hidden aria-label="' + esc(L('Deadline date', 'Datum termínu')) + '"></div>'
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
        const dlw = el.querySelector('#rnDl');
        const show = () => { const v = ln.value.trim(); R.k = v ? linkKind(v) : null; R.data = null; const k = R.k; clearTimeout(tm);
          const ong = !!(k && !k.own); dlw.hidden = ong; if (ong) { R.dl = null; seg.forEach((x, i) => x.classList.toggle('on', i === 0)); dt.hidden = true; }
          if (!v) { out.innerHTML = ''; return; }
          if (!k) { out.innerHTML = '<span class="rnl">' + esc(L('That does not look like a link yet', 'Tohle ještě nevypadá jako odkaz')) + '</span>'; return; }
          if (k.own) { out.innerHTML = line('#8be0b0', L('Own automation', 'Vlastní automatizace'), L('set it up in Settings → Sources', 'nastavíš v Settings → Sources')); return; }
          if (!R.name.trim() && k.name) { R.name = k.name; nm.value = k.name; upd(); }
          out.innerHTML = line('#f0c46b', L('Reading…', 'Čtu…'), k.label);
          const my = ++seq; tm = setTimeout(async () => { const r = await srcRead(v); if (my !== seq) return;
            if (r.data) { R.data = r.data; const d = r.data; out.innerHTML = '<div class="rnfound frost">' + (d.image ? '<img src="' + esc(d.image) + '" onerror="this.remove()" alt="" referrerpolicy="no-referrer">' : '') + '<span class="tx"><small>' + esc(L('Found', 'Nalezeno') + ' · ' + (KIND[d.kind] || '')) + '</small><b>' + esc(d.title) + '</b>' + (d.sub ? '<small>' + esc(tr(d.sub)) + '</small>' : '') + '</span></div>' + (d.kind === 'sheet' && (d.plain || !(d.kpis || []).length) ? '<p class="rnhint">' + ico('spark', 13, 2.2) + esc(L('Aurora will learn this sheet with Claude in the card.', 'Tuhle tabulku se Aurora v kartě naučí s Claudem.')) + '</p>' : '<div class="rnkp">' + tiles(d).slice(0, 3).map(k => '<span><b>' + esc(k.raw || kf(k.value)) + '</b>' + esc(k.label) + '</span>').join('') + '</div>'); if ((!R.name.trim() || R.name === k.name) && d.title && d.title !== 'Google Sheet') { R.name = d.title; nm.value = d.title; upd(); } }
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
      const ERR = { private: L('The sheet is private. In Google Sheets: Share → Anyone with the link → Viewer.', 'Tabulka je soukromá. V Google Sheets: Sdílet → Kdokoli s odkazem → Čtenář.'), unsupported: L('This service does not share its data publicly.', 'Tahle služba svoje data veřejně nesdílí.'), ytpath: L('Paste the link of a channel, e.g. youtube.com/@name', 'Vlož odkaz na kanál, např. youtube.com/@jmeno'), notfound: L('Nothing found at that link.', 'Na tom odkazu nic není.'), empty: L('The sheet is empty.', 'Tabulka je prázdná.'), ytnoid: L('Could not find that channel.', 'Ten kanál se nepodařilo najít.'), ytempty: L('The channel has no public videos.', 'Kanál nemá žádná veřejná videa.') };
      return { msg: (j && ERR[j.error]) || (j && j.message) || L('The reader answered ', 'Čtečka odpověděla ') + r.status, code: j && j.error };
    } catch (e) { return { setup: true, msg: L('The link reader is not reachable', 'Čtečka odkazů není dostupná') }; }
  }
  const kf = n => { n = +n || 0; const a = Math.abs(n); return a >= 1e9 ? (Math.round(n / 1e8) / 10) + 'B' : a >= 1e6 ? (Math.round(n / 1e5) / 10) + 'M' : a >= 1e4 ? Math.round(n / 1e3) + 'k' : a >= 1e3 ? (Math.round(n / 100) / 10) + 'k' : String(Math.round(n * 100) / 100); };
  function srcSummary(d) { const k = (d.kpis || [])[0]; return [tr(d.sub), k ? kf(k.value) + ' ' + tr(k.label).toLowerCase() + (k.text ? ' · ' + tr(k.text) : '') : ''].filter(Boolean).join(' · '); }
  const ago2 = iso => { if (!iso) return ''; const t = +new Date(iso); if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); if (m < 0) { const d = Math.round(-m / 1440); return d < 1 ? L('today', 'dnes') : L('in ', 'za ') + d + L(' d', ' d'); } return m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' d'; };
  const KIND = { youtube: 'YouTube', sheet: 'Google Sheet', get calendar() { return L('Calendar', 'Kalendář'); }, github: 'GitHub', feed: 'RSS', podcast: 'Podcast' };
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
    if (d.kind === 'calendar') {
      const ev = evsOf(d), d7 = Array.from({ length: 7 }, (_, i) => addD(T(), i)), cnt = d7.map(x => ev.filter(e => e.day === x).length), n7 = cnt.reduce((a, b) => a + b, 0);
      if (!ev.length) add(L('Nothing planned in the calendar.', 'V kalendáři nic naplánovaného.'), 'down', L('Plan something for this week', 'Naplánovat něco na tento týden'));
      else if (!n7) add(L('Free week, the next thing is ' + untilTxt(ev[0]).toLowerCase() + '.', 'Volný týden, další věc je ' + untilTxt(ev[0]).toLowerCase() + '.'), 'up');
      else { const mx = Math.max(...cnt), bi = cnt.indexOf(mx), free = cnt.filter(x => !x).length;
        add(mx > 1 ? L('Busiest day: ' + wd(d7[bi]) + ' (' + mx + '), ' + free + ' free days this week.', 'Nejnabitější den: ' + wd(d7[bi]) + ' (' + mx + '), volných dní tento týden: ' + free + '.') : L(n7 + ' this week, ' + free + ' free days.', 'Tento týden ' + n7 + (n7 === 1 ? ' událost' : n7 < 5 ? ' události' : ' událostí') + ', volných dní: ' + free + '.'), mx >= 3 ? 'down' : '', mx > 1 ? L('Prepare for ', 'Připravit se na ') + wd(d7[bi]) : ''); }
      return out.slice(0, 3);
    }
    const ev = (d.events || [])[0];
    if (ev) add(L('Next: ' + short(ev.title, 40) + ' · ' + ago2(ev.when) + '.', 'Další: ' + short(ev.title, 40) + ' · ' + ago2(ev.when) + '.'), '', L('Prepare: ', 'Připravit: ') + short(ev.title, 40));
    const dd = (d.items || []).filter(x => x.date).sort((a, b) => a.date < b.date ? 1 : -1), li = dd[0];
    if (li && (d.kind === 'feed' || d.kind === 'podcast' || d.kind === 'github')) { const g = days(li.date), gaps = dd.slice(0, 6).map((x, i, A) => i ? days(x.date) - days(A[i - 1].date) : null).filter(x => x != null && x >= 0), gap = gaps.length >= 2 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;
      const what = d.kind === 'podcast' ? L('episode', 'díl') : d.kind === 'github' ? L('release', 'vydání') : L('post', 'příspěvek'), nov = d.kind === 'github' ? 'Nové' : 'Nový', nw = d.kind === 'github' ? 'nové' : 'nový';
      if (gap && g > gap * 1.5 && g > 7) add(L('Usually a new ' + what + ' every ' + gap + ' days, now ' + Math.floor(g) + ' days nothing.', 'Obvykle ' + nw + ' ' + what + ' každých ' + gap + ' ' + dny(gap) + ', teď ' + Math.floor(g) + ' dní nic.'), 'down', d.kind === 'podcast' ? L('Record the next episode', 'Natočit další díl') : d.kind === 'github' ? L('Check what is waiting for a release', 'Projít, co čeká na vydání') : L('Write the next post', 'Napsat další příspěvek'));
      else if (gap) { const nxD = addD(isoL(new Date(li.date)), gap); add(L('A new ' + what + ' about every ' + gap + ' days, the next one around ' + wd(nxD < T() ? T() : nxD), nov + ' ' + what + ' zhruba každých ' + gap + ' ' + dny(gap) + ', další kolem ' + wd(nxD < T() ? T() : nxD)), ''); }
      else if (g > 14) add(L('Nothing new for ' + Math.floor(g) + ' days.', Math.floor(g) + ' dní nic nového.'), 'down', d.kind === 'podcast' ? L('Record the next episode', 'Natočit další díl') : L('Write the next post', 'Napsat další příspěvek'));
      else add(L('Latest ' + ago2(li.date) + ' ago.', 'Nejnovější před ' + ago2(li.date) + '.'), ''); }
    return out.slice(0, 3);
  }
  const askGet = id => { try { return JSON.parse(localStorage.getItem('srca:' + id) || 'null'); } catch (e) { return null; } };
  /* v2033 · AI limit: the reader counts calls per account; Aurora remembers what is left today */
  const aiUser = () => { try { if (S && S.acc && S.acc.id) return String(S.acc.id); let d = localStorage.getItem('aiDev'); if (!d) { d = 'd' + Math.random().toString(36).slice(2, 12); localStorage.setItem('aiDev', d); } return d; } catch (e) { return 'anon'; } };
  const aiSeen = j => { if (!j || j.limit == null) return; try { localStorage.setItem('aiQuota', JSON.stringify({ d: T(), left: j.left == null ? null : j.left, limit: j.limit })); } catch (e) {} };
  const aiLeft = () => { try { const q = JSON.parse(localStorage.getItem('aiQuota') || 'null'); return q && q.d === T() ? q : null; } catch (e) { return null; } };
  const askCfg = () => { try { return { pin: localStorage.getItem('srcAskPin') || '', model: localStorage.getItem('srcAskModel') || 'sonnet', effort: localStorage.getItem('srcAskEffort') || 'low' }; } catch (e) { return { pin: '', model: 'sonnet', effort: 'low' }; } };
  const MNAME = { sonnet: 'Claude Sonnet', opus: 'Claude Opus', haiku: 'Claude Haiku' };
  const asking = new Set();
  function sayHTML(c, d) {
    const ins = insights(c, d), A = askGet(c.id), cfg = askCfg(), busyA = asking.has(c.id);
    const row = (x, i) => '<div class="say' + (x.tone ? ' ' + x.tone : '') + '" style="--i:' + i + '"><i></i><span>' + esc(x.t) + '</span>' + (x.task ? '<button class="saytask press" data-a="srcTask" data-id="' + c.id + '" data-t="' + esc(x.task) + '" aria-label="' + esc(L('Add as a task: ', 'Přidat jako úkol: ') + x.task) + '">' + ico('plus', 13, 2.4) + '</button>' : '') + '</div>';
    const ai = A && A.lines && A.lines.length ? '<div class="sayai"><span class="cap">' + esc((MNAME[A.mk] || 'Claude') + ' · ' + new Date(A.at).toLocaleTimeString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' })) + '</span>' + A.lines.map((t, i) => row({ t, tone: '' }, i)).join('') + (A.task ? row({ t: '→ ' + A.task, tone: 'ai', task: A.task }, A.lines.length) : '') + '</div>' : A && A.err ? '<p class="sayerr">' + esc(A.err) + '</p>' : '';
    const btn = cfg.pin ? '<button class="pbtn ghost press askbtn' + (busyA ? ' busy' : '') + '" data-a="srcAsk" data-id="' + c.id + '"' + (busyA ? ' disabled' : '') + '>' + ico('spark', 15, 2.2) + esc(busyA ? L('Aurora is thinking…', 'Aurora přemýšlí…') : A && A.lines ? L('Ask again', 'Zeptat se znovu') : L('Ask Aurora', 'Zeptej se Aurory')) + '</button>'
      : '<button class="lnk asksetup" data-a="srcSetup">' + esc(L('Ask Aurora · set up Claude', 'Zeptej se Aurory · nastavit Claude')) + '</button>';
    const learn = d.kind === 'sheet' && cfg.pin ? '<button class="lnk asksetup" data-a="srcRecipe" data-id="' + c.id + '">' + ico('spark', 13, 2.2) + ' ' + esc(L('Let Aurora understand the sheet better', 'Nech Auroru tabulku pochopit líp')) + '</button>' : '';
    return (ins.length ? ins.map(row).join('') : '<p class="muted saynone">' + esc(L('Nothing stands out yet.', 'Zatím nic nevyčnívá.')) + '</p>') + ai + '<div class="askrow">' + btn + learn + '</div>';
  }
  /* bars in the same style as the clipping page; best bar full colour, average as a dashed line */
  function bars(pts, col, avg, W, cid) {
    W = W || 760; const cmp = W < 600, n = pts.length, H = 170, step = (W - 40) / n, bw = Math.min(40, step * .62), mx = Math.max(1, ...pts.map(p => p.value));
    const every = cmp ? Math.max(1, Math.ceil(n / 4)) : n > 16 ? 5 : n > 9 ? 2 : 1, hiV = Math.max(...pts.map(p => p.value));
    const ay = avg ? H + 12 - avg / mx * (H - 14) : 0;
    return '<svg class="kch" viewBox="0 0 ' + W + ' 215" role="img">' + (avg ? '<line x1="16" x2="' + (W - 16) + '" y1="' + ay.toFixed(1) + '" y2="' + ay.toFixed(1) + '" class="kavg"/>' : '') + pts.map((p, i) => {
      const x = 20 + i * step + (step - bw) / 2, h = Math.max(2, p.value / mx * (H - 14)), y = H + 12 - h;
      return '<g class="kcb' + (cid && p.ix != null ? ' kclk' : '') + '" style="--i:' + i + '"' + (cid && p.ix != null ? ' data-a="srcVid" data-id="' + cid + '" data-i="' + p.ix + '"' : '') + '><rect x="' + (x - (step - bw) / 2).toFixed(1) + '" y="0" width="' + step.toFixed(1) + '" height="' + (H + 40) + '" fill="transparent"/><rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + Math.min(6, bw / 4).toFixed(1) + '" fill="' + col + '" opacity="' + (p.value === hiV ? 1 : .55) + '"><title>' + esc((p.title ? p.title + ' · ' : '') + kf(p.value)) + '</title></rect></g>'
        + (i % every === 0 || i === n - 1 ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H + 34) + '" text-anchor="middle" class="kcl">' + esc(p.label) + '</text>' : '')
        + ((cmp ? p.value === hiV || i === n - 1 : n <= 16) ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 8).toFixed(1) + '" text-anchor="middle" class="kct" style="--i:' + i + '">' + kf(p.value) + '</text>' : '');
    }).join('') + '</svg>';
  }
  const dm = iso => { const t = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso); return t.getDate() + '.' + (t.getMonth() + 1) + '.'; };
  function chartOf(c, d, desk) {
    const W = desk ? 1400 : 440;
    const sr = series(c, d);
    if (sr && d.kind !== 'youtube') return { cap: sr.label + ' · ' + L('by day', 'po dnech'), svg: bars(sr.pts.slice(-30).map(p => ({ label: dm(p.date), value: p.value })), c.color, 0, W) };
    const it = (d.items || []).filter(x => x.value != null);
    if (it.length > 1) { const pts = it.map((x, ix) => ({ label: dm(x.date), value: x.value, title: x.title, ix })).reverse(); return { cap: L('Views per video · latest ', 'Zhlédnutí na video · posledních ') + it.length, svg: bars(pts, c.color, it.reduce((a, x) => a + x.value, 0) / it.length, W, c.id) }; }
    return null;
  }
  const TRL = { 'Views': 'Zhlédnutí', 'Per video': 'Na video', 'New': 'Nová videa', 'average': 'průměr', 'videos in 30 days': 'videí za 30 dní', 'Latest videos': 'Poslední videa', 'This week': 'Tento týden', 'events': 'událostí', 'Coming up': 'Chystá se', 'events ahead': 'nadcházejících', 'Stars': 'Hvězdy', 'Open issues': 'Otevřené issues', 'Forks': 'Forky', 'total': 'celkem', 'and pull requests': 'a pull requesty', 'Episodes': 'Díly', 'Posts': 'Příspěvky', 'in 30 days': 'za 30 dní', 'In the feed': 'Ve feedu', 'latest': 'nejnovější', 'Latest rows': 'Poslední řádky', 'Latest episodes': 'Poslední díly', 'Latest posts': 'Poslední příspěvky', 'Releases': 'Vydání', 'Latest releases': 'Poslední vydání' };
  const tr = t => { if (lang() !== 'cs' || !t) return t; if (TRL[t]) return TRL[t]; let m; if ((m = String(t).match(/^last (\d+) videos$/))) return 'posledních ' + m[1] + ' videí'; if ((m = String(t).match(/^([+-][\d.,kMB]+) since the row before$/))) return m[1] + ' od minulého řádku'; if ((m = String(t).match(/^([\d.,]+[KMB]?) subscribers$/i))) return m[1] + ' odběratelů'; if ((m = String(t).match(/^(\d+) rows · (\d+) columns$/))) return m[1] + ' řádků · ' + m[2] + ' sloupců'; return t; };
  function tiles(d) {
    const k = (d.kpis || []).map(x => Object.assign({}, x, { label: tr(x.label), text: tr(x.text) }));
    if (d.kind === 'youtube' && d.sub) { const m = d.sub.match(/^([\d.,]+\s?[KMB]?)/i); if (m) k.unshift({ label: L('Subscribers', 'Odběratelé'), raw: m[1].replace(/\s/g, '').toUpperCase(), text: L('public count', 'veřejný počet') }); }
    return k.slice(0, 4);
  }
  const updated = st => st.at ? new Date(st.at).toLocaleTimeString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  /* ================= Recipes: Claude reads a sheet once, Aurora builds the view from its own blocks ================= */
  const MON = ['jan|led', 'feb|úno|uno', 'mar|bře|bre', 'apr|dub', 'may|kvě|kve|máj|maj', 'jun|čer(?!v)|cer(?!v)|červen$|cerven$', 'jul|čvc|červenec|cervenec', 'aug|srp', 'sep|zář|zar', 'oct|říj|rij', 'nov|lis', 'dec|pro'];
  function monthOf(v) { v = String(v || '').trim().toLowerCase(); if (!v) return 0; let m = v.match(/^\d{1,2}\.\s?(\d{1,2})\./) || v.match(/^\d{4}-(\d{1,2})/); if (m) return +m[1];
    if (/^(1[0-2]|[1-9])$/.test(v)) return +v; for (let i = 11; i >= 0; i--) if (new RegExp('^(' + MON[i] + ')').test(v)) return i + 1; return 0; }
  const iso = (y, m, d) => y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  function pdateC(v) { const s2 = String(v || '').trim(); let m; if ((m = s2.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return iso(+m[1], +m[2], +m[3]); if ((m = s2.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/))) return iso(+m[3], +m[2], +m[1]); if ((m = s2.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return iso(+m[3], +m[1], +m[2]); return null; }
  function pnumC(v) { let s2 = String(v == null ? '' : v).trim().replace(/[\s ]|Kč|CZK|€|\$|%/g, ''); if (!s2 || !/^-?[\d.,]+$/.test(s2)) return null; if (/,\d{1,2}$/.test(s2) && !/\.\d{1,2}$/.test(s2)) s2 = s2.replace(/\./g, '').replace(',', '.'); else s2 = s2.replace(/,/g, ''); const n = parseFloat(s2); return isFinite(n) ? n : null; }
  /* turn the sheet + recipe into plain records */
  function model(rc, g) {
    if (!rc || !g) return null;
    if (rc.shape === 'matrix' && rc.matrix) {
      const M = rc.matrix, dr = g[M.dayRow] || [], mr = M.monthRow != null ? g[M.monthRow] || [] : [], width = Math.max(...g.map(r => r.length));
      let mon = M.startMonth || 1, yr = M.year || new Date().getFullYear(), prev = 0; const days = [];
      for (let col = M.firstCol || 1; col < width; col++) {
        const cell = String(dr[col] || '').trim(); if (!cell) continue;
        const full = pdateC(cell); if (full) { days.push({ col, date: full }); continue; }
        const dm2 = cell.match(/^(\d{1,2})\.\s?(\d{1,2})\.?/); const dn = dm2 ? +dm2[1] : +((cell.match(/(\d{1,2})/) || [])[1] || 0); if (!dn || dn > 31) continue;
        const mm = monthOf(mr[col]); if (dm2) mon = +dm2[2]; else if (mm) mon = mm; else if (dn < prev) mon++;
        if (mon > 12) { mon = 1; yr++; } prev = dn; days.push({ col, date: iso(yr, mon, dn) });
      }
      const last = M.lastRow != null ? M.lastRow : g.length - 1, people = [];
      for (let row = M.firstRow || 0; row <= last && row < g.length; row++) { const lab = String((g[row] || [])[M.labelCol || 0] || '').trim(); if (!lab) continue; if (!days.some(d2 => String(g[row][d2.col] || '').trim())) continue; people.push({ row, label: lab }); }
      const codes = rc.codes || {}, isOff = v => !v || (codes[v] && codes[v].off);
      const at = (p, date) => { const d2 = days.find(x => x.date === date); return d2 ? String(g[p.row][d2.col] || '').trim() : ''; };
      /* a second row under each person often holds the times (8-15); use it when the recipe says so or when it clearly looks like times */
      const TM = /^\d{1,2}([:.]\d{2})?\s*[-–]\s*\d{1,2}([:.]\d{2})?$/;
      const off1 = M.timeOffset != null ? M.timeOffset : (people.length && people.every(p => !String((g[p.row + 1] || [])[M.labelCol || 0] || '').trim()) && people.some(p => days.some(d2 => TM.test(String((g[p.row + 1] || [])[d2.col] || '').trim()))) ? 1 : 0);
      const timeAt = (p, date) => { if (!off1) return ''; const d2 = days.find(x => x.date === date); const v = d2 ? String((g[p.row + off1] || [])[d2.col] || '').trim() : ''; return TM.test(v) ? v.replace(/\s+/g, '') : ''; };
      /* how often each value appears: frequent values are shift codes, one-off text is a note */
      const freq = {}; people.forEach(p => days.forEach(d2 => { const v = String(g[p.row][d2.col] || '').trim(); if (v) freq[v] = (freq[v] || 0) + 1; }));
      const real = v => !!v && (codes[v] ? freq[v] >= 2 : freq[v] >= 3);
      const offF = v => !v || (codes[v] && codes[v].off) || !real(v);
      const used = Object.keys(freq).filter(real).sort((a, b) => freq[b] - freq[a]);
      /* short codes: all one letter when that stays unique, otherwise two */
      const longC = used.some(v => v.length > 2), abbr = {};
      used.forEach(v => { const c0 = codes[v] && codes[v].abbr; let a = c0 || (longC ? v.charAt(0).toUpperCase() : v); if (Object.values(abbr).includes(a)) a = v.charAt(0).toUpperCase() + v.charAt(1).toLowerCase(); abbr[v] = a; });
      return { kind: 'matrix', days, people, at, isOff: offF, isNote: v => !!v && !real(v), isAway: v => !!v && real(v) && codes[v] && codes[v].off, codes, used, abbr, timeAt, byDate: Object.fromEntries(days.map(d2 => [d2.date, d2.col])) };
    }
    if (rc.shape === 'rows' && rc.rows) {
      const Rr = rc.rows, head = g[Rr.headerRow || 0] || [], recs = [];
      for (let row = (Rr.headerRow || 0) + 1; row < g.length; row++) { const r = g[row] || []; const date = Rr.dateCol != null ? pdateC(r[Rr.dateCol]) : null; if (Rr.dateCol != null && !date) continue; recs.push({ row, date, label: Rr.labelCol != null ? String(r[Rr.labelCol] || '').trim() : '', nums: (Rr.numCols || []).map(cn => pnumC(r[cn])) }); }
      recs.sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1);
      return { kind: 'rows', recs, numLabels: (Rr.numCols || []).map(cn => String(head[cn] || '').trim() || L('Value', 'Hodnota')) };
    }
    /* anything else: a plain list of rows, optionally grouped by one column */
    const Ls = rc.list || {}, hr = Ls.headerRow || 0, head = g[hr] || [], width = Math.max(...g.map(r => r.length));
    const cols = (Ls.cols && Ls.cols.length ? Ls.cols : Array.from({ length: Math.min(width, 4) }, (_, i) => i)).filter(k => k !== (Ls.labelCol || 0)).slice(0, 3);
    const recs = g.slice(hr + 1).map((r, i) => ({ row: hr + 1 + i, label: String(r[Ls.labelCol || 0] || '').trim(), vals: cols.map(k => String(r[k] || '').trim()), group: Ls.groupCol != null ? String(r[Ls.groupCol] || '').trim() : '' })).filter(x => x.label || x.vals.some(Boolean));
    return { kind: 'list', recs, colLabels: cols.map(k => String(head[k] || '').trim()), groupLabel: Ls.groupCol != null ? String(head[Ls.groupCol] || '').trim() : '' };
  }
  const CODEC = ['#ffc56b', '#7aa7ff', '#b18cff', '#5fd3a5', '#ff8fb1', '#7fd6ff', '#f59f6b', '#c9e36b'];
  const codeCol = (M, v) => { const ks = (M.used || Object.keys(M.codes)).filter(k => !(M.codes[k] && M.codes[k].off)); const i = ks.indexOf(v); return i < 0 ? 'rgba(243,234,216,.55)' : CODEC[i % CODEC.length]; };
  const codeLab = (M, v) => (M.codes[v] && M.codes[v].label) || v;
  const wd = iso2 => new Date(iso2 + 'T12:00:00').toLocaleDateString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'numeric' });
  function recInsights(c, rc, M) {
    const out = [], td = T(), tm = addD(td, 1), me = rc.me && M.people.find(p => p.label.toLowerCase() === String(rc.me).toLowerCase());
    if (M.kind === 'matrix') {
      const wk7 = Array.from({ length: 7 }, (_, i) => addD(td, i)).filter(x => M.byDate[x] != null).map(x => [x, M.people.filter(p => !M.isOff(M.at(p, x))).length]);
      if (wk7.length > 2) { const lo = wk7.reduce((a, x) => x[1] < a[1] ? x : a, wk7[0]); out.push({ t: L('Fewest people this week: ', 'Nejméně lidí tento týden: ') + wd(lo[0]) + ' (' + lo[1] + ').', tone: lo[1] <= 1 ? 'down' : '', task: lo[1] <= 1 ? L('Check cover for ', 'Zkontrolovat obsazení ') + wd(lo[0]) : '' }); }
      if (me) { const wk = Array.from({ length: 7 }, (_, i) => addD(td, i)).filter(x => !M.isOff(M.at(me, x))), nx = M.days.find(d2 => d2.date >= td && !M.isOff(M.at(me, d2.date)));
        out.push({ t: L('You: ' + wk.length + ' in the next 7 days', 'Ty: ' + wk.length + ' za příštích 7 dní') + (nx ? L(', next ', ', další ') + wd(nx.date) + ' · ' + codeLab(M, M.at(me, nx.date)) : '') + '.', tone: wk.length >= 6 ? 'down' : '', task: nx ? L('Prepare for the shift ', 'Připravit se na směnu ') + wd(nx.date) : '' }); }
      const ym = td.slice(0, 7), cnt = M.people.map(p => [p, M.days.filter(d2 => d2.date.startsWith(ym) && !M.isOff(M.at(p, d2.date))).length]).sort((a, b) => b[1] - a[1]);
      if (cnt.length > 1 && cnt[0][1] - cnt[cnt.length - 1][1] >= 3) out.push({ t: L('This month the most: ', 'Tento měsíc nejvíc: ') + cnt[0][0].label + ' (' + cnt[0][1] + '), ' + L('the least: ', 'nejméně: ') + cnt[cnt.length - 1][0].label + ' (' + cnt[cnt.length - 1][1] + ').', tone: '' });
      const tmOn = M.people.filter(p => !M.isOff(M.at(p, tm))); if (M.byDate[tm] != null && !tmOn.length) out.push({ t: L('Nobody is on tomorrow.', 'Zítra nikdo nemá směnu.'), tone: 'down', task: L('Check tomorrow\'s cover', 'Zkontrolovat zítřejší obsazení') });
    } else if (M.kind === 'list') {
      const gg = {}; M.recs.forEach(x => { if (x.group) gg[x.group] = (gg[x.group] || 0) + 1; }); const g1 = Object.entries(gg).sort((a, b) => b[1] - a[1])[0];
      out.push({ t: g1 && Object.keys(gg).length > 1 ? L('Most: ' + g1[0] + ' (' + g1[1] + ' of ' + M.recs.length + ').', 'Nejvíc: ' + g1[0] + ' (' + g1[1] + ' z ' + M.recs.length + ').') : M.recs.length + ' ' + L('rows in the sheet.', 'řádků v tabulce.'), tone: '' });
    } else if (M.kind === 'rows') {
      const r2 = M.recs.filter(x => x.nums.some(v => v != null)); if (r2.length > 2) { const a = r2[Math.max(0, r2.length - 8)].nums[0], b = r2[r2.length - 1].nums[0]; if (a && b != null) { const ch = Math.round((b / a - 1) * 100); if (ch) out.push({ t: M.numLabels[0] + ' ' + (ch > 0 ? '+' : '') + ch + ' % ' + L('over the last rows.', 'za poslední řádky.'), tone: ch > 0 ? 'up' : 'down' }); } }
      const up = M.recs.find(x => x.date && x.date >= T() && x.label); if (up) out.push({ t: L('Next: ', 'Další: ') + (up.label || '') + ' · ' + wd(up.date), tone: '', task: up.label ? L('Prepare: ', 'Připravit: ') + short(up.label, 40) : '' });
    }
    return out.concat((rc.lines || []).filter(t => !/(row|column|header|cell|řád|sloup|hlavič|buňk)/i.test(t)).slice(0, 1).map(t => ({ t, tone: 'ai' }))).slice(0, 4);
  }
  function recSummary(c) {
    const st = srcGet(c.id), rc = c.src && c.src.recipe; if (!st || !st.data || !rc) return ''; const M = model(rc, st.data.grid); if (!M) return rc.what || '';
    if (M.kind === 'matrix') { const td = T(), me = rc.me && M.people.find(p => p.label.toLowerCase() === String(rc.me).toLowerCase());
      if (me) { const nx = M.days.find(d2 => d2.date >= td && !M.isOff(M.at(me, d2.date))); return nx ? L('Your next: ', 'Tvoje další: ') + wd(nx.date) + ' · ' + codeLab(M, M.at(me, nx.date)) : L('No shift ahead', 'Žádná směna před tebou'); }
      const on = M.people.filter(p => !M.isOff(M.at(p, td))); return L('Today: ', 'Dnes: ') + (on.map(p => p.label).join(', ') || '–'); }
    return rc.what || '';
  }
  function recPanel(c, d, st, desk, ref, head) {
    const rc = c.src.recipe, cfg = askCfg(), col = c.color;
    if (!rc) {
      const busyR = asking.has('r' + c.id);
      return '<div class="srcp sdash' + (desk ? ' desk' : ' mob') + '" data-src="' + c.id + '" style="--c:' + col + '">' + head + '<section class="pn frost solid reccta"><span class="ricon">' + ico('spark', 26, 2) + '</span><b>' + esc(L('Aurora doesn’t understand this sheet yet', 'Aurora téhle tabulce zatím nerozumí')) + '</b><span>' + esc(L('Claude looks at it once and picks the right view: today, your next items, a month grid, a ranking… After that Aurora updates it by itself, for free.', 'Claude se na ni jednou podívá a vybere správný pohled: dnešek, tvoje další položky, mřížku měsíce, žebříček… Pak už to Aurora aktualizuje sama, zdarma.')) + '</span>'
        + (cfg.pin ? '<button class="pbtn cr press askbtn' + (busyR ? ' busy' : '') + '" data-a="srcRecipe" data-id="' + c.id + '"' + (busyR ? ' disabled' : '') + '>' + ico('spark', 15, 2.2) + esc(busyR ? L('Claude is reading the sheet…', 'Claude čte tabulku…') : L('Let Aurora understand it', 'Nech Auroru tabulku pochopit')) + '</button>' : '<button class="pbtn cr press" data-a="srcSetup">' + esc(L('Set up Claude first', 'Nejdřív nastavit Claude')) + '</button>')
        + (st.rerr ? '<p class="sayerr">' + esc(st.rerr) + '</p>' : '') + '<small class="muted">' + esc((tr(d.sub) || '') + ' · ' + L('one Claude call, about 1 Kč', 'jedno volání Clauda, asi 1 Kč')) + '</small></section></div>';
    }
    const M = model(rc, d.grid); const td = T();
    if (!M || (M.kind === 'matrix' && (!M.days.length || !M.people.length)) || (M.kind !== 'matrix' && !M.recs.length)) return '<div class="srcp sdash' + (desk ? ' desk' : ' mob') + '" data-src="' + c.id + '">' + head + '<section class="pn frost solid reccta"><b>' + esc(L('The recipe does not fit the sheet any more', 'Recept už na tabulku nesedí')) + '</b><button class="pbtn cr press" data-a="srcRecipe" data-id="' + c.id + '">' + esc(L('Read it again', 'Přečíst znovu')) + '</button></section></div>';
    const me = rc.me && M.people.find(p => p.label.toLowerCase() === String(rc.me).toLowerCase());
    const tile = (lab, val, sub, i) => '<section class="pn frost solid kkpi" style="--i:' + i + '"><span class="cap">' + esc(lab) + '</span><div class="kkn' + (String(val).length > 6 ? ' long' : '') + '">' + esc(String(val)) + '</div><span class="muted ksubl">' + esc(sub || '') + '</span></section>';
    const blocks = {}, ym = V.recMonth && V.recMonth[c.id] || td.slice(0, 7);
    if (M.kind === 'matrix') {
      const ab = v => M.abbr[v] || (v ? '•' : ''), tm = (p, x) => M.timeAt(p, x);
      const onOf = x => M.people.filter(p => !M.isOff(M.at(p, x)));
      const onT = onOf(td), onM = onOf(addD(td, 1)), mine = me ? M.days.filter(d2 => d2.date.startsWith(td.slice(0, 7)) && !M.isOff(M.at(me, d2.date))) : [];
      const nx = me && M.days.find(d2 => d2.date >= td && !M.isOff(M.at(me, d2.date)));
      const hrsOf = (p, x) => { const t = tm(p, x); const m2 = t.match(/^(\d{1,2})(?:[:.](\d{2}))?[-–](\d{1,2})(?:[:.](\d{2}))?$/); if (m2) { let h = (+m2[3] + (+m2[4] || 0) / 60) - (+m2[1] + (+m2[2] || 0) / 60); if (h < 0) h += 24; return h; } return (M.codes[M.at(p, x)] || {}).hours || 0; };
      const hrs = me ? Math.round(mine.reduce((a, d2) => a + hrsOf(me, d2.date), 0) * 10) / 10 : 0;
      const wk = Array.from({ length: 7 }, (_, i) => addD(td, i)), wkN = wk.reduce((a, x) => a + onOf(x).length, 0);
      const cnt = M.people.map(p => [p, M.days.filter(d2 => d2.date.startsWith(td.slice(0, 7)) && !M.isOff(M.at(p, d2.date))).length]).sort((a, b) => b[1] - a[1]);
      blocks.kpis = '<div class="kd4">' + tile(L('Today on', 'Dnes slouží'), onT.length, onT.map(p => p.label).join(', ') || '–', 0)
        + (me ? tile(L('Your next', 'Tvoje další'), nx ? wd(nx.date) : '–', nx ? codeLab(M, M.at(me, nx.date)) + (tm(me, nx.date) ? ' · ' + tm(me, nx.date) : '') : L('nothing ahead', 'nic před tebou'), 1) + tile(L('You this month', 'Ty tento měsíc'), mine.length, hrs ? hrs + ' h' : (rc.unit || ''), 2)
          : tile(L('Tomorrow on', 'Zítra slouží'), onM.length, onM.map(p => p.label).join(', ') || '–', 1) + tile(L('Next 7 days', 'Příštích 7 dní'), wkN, rc.unit || '', 2))
        + tile(L('Most this month', 'Nejvíc tento měsíc'), cnt[0] ? cnt[0][1] : 0, cnt[0] ? cnt[0][0].label : '', 3) + '</div>';
      /* answer first: one big line on top */
      const nxT = nx ? tm(me, nx.date) : '', nxDay = nx ? (nx.date === td ? L('Today', 'Dnes') : nx.date === addD(td, 1) ? L('Tomorrow', 'Zítra') : wd(nx.date)) : '';
      blocks.hero = me ? '<section class="pn frost solid shero" style="--k:' + (nx ? codeCol(M, M.at(me, nx.date)) : 'rgba(243,234,216,.3)') + '"><span class="cap">' + esc(L('Your next shift', 'Tvoje další směna')) + '</span><div class="shb"><b>' + esc(nx ? nxDay : L('Nothing ahead', 'Nic před tebou')) + '</b>' + (nxT ? '<em>' + esc(nxT) + '</em>' : '') + '</div>' + (nx ? '<span class="shs"><i style="background:' + codeCol(M, M.at(me, nx.date)) + '">' + esc(M.abbr[M.at(me, nx.date)] || '') + '</i>' + esc(codeLab(M, M.at(me, nx.date)) + (nx.date === td ? '' : ' · ' + ago2(nx.date))) + '</span>' : '') + '</section>'
        : '<section class="pn frost solid shero"><span class="cap">' + esc(L('On today', 'Dnes slouží')) + '</span><div class="shb"><b>' + onT.length + '</b><em>' + esc(L(onT.length === 1 ? 'person' : 'people', onT.length === 1 ? 'člověk' : onT.length < 5 ? 'lidé' : 'lidí')) + '</em></div><span class="shs">' + esc(L('Tomorrow ', 'Zítra ') + onM.length) + '</span></section>';
      const face = (p, x) => '<span class="sav2' + (me === p ? ' me' : '') + '" style="--k:' + codeCol(M, M.at(p, x)) + '" title="' + esc(p.label + ' · ' + codeLab(M, M.at(p, x))) + '">' + esc(me === p ? L('You', 'Ty') : p.label.charAt(0)) + '</span>';
      blocks.who = '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('On today', 'Dnes slouží')) + ' · ' + onT.length + '</span></div><div class="savs">' + onT.map(p => '<span class="savw">' + face(p, td) + '<small>' + esc(p.label) + '</small>' + (tm(p, td) ? '<em>' + esc(tm(p, td)) + '</em>' : '') + '</span>').join('') + (onT.length ? '' : '<p class="muted saynone">' + esc(L('Nobody', 'Nikdo')) + '</p>') + '</div></section>';
      const wk7 = Array.from({ length: 7 }, (_, i) => addD(td, i));
      blocks.strip = me ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('Your week', 'Tvůj týden') + ' · ' + wk7.filter(x => !M.isOff(M.at(me, x))).length) + '</span><span class="muted">' + esc(hrs ? L('this month ', 'tento měsíc ') + hrs + ' h' : '') + '</span></div><div class="mystrip">' + wk7.map(x => { const v = M.at(me, x), on = !M.isOff(v), dd = new Date(x + 'T12:00:00'); return '<button class="msd' + (x === td ? ' td' : '') + '" data-a="srcDay" data-id="' + c.id + '" data-d="' + x + '"><small>' + esc(dd.toLocaleDateString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { weekday: 'short' })) + '</small><i' + (on ? ' style="background:' + codeCol(M, v) + '"' : ' class="off"') + '>' + esc(on ? M.abbr[v] || '•' : '') + '</i><em>' + onOf(x).length + '</em></button>'; }).join('') + '</div><span class="mysub">' + esc(L('number = people on that day', 'číslo = kolik lidí ten den slouží')) + '</span></section>' : '';
      const pill = (p, x) => { const v = M.at(p, x); return '<span class="recc" style="--k:' + codeCol(M, v) + '">' + esc(ab(v)) + '</span>'; };
      const dayList = (date, cap) => { const on = onOf(date); return '<div class="recday"><span class="cap">' + esc(cap + ' · ' + wd(date)) + '</span>' + (on.length ? on.map(p => '<div class="recp' + (me === p ? ' me' : '') + '">' + pill(p, date) + '<b>' + esc(p.label) + '</b><small>' + esc(codeLab(M, M.at(p, date))) + '</small>' + (tm(p, date) ? '<span class="rect">' + esc(tm(p, date)) + '</span>' : '') + '</div>').join('') : '<p class="muted saynone">' + esc(L('Nobody', 'Nikdo')) + '</p>') + '</div>'; };
      blocks.today = '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('Who is on', 'Kdo slouží')) + '</span></div><div class="rec2">' + dayList(td, L('Today', 'Dnes')) + dayList(addD(td, 1), L('Tomorrow', 'Zítra')) + '</div></section>';
      blocks.next = '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(me ? L('Your next', 'Tvoje další') + ' · ' + me.label : L('Who are you?', 'Kdo jsi ty?')) + '</span>' + (me ? '<button class="lnk" data-a="srcMe" data-id="' + c.id + '" data-k="">' + esc(L('change', 'změnit')) + '</button>' : '') + '</div>'
        + (me ? (M.days.filter(d2 => d2.date >= td && !M.isOff(M.at(me, d2.date))).slice(0, desk ? 7 : 5).map(d2 => '<div class="recp">' + pill(me, d2.date) + '<b>' + esc(wd(d2.date)) + '</b><small>' + esc(codeLab(M, M.at(me, d2.date)) + ' · ' + ago2(d2.date)) + '</small>' + (tm(me, d2.date) ? '<span class="rect">' + esc(tm(me, d2.date)) + '</span>' : '') + '<button class="saytask press" data-a="srcPlanShift" data-id="' + c.id + '" data-d="' + d2.date + '" data-t="' + esc(codeLab(M, M.at(me, d2.date)) + (tm(me, d2.date) ? ' ' + tm(me, d2.date) : '')) + '" aria-label="' + esc(L('Put into Plan', 'Dát do Plánu')) + '">' + ico('plus', 13, 2.4) + '</button></div>').join('') || '<p class="muted saynone">' + esc(L('Nothing ahead.', 'Nic před tebou.')) + '</p>')
          : '<p class="muted saynone" style="margin-bottom:12px">' + esc(L('Pick your name and Aurora shows your shifts and hours.', 'Vyber svoje jméno a Aurora ukáže tvoje směny a hodiny.')) + '</p><div class="recwho">' + M.people.map(p => '<button class="chip frost press" data-a="srcMe" data-id="' + c.id + '" data-k="' + esc(p.label) + '">' + esc(p.label) + '</button>').join('') + '</div>') + '</section>';
      /* two weeks from the chosen day: wide cells, short codes, only people who have something in it */
      const nW = desk ? 14 : 7, st0 = (V.recWin && V.recWin[c.id]) || td, win = Array.from({ length: nW }, (_, i) => addD(st0, i));
      const rowsW = M.people.filter(p => p === me || win.some(x => !M.isOff(M.at(p, x)) || M.isAway(M.at(p, x))));
      const hidden = M.people.length - rowsW.length;
      const usedW = M.used.filter(v => M.people.some(p => win.some(x => M.at(p, x) === v)));
      const rng = new Date(win[0] + 'T12:00:00').toLocaleDateString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'short' }) + ' – ' + new Date(win[nW - 1] + 'T12:00:00').toLocaleDateString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'short' });
      blocks.month = '<section class="pn frost solid recmonth"><div class="ph2"><span class="cap">' + esc((desk ? L('Two weeks · ', 'Dva týdny · ') : L('Week · ', 'Týden · ')) + rng) + '</span><div class="dgrp">' + (st0 !== td ? '<button class="chip frost press recnow" data-a="srcWin" data-id="' + c.id + '" data-k="0">' + esc(L('Today', 'Dnes')) + '</button>' : '') + '<button class="cb frost press sm" data-a="srcWin" data-id="' + c.id + '" data-k="-7" aria-label="' + esc(L('Previous week', 'Předchozí týden')) + '">' + ico('chevL', 15, 2.4) + '</button><button class="cb frost press sm" data-a="srcWin" data-id="' + c.id + '" data-k="7" aria-label="' + esc(L('Next week', 'Další týden')) + '">' + ico('chev', 15, 2.4) + '</button></div></div>'
        + '<div class="recgw"><table class="recg"><thead><tr><th></th>' + win.map(x => { const dd = new Date(x + 'T12:00:00'); return '<th class="' + (x === td ? 'td' : '') + ([0, 6].includes(dd.getDay()) ? ' we' : '') + '" data-a="srcDay" data-id="' + c.id + '" data-d="' + x + '"><small>' + esc(dd.toLocaleDateString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { weekday: 'short' })) + '</small>' + dd.getDate() + '</th>'; }).join('') + '</tr></thead><tbody>'
        + rowsW.map(p => '<tr class="' + (me === p ? 'me' : '') + '"><th>' + esc(p.label) + '</th>' + win.map(x => { const v = M.at(p, x), t = tm(p, x); return '<td class="' + (x === td ? 'td' : '') + '" data-a="srcDay" data-id="' + c.id + '" data-d="' + x + '">' + (!v ? '' : M.isNote(v) ? '<i class="note" title="' + esc(p.label + ' · ' + v) + '">•</i>' : M.isOff(v) ? '<i class="off" title="' + esc(p.label + ' · ' + codeLab(M, v)) + '">–</i>' : '<i style="--k:' + codeCol(M, v) + '" title="' + esc(p.label + ' · ' + codeLab(M, v) + (t ? ' · ' + t : '')) + '"><b>' + esc(ab(v)) + '</b>' + (t && desk ? '<small>' + esc(t) + '</small>' : '') + '</i>') + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>'
        + '<div class="recleg">' + usedW.map(k => '<span>' + (M.isOff(k) ? '<i class="off">–</i>' : '<i style="--k:' + codeCol(M, k) + '">' + esc(ab(k)) + '</i>') + esc(codeLab(M, k)) + '</span>').join('') + (M.people.some(p => win.some(x => M.isNote(M.at(p, x)))) ? '<span><i class="note">•</i>' + esc(L('note', 'poznámka')) + '</span>' : '') + (hidden ? '<span class="muted">' + esc(L('+' + hidden + ' without shifts', '+' + hidden + ' bez směn')) + '</span>' : '') + '</div></section>';
      const mx = Math.max(1, ...cnt.map(x => x[1]));
      blocks.rank = '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('This month by person', 'Tento měsíc po lidech')) + '</span><span class="muted">' + esc(rc.unit || '') + '</span></div>' + cnt.map(([p, n], i) => '<div class="krb" style="--i:' + i + '"><span>' + esc(p.label) + '</span><span class="khl"><i style="width:' + (n / mx * 100).toFixed(0) + '%;background:' + (me === p ? col : 'rgba(243,234,216,.45)') + '"></i></span><b>' + n + '</b></div>').join('') + '</section>';
    } else if (M.kind === 'list') {
      const grp = {}; M.recs.forEach(x => { if (x.group) grp[x.group] = (grp[x.group] || 0) + 1; }); const gs = Object.entries(grp).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...gs.map(x => x[1]));
      blocks.kpis = '<div class="kd4">' + tile(L('Rows', 'Řádků'), M.recs.length, rc.unit || '', 0) + (gs.length ? tile(M.groupLabel || L('Groups', 'Skupiny'), gs.length, '', 1) + tile(L('Most common', 'Nejčastější'), gs[0][1], gs[0][0], 2) : '') + '</div>';
      const q = (V.recQ && V.recQ[c.id]) || '', ql = q.toLowerCase(), shown = M.recs.filter(x => !ql || (x.label + ' ' + x.vals.join(' ') + ' ' + x.group).toLowerCase().includes(ql));
      blocks.table = '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(rc.what || L('Rows', 'Řádky')) + '</span><span class="muted">' + shown.length + '</span></div><div class="fld in recq"><input data-recq="' + c.id + '" value="' + esc(q) + '" placeholder="' + esc(L('Search…', 'Hledat…')) + '" autocomplete="off"></div><table class="ktb srctb"><tbody>' + shown.slice(0, V.srcAll === c.id ? 200 : 12).map(x => '<tr><td><span class="srcrow"><span><b>' + esc(x.label || x.vals[0] || '') + '</b><small class="muted">' + esc(x.vals.filter(Boolean).join(' · ')) + '</small></span></span></td>' + (x.group ? '<td class="vnum" style="width:auto;white-space:nowrap">' + esc(x.group) + '</td>' : '') + '</tr>').join('') + '</tbody></table>' + (shown.length > 12 ? '<button class="lnk srcmore" data-a="srcAll" data-id="' + c.id + '">' + esc(V.srcAll === c.id ? L('Show less', 'Méně') : L('Show all ', 'Ukázat všech ') + shown.length) + '</button>' : '') + '</section>';
      blocks.rank = gs.length ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('By ', 'Podle: ') + (M.groupLabel || '')) + '</span></div>' + gs.slice(0, 10).map(([k, n], i) => '<div class="krb" style="--i:' + i + '"><span>' + esc(k) + '</span><span class="khl"><i style="width:' + (n / mx * 100).toFixed(0) + '%;background:' + col + '"></i></span><b>' + n + '</b></div>').join('') + '</section>' : '';
      blocks.trend = ''; blocks.next = ''; blocks.today = ''; blocks.month = '';
      if (!(rc.blocks || []).includes('table')) rc.blocks = ['kpis', 'table', 'rank'];
    } else {
      const r2 = M.recs.filter(x => x.nums.some(v => v != null)), lastR = r2[r2.length - 1], prevR = r2[r2.length - 2];
      blocks.kpis = '<div class="kd4">' + M.numLabels.slice(0, 3).map((lb, i) => !(lastR && lastR.nums[i] != null) ? '' : tile(lb, kf(lastR.nums[i]), prevR && lastR && prevR.nums[i] != null && lastR.nums[i] != null ? ((lastR.nums[i] - prevR.nums[i] >= 0 ? '+' : '') + kf(lastR.nums[i] - prevR.nums[i])) + L(' since the row before', ' od minulého řádku') : '', i)).join('') + tile(L('Rows', 'Řádků'), M.recs.length, rc.unit || '', 3) + '</div>';
      const pts = r2.slice(-30).map(x => ({ label: x.date ? dm(x.date) : '', value: x.nums[0] || 0 }));
      blocks.trend = pts.length > 1 ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(M.numLabels[0] + ' · ' + L('over time', 'v čase')) + '</span></div>' + bars(pts, col, 0, desk ? 1400 : 440) + '</section>' : '';
      blocks.table = '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('Latest rows', 'Poslední řádky')) + '</span></div><table class="ktb srctb"><tbody>' + M.recs.slice(-8).reverse().map(x => '<tr><td><span class="srcrow"><span><b>' + esc(x.label || (x.date ? wd(x.date) : '')) + '</b><small class="muted">' + esc(x.date ? wd(x.date) : '') + '</small></span></span></td>' + x.nums.slice(0, 2).map(v => '<td class="vnum">' + (v == null ? '–' : kf(v)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></section>';
      blocks.next = ''; blocks.today = ''; blocks.month = ''; blocks.rank = '';
    }
    const ins = recInsights(c, rc, M);
    const sayIn = ins.map((x, i) => '<div class="say' + (x.tone ? ' ' + x.tone : '') + '" style="--i:' + i + '"><i></i><span>' + esc(x.t) + '</span>' + (x.task ? '<button class="saytask press" data-a="srcTask" data-id="' + c.id + '" data-t="' + esc(x.task) + '">' + ico('plus', 13, 2.4) + '</button>' : '') + '</div>').join('');
    const say = '<section class="pn frost solid saypn" style="--c:' + col + '"><div class="ph2"><span class="cap">' + esc(L('Aurora says', 'Aurora říká')) + '</span><span class="muted">' + esc(rc.what || '') + '</span></div><div class="saybox">' + sayIn + '</div><div class="askrow"><button class="lnk asksetup" data-a="srcRecipeEdit" data-id="' + c.id + '">' + ico('spark', 13, 2.2) + ' ' + esc(L('Change the view', 'Změnit pohled')) + '</button></div></section>';
    const order = (rc.blocks || ['kpis', 'today', 'next', 'month', 'rank']).filter(b => blocks[b]);
    const kp = order.includes('kpis') ? (desk ? blocks.kpis : blocks.kpis.replace('class="kd4"', 'class="kd4 m"')) : ''; const rest = order.filter(b => b !== 'kpis').map(b => blocks[b]);
    const headR = head.replace('</div>' + ref, '<span class="kdst">' + esc(rc.what || '') + '</span></div>' + ref);
    if (M.kind === 'matrix') {
      const more = V.srcMore && V.srcMore[c.id], ins1 = ins[0];
      const say1 = ins1 ? '<div class="say1' + (ins1.tone ? ' ' + ins1.tone : '') + '"><i></i><span>' + esc(ins1.t) + '</span>' + (ins1.task ? '<button class="saytask press" data-a="srcTask" data-id="' + c.id + '" data-t="' + esc(ins1.task) + '" aria-label="' + esc(L('Make it a task', 'Udělat z toho úkol')) + '">' + ico('plus', 13, 2.4) + '</button>' : '') + '</div>' : '';
      const moreBtn = moreButton(c, more, L('who is on, your shifts, people', 'kdo slouží, tvoje směny, lidi'));
      const pick = me ? '' : blocks.next;
      const extraAll = [blocks.today, me ? blocks.next : '', blocks.rank, '<section class="pn frost solid saypn" style="--c:' + col + '"><div class="ph2"><span class="cap">' + esc(L('Aurora says', 'Aurora říká')) + '</span></div><div class="saybox">' + sayIn + '</div><div class="askrow"><button class="lnk asksetup" data-a="srcRecipeEdit" data-id="' + c.id + '">' + ico('spark', 13, 2.2) + ' ' + esc(L('Change the view', 'Změnit pohled')) + '</button></div></section>']; const extra = more ? extraAll : [];
      void moreBtn; void extra;
      const B = { month: { h: blocks.month, s: 'L' }, hero: { h: blocks.hero }, pick: { h: pick }, say1: { h: say1 }, who: { h: blocks.who }, strip: { h: blocks.strip || blocks.who }, today: { h: extraAll[0] }, next: { h: extraAll[1] }, rank: { h: extraAll[2] }, say: { h: extraAll[3] } };
      return compose(c, desk, more, headR, B, { what: L('who is on, your shifts, people', 'kdo slouží, tvoje směny, lidi'), d: [['month', { st: ['hero', 'pick', 'say1', 'who'], s: 'S' }]], dm: ['today', 'next', 'rank', 'say'], m: ['hero', 'pick', 'say1', 'strip', 'month'], mm: ['today', 'next', 'rank', 'say'] });
    }
    if (M.kind === 'list') {
      const more = V.srcMore && V.srcMore[c.id], grp = {}; M.recs.forEach(x => { if (x.group) grp[x.group] = (grp[x.group] || 0) + 1; });
      const gs = Object.entries(grp).sort((a, b) => b[1] - a[1]), gcol = k => CODEC[Math.max(0, gs.findIndex(g => g[0] === k)) % CODEC.length];
      const f = (V.recF && V.recF[c.id]) || '', qRaw = (V.recQ && V.recQ[c.id]) || '', q = qRaw.toLowerCase();
      const shown = M.recs.filter(x => (!f || x.group === f) && (!q || (x.label + ' ' + x.vals.join(' ') + ' ' + x.group).toLowerCase().includes(q)));
      const ftile = (k, lab, n, i) => '<button class="pn frost solid kkpi lft press' + (f === k ? ' on' : '') + '" style="--i:' + i + ';--k:' + (k ? gcol(k) : col) + '" data-a="srcF" data-id="' + c.id + '" data-k="' + esc(k) + '" aria-pressed="' + (f === k) + '"><span class="cap">' + esc(lab) + '</span><div class="kkn">' + n + '</div><span class="lbar"><i style="width:' + Math.max(4, n / M.recs.length * 100).toFixed(0) + '%"></i></span></button>';
      const top = gs.length > 1 ? '<div class="kd4' + (desk ? '' : ' m') + '">' + ftile('', L('All', 'Vše'), M.recs.length, 0) + gs.slice(0, 3).map((g, i) => ftile(g[0], g[0], g[1], i + 1)).join('') + '</div>'
        : '<section class="pn frost solid shero" style="--k:' + col + '"><span class="cap">' + esc(rc.what || L('Rows', 'Řádky')) + '</span><div class="shb"><b>' + M.recs.length + '</b><em>' + esc(rc.unit || L('rows', 'řádků')) + '</em></div></section>';
      const selI = V.recSel && V.recSel[c.id], sel = shown.find(x => x.row === selI) || shown[0];
      const rowB = x => '<button class="lrow2 press' + (desk && sel === x ? ' on' : '') + '" data-a="srcRec" data-id="' + c.id + '" data-r="' + x.row + '">' + (x.group ? '<i style="background:' + gcol(x.group) + '"></i>' : '') + '<span class="tx"><b>' + esc(x.label || x.vals[0] || '') + '</b><small>' + esc(x.vals.filter(Boolean).slice(0, 2).join(' · ')) + '</small></span>' + (x.group ? '<span class="lgp" style="--k:' + gcol(x.group) + '">' + esc(x.group) + '</span>' : '') + (desk ? '' : '<span class="sgo">' + ico('chev', 14, 2.4) + '</span>') + '</button>';
      const n0 = desk ? 10 : 6, lim = V.srcAll === c.id ? 300 : n0;
      const listP = '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(f || rc.what || L('Rows', 'Řádky')) + '</span><span class="muted">' + shown.length + '</span></div><div class="fld in recq"><input data-recq="' + c.id + '" value="' + esc(qRaw) + '" placeholder="' + esc(L('Search…', 'Hledat…')) + '" autocomplete="off"></div>' + (shown.slice(0, lim).map(rowB).join('') || '<p class="muted saynone">' + esc(L('Nothing found.', 'Nic nenalezeno.')) + '</p>') + (shown.length > n0 ? '<button class="lnk srcmore" data-a="srcAll" data-id="' + c.id + '">' + esc(V.srcAll === c.id ? L('Show less', 'Méně') : L('Show all ', 'Ukázat všech ') + shown.length) + '</button>' : '') + '</section>';
      const s1 = say1Of(c, ins.find(x => x.tone === 'ai') || ins[0]), mbL = moreButton(c, more, gs.length ? L('by ', 'podle: ') + (M.groupLabel || '') : '');
      void mbL; const B = { filters: { h: top, raw: true }, say1: { h: s1, raw: true }, list: { h: listP, s: 'L' }, detail: { h: desk && sel ? recDetail(c, M, sel, true) : '', s: 'S' }, rank: { h: blocks.rank }, say: { h: say } };
      return compose(c, desk, more, headR, B, { what: gs.length ? L('by ', 'podle: ') + (M.groupLabel || '') : '', d: [['filters'], ['say1'], ['list', 'detail']], dm: ['rank', 'say'], m: ['filters', 'say1', 'list'], mm: ['rank', 'say'] });
    }
    if (M.kind === 'rows') {
      const more = V.srcMore && V.srcMore[c.id], r2 = M.recs.filter(x => x.nums.some(v => v != null)), lastR = r2[r2.length - 1], prevR = r2[r2.length - 2];
      const up = M.recs.find(x => x.date && x.date > (lastR && lastR.date || td) && x.date >= td);
      const v0 = lastR && lastR.nums[0], p0 = prevR && prevR.nums[0], dl = v0 != null && p0 != null ? v0 - p0 : null;
      const pts = r2.slice(-30).map(x => ({ label: x.date ? dm(x.date) : '', value: x.nums[0] || 0 }));
      const hero = '<section class="pn frost solid rhero"><div class="shb"><span class="cap">' + esc((lastR && lastR.date ? wd(lastR.date) : L('Latest', 'Poslední')) + ' · ' + (M.numLabels[0] || '')) + '</span><b>' + (v0 != null ? kf(v0) : M.recs.length) + '</b>' + (dl != null && dl !== 0 ? '<em class="' + (dl > 0 ? 'up' : 'down') + '">' + (dl > 0 ? '+' : '') + kf(dl) + L(' vs the row before', ' proti minulému') + '</em>' : '') + '</div>' + (pts.length > 1 ? bars(pts, col, 0, desk ? 1400 : 440) : '') + '</section>';
      const vs = r2.filter(x => x.nums[0] != null), mxR = vs.reduce((a, x) => !a || x.nums[0] > a.nums[0] ? x : a, null), avgV = vs.length ? vs.reduce((a, x) => a + x.nums[0], 0) / vs.length : 0;
      const side = M.numLabels.slice(1, 2).map((lb, i) => lastR && lastR.nums[i + 1] != null ? tile(lb, kf(lastR.nums[i + 1]), lastR.date ? wd(lastR.date) : '', 0) : '').filter(Boolean)
        .concat(mxR ? [tile(L('Best', 'Nejvíc'), kf(mxR.nums[0]), mxR.date ? wd(mxR.date) : (mxR.label || ''), 1)] : []).concat(vs.length > 1 ? [tile(L('Average', 'Průměr'), kf(Math.round(avgV)), vs.length + ' ' + L('records', 'záznamů'), 2)] : [tile(L('Rows', 'Řádků'), M.recs.length, rc.unit || '', 3)]).slice(0, 3);
      const useC = [0, 1, 2].filter(k => r2.some(x => x.nums[k] != null)).slice(0, 2);
      const tableR = '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('Latest records', 'Poslední záznamy')) + '</span><span class="muted">' + esc(useC.map(k => M.numLabels[k]).join(' · ')) + '</span></div><table class="ktb srctb"><tbody>' + r2.slice(-8).reverse().map(x => '<tr><td><span class="srcrow"><span><b>' + esc(x.date ? wd(x.date) : x.label) + '</b>' + (x.date && x.label ? '<small class="muted">' + esc(x.label) + '</small>' : '') + '</span></span></td>' + useC.map(k => '<td class="vnum">' + (x.nums[k] == null ? '–' : kf(x.nums[k])) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' + (up ? '<div class="say1 rnext"><i></i><span>' + esc(L('Next: ', 'Další: ') + wd(up.date) + (up.label ? ' · ' + up.label : '')) + '</span></div>' : '') + '</section>';
      const s1 = say1Of(c, ins[0]), mbR = moreButton(c, more, '');
      void mbR; const B = { hero: { h: hero, s: 'L' }, nums: { h: side.length ? '<div class="kd4' + (desk ? ' vcol' : ' m') + '">' + side.join('') + '</div>' : '', s: 'S' }, say1: { h: s1 }, table: { h: tableR, s: 'L' }, say: { h: say, s: 'S' } };
      return compose(c, desk, more, headR, B, { d: [['hero', 'nums'], ['table', 'say']], m: ['hero', 'nums', 'say1', 'table'], mm: ['say'] });
    }
    if (desk) { const main = rest.find(x => x === blocks.month || x === blocks.trend || x === blocks.table) || rest[0], others = rest.filter(x => x !== main);
      const mo3 = V.srcMore && V.srcMore[c.id];
      return '<div class="srcp sdash desk fx-go' + (mo3 ? ' more' : '') + '" data-src="' + c.id + '" style="--c:' + col + '">' + headR + kp + rowsOf(main, say, others) + moreButton(c, mo3, '') + '</div>'; }
    const mo4 = V.srcMore && V.srcMore[c.id];
    return '<div class="srcp sdash mob fx-go' + (mo4 ? ' more' : '') + '" data-src="' + c.id + '" style="--c:' + col + '">' + headR + kp + say + rest.join('') + moreButton(c, mo4, '') + '</div>';
  }
  /* the card's own part (tasks, note, moments) lives under "More" on a dashboard card */
  function moreButton(c, more, what) {
    const open = S.items.filter(i => i.card === c.id && !i.done).length;
    return '<button class="smore press" data-a="srcMoreT" data-id="' + c.id + '">' + esc(more ? L('Less', 'Méně') : L('More · ', 'Víc · ') + (what ? what + ', ' : '') + (open ? L('tasks (' + open + ')', 'úkoly (' + open + ')') : L('tasks', 'úkoly')) + L(', note', ', poznámka')) + '<span>' + (more ? '−' : '›') + '</span></button>';
  }
  ACT.srcMoreT = el => { V.srcMore = V.srcMore || {}; V.srcMore[el.dataset.id] = !V.srcMore[el.dataset.id]; repaintCard(el.dataset.id); };
  ACT.srcWin = el => { const c = cardById(el.dataset.id); if (!c) return; V.recWin = V.recWin || {}; const k = +el.dataset.k; V.recWin[c.id] = k ? addD(V.recWin[c.id] || T(), k) : T(); repaintCard(c.id); };
  ACT.srcMe = el => { const c = cardById(el.dataset.id); if (!c || !c.src || !c.src.recipe) return; c.src.recipe.me = el.dataset.k || null; save(); repaintCard(c.id); };
  ACT.srcMonth = el => { const c = cardById(el.dataset.id); if (!c) return; V.recMonth = V.recMonth || {}; const cur = V.recMonth[c.id] || T().slice(0, 7); const [y, m] = cur.split('-').map(Number); const d2 = new Date(y, m - 1 + (+el.dataset.k), 1); V.recMonth[c.id] = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0'); repaintCard(c.id); };
  ACT.srcDay = el => { const c = cardById(el.dataset.id), st = c && srcGet(c.id); if (!st || !st.data || !c.src.recipe) return; const M = model(c.src.recipe, st.data.grid); if (!M || M.kind !== 'matrix') return; const date = el.dataset.d;
    openSheet({ title: wd(date), leftLabel: L('Close', 'Zavřít'), cls: 'srcv', body: M.people.map(p => { const v = M.at(p, date); return '<div class="recp' + (M.isOff(v) ? ' dim' : '') + '"><span class="recc" style="--k:' + (v && !M.isOff(v) ? codeCol(M, v) : 'transparent') + '">' + esc(v ? (M.isOff(v) ? '–' : M.abbr[v] || '•') : '–') + '</span><b>' + esc(p.label) + '</b><small>' + esc(v ? (M.isNote(v) ? v : codeLab(M, v)) : L('empty', 'prázdné')) + '</small>' + (M.timeAt(p, date) && !M.isOff(v) ? '<span class="rect">' + esc(M.timeAt(p, date)) + '</span>' : '') + '</div>'; }).join('') }); };
  ACT.srcPlanShift = el => { const c = cardById(el.dataset.id); if (!c) return; S.items.push({ id: uid(), t: el.dataset.t, card: c.id, date: el.dataset.d, created: T() }); save(); haptic(); el.classList.add('done'); el.disabled = true; toast(esc(L('In Plan · ', 'V Plánu · ') + wd(el.dataset.d))); };
  function sampleOf(g) {
    const rows = Math.min(g.length, 16), out = [];
    for (let r = 0; r < rows; r++) { const row = g[r] || [], cells = []; for (let k = 0; k < row.length; k++) if ((k < 45 || k >= row.length - 4) && row[k]) cells.push('c' + k + '=' + String(row[k]).slice(0, 40)); if (cells.length) out.push('r' + r + ': ' + cells.join(' | ')); }
    for (let r = rows; r < Math.min(g.length, 300); r++) { const row = g[r] || [], cells = []; for (let k = 0; k < Math.min(row.length, 6); k++) if (row[k]) cells.push('c' + k + '=' + String(row[k]).slice(0, 40)); if (cells.length) out.push('r' + r + ': ' + cells.join(' | ') + (row.length > 6 ? ' | …' + row.length + ' cols' : '')); }
    return out.join('\n');
  }
  async function makeRecipe(c, wish) {
    const st = srcGet(c.id), d = st && st.data; if (!d || !d.grid) return; const cfg = askCfg(); const key = 'r' + c.id; if (asking.has(key)) return;
    asking.add(key); srcPut(c.id, Object.assign({}, st, { rerr: '' })); repaintCard(c.id);
    let err = '';
    try { const r = await fetch(srcBase() + '/recipe', { method: 'POST', headers: { 'content-type': 'text/plain', 'x-aurora-pin': cfg.pin, 'x-aurora-user': aiUser() }, body: JSON.stringify({ title: c.name, dims: d.grid.length + ' rows × ' + Math.max(...d.grid.map(x => x.length)) + ' columns', sample: sampleOf(d.grid), wish: wish || '', lang: lang(), model: cfg.model, effort: cfg.effort, today: T() }) });
      const j = await r.json().catch(() => null); aiSeen(j);
      if (r.ok && j && j.shape) { if (!wish && c.src.recipe && c.src.recipe.me && !j.me) j.me = c.src.recipe.me; c.src.recipe = j; save(); }
      else err = j && j.error === 'pin' ? L('Wrong PIN, check Settings → Sources → Link reader.', 'Špatný PIN, zkontroluj Settings → Sources → Čtečka odkazů.') : j && j.error === 'limit' ? L('Today’s Claude limit is used up.', 'Dnešní limit Clauda je vyčerpaný.') : (j && j.message) || L('Claude did not answer.', 'Claude neodpověděl.'); }
    catch (e) { err = L('The link reader is not reachable.', 'Čtečka odkazů není dostupná.'); }
    asking.delete(key); const st2 = srcGet(c.id) || {}; st2.rerr = err; srcPut(c.id, st2); repaintCard(c.id); if (!err) toast(esc(L('Aurora understands it now', 'Aurora už tomu rozumí')));
  }
  ACT.srcRecipe = el => { const c = cardById(el.dataset.id); if (c) makeRecipe(c, ''); };
  ACT.srcRecipeEdit = el => { const c = cardById(el.dataset.id); if (!c) return; const rc = c.src.recipe || {};
    openSheet({ title: L('Change the view', 'Změnit pohled'), right: L('Rebuild', 'Přestavět'), body: '<p class="lkp">' + esc(L('Tell Aurora what you want to see. Claude rebuilds the view once.', 'Napiš, co chceš vidět. Claude pohled jednou přestaví.')) + '</p><div class="fld in"><textarea id="rwish" rows="3" placeholder="' + esc(L('e.g. I am Matej, show my shifts first and hours this month', 'např. Jsem Matej, ukaž hlavně moje směny a hodiny za měsíc')) + '">' + '</textarea></div><p class="rnfoot" style="text-align:left">' + esc(L('Now: ', 'Teď: ') + (rc.what || '') + (rc.summary ? ' · ' + rc.summary : '')) + '</p>',
      onSave: () => { const w = $('#rwish').value.trim(); closeSheet(true); makeRecipe(c, w); } }); };
  /* one layout rule for every dashboard: full rows only. [main 3 : side 1], then pairs [1 : 1], a single leftover takes the whole row */
  function rowsOf(main, side, others) {
    let h = main ? (side ? '<div class="lr lr31">' + main + side + '</div>' : '<div class="lr lr1">' + main + '</div>') : side ? '<div class="lr lr1">' + side + '</div>' : '';
    const o = others.filter(Boolean); for (let i = 0; i < o.length; i += 2) h += o[i + 1] ? '<div class="lr lr11">' + o[i] + o[i + 1] + '</div>' : '<div class="lr lr1">' + o[i] + '</div>';
    return h;
  }

  /* ===== v2033 · block registry: each block is one piece (id, name, size S/M/L); a recipe lists ids; one composer lays them out ===== */
  const BLK = { hero: ['Answer', 'Odpověď'], nums: ['Numbers', 'Čísla'], week: ['Next 7 days', 'Příštích 7 dní'], later: ['Later', 'Později'], say: ['Aurora says', 'Aurora říká'], say1: ['Aurora line', 'Aurora v jedné větě'],
    list: ['List', 'Seznam'], chart: ['Chart', 'Graf'], table: ['Table', 'Tabulka'], best: ['Best', 'Nejlepší'], events: ['Coming up', 'Chystá se'], month: ['Two weeks', 'Dva týdny'], who: ['Who is on', 'Kdo slouží'],
    today: ['Today and tomorrow', 'Dnes a zítra'], next: ['Your next', 'Tvoje další'], rank: ['By person', 'Po lidech'], filters: ['Filters', 'Filtry'], detail: ['Detail', 'Detail'], strip: ['Your week', 'Tvůj týden'], pick: ['Who are you', 'Kdo jsi'] };
  window.AUR_BLOCKS = BLK;
  const LASTB = {};
  const viewOf = c => (c.src && c.src.view) || {};
  function compose(c, desk, more, head, B, R) {
    const v = viewOf(c), ok = id => !!(B[id] && B[id].h);
    const ids = it => typeof it === 'string' ? [it] : it.st;
    const rowsD = R.d || [], mainDef = [], moreDef = [];
    (desk ? rowsD.flatMap(r => r.flatMap(ids)) : (R.m || [])).forEach(id => { if (ok(id) && !mainDef.includes(id)) mainDef.push(id); });
    ((desk ? R.dm : R.mm) || []).forEach(id => { if (ok(id) && !mainDef.includes(id) && !moreDef.includes(id)) moreDef.push(id); });
    const def = mainDef.concat(moreDef);
    /* the view the person set: an order of all blocks + which ones sit under "More"; blocks a source no longer has just drop out */
    let ord = def, offS = moreDef;
    if (v.order) { ord = v.order.filter(id => def.includes(id)).concat(def.filter(id => !v.order.includes(id))); offS = (v.off || []).filter(id => def.includes(id) && id !== 'hero').concat(moreDef.filter(id => !v.order.includes(id))); }
    LASTB[c.id] = { ord, off: offS, def, defOff: moreDef };
    const on = id => ok(id) && !offS.includes(id), pos = id => { const i = ord.indexOf(id); return i < 0 ? 1e3 : i; };
    let vis = on; const hasIt = it => ids(it).some(vis);
    const tag = id => String(B[id].h).replace(/^\s*<(\w+)/, '<$1 data-b="' + id + '"');
    const htmlOf = it => typeof it === 'string' ? tag(it) : '<div class="' + (it.cls || 'sside') + '">' + it.st.filter(vis).map(tag).join('') + '</div>';
    const sizeOf = it => typeof it === 'string' ? (B[it].s || 'M') : (it.s || 'M');
    const wrap = row => { const its = row.filter(hasIt); if (!its.length) return ''; if (its.length === 1) { const it = its[0]; return typeof it === 'string' && B[it].raw ? tag(it) : '<div class="lr lr1">' + htmlOf(it) + '</div>'; }
      const a = sizeOf(its[0]), b = sizeOf(its[1]); return '<div class="lr ' + (a === 'L' && b === 'S' ? 'lr31' : a === 'S' && b === 'L' ? 'lr12' : 'lr11') + '">' + htmlOf(its[0]) + htmlOf(its[1]) + '</div>'; };
    const first = row => Math.min(...row.map(it => Math.min(...ids(it).map(pos))));
    const byOrd = l => l.slice().sort((x, y) => pos(x) - pos(y));
    const pairs = l => { const r = []; for (let i = 0; i < l.length; i += 2) r.push(l.slice(i, i + 2)); return r; };
    const moreIds = byOrd(def.filter(id => offS.includes(id)));
    const mb = moreButton(c, more, R.what || '');
    const vb = '<button class="cb frost press srcvw" data-a="srcView" data-id="' + c.id + '" aria-label="' + esc(L('Edit view', 'Upravit pohled')) + '">' + ico('edit', desk ? 17 : 16, 2.2) + '</button>';
    if (desk) {
      const promoted = byOrd(def.filter(id => on(id) && !rowsD.some(r => r.some(it => ids(it).includes(id)))));
      const rows = rowsD.slice().map((r, i) => [r, i]).sort((x, y) => (first(x[0]) - first(y[0])) || x[1] - y[1]).map(x => x[0]);
      const hd = head.replace('<button class="cb frost press srcr', vb + '<button class="cb frost press srcr');
      return dashW(c, true, more, hd + rows.map(wrap).join('') + pairs(promoted).map(wrap).join('') + mb + (more ? (vis = ok, pairs(moreIds).map(wrap).join('')) : ''));
    }
    return dashW(c, false, more, head + byOrd(def.filter(on)).map(tag).join('') + '<div class="smrow">' + mb + vb + '</div>' + (more ? moreIds.map(tag).join('') : ''));
  }
  /* "Edit view": order the blocks and choose what sits on the card and what under "More"; per card, nothing is deleted */
  ACT.srcView = el => {
    const c = cardById(el.dataset.id); if (!c || !c.src) return; const lb = LASTB[c.id]; if (!lb || !lb.def.length) return;
    let ord = lb.ord.slice(), off = lb.off.slice();
    const row = (id, i) => { const lock = id === 'hero', inM = off.includes(id);
      return '<div class="srow vwr' + (inM ? ' dn' : '') + '"><span class="tx">' + esc(L(...(BLK[id] || [id, id]))) + '<small>' + esc(lock ? L('always on top', 'vždy nahoře') : inM ? L('under More', 'pod Víc ›') : L('on the card', 'na kartě')) + '</small></span><span class="vwa">'
        + (lock ? '' : '<button class="cb frost press" data-mv="-1" data-k="' + id + '"' + (i > (ord[0] === 'hero' ? 1 : 0) ? '' : ' disabled') + ' aria-label="' + esc(L('Up', 'Nahoru')) + '">↑</button><button class="cb frost press" data-mv="1" data-k="' + id + '"' + (i < ord.length - 1 ? '' : ' disabled') + ' aria-label="' + esc(L('Down', 'Dolů')) + '">↓</button><button class="vwt" data-tg="' + id + '" aria-pressed="' + !inM + '" aria-label="' + esc(L('On the card', 'Na kartě')) + '"><span class="tg' + (inM ? '' : ' on') + '"></span></button>') + '</span></div>'; };
    const paint = box => { box.innerHTML = '<section class="grp frost solid vwl">' + ord.map(row).join('') + '</section><button class="lnk vwreset" data-rs="1">' + esc(L('Back to the default view', 'Vrátit výchozí pohled')) + '</button>'; };
    openSheet({ title: L('Edit view', 'Upravit pohled'), leftLabel: L('Cancel', 'Zrušit'), right: L('Done', 'Hotovo'), cls: 'vwsh',
      body: '<p class="lkp">' + esc(L('Move blocks and pick what stays on the card. Switched off goes under More, nothing is lost.', 'Posuň bloky a vyber, co zůstane na kartě. Vypnuté jde pod Víc, nic se neztratí.')) + '</p><div id="vwBox"></div>',
      mount: e2 => { const box = e2.querySelector('#vwBox'); paint(box);
        box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return;
          if (b.dataset.tg) { const k = b.dataset.tg; off = off.includes(k) ? off.filter(x => x !== k) : off.concat(k); }
          else if (b.dataset.mv) { const i = ord.indexOf(b.dataset.k), j = i + +b.dataset.mv; if (j < 0 || j >= ord.length || ord[j] === 'hero') return; [ord[i], ord[j]] = [ord[j], ord[i]]; }
          else if (b.dataset.rs) { off = lb.defOff.slice(); ord = lb.def.slice(); }
          haptic && haptic(); paint(box); }; },
      onSave: () => { const same = ord.join() === lb.def.join() && off.slice().sort().join() === lb.defOff.slice().sort().join(); c.src.view = same ? null : { order: ord, off }; save(); closeSheet(true); repaintCard(c.id); } });
  };
  /* ===== v2032 · answer first for every source: one big answer, the main overview, one Aurora line, the rest under "More" ===== */
  const hm = dt => dt.toLocaleTimeString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  const isoL = t => t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  const dayDiff = iso2 => Math.round((new Date(iso2 + 'T12:00:00') - new Date(T() + 'T12:00:00')) / 864e5);
  const dny = n => lang() === 'cs' ? (n === 1 ? 'den' : n < 5 ? 'dny' : 'dní') : (n === 1 ? 'day' : 'days');
  const imgT = (u, cls) => u ? '<img class="' + cls + '" src="' + esc(u) + '" onerror="this.style.visibility=\'hidden\'" alt="" loading="lazy" referrerpolicy="no-referrer">' : '';
  const agoT = iso2 => { if (!iso2) return ''; const m = Math.round((Date.now() - +new Date(iso2)) / 60000); if (!(m >= 0)) return ''; if (m < 60) return L(m + ' min ago', 'před ' + m + ' min'); if (m < 1440) return L(Math.round(m / 60) + ' h ago', 'před ' + Math.round(m / 60) + ' h'); const dd = Math.round(m / 1440); return dd === 1 ? L('yesterday', 'včera') : L(dd + ' days ago', 'před ' + dd + ' dny'); };
  function evsOf(d) {
    const now = Date.now();
    return (d.events || []).map((x, i) => { const allDay = String(x.when).length === 10, dt = new Date(allDay ? x.when + 'T12:00:00' : x.when); return Object.assign({}, x, { i, allDay, dt, day: allDay ? x.when : isoL(dt) }); })
      .filter(x => !isNaN(x.dt) && (x.allDay ? x.day >= T() : +x.dt > now - 2 * 3600e3)).sort((a, b) => a.dt - b.dt);
  }
  function untilTxt(x) {
    const dd = dayDiff(x.day);
    if (!x.allDay && dd === 0) { const m = Math.round((+x.dt - Date.now()) / 60000); if (m <= 0) return L('Now', 'Právě teď'); if (m < 60) return L('In ', 'Za ') + m + ' min'; const h = Math.floor(m / 60), r = m % 60; return L('In ', 'Za ') + h + ' h' + (r ? ' ' + r + ' min' : ''); }
    return dd <= 0 ? L('Today', 'Dnes') : dd === 1 ? L('Tomorrow', 'Zítra') : L('In ', 'Za ') + dd + ' ' + dny(dd);
  }
  const say1Of = (c, x) => x ? '<div class="say1' + (x.tone ? ' ' + x.tone : '') + '"><i></i><span>' + esc(x.t) + '</span>' + (x.task ? '<button class="saytask press" data-a="srcTask" data-id="' + c.id + '" data-t="' + esc(x.task) + '" aria-label="' + esc(L('Make it a task', 'Udělat z toho úkol')) + '">' + ico('plus', 13, 2.4) + '</button>' : '') + '</div>' : '';
  const sayPanel = (c, d) => '<section class="pn frost solid saypn" style="--c:' + c.color + '"><div class="ph2"><span class="cap">' + esc(L('Aurora says', 'Aurora říká')) + '</span><span class="muted">' + esc(L('+ makes it a task', '+ udělá z toho úkol')) + '</span></div><div class="saybox" data-say="' + c.id + '">' + sayHTML(c, d) + '</div></section>';
  const dashW = (c, desk, more, inner) => '<div class="srcp sdash ' + (desk ? 'desk' : 'mob') + ' fx-go' + (more ? ' more' : '') + '" data-src="' + c.id + '" style="--c:' + c.color + '">' + inner + '</div>';
  const isMore = c => !!(V.srcMore && V.srcMore[c.id]);

  /* calendar: "In 1 h 20 min · Shoot" + the week by day */
  function calPanel(c, d, st, desk, head) {
    const col = c.color, ev = evsOf(d), nx = ev[0], td = T(), more = isMore(c);
    const hero = nx ? '<button class="pn frost solid shero ehero press" data-a="srcEv" data-id="' + c.id + '" data-i="' + nx.i + '" style="--k:' + col + '"><span class="cap">' + esc(untilTxt(nx)) + '</span><b class="eht">' + esc(nx.title) + '</b><span class="shs">' + esc((nx.allDay ? L('All day', 'Celý den') : hm(nx.dt)) + ' · ' + wd(nx.day)) + '</span></button>'
      : '<section class="pn frost solid shero ehero" style="--k:rgba(243,234,216,.3)"><span class="cap">' + esc(L('Coming up', 'Chystá se')) + '</span><b class="eht">' + esc(L('Nothing planned', 'Nic naplánovaného')) + '</b><button class="chip frost press" data-a="srcTask" data-id="' + c.id + '" data-t="' + esc(L('Plan something for this week', 'Naplánovat něco na tento týden')) + '">' + ico('plus', 13, 2.4) + ' ' + esc(L('Plan something', 'Naplánovat')) + '</button></section>';
    const days7 = Array.from({ length: 7 }, (_, i) => addD(td, i)), by = {}; ev.forEach(x => (by[x.day] = by[x.day] || []).push(x));
    const n7 = days7.reduce((a, x) => a + (by[x] || []).length, 0);
    const blk = x => '<button class="evb press' + (x === nx ? ' nx' : '') + '" data-a="srcEv" data-id="' + c.id + '" data-i="' + x.i + '"><b>' + esc(x.title) + '</b><small>' + esc(x.allDay ? L('all day', 'celý den') : hm(x.dt)) + '</small></button>';
    const wdS = x => new Date(x + 'T12:00:00').toLocaleDateString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { weekday: 'short' });
    const cap = '<div class="ph2"><span class="cap">' + esc(L('Next 7 days', 'Příštích 7 dní')) + '</span><span class="muted">' + esc(n7 + ' ' + L(n7 === 1 ? 'event' : 'events', n7 === 1 ? 'událost' : n7 > 1 && n7 < 5 ? 'události' : 'událostí')) + '</span></div>';
    let week;
    if (desk) week = '<section class="pn frost solid evpn">' + cap + '<div class="evwk">' + days7.map(x => '<div class="evcol"><span class="evh' + (x === td ? ' td' : '') + '">' + esc(wdS(x) + ' ' + new Date(x + 'T12:00:00').getDate() + (x === td ? L(' · today', ' · dnes') : '')) + '</span>' + ((by[x] || []).slice(0, 4).map(blk).join('') || '<i class="evnone"></i>') + ((by[x] || []).length > 4 ? '<small class="muted">+' + (by[x].length - 4) + '</small>' : '') + '</div>').join('') + '</div></section>';
    else { const sel = (V.calDay && V.calDay[c.id] && days7.includes(V.calDay[c.id]) && V.calDay[c.id]) || days7.find(x => by[x]) || td;
      week = '<section class="pn frost solid">' + cap + '<div class="mystrip">' + days7.map(x => { const n = (by[x] || []).length; return '<button class="msd' + (x === sel ? ' td' : '') + '" data-a="srcCalDay" data-id="' + c.id + '" data-d="' + x + '"><small>' + esc(wdS(x)) + '</small><i' + (n ? ' style="background:' + col + '"' : ' class="off"') + '>' + (n || '') + '</i><em>' + new Date(x + 'T12:00:00').getDate() + '.</em></button>'; }).join('') + '</div><div class="evday"><span class="cap">' + esc(wd(sel)) + '</span>' + ((by[sel] || []).map(blk).join('') || '<p class="muted saynone">' + esc(L('Nothing that day.', 'Ten den nic.')) + '</p>') + '</div></section>'; }
    const later = ev.filter(x => x.day > days7[6]);
    const laterP = later.length ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('Later', 'Později')) + '</span><span class="muted">' + later.length + '</span></div>' + later.slice(0, 6).map(x => '<button class="srcit evrow press" data-a="srcEv" data-id="' + c.id + '" data-i="' + x.i + '"><span class="srcd"><b>' + x.dt.getDate() + '.' + (x.dt.getMonth() + 1) + '.</b>' + (x.allDay ? '' : '<small>' + hm(x.dt) + '</small>') + '</span><span class="tx"><b>' + esc(x.title) + '</b><small>' + esc(untilTxt(x)) + '</small></span></button>').join('') + '</section>' : '';
    const mb = '';
    void mb; const B = { hero: { h: hero, s: 'S' }, week: { h: week, s: 'L' }, say1: { h: say1Of(c, insights(c, d)[0]) }, later: { h: laterP, s: 'L' }, say: { h: sayPanel(c, d), s: 'S' } };
    return compose(c, desk, more, head, B, { what: later.length ? L('later', 'později') : '', d: [['hero', 'week'], ['later', 'say']], m: ['hero', 'say1', 'week'], mm: ['later', 'say'] });
  }
  ACT.srcCalDay = el => { V.calDay = V.calDay || {}; V.calDay[el.dataset.id] = el.dataset.d; repaintCard(el.dataset.id); };
  ACT.srcEv = el => {
    const c = cardById(el.dataset.id), st = c && srcGet(c.id), d = st && st.data; if (!d) return; const x = evsOf(d).find(e => e.i === +el.dataset.i); if (!x) return;
    openSheet({ title: KIND.calendar, leftLabel: L('Close', 'Zavřít'), cls: 'srcv', body: '<span class="cap evdc">' + esc(untilTxt(x)) + '</span><b class="svt evdt">' + esc(x.title) + '</b><small class="svd">' + esc(wd(x.day) + ' · ' + (x.allDay ? L('all day', 'celý den') : hm(x.dt))) + '</small>'
      + '<div class="svact">' + '<button class="pbtn cr press" id="evTask">' + ico('plus', 15, 2.4) + esc(L('Prepare in Plan', 'Připravit v Plánu')) + '</button>' + (x.url || d.url ? '<a class="pbtn ghost press" href="' + esc(x.url || d.url) + '" target="_blank" rel="noopener">' + esc(L('Open calendar', 'Otevřít kalendář')) + '</a>' : '') + '</div>',
      mount: e2 => { e2.querySelector('#evTask').onclick = () => { const dd = x.day > T() ? addD(x.day, -1) : T(); S.items.push({ id: uid(), t: L('Prepare: ', 'Připravit: ') + short(x.title, 50), card: c.id, date: dd, created: T() }); save(); haptic(); closeSheet(true); toast(esc(L('In Plan · ', 'V Plánu · ') + wd(dd))); }; } });
  };

  /* releases, posts, episodes: the newest one big, how often new ones come, the list */
  function itemPanel(c, d, st, desk, head, T4, tile) {
    const col = c.color, more = isMore(c), it = (d.items || []).filter(x => x.title);
    const dated = it.filter(x => x.date).sort((a, b) => a.date < b.date ? 1 : -1), rows = dated.length ? dated : it, top = rows[0];
    const capH = d.kind === 'github' ? (d.itemsLabel === 'Releases' ? L('Latest release', 'Poslední vydání') : L('Updated last', 'Naposledy upraveno')) : d.kind === 'podcast' ? L('Latest episode', 'Nejnovější díl') : L('Latest post', 'Nejnovější příspěvek');
    const old = top && top.date && days(top.date) > 30;
    /* rhythm: how many per month, last 12 months */
    let rh = '';
    if (dated.length >= 3) { const now = new Date(), ms = Array.from({ length: 12 }, (_, i) => { const t = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1); return isoL(t).slice(0, 7); }), cnt = ms.map(m => dated.filter(x => isoL(new Date(x.date)).slice(0, 7) === m).length), mx = Math.max(1, ...cnt);
      if (cnt.some(Boolean)) rh = '<div class="irh" aria-label="' + esc(L('per month', 'po měsících')) + '">' + cnt.map((n, i) => '<i class="' + (i === 11 ? 'on' : '') + '" style="height:' + Math.max(6, n / mx * 100).toFixed(0) + '%" title="' + esc(ms[i] + ' · ' + n) + '"></i>').join('') + '</div><div class="irl"><span>' + esc(new Date(ms[0] + '-15').toLocaleDateString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { month: 'short' })) + '</span><span>' + esc(L('per month', 'po měsících')) + '</span><span>' + esc(L('now', 'teď')) + '</span></div>'; }
    const hero = top ? '<a class="pn frost solid shero ihero press' + (top.thumb ? ' hasth' : '') + '" href="' + esc(top.url || d.url) + '" target="_blank" rel="noopener" style="--k:' + (old ? '#ffb27a' : col) + '">' + imgT(top.thumb, 'ith') + '<span class="ihx"><span class="cap">' + esc(capH) + '</span><b class="eht">' + esc(top.title) + '</b><span class="shs">' + esc([agoT(top.date), top.value != null ? '★ ' + kf(top.value) : ''].filter(Boolean).join(' · ')) + '</span>' + (d.kind === 'github' && d.sub && !rh ? '<span class="ihd">' + esc(d.sub) + '</span>' : '') + rh + '</span></a>'
      : '<section class="pn frost solid shero ihero" style="--k:' + col + '"><span class="ihx"><span class="cap">' + esc(KIND[d.kind] || '') + '</span><b class="eht">' + esc(d.title) + '</b><span class="shs">' + esc(tr(d.sub) || '') + '</span></span></section>';
    const lim = V.srcAll === c.id ? 50 : desk ? 6 : 5, rest = rows.slice(1);
    const list = rest.length ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('Before that', 'Předtím')) + '</span><span class="muted">' + rest.length + '</span></div>' + rest.slice(0, lim).map(x => '<a class="srcit press" href="' + esc(x.url || d.url) + '" target="_blank" rel="noopener">' + (x.thumb ? imgT(x.thumb, '') : '<span class="srcd"><b>' + (x.date ? dm(x.date) : '·') + '</b></span>') + '<span class="tx"><b>' + esc(x.title) + '</b><small>' + esc([agoT(x.date), x.value != null ? '★ ' + kf(x.value) : ''].filter(Boolean).join(' · ')) + '</small></span><span class="sgo">' + ico('arrow', 13, 2.4) + '</span></a>').join('') + (rest.length > (desk ? 6 : 5) ? '<button class="lnk srcmore" data-a="srcAll" data-id="' + c.id + '">' + esc(V.srcAll === c.id ? L('Show less', 'Méně') : L('Show all ', 'Ukázat všech ') + rest.length) + '</button>' : '') + '</section>' : '';
    const T3 = T4.slice(0, 3), mb = '';
    const tall = !!(rh || (top && top.thumb));
    void mb; const B = { hero: { h: hero, s: tall ? 'L' : 'S' }, nums: { h: T3.length ? '<div class="kd4' + (desk ? (tall ? ' vcol' : '') : ' m') + '">' + T3.map(tile).join('') + '</div>' : '', s: tall ? 'S' : 'L' }, say1: { h: say1Of(c, insights(c, d)[0]) }, list: { h: list, s: 'L' }, say: { h: sayPanel(c, d), s: 'S' } };
    return compose(c, desk, more, head, B, { d: [['hero', 'nums'], ['list', 'say']], m: ['hero', 'nums', 'say1', 'list'], mm: ['say'] });
  }

  /* the link could not be read: one clean card that says how to fix it */
  function errPanel(c, st, desk, kn, ref) {
    const priv = /soukrom|private|sdílet|share|přístup|access|403|401/i.test(st.err || ''), more = isMore(c);
    const steps = priv ? [L('Open the sheet in Google Sheets', 'Otevři tabulku v Google Sheets'), L('Share → General access → Anyone with the link', 'Sdílet → Obecný přístup → Kdokoli s odkazem'), L('Role: Viewer, then come back and tap Try again', 'Role: Čtenář, pak se vrať a dej Zkusit znovu')] : [];
    return dashW(c, desk, more, '<div class="sdh"><div class="dgrp"><span class="kdst"><i style="background:' + c.color + ';box-shadow:none"></i>' + esc(kn) + '</span></div>' + ref + '</div>'
      + '<section class="pn frost solid serr"><span class="ricon">' + ico(priv ? 'lock' : 'sync', 24, 2) + '</span><b>' + esc(st.setup ? L('The link reader is not set up yet', 'Čtečka odkazů ještě není nastavená') : priv ? L('This sheet is private', 'Tabulka je soukromá') : L('Could not read the link', 'Odkaz se nepodařilo přečíst')) + '</b>'
      + '<span class="serrm">' + esc(st.setup ? L('One-time setup, about 5 minutes.', 'Jednorázové nastavení, asi 5 minut.') : priv ? L('Aurora can only read sheets anyone with the link can view. Three taps:', 'Aurora umí číst jen tabulky, které může vidět kdokoli s odkazem. Tři kroky:') : (st.err || '')) + '</span>'
      + (steps.length ? '<ol>' + steps.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol>' : '')
      + '<div class="sact">' + (st.setup ? '<button class="pbtn cr press" data-a="srcSetup">' + esc(L('Set it up', 'Nastavit')) + '</button>' : '<button class="pbtn cr press" data-a="srcRefresh" data-id="' + c.id + '">' + esc(L('Try again', 'Zkusit znovu')) + '</button>') + '<a class="pbtn ghost press" href="' + esc(c.src.url) + '" target="_blank" rel="noopener">' + esc(L('Open the link', 'Otevřít odkaz')) + '</a></div></section>'
      + moreButton(c, more, ''));
  }
  ACT.srcF = el => { V.recF = V.recF || {}; const id = el.dataset.id; V.recF[id] = V.recF[id] === el.dataset.k ? '' : el.dataset.k; V.recSel = V.recSel || {}; V.recSel[id] = null; repaintCard(id); };
  ACT.srcRec = el => { const id = el.dataset.id, r = +el.dataset.r; V.recSel = V.recSel || {}; V.recSel[id] = r;
    if (isDeskV()) { repaintCard(id); return; }
    const c = cardById(id), st = srcGet(id); if (!c || !st || !st.data) return; const M = model(c.src.recipe, st.data.grid); if (!M || M.kind !== 'list') return; const x = M.recs.find(y => y.row === r); if (!x) return;
    openSheet({ title: c.src.recipe.what || L('Detail', 'Detail'), leftLabel: L('Close', 'Zavřít'), cls: 'srcv', body: recDetail(c, M, x, false) });
  };
  function recDetail(c, M, x, panel) {
    const gs = {}; M.recs.forEach(y => { if (y.group) gs[y.group] = (gs[y.group] || 0) + 1; }); const order = Object.keys(gs).sort((a, b) => gs[b] - gs[a]);
    const gc = k => CODEC[Math.max(0, order.indexOf(k)) % CODEC.length];
    const inner = (panel ? '<span class="cap">' + esc(L('Detail', 'Detail')) + '</span>' : '') + '<b class="ldt">' + esc(x.label || x.vals[0] || '') + '</b>' + (x.group ? '<span class="lgp" style="--k:' + gc(x.group) + '">' + esc(x.group) + '</span>' : '')
      + '<div class="ldf">' + M.colLabels.map((lb, i) => x.vals[i] ? '<div><small>' + esc(lb || L('Value', 'Hodnota')) + '</small><span>' + esc(x.vals[i]) + '</span></div>' : '').join('') + '</div>'
      + '<div class="sact"><button class="pbtn ghost press" data-a="srcTask" data-id="' + c.id + '" data-t="' + esc(x.label || x.vals[0] || '') + '">' + ico('plus', 15, 2.4) + esc(L('Task for today', 'Úkol na dnes')) + '</button></div>';
    return panel ? '<section class="pn frost solid ldet">' + inner + '</section>' : '<div class="ldet sh">' + inner + '</div>';
  }
  function srcPanel(c, desk) {
    const st = srcGet(c.id) || {}, d = st.data, col = c.color, kn = KIND[(d && d.kind) || c.src.kind] || L('Link', 'Odkaz');
    const ref = '<button class="cb frost press srcr' + (st.loading ? ' spin' : '') + '" data-a="srcRefresh" data-id="' + c.id + '" aria-label="' + esc(L('Refresh', 'Obnovit')) + '">' + ico('sync', desk ? 18 : 16, 2.2) + '</button>';
    if (!d && st.errAt && !st.loading) return errPanel(c, st, desk, kn, ref);
    if (!d) {
      const msg = st.loading || !st.errAt ? L('Reading ', 'Čtu ') + c.src.url.replace(/^https?:\/\//, '').slice(0, 48) + '…' : st.err || L('Could not read it', 'Nepodařilo se přečíst');
      return '<section class="srcp frost solid' + (desk ? ' desk' : '') + '" data-src="' + c.id + '"><div class="srch"><span class="srck"><i style="background:' + col + '"></i>' + esc(kn) + '</span>' + ref + '</div><div class="srce"><b>' + esc(st.setup ? L('The link reader is not set up yet', 'Čtečka odkazů ještě není nastavená') : st.errAt && !st.loading ? L('Could not read the link', 'Odkaz se nepodařilo přečíst') : L('Getting the numbers…', 'Načítám čísla…')) + '</b><span>' + esc(st.setup ? L('One-time setup, about 5 minutes.', 'Jednorázové nastavení, asi 5 minut.') : msg) + '</span>' + (st.setup ? '<button class="pbtn cr press" data-a="srcSetup">' + esc(L('Set it up', 'Nastavit')) + '</button>' : st.errAt && !st.loading ? '<button class="pbtn ghost press" data-a="srcRefresh" data-id="' + c.id + '">' + esc(L('Try again', 'Zkusit znovu')) + '</button>' : '') + '</div></section>';
    }
    const img = (u, cls) => u ? '<img class="' + cls + '" src="' + esc(u) + '" onerror="this.style.visibility=\'hidden\'" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="' + cls + '"></span>';
    const head = '<div class="sdh"><div class="dgrp">' + (d.image ? '<img class="sav" src="' + esc(d.image) + '" onerror="this.remove()" alt="" referrerpolicy="no-referrer">' : '') + '<span class="kdst"><i style="background:' + col + ';box-shadow:none"></i>' + esc(kn) + '</span><span class="kdst"><i></i>' + esc(L('Live · ', 'Živě · ') + updated(st)) + '</span><a class="kdst press" href="' + esc(d.url || c.src.url) + '" target="_blank" rel="noopener">' + esc(L('Open', 'Otevřít')) + ' ' + ico('arrow', 12, 2.4) + '</a></div>' + ref + '</div>';
    if (d.kind === 'sheet' && (c.src.recipe || d.plain || !(d.kpis || []).length)) return recPanel(c, d, st, desk, ref, head);
    const T4 = tiles(d), ch = chartOf(c, d, desk), it = d.items || [], avg = it.filter(x => x.value != null).reduce((a, x, _, A) => a + x.value / A.length, 0);
    const tile = (k, i) => '<section class="pn frost solid kkpi" style="--i:' + i + '"><span class="cap">' + esc(k.label) + '</span><div class="kkn">' + esc(k.raw || kf(k.value)) + '</div><span class="muted ksubl">' + esc(k.text || '') + '</span></section>';
    const say = '<section class="pn frost solid saypn" style="--c:' + col + '"><div class="ph2"><span class="cap">' + esc(L('Aurora says', 'Aurora říká')) + '</span><span class="muted">' + esc(L('tap + to make it a task', '+ udělá z toho úkol')) + '</span></div><div class="saybox" data-say="' + c.id + '">' + sayHTML(c, d) + '</div></section>';
    const best = d.best ? '<a class="pn frost solid bestpn" href="' + esc(d.best.url) + '" target="_blank" rel="noopener">' + img(d.best.thumb, 'bthumb') + '<span class="cap">' + esc(L('Best of the latest', 'Nejlepší z posledních')) + '</span><b>' + esc(d.best.title) + '</b><span class="bnum"><em style="color:' + col + '">' + kf(d.best.value) + '</em> ' + esc(L('views', 'zhlédnutí')) + (avg ? ' · ' + String(Math.round(d.best.value / avg * 10) / 10).replace('.', lang() === 'cs' ? ',' : '.') + '× ' + esc(L('average', 'průměr')) : '') + '</span></a>' : '';
    const evs = (d.events || []).length ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(L('Coming up', 'Chystá se')) + '</span><span class="muted">' + d.events.length + '</span></div>' + d.events.slice(0, 6).map(x => { const dt = new Date(x.when.length === 10 ? x.when + 'T12:00:00' : x.when); return '<div class="srcit"><span class="srcd"><b>' + dt.getDate() + '.' + (dt.getMonth() + 1) + '.</b>' + (x.when.length > 10 ? '<small>' + dt.toLocaleTimeString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) + '</small>' : '') + '</span><span class="tx"><b>' + esc(x.title) + '</b><small>' + esc(ago2(x.when)) + '</small></span></div>'; }).join('') + '</section>' : '';
    const vsA = v => { if (v == null || !avg) return ''; const r = v / avg; return '<span class="vsa"><span class="khl"><i style="width:' + Math.min(100, r / 2 * 100).toFixed(0) + '%;background:' + (r >= 1 ? col : 'rgba(243,234,216,.35)') + '"></i></span><b class="' + (r >= 1.15 ? 'up' : r <= .85 ? 'down' : '') + '">' + (r >= 1 ? '+' : '') + Math.round((r - 1) * 100) + ' %</b></span>'; };
    const hasV = it.some(x => x.value != null);
    const srt = V.srcSort || 'new', lim = V.srcAll === c.id ? 99 : desk ? 8 : 5;
    const rows = it.map((x, ix) => Object.assign({ ix }, x)); if (hasV && srt === 'top') rows.sort((a, b) => (b.value || 0) - (a.value || 0));
    const sortSeg = hasV ? '<div class="seg frost srcsort">' + [['new', L('Latest', 'Nejnovější')], ['top', L('Most viewed', 'Nejsledovanější')]].map(([k, l]) => '<button class="' + (srt === k ? 'on' : '') + '" data-a="srcSort" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div>' : '<span class="muted">' + it.length + '</span>';
    const table = it.length ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(tr(d.itemsLabel) || L('Latest', 'Poslední')) + '</span>' + sortSeg + '</div><table class="ktb srctb"><tbody>' + rows.slice(0, lim).map(x => '<tr class="srctr" ' + (hasV ? 'data-a="srcVid" data-id="' + c.id + '" data-i="' + x.ix + '"' : '') + '><td>' + (hasV ? '<span class="srcrow">' : '<a class="srcrow" href="' + esc(x.url || d.url || '#') + '" target="_blank" rel="noopener">') + (x.thumb ? img(x.thumb, 'sth') : '') + '<span><b>' + esc(x.title) + '</b><small class="muted">' + esc(x.date ? ago2(x.date) : '') + '</small></span>' + (hasV ? '</span>' : '</a>') + '</td>' + (hasV ? '<td class="vnum">' + kf(x.value) + '</td>' + (desk ? '<td class="vs">' + vsA(x.value) + '</td>' : '') : '') + '</tr>').join('') + '</tbody></table>' + (it.length > (desk ? 8 : 5) ? '<button class="lnk srcmore" data-a="srcAll" data-id="' + c.id + '">' + esc(V.srcAll === c.id ? L('Show less', 'Méně') : L('Show all ', 'Ukázat všech ') + it.length) + '</button>' : '') + '</section>' : '';
    const chart = ch ? '<section class="pn frost solid"><div class="ph2"><span class="cap">' + esc(ch.cap) + '</span><span class="muted">' + (avg ? '<i class="avgk"></i>' + esc(L('average ', 'průměr ') + kf(avg)) : '') + '</span></div>' + ch.svg + '</section>' : '';
    if (d.kind === 'calendar') return calPanel(c, d, st, desk, head);
    if (d.kind === 'github' || d.kind === 'feed' || d.kind === 'podcast') return itemPanel(c, d, st, desk, head, T4, tile);
    if (d.kind === 'youtube' && d.best) {
      const r = avg ? Math.round(d.best.value / avg * 10) / 10 : 0;
      const vhero = '<a class="pn frost solid vhero" href="' + esc(d.best.url) + '" target="_blank" rel="noopener">' + img(d.best.thumb, 'vth') + '<span class="vtx"><span class="cap" style="color:#8be0b0">' + esc(r >= 1.3 ? L('Doing ' + r + '× the average', 'Jede ' + String(r).replace('.', lang() === 'cs' ? ',' : '.') + '× líp než průměr') : L('Best of the latest', 'Nejlepší z posledních')) + '</span><b>' + esc(d.best.title) + '</b><small>' + kf(d.best.value) + ' ' + esc(L('views', 'zhlédnutí')) + '</small></span></a>';
      const T3 = T4.filter(k => !/^(Views|Zhlédnutí)$/.test(k.label)).slice(0, 3);
      const nums = '<div class="kd4' + (desk ? ' vcol' : ' m') + '">' + T3.map(tile).join('') + '</div>';
      const mo = V.srcMore && V.srcMore[c.id];
      const B = { hero: { h: vhero, s: 'L' }, nums: { h: nums, s: 'S' }, chart: { h: chart, s: 'L' }, table: { h: table, s: 'L' }, say: { h: say, s: 'S' } };
      return compose(c, desk, mo, head, B, { d: [['hero', 'nums'], ['chart'], ['table', 'say']], m: ['hero', 'nums', 'chart', 'say', 'table'] });
    }
    const mo2 = V.srcMore && V.srcMore[c.id];
    const B = { nums: { h: T4.length ? '<div class="kd4' + (desk ? '' : ' m') + '">' + T4.map(tile).join('') + '</div>' : '', raw: true }, chart: { h: chart, s: 'L' }, say: { h: say, s: 'S' }, table: { h: table, s: 'L' }, best: { h: best, s: 'S' }, events: { h: evs, s: 'S' } };
    return compose(c, desk, mo2, head, B, { d: [['nums'], ['chart', 'say'], best ? ['table', 'best'] : ['table', 'events'], best ? ['events'] : []], m: ['nums', 'say', 'chart', 'best', 'table', 'events'] });
  }
  const repaintCard = id => { if (V.card !== id) return; if (isDeskV()) { const m = $('#desk'), y = m ? m.scrollTop : 0, dm2 = $('#dCardMain'), y2 = dm2 ? dm2.scrollTop : 0; mountSrc($('#dCardMain'), true); if (dm2) dm2.scrollTop = y2; } else { const e3 = $('#s-card'), y = e3.scrollTop; mountSrc(e3, false); e3.scrollTop = y; } };
  ACT.srcSort = el => { V.srcSort = el.dataset.k; repaintCard(V.card); };
  ACT.srcAll = el => { V.srcAll = V.srcAll === el.dataset.id ? null : el.dataset.id; repaintCard(el.dataset.id); };
  ACT.srcVid = el => {
    const c = cardById(el.dataset.id), st = c && srcGet(c.id), d = st && st.data; if (!d) return; const it = d.items || [], x = it[+el.dataset.i]; if (!x) return;
    const vals = it.filter(y => y.value != null), avg = vals.reduce((a, y) => a + y.value, 0) / (vals.length || 1), rank = vals.slice().sort((a, b) => b.value - a.value).indexOf(x) + 1, r = x.value / (avg || 1);
    const dt = x.date ? new Date(x.date) : null, task = L('Learn from “', 'Poučit se z „') + short(x.title, 34) + L('”', '“');
    openSheet({ title: KIND[d.kind] || L('Video', 'Video'), leftLabel: L('Close', 'Zavřít'), cls: 'srcv', body:
      (x.thumb ? '<a class="svth" href="' + esc(x.url) + '" target="_blank" rel="noopener"><img src="' + esc(x.thumb) + '" onerror="this.style.visibility=\'hidden\'" alt="" referrerpolicy="no-referrer"><span class="svplay">' + ico('play', 22, 2.2) + '</span></a>' : '')
      + '<b class="svt">' + esc(x.title) + '</b><small class="svd">' + esc(dt ? dt.toLocaleDateString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'long' }) + ' · ' + L('', 'před ') + ago2(x.date) + L(' ago', '') : '') + '</small>'
      + '<div class="rnkp sv3"><span><b>' + kf(x.value) + '</b>' + esc(L('views', 'zhlédnutí')) + '</span><span><b class="' + (r >= 1.15 ? 'up' : r <= .85 ? 'down' : '') + '">' + (r >= 1 ? '+' : '') + Math.round((r - 1) * 100) + ' %</b>' + esc(L('vs average', 'proti průměru')) + '</span><span><b>#' + rank + '</b>' + esc(L('of ', 'z ') + vals.length) + '</span></div>'
      + '<div class="svact"><a class="pbtn cr press" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(L('Open on ', 'Otevřít na ') + (KIND[d.kind] || 'web')) + '</a><button class="pbtn ghost press" id="svTask">' + ico('plus', 15, 2.4) + esc(L('Task', 'Úkol')) + '</button></div>',
      mount: e2 => { e2.querySelector('#svTask').onclick = () => { S.items.push({ id: uid(), t: task, card: c.id, date: T(), created: T() }); save(); haptic(); closeSheet(true); toast(esc(L('Added for today', 'Přidáno na dnes'))); repaintAll(c.id); }; } });
  };
  const repaintAll = id => { if (V.card !== id) return; if (isDeskV()) deskRender(); else { const e3 = $('#s-card'), y = e3.scrollTop; renderCard(); e3.scrollTop = y; } };
  ACT.srcTask = el => { const c = cardById(el.dataset.id); if (!c) return; const t3 = el.dataset.t; S.items.push({ id: uid(), t: t3, card: c.id, date: T(), created: T() }); save(); haptic && haptic(); toast(esc(L('Added for today', 'Přidáno na dnes')) + ' · ' + esc(short(t3, 34))); if (V.card === c.id) { if (isDeskV()) { const m = $('#desk'), y = m ? m.scrollTop : 0; deskRender(); if (m) m.scrollTop = y; } else { const e3 = $('#s-card'), y = e3.scrollTop; renderCard(); e3.scrollTop = y; } } };
  ACT.srcAsk = async el => {
    const c = cardById(el.dataset.id); if (!c || asking.has(c.id)) return; const st = srcGet(c.id), d = st && st.data; if (!d) return; const cfg = askCfg();
    asking.add(c.id); repaintSay(c);
    const data = { kind: d.kind, title: d.title, sub: d.sub, kpis: d.kpis, items: (d.items || []).slice(0, 15).map(x => ({ title: x.title, date: x.date, value: x.value })), events: (d.events || []).slice(0, 8), series: d.series ? d.series.points.slice(-30) : null, computed: insights(c, d).map(x => x.t), today: T() };
    let o;
    try { const r = await fetch(srcBase() + '/ask', { method: 'POST', headers: { 'content-type': 'text/plain', 'x-aurora-pin': cfg.pin, 'x-aurora-user': aiUser() }, body: JSON.stringify({ name: c.name, lang: lang(), model: cfg.model, effort: cfg.effort, data }) }); const j = await r.json().catch(() => null); aiSeen(j);
      o = r.ok && j && j.lines ? { at: Date.now(), lines: j.lines, task: j.task, mk: cfg.model } : { at: Date.now(), err: j && j.error === 'pin' ? L('Wrong PIN, check it in Settings → Sources → Link reader.', 'Špatný PIN, zkontroluj ho v Settings → Sources → Čtečka odkazů.') : j && j.error === 'noai' ? L('Claude is not set up on the reader yet.', 'Na čtečce ještě není nastavený Claude.') : j && j.error === 'limit' ? L('Today’s AI limit is used up (' + j.limit + '). It resets tomorrow.', 'Dnešní AI limit je vyčerpaný (' + j.limit + '). Zítra se obnoví.') : (j && j.message) || L('Aurora could not answer.', 'Aurora neodpověděla.') }; }
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
    const qi = p && p.querySelector('[data-recq]'); if (qi) { let tq; qi.addEventListener('input', () => { clearTimeout(tq); tq = setTimeout(() => { V.recQ = V.recQ || {}; V.recQ[c.id] = qi.value; repaintCard(c.id); const n = root.querySelector('[data-recq]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); }); }
    if (go) { const inp = p.querySelector('.srcin'); const run = () => { const v = inp.value.trim(), k = v && linkKind(v); if (!k) { inp.focus(); return; } if (k.own) { ACT.srcAdv(); return; } c.src = { url: v, kind: k.k }; save(); mountSrc(root, desk); srcRefresh(c, true); };
      go.onclick = run; inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } }); }
    if (c.src && stale(c) && !busy.has(c.id)) { const st = srcGet(c.id); if (!st || !st.errAt || Date.now() - st.errAt > 60000) srcRefresh(c); }
  }
  ACT.srcRefresh = el => { const c = cardById(el.dataset.id); if (c) srcRefresh(c, true); };
  /* Spaces: the card's subtitle becomes the source's numbers */
  function spacesSrc() {
    S.cards.filter(c => c.src).forEach(c => { const st = srcGet(c.id); if (stale(c) && !busy.has(c.id) && (!st || !st.errAt || Date.now() - st.errAt > 300000)) setTimeout(() => srcRefresh(c), 400);
      if (!st || !st.data) return; const t3 = (c.src.recipe && recSummary(c)) || srcSummary(st.data);
      document.querySelectorAll('#deck > .spc[data-id="' + c.id + '"] .sub, #desk .dcard[data-id="' + c.id + '"] .dsub').forEach(n => { n.textContent = t3; n.classList.add('srcsub'); });
      document.querySelectorAll('#s-spaces .stack > .lrow[data-id="' + c.id + '"] .tx small').forEach(n => { n.textContent = (KIND[st.data.kind] || '') + ' · ' + t3; }); });
  }
  /* hook the card page and Spaces on phone and computer */
  const _rc = renderCard; renderCard = function () { _rc(); if (!isDeskV()) mountSrc($('#s-card'), false); };
  document.addEventListener('DOMContentLoaded', () => {
    const _rs = renderSpaces; renderSpaces = function () { _rs(); if (!V.spEdit) spacesSrc(); try { fixCount(); } catch (e) {} }; if (typeof RENDER !== 'undefined') RENDER.spaces = renderSpaces;
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
        try { const j = await (await fetch(base + '/ping', { cache: 'no-store' })).json(); st.innerHTML = j && j.ok ? '<span class="rnl"><i style="background:#8be0b0"></i><b>' + esc(L('Works', 'Funguje')) + '</b> · v' + j.v + ' · ' + esc(j.ask ? L('Claude ready', 'Claude připravený') : L('Claude not set up', 'Claude nenastavený')) + '</span>' : '<span class="rnl"><i style="background:#ff8a8a"></i><b>' + esc(L('Not a reader', 'Tohle není čtečka')) + '</b></span>'; 
          if (j && j.ok && j.v >= 4) { try { const q = await (await fetch(base + '/quota', { headers: { 'x-aurora-pin': el.querySelector('#srcPin').value.trim(), 'x-aurora-user': aiUser() } })).json(); if (q && q.limit) { aiSeen(q); st.insertAdjacentHTML('beforeend', '<span class="rnl"><i style="background:#b18cff"></i>' + esc(q.left == null ? L('AI limit: no counter yet (bind ASK_KV)', 'AI limit: zatím bez počítadla (chybí ASK_KV)') : L('AI today: ' + q.left + ' of ' + q.limit + ' left', 'AI dnes: zbývá ' + q.left + ' z ' + q.limit)) + '</span>'); } } catch (e) {} } }
        catch (e) { st.innerHTML = '<span class="rnl"><i style="background:#ff8a8a"></i><b>' + esc(L('Not reachable', 'Nedostupné')) + '</b> · ' + esc(L('check the address and that you pressed Deploy', 'zkontroluj adresu a že jsi dal Deploy')) + '</span>'; } }; } });
  }
  ACT.srcSetup = () => { if (SH.open) after(srcSetupSheet); else srcSetupSheet(); };
  /* v2033 · what the AI orb needs from here */
  window.LABX = { srcGet, srcBase, askCfg, insights, evsOf, untilTxt, BLK, viewOf, LASTB, repaintCard, aiUser, aiSeen, aiLeft, isDeskV };
})();
