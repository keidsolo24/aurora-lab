/* Aurora 2 Lab · v2034 · Studio: the first skill "Střih" inside a project card.
   Film it, upload it to Aurora, write what you want. The video goes straight to Cloudflare R2 in 8 MB parts
   (it survives a dropped connection and an app restart), never through sync. The cutting server (aurora-studio)
   sends back a preview, a summary and 3 openings; nothing is final until Use, nothing is lost on Discard.
   The person never sets anything up: being signed in to Aurora is enough. Keiro projects stay as they are. */
(function () {
  const L = (en, cs) => (lang() === 'cs' ? cs : en);
  const STUDIO_DEFAULT = 'https://aurora-studio.keidaurora.workers.dev';
  const base = () => { try { return (localStorage.getItem('studioServer') || STUDIO_DEFAULT).replace(/\/+$/, ''); } catch (e) { return STUDIO_DEFAULT; } };
  const desk = () => typeof DESK !== 'undefined' && DESK.on;
  const signed = () => !!(S && S.acc && S.acc.id && S.sync && S.sync.sp && S.sync.secret);
  const H = () => ({ 'x-aurora-sp': S.sync.sp, 'x-aurora-secret': S.sync.secret });
  const ST = { jobs: [], daily: 5, used: 0, at: 0, err: '', ups: {}, loading: false, poll: null };
  const STATUS = { queued: ['In the queue', 'Ve frontě'], cutting: ['Cutting', 'Stříhám'], ready: ['Pick an opening', 'Vyber začátek'], 'final-queued': ['Final version next', 'Finální verze se chystá'], finalizing: ['Making the final version', 'Dělám finální verzi'], final: ['Done · download', 'Hotovo · stáhnout'], error: ['Failed', 'Nepovedlo se'] };
  const STAGE = { start: ['starting', 'začínám'], download: ['getting the video', 'beru video'], transcript: ['transcript', 'přepis'], plan: ['reading your request', 'čtu zadání'], cut: ['cutting pauses', 'stříhám pauzy'], render: ['rendering', 'renderuju'], upload: ['almost done', 'skoro hotovo'] };
  const busy = j => ['queued', 'cutting', 'final-queued', 'finalizing'].includes(j.status);

  async function api(path, o = {}) {
    const r = await fetch(base() + path, Object.assign({}, o, { headers: Object.assign({}, H(), o.headers || {}) }));
    const j = await r.json().catch(() => null);
    if (!r.ok) { const e = new Error((j && j.message) || 'HTTP ' + r.status); e.code = j && j.error; e.status = r.status; e.j = j; throw e; }
    return j;
  }
  async function load(quiet) {
    if (!signed()) return; ST.loading = !quiet;
    try { const j = await api('/jobs'); ST.jobs = j.jobs || []; ST.daily = j.daily; ST.used = j.used; ST.err = ''; ST.at = Date.now(); }
    catch (e) { ST.err = e.status === 401 ? L('Studio could not verify your account. Settings → Connection check shows why.', 'Studio neověřilo tvůj účet. Nastavení → Kontrola spojení ukáže proč.') : L('Studio server is not reachable.', 'Server Studia není dostupný.'); }
    ST.loading = false; paintAll(); schedule();
  }
  function schedule() {
    clearTimeout(ST.poll); const any = ST.jobs.some(busy) || Object.keys(ST.ups).length;
    /* v2052 · keep checking wherever the Studio shows: a card, the Studio page, Spaces or Home */
    if (any) ST.poll = setTimeout(() => load(true), document.hidden ? 30000 : 4000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && signed() && (V.card || V.studio || V.stv || ST.jobs.some(busy) || Object.keys(ST.ups).length)) load(true); });

  /* ---------- upload in parts, resumable ---------- */
  const upKey = id => 'studio:up:' + id;
  async function saveUp(u) { const rec = Object.assign({}, u); delete rec.file; try { localStorage.setItem('studioUps', JSON.stringify(Object.values(ST.ups).map(x => { const r = Object.assign({}, x); delete r.file; return r; }))); await DB.set('kv', upKey(u.id), u.file); } catch (e) {} }
  async function dropUp(u) { delete ST.ups[u.id]; try { localStorage.setItem('studioUps', JSON.stringify(Object.values(ST.ups).map(x => { const r = Object.assign({}, x); delete r.file; return r; }))); await DB.del('kv', upKey(u.id)); } catch (e) {} }
  async function restoreUps() {
    let list = []; try { list = JSON.parse(localStorage.getItem('studioUps') || '[]'); } catch (e) {}
    for (const r of list) { let f = null; try { f = await DB.get('kv', upKey(r.id)); } catch (e) {} if (f) { ST.ups[r.id] = Object.assign(r, { file: f, state: 'paused' }); setTimeout(() => runUp(ST.ups[r.id]), 1500); } }
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function runUp(u) {
    if (!u || u.running) return; u.running = true; u.state = 'up'; u.err = ''; paintAll();
    try {
      if (!u.key) { const s = await api('/u/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: u.name, size: u.size, type: u.type }) }); Object.assign(u, { key: s.key, uploadId: s.uploadId, partSize: s.partSize, parts: [] }); await saveUp(u); }
      const n = Math.ceil(u.size / u.partSize);
      for (let i = 1; i <= n; i++) {
        if (u.parts.some(p => p.partNumber === i)) continue;
        const blob = u.file.slice((i - 1) * u.partSize, Math.min(u.size, i * u.partSize));
        for (let tr = 0; ; tr++) {
          if (!navigator.onLine) { u.state = 'offline'; paintAll(); await new Promise(r => window.addEventListener('online', r, { once: true })); u.state = 'up'; }
          try { const p = await api('/u/part?key=' + encodeURIComponent(u.key) + '&uploadId=' + encodeURIComponent(u.uploadId) + '&n=' + i, { method: 'PUT', headers: { 'content-type': 'application/octet-stream' }, body: blob }); u.parts.push({ partNumber: p.partNumber, etag: p.etag }); break; }
          catch (e) { if (e.status === 401 || e.status === 403 || tr >= 6) throw e; await wait(Math.min(30000, 1500 * 2 ** tr)); }
        }
        u.pct = Math.round(u.parts.length / n * 100); await saveUp(u); paintAll();
      }
      await api('/u/done', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: u.key, uploadId: u.uploadId, parts: u.parts }) });
      const p = S.push || {};
      const j = await api('/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: u.key, name: u.name, prompt: u.prompt, card: u.card, lang: lang(), push: p.on && p.id && typeof pushBase === 'function' && pushBase() ? { url: pushBase(), id: p.id, secret: p.secret } : null }) });
      ST.jobs.unshift(j.job); ST.used = (ST.used || 0) + 1; await dropUp(u);
      toast(esc(L('Uploaded · Aurora is cutting it', 'Nahráno · Aurora stříhá')) + (p.on ? '' : ' · ' + esc(L('turn on notifications to hear when it is done', 'zapni notifikace, ať víš, kdy je hotovo'))));
    } catch (e) {
      u.running = false; u.state = 'error'; u.err = e.code === 'limit' ? L('Today’s limit is used up (' + (e.j && e.j.limit) + ' videos). The video waits, try tomorrow.', 'Dnešní limit je vyčerpaný (' + (e.j && e.j.limit) + ' videí). Video počká, zkus to zítra.') : e.code === 'big' || e.code === 'type' ? e.message : L('Upload stopped', 'Nahrávání se zastavilo') + ' (' + (e.status ? e.status + ' · ' : '') + (e.message || 'network') + '). ' + L('Tap to try again.', 'Ťukni a zkusí to znova.');
      if (e.code === 'big' || e.code === 'type') await dropUp(u); else await saveUp(u);
      paintAll(); return;
    }
    u.running = false; paintAll(); schedule();
  }

  /* ---------- the panel on a project card ---------- */
  const fmtS = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const mb = b => (b / 1048576).toFixed(b > 104857600 ? 0 : 1) + ' MB';
  function rowJob(j) {
    const it = j.result && j.result.items && j.result.items[0], img = it && it.posterUrl ? '<img src="' + esc(base() + it.posterUrl) + '" alt="" loading="lazy">' : '<i>' + ico('play', 16, 2.2) + '</i>';
    const st = L(...(STATUS[j.status] || [j.status, j.status])) + (busy(j) && j.stage ? ' · ' + L(...(STAGE[j.stage] || [j.stage, j.stage])) : '') + (j.status === 'ready' && j.result ? ' · ' + j.result.summary : '');
    return '<button class="strow press s-' + j.status + '" data-a="stOpen" data-id="' + j.id + '"><span class="stth">' + img + '</span><span class="tx"><b>' + esc(j.prompt || j.name) + '</b><small>' + esc(st) + '</small></span>'
      + (busy(j) ? '<span class="stpct"><i style="--p:' + (j.pct || 4) + '"></i></span>' : j.status === 'ready' ? '<span class="stgo">' + esc(L('Pick', 'Vybrat')) + '</span>' : j.status === 'final' ? '<span class="stgo ok">' + ico('download', 15, 2.4) + '</span>' : j.status === 'error' ? '<span class="stgo err">!</span>' : '') + '</button>';
  }
  function rowUp(u) {
    return '<button class="strow press s-up" data-a="stUp" data-id="' + u.id + '"><span class="stth"><i>' + ico('upload', 16, 2.2) + '</i></span><span class="tx"><b>' + esc(u.prompt || u.name) + '</b><small>' + esc(u.state === 'error' ? u.err : u.state === 'offline' ? L('Waiting for the internet…', 'Čekám na internet…') : u.state === 'paused' ? L('Continuing the upload…', 'Pokračuju v nahrávání…') : L('Uploading ', 'Nahrávám ') + (u.pct || 0) + ' % · ' + mb(u.size)) + '</small></span><span class="stpct"><i style="--p:' + (u.pct || 2) + '"></i></span></button>';
  }
  function panel(c) {
    const jobs = ST.jobs.filter(j => j.card === c.id), ups = Object.values(ST.ups).filter(u => u.card === c.id);
    const head = '<div class="ph2"><span class="cap">' + esc(L('Studio · cut', 'Studio · střih')) + '</span><span class="muted">' + esc(signed() && ST.at ? L(ST.used + ' of ' + ST.daily + ' today', ST.used + ' z ' + ST.daily + ' dnes') : '') + '</span></div>';
    if (!signed()) return ''; /* v2045 · not signed in: Studio stays out of the way */
    if (!jobs.length && !ups.length) return '<section class="pn frost solid stud empty1" data-st="' + c.id + '"><span class="stic">' + ico('play', 18, 2.2) + '</span><span class="tx"><b>' + esc(L('Cut a video', 'Nech si sestříhat video')) + '</b><small>' + esc(L('Upload it and write what you want. Aurora does the rest.', 'Nahraj ho a napiš, co z něj chceš. Zbytek udělá Aurora.')) + '</small></span><button class="pbtn cr press stnew" data-a="stNew" data-id="' + c.id + '">' + esc(L('Upload', 'Nahrát')) + '</button></section>';
    return '<section class="pn frost solid stud" data-st="' + c.id + '">' + head + '<div class="stl">' + ups.map(rowUp).join('') + jobs.slice(0, 6).map(rowJob).join('') + '</div>'
      + (ST.err ? '<p class="sayerr">' + esc(ST.err) + '</p>' : '') + '<button class="chip frost press stadd" data-a="stNew" data-id="' + c.id + '">' + ico('plus', 14, 2.4) + ' ' + esc(L('Another video', 'Další video')) + '</button></section>';
  }
  function mount(root, isDesk) {
    const c = V.card && cardById(V.card); if (!c || c.type !== 'project' || !root) return;
    const html = panel(c), old = root.querySelector('.stud');
    if (old) { old.outerHTML = html; return; }
    const after = root.querySelector('.srcp') || (isDesk ? root.querySelector('#dCardTitle') : root.querySelector('.cnote') || root.querySelector('.cname'));
    if (after) after.insertAdjacentHTML('afterend', html);
    if (signed() && Date.now() - ST.at > 20000 && !ST.loading) load(true);
  }
  function paintAll() {
    if (window.A3S) A3S.paint();
    if (!V.card) return;
    if (desk()) { const m = $('#dCardMain'); if (m) mount(m, true); } else { const e = $('#s-card'); if (e) mount(e, false); }
    if (SH.open && SH.stJob) { const j = ST.jobs.find(x => x.id === SH.stJob); if (j && SH.stStatus !== j.status) openJob(j.id); }
  }

  /* ---------- new video ---------- */
  ACT.stNew = async el => {
    const card = el.dataset.id || 'studio'; let file = null;
    /* v2051 · from a Board video: the file is already here */
    if (el.dataset.mom) { const m = S.moments.find(x => x.id === el.dataset.mom); try { const b = m && m.img && await DB.get('media', m.img); if (b) file = new File([b], (m.note || 'video').slice(0, 40).replace(/[^\w\- ]+/g, '') + '.mp4', { type: b.type || 'video/mp4' }); } catch (e) {} }
    const ex = [L('Reel: drop the pauses and ums, captions, hook on top', 'Reel, vyhoď pauzy a ehm, titulky, hook nahoru'), L('3 funniest moments for TikTok', '3 nejvtipnější momenty na TikTok'), L('Fast cut to music, 15 s', 'Rychlý sestřih na hudbu, 15 s')];
    openSheet({ title: L('New video', 'Nové video'), leftLabel: L('Cancel', 'Zrušit'), right: L('Cut it', 'Stříhat'), cls: 'stsh',
      body: '<label class="stpick press" for="stFile"><span class="stic">' + ico('upload', 18, 2.2) + '</span><span class="tx"><b id="stFn">' + esc(L('Choose a video', 'Vyber video')) + '</b><small id="stFs">' + esc(L('From your phone or computer', 'Z mobilu nebo počítače')) + '</small></span></label><input type="file" id="stFile" accept="video/*" hidden>'
        + '<span class="cap" style="display:block;margin:18px 2px 8px">' + esc(L('What do you want from it?', 'Co z něj chceš?')) + '</span><div class="fld in"><textarea id="stPr" rows="3" maxlength="600" placeholder="' + esc(ex[0]) + '"></textarea></div>'
        + '<div class="stex">' + ex.map(x => '<button class="chip frost press" data-ex="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>'
        + '<p class="stfoot">' + esc(L('Uploads in parts, so a dropped connection does not matter. Nothing is published without you.', 'Nahrává se po kouscích, výpadek nevadí. Nic se nevydá bez tebe.')) + (ST.at ? ' · ' + esc(L((ST.daily - ST.used) + ' videos left today', 'dnes zbývá ' + Math.max(0, ST.daily - ST.used) + ' videí')) : '') + '</p>',
      mount: e2 => {
        if (file) { e2.querySelector('#stFn').textContent = file.name; e2.querySelector('#stFs').textContent = mb(file.size) + ' · ' + L('from Board', 'z Boardu'); }
        e2.querySelector('#stFile').onchange = ev => { file = ev.target.files[0] || null; if (file) { e2.querySelector('#stFn').textContent = file.name; e2.querySelector('#stFs').textContent = mb(file.size); } };
        e2.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { const t = e2.querySelector('#stPr'); t.value = b.dataset.ex; t.focus(); });
      },
      onSave: () => {
        if (!file) { const l = $('#sheet .stpick'); l && l.classList.add('shake'); setTimeout(() => l && l.classList.remove('shake'), 500); return; }
        if (!/^video\//.test(file.type || 'video/mp4')) { toast(esc(L('That is not a video', 'Tohle není video'))); return; }
        const u = { id: uid(), card, name: file.name, size: file.size, type: file.type || 'video/mp4', prompt: ($('#stPr').value || '').trim(), file, pct: 0, parts: [], state: 'up', at: Date.now() };
        ST.ups[u.id] = u; closeSheet(true); saveUp(u); paintAll(); runUp(u); haptic();
      } });
  };
  ACT.stUp = el => { const u = ST.ups[el.dataset.id]; if (!u) return; if (u.state === 'error' && !/limit/.test(u.err)) { runUp(u); return; }
    confirmSheet(L('Cancel this upload?', 'Zrušit nahrávání?'), L('Cancel upload', 'Zrušit'), async () => { try { if (u.key) await api('/u/abort', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: u.key, uploadId: u.uploadId }) }); } catch (e) {} await dropUp(u); paintAll(); }); };

  /* ---------- a finished cut: preview, summary, 3 openings, slip-ups, Use / Discard ---------- */
  const SEL = {};
  function openJob(id) {
    const j = ST.jobs.find(x => x.id === id); if (!j) return; const r = j.result, f = u => base() + u;
    SH.stJob = id; SH.stStatus = j.status;
    if (j.status === 'error') { openSheet({ title: L('Studio', 'Studio'), leftLabel: L('Close', 'Zavřít'), cls: 'stsh', body: '<p class="sayerr" style="margin:4px 2px 16px">' + esc(j.error || L('Cutting failed.', 'Střih se nepovedl.')) + '</p><div class="btnrow"><button class="pbtn ghost press" id="stDel">' + esc(L('Discard', 'Zahodit')) + '</button><button class="pbtn cr press" id="stRe">' + esc(L('Try again', 'Zkusit znovu')) + '</button></div>',
      mount: e2 => { e2.querySelector('#stRe').onclick = async () => { try { const x = await api('/jobs/' + id + '/retry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); Object.assign(j, x.job); closeSheet(true); paintAll(); schedule(); } catch (e) { toast(esc(e.message)); } }; e2.querySelector('#stDel').onclick = () => discard(j); } }); return; }
    if (busy(j) || !r) { openSheet({ title: L('Studio', 'Studio'), leftLabel: L('Close', 'Zavřít'), cls: 'stsh', body: '<div class="stwait"><div class="stmo"></div><b>' + esc(L(...(STATUS[j.status] || ['', '']))) + '</b><small>' + esc(j.stage ? L(...(STAGE[j.stage] || [j.stage, j.stage])) + ' · ' + (j.pct || 0) + ' %' : L('You can close the app, Aurora lets you know.', 'Klidně appku zavři, Aurora dá vědět.')) + '</small></div>' }); return; }
    const sel = SEL[id] = SEL[id] || { items: r.items.map((it, i) => ({ i, on: true, hook: it.picked ? it.picked.hook : 0, cuts: it.picked ? it.picked.cuts.slice() : [] })) };
    const fin = j.status === 'final';
    const itemHTML = (it, i) => { const s = sel.items[i];
      const ch = it.checks || {}, okc = (b, t) => '<span class="' + (b ? 'ok' : 'no') + '">' + (b ? '✓' : '!') + ' ' + esc(t) + '</span>';
      return '<section class="stit" data-i="' + i + '">' + (r.items.length > 1 ? '<div class="stih"><b>' + esc(it.title || L('Clip ', 'Klip ') + (i + 1)) + '</b><span class="muted">' + fmtS(it.outDur) + '</span>' + (fin ? '' : '<button class="stuse' + (s.on ? ' on' : '') + '" data-on="' + i + '">' + (s.on ? ico('check', 13, 3) : '') + '</button>') + '</div>' : '')
        + '<div class="stv"><video playsinline controls preload="metadata" poster="' + esc(f(it.posterUrl)) + '" src="' + esc(f(fin && it.finalUrl ? it.finalUrl : it.previewUrl)) + '"></video></div>'
        + (fin && it.finalUrl ? '<a class="pbtn cr press stdl" href="' + esc(f(it.finalUrl) + '&dl=1') + '" target="_blank" rel="noopener" download>' + ico('download', 16, 2.4) + esc(L('Download', 'Stáhnout') + ' · ' + fmtS(it.finalDur || it.outDur)) + '</a>' : '')
        + (!fin && it.hooks && it.hooks.length ? '<span class="cap stcap">' + esc(L('Opening · pick one', 'Začátek · vyber jeden')) + '</span><div class="sthk">' + it.hooks.map((h, k) => '<button class="sthc press' + (s.hook === k ? ' on' : '') + '" data-h="' + i + ':' + k + '"><span class="sthv"><video muted playsinline loop preload="none" src="' + esc(f(h.clipUrl)) + '" poster="' + esc(f(it.posterUrl)) + '"></video>' + (h.open === 'cold' ? '<em>' + esc(L('teaser', 'upoutávka')) + '</em>' : '') + '</span><b>' + esc(h.text) + '</b></button>').join('') + '</div>' : '')
        + (!fin && it.slips && it.slips.length ? '<span class="cap stcap">' + esc(L('Slip-ups · suggestions', 'Přeřeky · návrhy')) + '</span><section class="grp frost solid">' + it.slips.map((x, k) => '<button class="srow stsl" data-sl="' + i + ':' + k + '"><span class="tx">„' + esc(x.say) + '“<small>' + esc((x.why || '') + ' · ' + L('cut ', 'vystřihne ') + x.save + ' s') + '</small></span><span class="tg' + (s.cuts.includes(k) ? ' on' : '') + '" style="margin-left:auto"></span></button>').join('') + '</section>' : '')
        + '<div class="stck">' + okc(ch.jumps !== false, L('no jumpy cuts', 'střihy bez skoků')) + okc(ch.syllables !== false, L('no clipped words', 'slabiky celé')) + okc(ch.sync !== false, L('sound in sync', 'zvuk sedí')) + '</div></section>'; };
    const body = '<div class="stsum"><b>' + esc(r.summary || '') + '</b>' + (r.note ? '<small>' + esc(r.note) + '</small>' : '') + (j.finalError ? '<small class="sayerr">' + esc(j.finalError) + '</small>' : '') + '</div>'
      + r.items.map(itemHTML).join('')
      + '<span class="cap stcap">' + esc(L('Note for next time', 'Poznámka pro příště')) + '</span><div class="fld in lkf"><input id="stNote" maxlength="200" placeholder="' + esc(L('e.g. music too loud, smaller captions', 'např. hudba moc nahlas, menší titulky')) + '"><button class="pbtn ghost press" id="stNoteGo">' + esc(L('Save', 'Uložit')) + '</button></div>'
      + '<p class="stfoot">' + esc(L('A note becomes a rule for your next videos.', 'Poznámka se stane pravidlem pro další videa.')) + '</p>'
      + (fin ? '' : '<div class="btnrow stbtns"><button class="pbtn ghost press" id="stDel">' + esc(L('Discard', 'Zahodit')) + '</button><button class="pbtn cr press" id="stUse">' + esc(L('Use', 'Použít')) + '</button></div>');
    openSheet({ title: j.prompt ? (j.prompt.length > 38 ? j.prompt.slice(0, 37) + '…' : j.prompt) : L('Your cut', 'Tvůj střih'), leftLabel: L('Close', 'Zavřít'), cls: 'stsh', body,
      mount: e2 => {
        e2.onclick = ev => { const b = ev.target.closest('button'); if (!b) return;
          if (b.dataset.h) { const [i, k] = b.dataset.h.split(':').map(Number); sel.items[i].hook = k; e2.querySelectorAll('[data-h^="' + i + ':"]').forEach(x => x.classList.toggle('on', x === b)); const v = b.querySelector('video'); e2.querySelectorAll('.sthv video').forEach(x => { if (x !== v) x.pause(); }); if (v) { v.currentTime = 0; v.play().catch(() => {}); } haptic(); }
          else if (b.dataset.sl) { const [i, k] = b.dataset.sl.split(':').map(Number); const cs2 = sel.items[i].cuts; const at = cs2.indexOf(k); if (at < 0) cs2.push(k); else cs2.splice(at, 1); b.querySelector('.tg').classList.toggle('on', at < 0); haptic(); }
          else if (b.dataset.on) { const s = sel.items[+b.dataset.on]; s.on = !s.on; b.classList.toggle('on', s.on); b.innerHTML = s.on ? ico('check', 13, 3) : ''; } };
        const nb = e2.querySelector('#stNoteGo'); if (nb) nb.onclick = async () => { const i = e2.querySelector('#stNote'), t = i.value.trim(); if (!t) { i.focus(); return; } try { await api('/jobs/' + id + '/note', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: t }) }); i.value = ''; toast(esc(L('Saved as a rule for next time', 'Uloženo jako pravidlo pro příště'))); } catch (e) { toast(esc(e.message)); } };
        const d = e2.querySelector('#stDel'); if (d) d.onclick = () => discard(j);
        const us = e2.querySelector('#stUse'); if (us) us.onclick = async () => { const items = sel.items.filter(x => x.on).map(x => ({ i: x.i, hook: x.hook, cuts: x.cuts })); if (!items.length) { toast(esc(L('Pick at least one clip', 'Vyber aspoň jeden klip'))); return; }
          us.disabled = true; try { const x = await api('/jobs/' + id + '/use', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) }); Object.assign(j, x.job); closeSheet(true); paintAll(); schedule(); toast(esc(L('Making the final version', 'Dělám finální verzi'))); } catch (e) { us.disabled = false; toast(esc(e.message)); } };
      }, onClose: () => { SH.stJob = null; } });
  }
  function discard(j) {
    confirmSheet(L('Discard this cut? The video is deleted.', 'Zahodit tenhle střih? Video se smaže.'), L('Discard', 'Zahodit'), async () => { try { await api('/jobs/' + j.id + '/discard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); } catch (e) {} ST.jobs = ST.jobs.filter(x => x.id !== j.id); paintAll(); });
  }
  ACT.stOpen = el => { const j = ST.jobs.find(x => x.id === el.dataset.id); if (j) { if (busy(j)) load(true); openJob(j.id); } };

  /* hook into the card page on phone and computer (after the source panel) */
  const _rc = renderCard; renderCard = function () { _rc.apply(this, arguments); if (!desk()) mount($('#s-card'), false); };
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof deskRender === 'function') { const _d = deskRender; deskRender = function (a) { _d(a); if (desk() && V.card) mount($('#dCardMain'), true); }; }
    restoreUps();
  });
  window.STUDIO = { api, load, base, ST, rowJob, rowUp, signed, busy: j => busy(j), paintAll, STAGE };
})();
