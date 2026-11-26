/* Aurora 2 Lab · v2050 · the visual language, one level up.
   Adds: the breathing wallpaper, each card's colour as light, and a Motion setting (Full / Calm / Off).
   Only looks: no layout logic, no data changes besides the one setting (S.a2motion). Loaded last. */
(function () {
  const cs = () => (typeof lang === 'function' ? lang() : 'en') === 'cs';
  const level = () => (typeof S !== 'undefined' && S && S.a2motion) || 'full';

  /* ---------- Motion: Full / Calm / Off ---------- */
  const _animate = Element.prototype.animate;
  Element.prototype.animate = function (k, o) {
    if (level() === 'off') { if (typeof o === 'number') o = 1; else o = Object.assign({}, o || {}, { duration: 1, delay: 0 }); }
    return _animate.call(this, k, o);
  };
  function applyMotion() {
    const l = level(), b = document.body; if (!b) return;
    b.classList.toggle('a2-calm', l === 'calm'); b.classList.toggle('a2-off', l === 'off');
  }

  /* ---------- the breathing wallpaper ---------- */
  function lights() {
    const bg = document.getElementById('bg'); if (!bg || bg.querySelector('.a2l')) return;
    const l = document.createElement('div'); l.className = 'a2l'; l.setAttribute('aria-hidden', 'true'); l.innerHTML = '<i class="l1"></i><i class="l2"></i><i class="l3"></i>';
    const g = document.createElement('div'); g.className = 'a2g'; g.setAttribute('aria-hidden', 'true');
    const dim = bg.querySelector('.dim'); if (dim && dim.nextSibling) { bg.insertBefore(l, dim.nextSibling); bg.insertBefore(g, l.nextSibling); } else { bg.appendChild(l); bg.appendChild(g); }
  }

  /* ---------- a card's colour as light in its corner ---------- */
  const colorOf = id => { try { const c = typeof cardById === 'function' && cardById(id); return c && c.color; } catch (e) { return null; } };
  function tint(el, c) { if (!el || !c) return; if (el.style.getPropertyValue('--a2c') !== c) el.style.setProperty('--a2c', c); el.classList.add('a2t'); }
  function decorate() {
    document.querySelectorAll('#deck > .spc[data-id], #s-spaces .lrow[data-id], #desk .dcard[data-id]').forEach(el => tint(el, colorOf(el.dataset.id)));
    if (typeof V !== 'undefined' && V.card) {
      const c = colorOf(V.card);
      tint(document.querySelector('#s-card .hero') || document.querySelector('#s-card section.frost'), c);
      const dm = document.querySelector('#dCardMain'); if (dm) tint(dm.querySelector('.hero') || dm.querySelector('.pn'), c);
    }
  }
  let raf = 0; const soon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { applyMotion(); decorate(); }); };

  /* ---------- the Motion row in Settings › Appearance ---------- */
  function motionRow() {
    const l = level(), b = (k, t) => '<button class="' + (l === k ? 'on' : '') + '" data-a="a2Motion" data-k="' + k + '">' + esc(t) + '</button>';
    const hint = { full: cs() ? 'Stránky najedou, čísla se napočítají, tapeta dýchá.' : 'Pages glide in, numbers count up, the wallpaper breathes.',
      calm: cs() ? 'Jen odškrtnutí, čísla a kroužky. Tapeta stojí.' : 'Only ticks, numbers and rings. The wallpaper stays still.',
      off: cs() ? 'Bez pohybu.' : 'No movement.' }[l];
    return '<div class="sec a2mot"><span class="cap">' + esc(cs() ? 'Pohyb' : 'Motion') + '</span><div class="seg frost a2seg">' + b('full', cs() ? 'Plný' : 'Full') + b('calm', cs() ? 'Klidný' : 'Calm') + b('off', cs() ? 'Vypnuto' : 'Off') + '</div><div class="a2hint">' + esc(hint) + '</div></div>';
  }
  function injectMotion() {
    if (typeof V === 'undefined' || V.settingsPage !== 'look') return;
    document.querySelectorAll('[data-a="setMode"]').forEach(btn => {
      const sec = btn.closest('.sec'); if (!sec || (sec.nextElementSibling && sec.nextElementSibling.classList.contains('a2mot'))) return;
      sec.insertAdjacentHTML('afterend', motionRow());
    });
  }
  typeof ACT !== 'undefined' && (ACT.a2Motion = el => {
    S.a2motion = el.dataset.k; if (typeof save === 'function') save(); applyMotion();
    document.querySelectorAll('.a2mot').forEach(x => x.remove()); injectMotion();
  });

  document.addEventListener('DOMContentLoaded', () => {
    lights(); applyMotion();
    /* Calm and Off: no page stagger; Off: nothing at all */
    if (window.FX && FX.enter) { const _e = FX.enter; FX.enter = function (root, o) { const l = level(); if (l === 'off') return; return _e(root, l === 'calm' ? Object.assign({}, o || {}, { noStagger: true }) : o); }; }
    if (typeof renderSettings === 'function') { const _rs = renderSettings; renderSettings = function () { const r = _rs.apply(this, arguments); injectMotion(); return r; }; }
    const mo = new MutationObserver(() => { soon(); injectMotion(); });
    ['app', 'desk'].forEach(id => { const n = document.getElementById(id); if (n) mo.observe(n, { childList: true, subtree: true }); });
    setTimeout(() => { applyMotion(); decorate(); }, 600);
  });
})();
