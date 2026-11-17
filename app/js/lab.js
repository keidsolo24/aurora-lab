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
    kLoading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/keiro.js?v=2001'; s.onload = () => res(window.KR); s.onerror = rej; document.head.appendChild(s); });
    return kLoading;
  };
  if (KCFG().on) keiroLoad().then(() => { if (S) render(); }).catch(() => {});

  /* ---------- hooks into the existing screens ---------- */
  const _home = renderHome;
  renderHome = function () { _home(); labBadge(); };
  /* Home: Keiro speaks through the notification bar between the arc and the widgets */
  HOME_NOTES.push(() => (window.KR ? KR.note() : null));
  const _spaces = renderSpaces;
  renderSpaces = function () { _spaces(); if (window.KR) KR.spacesHook($('#s-spaces')); };
  function labBadge() { const h = $('#s-home .hdr .logo'); if (h && !h.nextElementSibling?.classList.contains('labtag')) h.insertAdjacentHTML('afterend', '<span class="labtag">LAB</span>'); }

  /* 2.0 week (checklist 03 · Týden): one row per day with the day's things as chips, today highlighted.
     Tap a day → that day in the list, tap a chip → the item. Desktop keeps its own week. */
  const _plan = renderPlan;
  renderPlan = function () {
    _plan();
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
  ACT.keiroSettings = () => { V.settingsPage = 'keiro'; renderSettings(); $('#s-settings').scrollTop = 0; };
})();
