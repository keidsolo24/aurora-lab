/* Aurora 2 Lab · v2045 · a new card in one line
   You write what you want to keep doing or get done ("running 3× a week", "website for FIT by 15.12."),
   Aurora shows the card it understood (habit, monthly or project, how often, by when) and you tap Create.
   The type can be switched with one tap. The old detailed form stays one tap away. */
(function () {
  const L = (en, cs) => (lang() === 'cs' ? cs : en);
  const deacc = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const NUMW = { jednou: 1, once: 1, dvakrat: 2, twice: 2, trikrat: 3, ctyrikrat: 4, petkrat: 5 };

  /* what the line says: type, name, goal or deadline */
  function read(text) {
    const raw = String(text || '').trim(), d = deacc(raw); const out = { type: 'project', name: raw, goal: null, deadline: null, why: '' };
    if (!raw) return out;
    let cut = [];
    const monthly = /(kazdy mesic|mesicne|jednou za mesic|every month|monthly)/.exec(d);
    const times = /(\d)\s*(x|×|krat)\s*(za\s+)?(tydne|tyden|týdně|a week|per week|weekly|week)?/.exec(d) || /(jednou|dvakrat|trikrat|ctyrikrat|petkrat|once|twice)\s*(za\s+)?(tydne|tyden|a week|per week)/.exec(d);
    const daily = /(kazdy den|denne|daily|every day|kazdej den)/.exec(d);
    const weekly = /(tydne|kazdy tyden|weekly|every week)/.exec(d);
    if (monthly) { out.type = 'month'; cut.push(monthly[0]); }
    else if (times) { out.type = 'habit'; out.goal = Math.max(1, Math.min(7, +times[1] || NUMW[times[1]] || 3)); cut.push(times[0]); }
    else if (daily) { out.type = 'habit'; out.goal = 7; cut.push(daily[0]); }
    else if (weekly) { out.type = 'habit'; out.goal = 1; cut.push(weekly[0]); }
    else {
      /* "… do pátku / do 15.12. / do zítřka / do konce prosince" → deadline, and the name is what comes before */
      const dm = /^(.*?)\s+(do|by|until)\s+(.+)$/i.exec(raw); const dl = dm && due(dm[3]);
      if (dl) { out.deadline = dl; out.name = dm[1]; return fin(out, []); }
      const p = typeof NL === 'function' ? NL(raw) : null;
      if (p && p.repeat) { out.type = 'habit'; out.goal = p.days && p.days.length ? p.days.length : 7; }
      if (p && p.date && !p.repeat) out.deadline = p.date;
      if (p && p.spans && p.spans.length) { let n = raw; p.spans.slice().sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { n = n.slice(0, a) + n.slice(b); }); out.name = n; }
    }
    return fin(out, cut);
  }
  const WD = [['pondel', 0], ['uter', 1], ['stred', 2], ['ctvrt', 3], ['pat', 4], ['sobot', 5], ['nedel', 6], ['mon', 0], ['tue', 1], ['wed', 2], ['thu', 3], ['fri', 4], ['sat', 5], ['sun', 6]];
  const MO = ['led', 'un', 'bre', 'dub', 'kve', 'cervn', 'cerven', 'srp', 'zar', 'rij', 'listop', 'prosin'];
  const MOE = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const iso = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  function due(s) {
    const d = deacc(s).trim(), now = new Date(T() + 'T12:00:00');
    if (/^(zitr|tomorrow)/.test(d)) { now.setDate(now.getDate() + 1); return iso(now); }
    if (/^(dnes|today)/.test(d)) return iso(now);
    let m = /^(\d{1,2})\.\s*(\d{1,2})\.?(\s*(\d{4}))?/.exec(d) || /^(\d{1,2})\/(\d{1,2})(\/(\d{4}))?/.exec(d);
    if (m) { const y = m[4] ? +m[4] : now.getFullYear(); let dt = new Date(y, +m[2] - 1, +m[1], 12); if (!m[4] && dt < now) dt = new Date(y + 1, +m[2] - 1, +m[1], 12); return isNaN(dt) ? null : iso(dt); }
    if ((m = /^(konce|end of)\s+(.+)$/.exec(d))) { const w = m[2]; if (/^(tydne|week)/.test(w)) { const k = (7 - ((now.getDay() + 6) % 7)) - 1; now.setDate(now.getDate() + k); return iso(now); }
      let mi = /^(mesice|month)/.test(w) ? now.getMonth() : MO.findIndex(x => w.startsWith(x)); if (mi < 0) mi = MOE.findIndex(x => w.startsWith(x)); if (mi < 0) return null;
      let y = now.getFullYear(); if (mi < now.getMonth()) y++; return iso(new Date(y, mi + 1, 0, 12)); }
    if ((m = /^(pristiho |next )?(.+)$/.exec(d))) { const w = WD.find(([k]) => m[2].startsWith(k)); if (w) { const cur = (now.getDay() + 6) % 7; let k = (w[1] - cur + 7) % 7; if (k === 0) k = 7; if (m[1]) k += 7; now.setDate(now.getDate() + k); return iso(now); } }
    return null;
  }
  function fin(out, cut) {
    let n = out.name; const dn = deacc(n);
    cut.forEach(c => { const k = dn.indexOf(c); if (k >= 0) n = n.slice(0, k) + n.slice(k + c.length); });
    out.name = n.replace(/\s+(do|by|until|az|na)\s*$/i, '').replace(/\s{2,}/g, ' ').replace(/^[\s,·:-]+|[\s,·:-]+$/g, '').trim();
    out.name = out.name ? out.name.charAt(0).toUpperCase() + out.name.slice(1) : '';
    return out;
  }

  const Q = { text: '', type: null, goal: null };
  function line(r) {
    if (!r.name) return '';
    const ty = Q.type || r.type, g = Q.goal || r.goal || 3;
    const what = ty === 'habit' ? L(g === 7 ? 'every day' : g + '× a week', g === 7 ? 'každý den' : g + '× týdně') : ty === 'month' ? L('every month', 'každý měsíc') : r.deadline ? L('by ', 'do ') + (typeof dayShort === 'function' ? dayShort(r.deadline) : r.deadline) : L('no deadline', 'bez termínu');
    return '<div class="qcp"><span class="qcd" style="--c:' + (ty === 'habit' ? 'var(--green)' : ty === 'month' ? '#4cc9d9' : 'var(--orange)') + '"></span><b>' + esc(r.name) + '</b><span>' + esc(what) + '</span></div>';
  }
  /* v2051 · four big choices (Habit · Project · Monthly · Studio); typing marks the one Aurora understood */
  const TYPES = () => [
    ['habit', ico('repeat', 20, 2), L('Habit', 'Návyk'), L('something you repeat', 'co opakuješ'), '#3fc483'],
    ['project', ico('flame', 20, 2), L('Project', 'Projekt'), L('get it done by a date', 'dotáhnout do termínu'), '#f2a541'],
    ['month', ico('cal', 20, 2), L('Monthly', 'Měsíčně'), L('bills, things each month', 'platby, věci každý měsíc'), '#5fb2d4'],
    ['studio', ico('play', 20, 2), 'Studio', L('video in, cut out', 'video → sestřih'), '#5fd0cf']];
  function paint(el) {
    const r = read(Q.text), ty = Q.type || (r.name ? r.type : null);
    el.querySelector('#qcPrev').innerHTML = line(r);
    el.querySelectorAll('.qtl').forEach(b => b.classList.toggle('on', b.dataset.k === ty));
    const g = el.querySelector('.qcg'); g.hidden = !(ty === 'habit' && r.name);
    g.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.g === (Q.goal || r.goal || 3)));
    const sv = document.getElementById('sheetSave'); if (sv) sv.disabled = !r.name;
  }
  function card(pre) {
    Q.text = pre || ''; Q.type = null; Q.goal = null;
    openSheet({ title: t('newCard'), right: L('Create', 'Vytvořit'), rightDisabled: !read(Q.text).name, cls: 'qcsheet a3qc',
      body: '<div class="fld in big"><input id="qcIn" autocomplete="off" enterkeyhint="done" placeholder="' + esc(L('What do you want to keep doing or get done?', 'Co chceš dělat nebo dotáhnout?')) + '" value="' + esc(Q.text) + '"></div>'
        + '<div id="qcPrev"></div>'
        + '<div class="qtls">' + TYPES().map(([k, ic, n, sub, c]) => '<button class="qtl press" data-k="' + k + '" style="--c:' + c + '"><span class="qti">' + ic + '</span><b>' + esc(n) + '</b><small>' + esc(sub) + '</small></button>').join('') + '</div>'
        + '<div class="qcg" hidden>' + [1, 2, 3, 4, 5, 7].map(n => '<button data-g="' + n + '">' + (n === 7 ? L('daily', 'denně') : n + '×') + '</button>').join('') + '</div>'
        + '<div class="qcmore"><button class="lnk" data-a="srcLink">' + esc(L('Paste a link instead', 'Nebo vlož odkaz')) + '</button><button class="lnk" id="qcFull">' + esc(L('More options', 'Víc možností')) + '</button></div>',
      mount: el => {
        const i = el.querySelector('#qcIn'); paint(el); setTimeout(() => i.focus(), 320);
        i.addEventListener('input', () => { Q.text = i.value; paint(el); });
        i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const sv = document.getElementById('sheetSave'); sv && !sv.disabled && sv.click(); } });
        el.querySelectorAll('.qtl').forEach(b => b.onclick = () => {
          if (b.dataset.k === 'studio') { closeSheet(true); setTimeout(() => { if (window.A3S) A3S.open(); }, 300); return; }
          Q.type = b.dataset.k; paint(el); if (!read(Q.text).name) i.focus();
        });
        el.querySelectorAll('.qcg button').forEach(b => b.onclick = () => { Q.goal = +b.dataset.g; paint(el); });
        el.querySelector('#qcFull').onclick = () => { closeSheet(true); setTimeout(() => openCardSheet(null), 320); };
      },
      onSave: () => {
        const r = read(Q.text); if (!r.name) return; const ty = Q.type || r.type;
        const c = { id: uid(), name: r.name, type: ty, color: COLORS[S.cards.length % COLORS.length], deadline: ty === 'project' ? r.deadline : null, note: '', created: T(), goal: ty === 'habit' ? (Q.goal || r.goal || 3) : undefined };
        if (ty === 'month') c.win = { from: 14, to: 20 };
        S.cards.push(c); save(); closeSheet(true); toast(esc(t('cardCreated'))); setTimeout(() => openCard(c.id), 280);
      } });
  }
  window.QUICK = { card, read };
  document.addEventListener('DOMContentLoaded', () => { ACT.newCard = el => { if (el && el._suppress && Date.now() - el._suppress < 500) return; card(''); }; });
})();
