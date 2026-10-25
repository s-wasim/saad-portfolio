// v4 type: every word is its own span, set in Zaslia (the past) or Moonhouse (the future). Each block of text spreads its words over
// ranks 0..1; a word turns Moonhouse once the frame's mix ratio passes its rank. Swaps flicker unless reduced motion is on.
(function () {
  const ZF = "Zaslia, Cormorant, serif", MF = "Moonhouse, 'Hanken Grotesk', sans-serif";
  // size multipliers per role [ui < 14px, text < 40px, display]; Zaslia caps are tall and narrow, Moonhouse is wide
  // v5: ui and body text are larger and get a faux-semibold stroke (Zaslia ships in one thin weight); display sizes are untouched
  const K = { z: [1.42, 1.1, 0.8], m: [1.16, 1.1, 0.9] };
  const SW = { z: ['0.05em', '0.045em', null], m: ['0.018em', '0.015em', null] };
  const LS = { z: [null, null, '0.01em'], m: [null, null, '-0.005em'] };
  const SKIP = '[data-nofont],[data-gl4],[data-art],svg,script,style,[data-live]';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let x = seed % 2147483646 + 1; return () => (x = x * 16807 % 2147483647) / 2147483647; };

  class Type {
    constructor(stage, o) { this.stage = stage; this.reduced = !!(o && o.reduced); this.ratio = 0; this.words = []; this.wrap(stage); }
    wrap(root) {
      const nodes = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: n => (n.nodeValue.trim() && n.parentElement && !n.parentElement.closest(SKIP) && !n.parentElement.hasAttribute('data-w')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
      });
      while (w.nextNode()) nodes.push(w.currentNode);
      const made = [];
      nodes.forEach(n => {
        const par = n.parentElement, fs = parseFloat(getComputedStyle(par).fontSize) || 16, role = fs < 14 ? 0 : fs < 40 ? 1 : 2;
        const frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(p => {
          if (!p) return;
          if (!p.trim()) { frag.appendChild(document.createTextNode(p)); return; }
          const s = document.createElement('span');
          s.setAttribute('data-w', ''); s.textContent = p; s._role = role;
          s.style.fontStyle = 'normal'; s.style.fontWeight = '400'; s.style.fontSynthesis = 'none';
          frag.appendChild(s); made.push(s);
        });
        par.replaceChild(frag, n);
      });
      this.rank(made);
      this.words.push(...made);
      return made;
    }
    rank(list) {
      const blocks = new Map();
      list.forEach(s => {
        const b = s.closest('[data-fb]') || s.closest('[data-a]') || s.parentElement;
        if (!blocks.has(b)) blocks.set(b, []);
        blocks.get(b).push(s);
        let e = s, f = 0;
        while (e && e !== this.stage) { const m = /^[tx](\d+)/.exec(e.getAttribute ? e.getAttribute('data-a') || '' : ''); if (m) { f = +m[1]; break; } e = e.parentElement; }
        s._f = f; s._chrome = !s.closest('[data-world]');
      });
      blocks.forEach((ws, b) => {
        const txt = ws.map(s => s.textContent).join(' '), r = rng(hash(txt)), idx = ws.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
        ws.forEach((s, i) => { s._r = idx[i] / ws.length; s._d = (hash(txt + '#' + i) % 1000) / 1000; });
      });
    }
    setF(s, m) {
      if (s._m === m) return; s._m = m;
      const k = (m ? K.m : K.z)[s._role], ls = (m ? LS.m : LS.z)[s._role], sw = (m ? SW.m : SW.z)[s._role];
      s.style.fontFamily = m ? MF : ZF; s.style.fontSize = k + 'em';
      if (ls) s.style.letterSpacing = ls;
      s.style.webkitTextStroke = sw ? sw + ' currentColor' : '';
    }
    flick(s, m, d) {
      const tl = gsap.timeline({ delay: d, onComplete: () => { s._tl = null; this.setF(s, m); gsap.set(s, { opacity: 1 }); } });
      [0, 0.07, 0.15, 0.26].forEach((t, i) => {
        tl.call(() => this.setF(s, i % 2 === 0 ? m : !m), null, t);
        tl.fromTo(s, { opacity: 0.3 }, { opacity: 1, duration: 0.05, ease: 'none', immediateRender: false }, t);
      });
      s._tl = tl;
    }
    // move every word to `ratio`; pick(s, m) returns a flicker delay (s), null for an instant swap, or false to leave the word for now
    to(ratio, pick) {
      this.ratio = ratio;
      this.words.forEach(s => {
        const m = s._r < ratio;
        if (s._tl) { if (s._want === m) return; s._tl.kill(); s._tl = null; gsap.set(s, { opacity: 1 }); }
        const d = pick ? pick(s, m) : null;
        if (d === false) { s._want = undefined; return; }
        s._want = m;
        if (s._m === m) return;
        if (d == null || this.reduced) this.setF(s, m); else this.flick(s, m, d);
      });
    }
    setText(el, str) {
      if (el._t === str) return; el._t = str;
      this.words = this.words.filter(s => { if (el.contains(s)) { if (s._tl) s._tl.kill(); return false; } return true; });
      el.textContent = str;
      this.wrap(el).forEach(s => { s._want = s._r < this.ratio; this.setF(s, s._want); });
    }
    destroy() { this.words.forEach(s => { if (s._tl) s._tl.kill(); }); }
  }

  window.SWType = { create: (stage, o) => new Type(stage, o) };
})();
