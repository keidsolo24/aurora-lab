/* Aurora 2 Lab · v2033 · AI orb + "thinking" mood
   The orb sits where + used to be. Tap = add (as before). Hold = pick it up: places it can help with light up,
   the rest dims. Drop it on one (or hold, let go, then tap one). Aurora offers at most 3 steps, the first one is the
   AI step (one query, counts toward the daily limit), the others are fixed and free. Nothing is applied without a
   preview with Add / Back, and after adding there is still Undo. While AI works, the whole app slips into a calm
   "thinking" mood: the KEID mark melts into drops that flow through shapes and back. */
(function () {
  const L = (en, cs) => (lang() === 'cs' ? cs : en);
  const X = () => window.LABX || {};
  const desk = () => typeof DESK !== 'undefined' && DESK.on;
  const HOLD = 360, MOVE = 10;
  const O = { held: false, aim: false, tg: [], over: null, ghost: null, layer: null, btn: null, t: null, x0: 0, y0: 0, moved: false, busy: false, pid: null };

  /* ---------- the orb itself ---------- */
  const orbFace = small => '<span class="orbv' + (small ? ' sm' : '') + '" aria-hidden="true"><span class="orbm"></span></span>';
  function dress() {
    const p = $('#plusBtn'); if (p && !p.querySelector('.orbv')) { const first = !p.classList.contains('aorb'); p.classList.add('aorb'); p.classList.remove('cr'); p.innerHTML = orbFace() + '<span class="orbp">' + ico('plus', 12, 3) + '</span>'; p.setAttribute('aria-label', L('Add · hold for Aurora AI', 'Přidat · podrž pro Aurora AI')); if (first) bind(p); }
    /* on the phone the card page has no nav, so the orb floats there on its own */
    let f = $('#orbFab'); if (!f) { f = document.createElement('button'); f.id = 'orbFab'; f.className = 'aorb press'; f.innerHTML = orbFace() + '<span class="orbp">' + ico('plus', 12, 3) + '</span>'; f.setAttribute('aria-label', L('Add to this card · hold for Aurora AI', 'Přidat do karty · podrž pro Aurora AI')); f.addEventListener('click', () => { if (V.card) openAdd({ card: V.card }); }); document.body.appendChild(f); bind(f); }
    f.classList.toggle('on', !!(V.card && !V.settingsOpen && !desk()));
    document.querySelectorAll('.dadd[data-a="add"]').forEach(b => { if (b.classList.contains('aorb')) return; b.classList.add('aorb'); const s = b.querySelector('svg'); if (s) s.outerHTML = orbFace(true); bind(b); });
  }
  function bind(b) {
    b.style.touchAction = 'none';
    b.addEventListener('pointerdown', e => { if (O.busy || e.button > 0) return; O.btn = b; O.pid = e.pointerId; O.x0 = e.clientX; O.y0 = e.clientY; O.moved = false; clearTimeout(O.t); b.classList.add('orbpress'); O.t = setTimeout(() => pickUp(e), HOLD); });
    b.addEventListener('pointermove', e => { if (!O.held && O.t && Math.hypot(e.clientX - O.x0, e.clientY - O.y0) > MOVE) { clearTimeout(O.t); O.t = null; b.classList.remove('orbpress'); } });
    const up = () => { clearTimeout(O.t); O.t = null; b.classList.remove('orbpress'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', e => e.preventDefault());

  }

  /* ---------- what the orb can be dropped on ---------- */
  const TG = [
    ['.sdash [data-b]', el => { const s = el.closest('[data-src]'); return s && { type: 'block', card: s.dataset.src, b: el.dataset.b }; }],
    ['[data-a="openCard"][data-id]', el => cardById(el.dataset.id) && { type: 'card', card: el.dataset.id }],
    ['#s-card .cname, #dCardTitle', () => V.card && cardById(V.card) && { type: 'card', card: V.card }],
    ['.irow[data-id], .trow[data-id], .fp[data-a="openItem"][data-id]', el => S.items.find(i => i.id === el.dataset.id) && { type: 'task', id: el.dataset.id }],
    ['#s-plan .dayp .dh', () => ({ type: 'day', d: V.planDay || T() })],
    ['.wd[data-d]', el => ({ type: 'day', d: el.dataset.d })],
    ['.addday[data-date]', el => ({ type: 'day', d: el.dataset.date, el: el.closest('section') || el })],
    ['.mt[data-id], .hrow[data-a="viewMoment"][data-id]', el => S.moments.find(m => m.id === el.dataset.id) && { type: 'photo', id: el.dataset.id }],
    ['#dialw', () => ({ type: 'now' })]
  ];
  function visible(el) {
    const r = el.getBoundingClientRect(); if (r.width < 24 || r.height < 18 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
    const cx = Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2)), cy = Math.min(innerHeight - 2, Math.max(2, r.top + Math.min(r.height / 2, 40)));
    const hit = document.elementFromPoint(cx, cy); if (!hit || !(el === hit || el.contains(hit))) return null;
    return r;
  }
  function collect() {
    const out = [], seen = new Set();
    TG.forEach(([sel, f]) => document.querySelectorAll(sel).forEach(el => { const t = f(el); if (!t) return; const box = t.el || el; if (seen.has(box)) return; const r = visible(box); if (!r) return; seen.add(box); t.el = box; t.r = r; out.push(t); }));
    return out.slice(0, 60);
  }

  /* ---------- pick up, drag, drop ---------- */
  function pickUp(e) {
    O.t = null; const b = O.btn; if (!b) return; b._orbEat = Date.now(); b.classList.remove('orbpress');
    O.tg = collect(); if (!O.tg.length) { toast(esc(L('Nothing here the orb can help with yet', 'Tady zatím orb nemá s čím pomoct'))); return; }
    O.held = true; O.aim = false; haptic(); try { b.setPointerCapture(O.pid); } catch (er) {}
    document.body.classList.add('orbing');
    const lay = document.createElement('div'); lay.id = 'orbL'; O.layer = lay;
    const W = innerWidth, H = innerHeight, rr = r => 'M' + (r.left - 6) + ' ' + (r.top - 6) + 'h' + (r.width + 12) + 'v' + (r.height + 12) + 'h' + -(r.width + 12) + 'z';
    lay.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><path fill-rule="evenodd" class="orbdim" d="M0 0H' + W + 'V' + H + 'H0z ' + O.tg.map(t => rr(t.r)).join(' ') + '"/></svg>'
      + O.tg.map((t, i) => '<i class="orbt" data-i="' + i + '" style="left:' + (t.r.left - 6) + 'px;top:' + (t.r.top - 6) + 'px;width:' + (t.r.width + 12) + 'px;height:' + (t.r.height + 12) + 'px;--d:' + (i * 30) + 'ms"></i>').join('')
      + '<div class="orbhint">' + esc(L('Drop me on something', 'Hoď mě na něco')) + '</div>';
    document.body.appendChild(lay);
    const g = document.createElement('div'); g.id = 'orbGhost'; g.innerHTML = orbFace(); document.body.appendChild(g); O.ghost = g;
    const br = b.getBoundingClientRect(); place(br.left + br.width / 2, br.top + br.height / 2);
    requestAnimationFrame(() => g.classList.add('on'));
    b.classList.add('orbaway');
    b.addEventListener('pointermove', onMove); b.addEventListener('pointerup', onUp); b.addEventListener('pointercancel', cancel);
    lay.addEventListener('pointerdown', onAimTap);
  }
  const place = (x, y) => { O.ghost.style.transform = 'translate(' + (x - 34) + 'px,' + (y - 34) + 'px)'; };
  const hitAt = (x, y) => { let best = null; O.tg.forEach((t, i) => { const r = t.r; if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6) { const a = r.width * r.height; if (!best || a < best.a) best = { i, a }; } }); return best ? best.i : null; };
  function setOver(i) {
    if (O.over === i) return; O.over = i; O.layer && O.layer.querySelectorAll('.orbt').forEach(n => n.classList.toggle('over', +n.dataset.i === i));
    O.ghost && O.ghost.classList.toggle('snap', i != null); if (i != null) haptic();
  }
  function onMove(e) {
    if (!O.held) return; if (Math.hypot(e.clientX - O.x0, e.clientY - O.y0) > MOVE) O.moved = true;
    const i = hitAt(e.clientX, e.clientY); setOver(i);
    if (i != null) { const r = O.tg[i].r; place(Math.min(innerWidth - 30, r.right - 10), Math.max(30, r.top + 10)); } else place(e.clientX, e.clientY - 36);
  }
  function onUp(e) {
    const b = O.btn; b && b.removeEventListener('pointermove', onMove); b && b.removeEventListener('pointerup', onUp); if (b) b._orbEat = Date.now();
    const i = hitAt(e.clientX, e.clientY);
    if (i != null && O.moved) return drop(O.tg[i]);
    if (!O.moved) { O.aim = true; O.layer.classList.add('aim'); O.layer.querySelector('.orbhint').textContent = L('Now tap where it should go', 'Teď klepni, kam ho dát'); const br = b.getBoundingClientRect(); place(br.left + br.width / 2, br.top - 40); return; }
    cancel();
  }
  function onAimTap(e) { if (!O.aim) return; e.preventDefault(); e.stopPropagation(); const i = hitAt(e.clientX, e.clientY); if (i == null) return cancel(); setOver(i); setTimeout(() => drop(O.tg[i]), 140); }
  function cleanup() {
    const b = O.btn; if (b) { b._orbEat = Date.now(); b.removeEventListener('pointermove', onMove); b.removeEventListener('pointerup', onUp); b.removeEventListener('pointercancel', cancel); b.classList.remove('orbaway'); }
    O.layer && O.layer.remove(); O.layer = null; if (O.ghost) { const g = O.ghost; g.classList.remove('on'); setTimeout(() => g.remove(), 260); } O.ghost = null;
    document.body.classList.remove('orbing'); O.held = false; O.aim = false; O.over = null;
  }
  function cancel() { cleanup(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && O.held) cancel(); });

  /* ---------- the steps each target knows (max 3, the first is the AI one) ---------- */
  const ai = (goal, label, sub) => ({ ai: true, goal, label, sub });
  const fx = (label, sub, run) => ({ ai: false, label, sub, run });
  function titleOf(t) {
    if (t.type === 'card' || t.type === 'block') { const c = cardById(t.card); return (c ? c.name : '') + (t.type === 'block' ? ' · ' + L(...((X().BLK || {})[t.b] || [t.b, t.b])) : ''); }
    if (t.type === 'task') { const i = S.items.find(x => x.id === t.id); return i ? i.t : ''; }
    if (t.type === 'day') return typeof dayFull === 'function' ? dayFull(t.d) : t.d;
    if (t.type === 'photo') { const m = S.moments.find(x => x.id === t.id); return m ? (m.note || m.title || L('Photo', 'Fotka')) : ''; }
    return L('Right now', 'Teď hned');
  }
  function stepsOf(t) {
    if (t.type === 'card') { const c = cardById(t.card);
      return [ai('week', L('Prepare the week', 'Připravit týden'), L('tasks from events, numbers and what is open', 'úkoly z událostí, čísel a toho, co je otevřené')),
        fx(L('Sum up the week', 'Shrnout týden'), L('free, counted by the app', 'zdarma, spočítá appka'), () => preview(t, { goal: 'sum', lines: sumWeek(c) })),
        c && c.src ? fx(L('Edit view', 'Upravit pohled'), L('blocks on the card', 'bloky na kartě'), () => { openCardIfNeeded(c); setTimeout(() => ACT.srcView({ dataset: { id: c.id } }), 450); }) : fx(L('Open the card', 'Otevřít kartu'), '', () => openCardIfNeeded(c))]; }
    if (t.type === 'block') return [ai('explain', L('Explain what is going on', 'Vysvětli, co se tu děje'), L('a few lines and one task', 'pár řádků a jeden úkol')),
      fx(L('Make it a task', 'Udělej z toho úkol'), L('for today', 'na dnes'), () => preview(t, { goal: 'task', items: [{ t: L('Go through: ', 'Projít: ') + titleOf(t).split(' · ').pop(), date: T(), on: true }] })),
      fx(L('Hide the block', 'Skryj blok'), L('it goes under More', 'půjde pod Víc ›'), () => hideBlock(t))];
    if (t.type === 'task') return [ai('split', L('Break it into steps', 'Rozlož na kroky'), L('3–5 small steps', '3–5 malých kroků')),
      fx(L('Move to tomorrow', 'Přesunout na zítra'), '', () => moveTask(t)), fx(L('Open', 'Otevřít'), '', () => openItem(t.id))];
    if (t.type === 'day') { const past = t.d <= T();
      return [ai('dayplan', L('Spread the day into free slots', 'Rozvrhni den do volných oken'), L('times for tasks without one', 'časy pro úkoly bez času')),
        past ? fx(L('Move what I won’t make', 'Přesuň, co nestihnu'), L('open tasks to the next day', 'otevřené úkoly na další den'), () => preview(t, { goal: 'move', items: S.items.filter(i => !i.repeat && i.date === t.d && !i.done).map(i => ({ id: i.id, t: i.t, date: addD(t.d, 1), on: true })) })) : null,
        fx(L('Add to this day', 'Přidat na tento den'), '', () => openAdd({ date: t.d }))].filter(Boolean); }
    if (t.type === 'photo') return [ai('photo', L('Plan from it', 'Naplánovat z toho'), L('1–3 tasks', '1–3 úkoly')),
      fx(L('Plan it', 'Naplánovat'), L('as before', 'jako dosud'), () => { const m = S.moments.find(x => x.id === t.id); if (m && typeof planMoment === 'function') planMoment(m); })];
    return [fx(L('What should I do now?', 'Co mám dělat teď?'), L('free, counted by the app', 'zdarma, spočítá appka'), () => preview(t, { goal: 'now', lines: nowLines() }))];
  }
  const openCardIfNeeded = c => { if (c && V.card !== c.id && typeof openCard === 'function') openCard(c.id); };

  /* ---------- free steps the app counts itself ---------- */
  function sumWeek(c) {
    if (!c) return []; const td = T(), wk = Array.from({ length: 7 }, (_, i) => addD(td, i)), mine = S.items.filter(i => i.card === c.id);
    const open = mine.filter(i => !i.done), dueW = open.filter(i => i.date && wk.includes(i.date)), late = open.filter(i => i.date && i.date < td && !i.repeat);
    const out = [L(open.length + ' open tasks, ' + dueW.length + ' due this week.', open.length + ' otevřených úkolů, ' + dueW.length + ' na tento týden.')];
    if (late.length) out.push(L(late.length + ' are late — start with “' + late[0].t + '”.', late.length + ' po termínu, začni „' + late[0].t + '“.'));
    const st = X().srcGet && X().srcGet(c.id); if (st && st.data && X().insights) { const ins = X().insights(c, st.data); if (ins[0]) out.push(ins[0].t); }
    return out;
  }
  function nowLines() {
    const td = T(), nm = typeof nowMin === 'function' ? nowMin() : 0, its = typeof itemsOn === 'function' ? itemsOn(td).filter(i => !isDone(i, td)) : [];
    const timed = its.filter(i => i.time).sort((a, b) => tmin(a.time) - tmin(b.time)), nx = timed.find(i => tmin(i.time) + (i.dur || 45) > nm), free = its.filter(i => !i.time);
    if (!its.length) return [L('Nothing left for today. Rest, or pick something from Board.', 'Na dnes nic nezbývá. Odpočiň si, nebo vyber něco z Boardu.')];
    const out = []; if (nx) out.push(L('Next: ' + nx.t + ' at ' + nx.time + '.', 'Další: ' + nx.t + ' v ' + nx.time + '.'));
    if (free.length) out.push(L('Until then: ' + free[0].t + '.', 'Do té doby: ' + free[0].t + '.'));
    out.push(L(its.length + ' left today.', 'Dnes zbývá ' + its.length + '.')); return out;
  }
  function hideBlock(t) {
    const c = cardById(t.card), lb = X().LASTB && X().LASTB[t.card]; if (!c || !c.src || !lb) return;
    const prev = c.src.view ? JSON.parse(JSON.stringify(c.src.view)) : null;
    c.src.view = { order: lb.ord.slice(), off: lb.off.concat(lb.off.includes(t.b) ? [] : [t.b]) }; save(); X().repaintCard && X().repaintCard(c.id); done();
    toast(esc(L('Moved under More', 'Přesunuto pod Víc')), { label: L('Undo', 'Vrátit'), fn: () => { c.src.view = prev; save(); X().repaintCard && X().repaintCard(c.id); } });
  }
  function moveTask(t) {
    const i = S.items.find(x => x.id === t.id); if (!i) return; const was = i.date; i.date = addD(i.date && i.date > T() ? i.date : T(), 1); save(); rerender(); done();
    toast(esc(L('Moved to ', 'Přesunuto na ') + dayLbl(i.date)), { label: L('Undo', 'Vrátit'), fn: () => { i.date = was; save(); rerender(); } });
  }
  const rerender = () => { try { render(); } catch (e) {} try { if (desk() && typeof deskRender === 'function') deskRender(); } catch (e) {} try { if (V.card && X().repaintCard) X().repaintCard(V.card); } catch (e) {} };

  /* ---------- drop → choose a step ---------- */
  function drop(t) {
    cleanup(); haptic();
    const steps = stepsOf(t).slice(0, 3), q = X().aiLeft && X().aiLeft(), cfg = X().askCfg ? X().askCfg() : {};
    const left = q && q.left != null ? L(q.left + ' of ' + q.limit + ' AI left today', 'AI dnes zbývá ' + q.left + ' z ' + q.limit) : '';
    openSheet({ title: titleOf(t), leftLabel: L('Back', 'Zpět'), cls: 'orbsh',
      body: '<div class="orbst">' + steps.map((s, i) => '<button class="orbs press' + (s.ai ? ' ai' : '') + '" data-i="' + i + '"' + (s.ai && !cfg.pin ? ' data-nopin="1"' : '') + '>'
        + '<span class="orbsi">' + (s.ai ? orbFace(true) : ico(i === 1 ? 'check' : 'arrow', 18, 2.2)) + '</span><span class="tx"><b>' + esc(s.label) + '</b><small>' + esc(s.sub || '') + '</small></span>'
        + '<span class="orbsc">' + esc(s.ai ? (cfg.pin ? L('★ AI · 1 query', '★ AI · 1 dotaz') : L('set up AI', 'nastav AI')) : L('free', 'zdarma')) + '</span></button>').join('') + '</div>'
        + '<p class="orbfoot">' + esc(L('Nothing changes until you tap Add.', 'Nic se nezmění, dokud nedáš Přidat.')) + (left ? ' · ' + esc(left) : '') + '</p>',
      mount: e2 => e2.querySelectorAll('.orbs').forEach(b => b.onclick = () => { const s = steps[+b.dataset.i]; if (s.ai && b.dataset.nopin) { closeSheet(true); setTimeout(() => ACT.srcSetup && ACT.srcSetup(), 380); return; } closeSheet(true); setTimeout(() => s.ai ? think(t, s) : s.run(), 320); }) });
  }

  /* ---------- AI step: thinking mood → preview ---------- */
  function ctxOf(t) {
    const c = t.card && cardById(t.card), st = c && X().srcGet && X().srcGet(c.id), d = st && st.data;
    const src = d ? { kind: d.kind, title: d.title, sub: d.sub, kpis: d.kpis, events: X().evsOf ? X().evsOf(d).slice(0, 12).map(x => ({ title: x.title, day: x.day, allDay: x.allDay })) : [], items: (d.items || []).slice(0, 8).map(x => ({ title: x.title, date: x.date, value: x.value })), says: X().insights ? X().insights(c, d).map(x => x.t) : [] } : null;
    if (t.type === 'card') return { card: c && c.name, type: c && c.type, open: S.items.filter(i => i.card === t.card && !i.done).slice(0, 25).map(i => ({ t: i.t, date: i.date || null })), source: src };
    if (t.type === 'block') { const el = document.querySelector('[data-src="' + t.card + '"] [data-b="' + t.b + '"]'); return { card: c && c.name, block: t.b, shows: el ? el.innerText.replace(/\s+\n/g, '\n').slice(0, 2400) : '', source: src }; }
    if (t.type === 'task') { const i = S.items.find(x => x.id === t.id) || {}; const cc = i.card && cardById(i.card); return { task: i.t, note: i.note || '', card: cc && cc.name, date: i.date || null }; }
    if (t.type === 'day') { const its = typeof itemsOn === 'function' ? itemsOn(t.d) : []; return { date: t.d, tasks: its.filter(i => !isDone(i, t.d)).map(i => ({ id: i.id, t: i.t, time: i.time || (i.repeat ? 'fixed' : null), dur: i.dur || 45 })) }; }
    if (t.type === 'photo') { const m = S.moments.find(x => x.id === t.id) || {}; const cc = m.card && cardById(m.card); return { kind: m.kind, note: m.note || '', title: m.title || '', url: m.url || '', card: cc && cc.name }; }
    return {};
  }
  async function think(t, s) {
    if (O.busy) return; O.busy = true; mood(true, s.label);
    const cfg = X().askCfg(), now = new Date(); let j = null, err = '';
    try { const r = await fetch(X().srcBase() + '/orb', { method: 'POST', headers: { 'content-type': 'text/plain', 'x-aurora-pin': cfg.pin, 'x-aurora-user': X().aiUser() },
        body: JSON.stringify({ goal: s.goal, type: t.type, title: titleOf(t), ctx: ctxOf(t), lang: lang(), today: T(), now: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'), model: cfg.model, effort: cfg.effort }) });
      j = await r.json().catch(() => null); X().aiSeen(j);
      if (!r.ok || !j || j.error) err = j && j.error === 'limit' ? L('Today’s AI limit is used up (' + j.limit + '). Fixed steps keep working, it resets tomorrow.', 'Dnešní AI limit je vyčerpaný (' + j.limit + '). Pevné kroky fungují dál, zítra se obnoví.') : j && j.error === 'pin' ? L('Wrong PIN, check Settings → Link reader.', 'Špatný PIN, zkontroluj Nastavení → Čtečka odkazů.') : j && j.error === 'noai' ? L('Claude is not set up on the reader yet.', 'Na čtečce ještě není nastavený Claude.') : (j && j.message) || L('Aurora could not answer.', 'Aurora neodpověděla.'); }
    catch (e) { err = L('The link reader is not reachable.', 'Čtečka odkazů není dostupná.'); }
    await new Promise(r => setTimeout(r, 450));
    mood(false); O.busy = false;
    if (err) return preview(t, { goal: s.goal, lines: [err], err: true });
    const items = (j.items || []).map(x => Object.assign({ on: true }, x));
    if (s.goal === 'explain' && j.task) items.push({ t: j.task, date: T(), on: true });
    if (s.goal === 'dayplan') items.forEach(x => { const i = S.items.find(y => y.id === x.id); x.t = i ? i.t : ''; });
    preview(t, { goal: s.goal, lines: j.lines || [], items: items.filter(x => x.t), left: j.left, limit: j.limit });
  }

  /* ---------- preview: Add / Back, then Undo ---------- */
  const dayLbl = d => { const td = T(); if (d === td) return L('today', 'dnes'); if (d === addD(td, 1)) return L('tomorrow', 'zítra'); try { return new Date(d + 'T12:00:00').toLocaleDateString(lang() === 'cs' ? 'cs-CZ' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'numeric' }); } catch (e) { return d; } };
  function preview(t, p) {
    const items = p.items || [], card = t.card || (t.type === 'task' ? (S.items.find(x => x.id === t.id) || {}).card : t.type === 'photo' ? (S.moments.find(x => x.id === t.id) || {}).card : null);
    const when = x => x.time ? x.time : x.date ? dayLbl(x.date) : '';
    const paint = box => { box.innerHTML = (p.lines && p.lines.length ? '<div class="orbln' + (p.err ? ' err' : '') + '">' + p.lines.map(l => '<p>' + esc(l) + '</p>').join('') + '</div>' : '')
      + (items.length ? '<section class="grp frost solid orbit">' + items.map((x, i) => '<button class="srow orbi' + (x.on ? ' on' : '') + '" data-i="' + i + '"><span class="ck">' + (x.on ? ico('check', 13, 3) : '') + '</span><span class="tx">' + esc(x.t) + '</span><span class="r">' + esc(when(x)) + '</span></button>').join('') + '</section>' : '')
      + (p.left != null ? '<p class="orbfoot">' + esc(L(p.left + ' of ' + p.limit + ' AI left today', 'AI dnes zbývá ' + p.left + ' z ' + p.limit)) + '</p>' : ''); };
    const can = items.length && !p.err;
    openSheet({ title: titleOf(t), leftLabel: L('Back', 'Zpět'), right: can ? L('Add', 'Přidat') : L('Done', 'Hotovo'), cls: 'orbsh',
      body: '<div id="orbPv"></div>',
      mount: e2 => { const box = e2.querySelector('#orbPv'); paint(box); box.onclick = ev => { const b = ev.target.closest('.orbi'); if (!b) return; const x = items[+b.dataset.i]; x.on = !x.on; haptic(); paint(box); }; },
      onSave: () => { closeSheet(true); if (!can) return; apply(t, p.goal, items.filter(x => x.on), card); } });
  }
  function apply(t, goal, items, card) {
    if (!items.length) return; const undo = [];
    if (goal === 'dayplan') items.forEach(x => { const i = S.items.find(y => y.id === x.id); if (i && !i.time && !i.repeat && x.time) { undo.push(() => { i.time = null; }); i.time = x.time; } });
    else if (goal === 'move') items.forEach(x => { const i = S.items.find(y => y.id === x.id); if (i) { const was = i.date; undo.push(() => { i.date = was; }); i.date = x.date; } });
    else { const base = t.type === 'task' ? ((S.items.find(y => y.id === t.id) || {}).date || T()) : t.type === 'day' ? t.d : T();
      items.forEach(x => { const it = { id: uid(), t: x.t, card: card || null, date: x.date || base, created: T() }; S.items.push(it); undo.push(() => { S.items = S.items.filter(y => y.id !== it.id); }); }); }
    save(); rerender(); done();
    toast(esc(goal === 'dayplan' ? L('Times set', 'Časy nastavené') : goal === 'move' ? L('Moved', 'Přesunuto') : L('Added ', 'Přidáno ') + items.length), { label: L('Undo', 'Vrátit'), fn: () => { undo.forEach(f => f()); save(); rerender(); } });
  }
  function done() { document.querySelectorAll('.aorb').forEach(b => { b.classList.remove('orbdone'); void b.offsetWidth; b.classList.add('orbdone'); setTimeout(() => b.classList.remove('orbdone'), 1300); }); }

  /* ---------- the "thinking" mood ---------- */
  let K = '';
  const goo = () => { if (!K) { const n = 37; K = '<svg class="omo" viewBox="0 0 200 200" aria-hidden="true"><defs><filter id="ogoo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter><linearGradient id="ogr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fb1"/><stop offset=".35" stop-color="#b18cff"/><stop offset=".7" stop-color="#7fd6ff"/><stop offset="1" stop-color="#8be0b0"/></linearGradient></defs><g filter="url(#ogoo)" fill="url(#ogr)">' + Array.from({ length: n }, (_, i) => '<circle class="k' + i + '" cx="100" cy="100" r="10"/>').join('') + '</g></svg>'; } return K; };
  function mood(on, label) {
    let m = $('#orbMood');
    if (on) {
      if (!m) { m = document.createElement('div'); m.id = 'orbMood'; document.body.appendChild(m); }
      m.innerHTML = '<div class="omw"></div><div class="omc">' + goo() + '<span class="omk"></span><b>' + esc(L('Aurora is thinking', 'Aurora přemýšlí')) + '</b><small>' + esc(label || '') + '</small></div>';
      document.body.classList.add('thinking'); requestAnimationFrame(() => m.classList.add('on'));
    } else if (m) { m.classList.add('out'); m.classList.remove('on'); document.body.classList.remove('thinking'); setTimeout(() => m && m.remove(), 700); }
  }

  /* first run: one bubble, once */
  function tipOnce() {
    try { if (localStorage.getItem('orbTip')) return; } catch (e) { return; }
    const p = desk() ? document.querySelector('.dadd.aorb') : $('#plusBtn'); if (!p || !p.offsetParent) return;
    const r = p.getBoundingClientRect(), b = document.createElement('div'); b.className = 'orbtip'; b.textContent = L('New: hold me and drop me on a card', 'Novinka: podrž mě a hoď na kartu');
    document.body.appendChild(b); const w = b.offsetWidth; b.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w + 30)) + 'px'; b.style.top = (desk() ? r.bottom + 12 : r.top - b.offsetHeight - 12) + 'px'; if (desk()) b.classList.add('dn');
    requestAnimationFrame(() => b.classList.add('on'));
    const gone = () => { b.classList.remove('on'); setTimeout(() => b.remove(), 300); try { localStorage.setItem('orbTip', '1'); } catch (e) {} document.removeEventListener('pointerdown', gone, true); };
    setTimeout(() => document.addEventListener('pointerdown', gone, true), 300); setTimeout(gone, 9000);
  }

  /* a hold must not also open "Add" (window capture runs before every other click handler) */
  window.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.aorb'); if (b && b._orbEat && Date.now() - b._orbEat < 1500) { b._orbEat = 0; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  ACT.orbDrop = el => { const t = { type: el.dataset.type, card: el.dataset.card, b: el.dataset.b, id: el.dataset.id, d: el.dataset.d }; drop(t); };
  window.ORB = { drop, mood, collect };
  const tick = () => { try { dress(); } catch (e) {} };
  document.addEventListener('DOMContentLoaded', () => { tick(); setTimeout(tipOnce, 2200); });
  let q = 0; new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; tick(); }); }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  tick();
})();
