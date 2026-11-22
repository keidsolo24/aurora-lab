/* Aurora 2 Lab · v2040 · motion
   One spring for the whole app (no jumps), a tick that feels like a tick, and sheets that morph into each other.
   Everything here only adds motion: no layout, no data, no new buttons. Reduced motion turns it all off. */
(function () {
  const reduce = () => (typeof RM !== 'undefined' && RM) || matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* a damped spring sampled into CSS linear(): the same curve for CSS transitions and Web Animations */
  function spring(damping, response, n) {
    n = n || 48; const w = 2 * Math.PI / response, z = damping, wd = w * Math.sqrt(Math.max(1e-6, 1 - z * z));
    const at = t => z < 1 ? 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)) : 1 - Math.exp(-w * t) * (1 + w * t);
    let T = 0; while (T < 4 && !(Math.abs(1 - at(T)) < 0.001 && Math.abs(1 - at(T + 0.05)) < 0.001)) T += 0.01;
    const pts = []; for (let i = 0; i <= n; i++) pts.push(+at(T * i / n).toFixed(4)); pts[n] = 1;
    return { ease: 'linear(' + pts.join(',') + ')', ms: Math.round(T * 1000) };
  }
  const OK = CSS.supports('transition-timing-function', 'linear(0,1)');
  const S_SHEET = spring(0.86, 0.42), S_POP = spring(0.55, 0.34), S_SOFT = spring(1, 0.36);
  const root = document.documentElement.style;
  if (OK) { root.setProperty('--sp-sheet', S_SHEET.ease); root.setProperty('--sp-sheet-ms', S_SHEET.ms + 'ms'); root.setProperty('--sp-soft', S_SOFT.ease); root.setProperty('--sp-soft-ms', S_SOFT.ms + 'ms'); root.setProperty('--sp-pop', S_POP.ease); }
  const E = s => OK ? s.ease : 'cubic-bezier(.2,.8,.2,1)';

  /* ---------- 1 · the tick (Boards): press, pop, ring, the row settles ---------- */
  function tick(btn, on) {
    if (reduce() || !btn || !btn.animate) return;
    const c = getComputedStyle(btn).getPropertyValue('--c') || '';
    btn.animate([{ transform: 'scale(.78)' }, { transform: 'scale(1)' }], { duration: S_POP.ms, easing: E(S_POP) });
    if (on) {
      const r = btn.getBoundingClientRect(); if (!r.width) return;
      const ring = document.createElement('i'); ring.className = 'mtring'; if (c.trim()) ring.style.setProperty('--c', c.trim());
      ring.style.left = (r.left + r.width / 2) + 'px'; ring.style.top = (r.top + r.height / 2) + 'px';
      document.body.appendChild(ring);
      ring.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(2.2)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => ring.remove();
      const svg = btn.querySelector('svg'); if (svg) svg.animate([{ transform: 'scale(.3) rotate(-20deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: S_POP.ms, easing: E(S_POP) });
    }
    const row = btn.closest('.irow,.trow,.mini,.nextp'); const tx = row && row.querySelector('.tx > span, .tx');
    if (tx) tx.animate([{ transform: 'translateX(' + (on ? 6 : -6) + 'px)', opacity: .5 }, { transform: 'none', opacity: 1 }], { duration: S_SOFT.ms, easing: E(S_SOFT) });
  }
  /* after the screen re-renders, today's dot in the week lights up like a square in Boards */
  function lightToday() {
    if (reduce()) return;
    const dot = document.querySelector('#dCardMain .wdots i.on.td') || document.querySelector('#s-card .wdots i.on.td'); if (!dot || !dot.animate) return;
    dot.animate([{ transform: 'scale(.4)', filter: 'brightness(1.8)' }, { transform: 'scale(1.18)', filter: 'brightness(1.3)', offset: .45 }, { transform: 'none', filter: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  function wrapToggle() {
    if (typeof ACT === 'undefined' || !ACT.toggle || ACT.toggle._m) return false;
    const orig = ACT.toggle;
    const w = function (el) {
      const id = el.dataset.id, d = el.dataset.d || (typeof T === 'function' ? T() : ''), i = typeof itemById === 'function' ? itemById(id) : null;
      const was = i && typeof isDone === 'function' ? isDone(i, d) : null;
      const r = orig.apply(this, arguments);
      if (was !== null) { tick(el, !was); if (!was) setTimeout(lightToday, 470); }
      return r;
    };
    w._m = true; ACT.toggle = w; return true;
  }

  /* ---------- 2 · sheets (Sudoku): spring in and out, one sheet morphs into the next ---------- */
  function wrapSheets() {
    if (typeof openSheet !== 'function' || openSheet._m) return false;
    const o = openSheet;
    window.openSheet = openSheet = function (opts) {
      const el = document.getElementById('sheet');
      const morph = !reduce() && el && el.classList.contains('on') && typeof SH !== 'undefined' && SH.open && el.offsetHeight > 0;
      const h0 = morph ? el.getBoundingClientRect().height : 0;
      const r = o.apply(this, arguments);
      if (morph) {
        const h1 = el.getBoundingClientRect().height;
        el.classList.add('mtmorph');
        const a = el.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: S_SHEET.ms, easing: E(S_SHEET) });
        a.onfinish = a.oncancel = () => el.classList.remove('mtmorph');
        const body = el.querySelector('.sb'), head = el.querySelector('.sh');
        [head, body].forEach((x, k) => x && x.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: k * 40, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
      }
      return r;
    };
    openSheet._m = true; return true;
  }

  /* ---------- 3 · the AI orb gets a living body (look only; what it does stays the same) ---------- */
  const BODY = '<span class="ob" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="gl"></i></span>';
  function liven(root) {
    (root || document).querySelectorAll('.orbv:not(.alive)').forEach(v => { v.classList.add('alive'); v.insertAdjacentHTML('afterbegin', BODY); });
  }

  /* ---------- wiring ---------- */
  let tries = 0;
  (function hook() { const a = wrapToggle(), b = wrapSheets(); if ((!a || !b) && tries++ < 60) setTimeout(hook, 100); })();
  const mo = new MutationObserver(() => liven());
  document.addEventListener('DOMContentLoaded', () => { liven(); mo.observe(document.body, { childList: true, subtree: true }); });
  window.MOTION = { spring, tick, lightToday };
})();
