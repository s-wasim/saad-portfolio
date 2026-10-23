// Phone fallback notice. The three 3D hand modules (reach3d.js, hands3d.js, fall3d.js) report here when they are ready or give up.
// On the phone layout, if the 3D fails (no WebGL, an error, a model not ready 30 s after start, or ?no3d), the flat SVG hands stay
// and a card says the page is best on a laptop, with a way to skip to the end. Once per visit; never over a running transition.
(function () {
  const NAMES = ['reach', 'hands', 'fall'], WAIT = 30000, KEY = 'sw-pop3d';
  const state = {}, at = {};   // at: ms after page start each hand reported (for diagnosis)
  let failed = /[?&]no3d\b/.test(location.search), eng = null, t0 = 0, timer = 0, open = false, back = null;

  const SW3D = {
    state, at,
    ok(name) { state[name] = 'ok'; at[name] = Math.round(performance.now()); },
    fail(name, err) { state[name] = 'fail'; at[name] = Math.round(performance.now()); failed = true; if (err) console.warn('3D ' + name + ' failed:', err); check(); }
  };

  function seen() { try { return sessionStorage.getItem(KEY) === '1'; } catch (_) { return false; } }
  function mark() { try { sessionStorage.setItem(KEY, '1'); } catch (_) {} }
  function el() { return document.querySelector('[data-pop3d]'); }

  function broken() {
    if (failed) return true;
    if (!eng) return false;
    if (eng.fall === null) return true;   // no WebGL: frame 4 already fell back to the flat pieces
    return performance.now() - t0 > WAIT && NAMES.some(n => state[n] !== 'ok');
  }

  function check() {
    clearTimeout(timer);
    if (!eng || open || seen() || !el()) return;
    if (!broken()) { if (NAMES.some(n => state[n] !== 'ok')) timer = setTimeout(check, 1000); return; }
    if (eng.L !== 'm') return;   // re-checked on resize
    if (eng.tl || eng.holdTw || eng.busy) { timer = setTimeout(check, 500); return; }
    show();
  }

  function show() {
    const p = el(); open = true; mark();
    back = document.activeElement;
    p.style.display = 'flex';
    gsap.fromTo(p, { autoAlpha: 0 }, { autoAlpha: 1, duration: eng.reduced ? 0.01 : 0.3, ease: 'power2.out' });
    const b = p.querySelector('[data-pop3d-skip]'); if (b) b.focus();
  }

  function hide() {
    const p = el(); if (!open) return; open = false;
    gsap.to(p, { autoAlpha: 0, duration: eng.reduced ? 0.01 : 0.2, onComplete: () => { p.style.display = 'none'; } });
    if (back && back.focus) try { back.focus(); } catch (_) {}
  }

  function init(e) {
    eng = e; t0 = performance.now();
    const p = el(); if (!p) return;
    p.querySelector('[data-pop3d-skip]').addEventListener('click', () => { hide(); eng.skip(); });
    p.querySelector('[data-pop3d-stay]').addEventListener('click', hide);
    p.addEventListener('click', ev => { if (ev.target === p) hide(); });
    window.addEventListener('keydown', ev => { if (open && ev.key === 'Escape') { ev.stopPropagation(); hide(); } }, true);
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(check, 200); });
    setTimeout(check, 400);
  }

  window.SW3D = SW3D;
  window.SWPhone = { init, check };
})();
