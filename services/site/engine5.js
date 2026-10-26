// v5: animated handshake: hold brings the human hand in, then the fingers and thumbs close round each other, two pumps, the robot lets go and leaves; soft shadow under the clasp.
// v4: backward steps get their own (mirrored) timeline instead of a reversed one; frame-1 sign hint (glow, pointing hand, pointing cursor);
// hold-driven handshake reach-in + 2 pumps; Zaslia -> Audiowide word mix. v3: drives the WebGL fall (SWFall) in frame 4. v2 step engine: one gesture = one frame, except frame 4 which scrubs continuously after its hold-to-crack gate.
(function () {
  const QUIET = 400, MIN_WHEEL = 4, D_STEP = 1.4, D_BACK = 1.15, D_JUMP = 1.0, SCRUB = 5200, HOLD5 = 1.3;
  const clamp = v => Math.max(0, Math.min(1, v));
  const now = () => performance.now();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  class Engine {
    constructor(stage) {
      this.stage = stage; this.F = window.SWFrames;
      this.cur = 1; this.g = { g1: false, g4: false, g5: false }; this.p = 0; this.pt = 0; this.edgeAt = 0; this.lastW = 0; this.wh = []; this.reached = 1;
      this.busy = false; this.last = 0; this.endT = 0; this.tl = null; this.pending = 0;
      this.popOpen = false; this.soundOn = false; this.offs = []; this.own = new Set(); this.reach = { v: 0 };
      this.mqR = matchMedia('(prefers-reduced-motion: reduce)');
      this.mqT = matchMedia('(hover: none) and (pointer: coarse)');
      this.reduced = this.mqR.matches;
      window.SWArt.inject(stage);
      this.touchCopy();
      this.type = window.SWType ? window.SWType.create(stage, { reduced: this.reduced }) : null;
      this.world = stage.querySelector('[data-world]');
      this.roots = { d: stage.querySelector('[data-layout="d"]'), m: stage.querySelector('[data-layout="m"]') };
      this.cache();
      // no WebGL (blocked or sandboxed): frame 4 falls back to the flat shop pieces instead of killing the whole page
      try { this.fall = window.SWFall ? window.SWFall.create(stage.querySelector('[data-gl4]'), this) : null; } catch (_) { this.fall = null; }
      this.readHash(true);
      this.layout();
      this.apply(this.state(this.cur)); this.mirrorSet(this.cur); this.typeTo(this.cur, null);
      this.bindInput(); this.bindGates(); this.bindUI(); this.hintSetup();
      this.breathe(); this.tick = () => { this.scrubTick(); this.hintTick(); }; gsap.ticker.add(this.tick);
      if (this.cur === 4) this.setP(0);
      this.updateUI(true); this.writeHash(); this.announce();
      gsap.to(stage, { autoAlpha: 1, duration: this.reduced ? 0.3 : 0.6, ease: 'power1.out' });
    }

    // ---------- actors ----------
    cache() {
      this.map = { d: {}, m: {}, s: { stage: [this.stage] } };
      this.stage.querySelectorAll('[data-a]').forEach(el => {
        const lay = el.closest('[data-layout]');
        const b = lay ? this.map[lay.getAttribute('data-layout')] : this.map.s;
        const k = el.getAttribute('data-a'); (b[k] = b[k] || []).push(el);
      });
    }
    els(k) { return (this.map[this.L][k] || []).concat(this.map.s[k] || []); }
    state(f) { return this.F.state(f, this.L, this.g, this.geo); }
    apply(S) { Object.keys(S).forEach(k => { if (this.own.has(k)) return; const e = this.els(k); if (e.length) gsap.set(e, S[k]); }); }

    build(A, B, o) {
      const tl = gsap.timeline({ paused: true });
      Object.keys(B).forEach(k => {
        if (o.skip && o.skip.includes(k)) return;
        const b = B[k], a = A ? A[k] : null;
        if (o.from && a && same(a, b)) return;
        const els = this.els(k); if (!els.length) return;
        const t = (o.over && o.over[k]) || this.timing(k, a, b, o.jump, o.back);
        const to = Object.assign({}, b, { duration: Math.max(0.01, t[1] * o.D), ease: t[2] || 'power2.inOut', immediateRender: false });
        if (o.from && a) tl.fromTo(els, Object.assign({}, a), to, t[0] * o.D);
        else tl.to(els, to, t[0] * o.D);
      });
      return tl;
    }
    timing(k, a, b, jump, back) {
      const ao = a && a.autoAlpha != null ? a.autoAlpha : 1, bo = b.autoAlpha != null ? b.autoAlpha : 1;
      if (k === 'stage') return [0, 0.7, 'sine.inOut'];
      // going back, the incoming background sits under the outgoing one: show it at once and fade the top one straight away
      if (/^bg/.test(k)) return back ? (bo > ao ? [0, 0.25, 'sine.out'] : [0, 0.8, 'sine.inOut']) : bo > ao ? [0, 0.9, 'sine.inOut'] : [0.2, 0.8, 'sine.inOut'];
      if (/^[tx]\d/.test(k)) return bo < ao ? [0, 0.45, 'power2.in'] : bo > ao ? [jump ? 0.42 : 0.48, 0.52, 'expo.out'] : [0, 1, 'power2.inOut'];
      if (bo < ao) return [0, 0.6, 'sine.inOut'];
      if (bo > ao) return [0.22, 0.78, 'power3.out'];
      return [0, 1, 'power3.inOut'];
    }
    kill() { if (this.tl) { this.tl.kill(); this.tl = null; } clearTimeout(this.ut); }

    // ---------- layout ----------
    layout() {
      const vw = this.stage.clientWidth || innerWidth, vh = this.stage.clientHeight || innerHeight;
      const hasM = !!this.roots.m.querySelector('[data-a]');
      const L = hasM && (vw < 640 || vw / vh < 0.8) ? 'm' : 'd';
      const RW = L === 'd' ? 1440 : 390, RH = L === 'd' ? 900 : 740;
      const s = Math.min(vw / RW, vh / RH), W = vw / s, H = vh / s, gx = (W - RW) / 2;
      this.L = L; this.dims = { vw, vh, RW, RH, s, W, H };
      gsap.set(this.world, { width: W, height: H, scale: s, transformOrigin: '0 0' });
      ['d', 'm'].forEach(k => { this.roots[k].style.display = k === L ? 'block' : 'none'; });
      const root = this.roots[L];
      root.style.left = gx + 'px';
      root.querySelectorAll('[data-vy]').forEach(el => { el.style.top = ((H - RH) * parseFloat(el.getAttribute('data-vy'))) + 'px'; });
      this.geo = { lx: -gx - 12, rx: RW + gx + 12, by: RH + (H - RH) * 0.5 + 12 };
      this.ui = vw < 640 ? 'm' : 'd';
      this.buildRuler();
      this.depths = Array.from(root.querySelectorAll('[data-depth]'));
      gsap.set(this.depths, { x: 0, y: 0 });
      this.qx = this.depths.map(el => gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }));
      this.qy = this.depths.map(el => gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' }));
      this.depths.forEach(el => { el.style.willChange = 'transform'; });
      this.buildScrub();
      if (this.g.g4) this.ensureCrack(false);
      if (this.fall) this.fall.resize();
    }
    onResize(force) {
      clearTimeout(this.rt);
      this.rt = setTimeout(() => {
        this.kill(); this.holdReset();
        if (this.drag) { clearTimeout(this.drag.t); this.drag = null; }
        this.layout();
        gsap.set(this.world, { autoAlpha: 1 });
        this.arrive(this.pending || this.cur, true);
      }, force ? 0 : 120);
    }

    // ---------- input ----------
    on(t, ev, fn, o) { t.addEventListener(ev, fn, o); this.offs.push(() => t.removeEventListener(ev, fn, o)); }
    bindInput() {
      const st = this.stage, mark = () => { this.last = now(); };
      this.on(st, 'wheel', mark, { passive: true });
      this.on(st, 'touchstart', mark, { passive: true });
      this.on(st, 'touchmove', mark, { passive: true });
      this.on(st, 'pointermove', e => { if (e.buttons || e.pointerType === 'touch') mark(); }, { passive: true });
      this.obs = Observer.create({
        target: st, type: 'wheel,touch', tolerance: 24, dragMinimum: 4, preventDefault: true, ignore: '[data-noobs]',
        onWheel: self => this.onWheel(self.event),
        onChangeY: self => { const e = self.event; if (e && (e.type === 'touchmove' || e.pointerType === 'touch') && this.cur === 4 && this.g.g4 && !this.tl) this.scrubIn(-self.deltaY * 3, 0, true); },
        onUp: self => { if (self.event && self.event.type !== 'wheel') this.gesture(1, 'touch'); },
        onDown: self => { if (self.event && self.event.type !== 'wheel') this.gesture(-1, 'touch'); }
      });
      this.on(window, 'keydown', e => this.onKey(e));
      this.noLongPress();
      this.on(window, 'resize', () => this.onResize());
      this.on(window, 'orientationchange', () => this.onResize());
      this.on(window, 'hashchange', () => this.readHash(false));
      const cl = this.map.s.clight;
      if (cl) { gsap.set(cl, { x: innerWidth / 2, y: innerHeight / 2 }); this.lx = gsap.quickTo(cl, 'x', { duration: 0.6, ease: 'power3.out' }); this.ly = gsap.quickTo(cl, 'y', { duration: 0.6, ease: 'power3.out' }); }
      this.on(window, 'pointermove', e => { this.parallax(e); if (this.lx) { this.lx(e.clientX); this.ly(e.clientY); } }, { passive: true });
      const mq = () => { this.reduced = this.mqR.matches; this.marquee(); this.breathe(); this.onResize(true); };
      this.mqR.addEventListener ? this.mqR.addEventListener('change', mq) : this.mqR.addListener(mq);
    }
    onWheel(e) {
      const t = now(), gap = t - this.lastW; this.lastW = t; this.last = t;
      if (!e || e.ctrlKey) return;
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.dims.vh : 1;
      const dy = e.deltaY * k, dx = e.deltaX * k;
      this.wh.push(Math.abs(dy)); if (this.wh.length > 6) this.wh.shift();
      if (Math.abs(dy) < MIN_WHEEL || Math.abs(dx) > Math.abs(dy)) return;
      if (this.cur === 4 && this.g.g4 && !this.tl) return this.scrubIn(dy, gap);
      this.gesture(dy > 0 ? 1 : -1);
    }
    onKey(e) {
      const t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
      if (e.key === 'Escape' && this.popOpen) { this.popup(false); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key; let dir = 0, to = 0;
      if (k === 'ArrowDown' || k === 'PageDown') dir = 1;
      else if (k === 'ArrowUp' || k === 'PageUp') dir = -1;
      else if (k === ' ' || k === 'Spacebar') { if (t && t.closest && t.closest('button,a')) return; dir = e.shiftKey ? -1 : 1; }
      else if (k === 'Home') to = 1; else if (k === 'End') to = 12;
      else return;
      e.preventDefault(); this.last = now();
      if (dir && this.cur === 4 && this.g.g4 && !this.tl && (dir > 0 ? this.pt < 1 : this.pt > 0)) { this.pt = clamp(this.pt + dir * 0.09); return; }
      if (e.repeat || this.busy) return;
      if (to === 12) this.skip(); else if (to === 1) this.jump(1); else this.gesture(dir);
    }
    parallax(e) {
      if (this.fall && e.pointerType === 'mouse' && this.dims) this.fall.pointer(e.clientX / this.dims.vw * 2 - 1, e.clientY / this.dims.vh * 2 - 1);
      if (this.reduced || this.L !== 'd' || e.pointerType !== 'mouse' || !this.qx) return;
      const nx = e.clientX / this.dims.vw - 0.5, ny = e.clientY / this.dims.vh - 0.5;
      this.depths.forEach((el, i) => { const d = parseFloat(el.getAttribute('data-depth')) || 0; this.qx[i](-nx * d * 20); this.qy[i](-ny * d * 12); });
    }

    // ---------- navigation ----------
    gesture(dir, src) {
      if (this.busy) return;
      if (this.popOpen) this.popup(false);
      const f = this.cur;
      if (f === 4 && this.g.g4) {
        const edge = dir > 0 ? this.pt >= 1 : this.pt <= 0;
        if (!edge) { if (!src) this.pt = clamp(this.pt + dir * 0.09); return; }
        if (src === 'touch' && now() - this.edgeAt < 350) return;
      }
      if (dir > 0) {
        if (f >= 12) return;
        if ((f === 1 && !this.g.g1) || (f === 4 && !this.g.g4) || (f === 5 && !this.g.g5)) return this.nudge();
        this.step(f + 1);
      } else if (f > 1) this.step(f - 1);
    }
    step(b) {
      const a = this.cur; this.busy = true; this.kill(); this.holdReset(); this.pending = b; this.fwd = b > a; if (b >= 6 && b <= 11) this.mirrorSet(b);
      this.sfx('tick'); this.pillText(b);
      if (b === 4) this.setP(this.fwd ? 0 : 1);
      this.typeTo(b, a, (this.fwd ? D_STEP : D_BACK) * 0.62);
      if (this.reduced) return this.dip(b);
      const tl = this.build(this.state(a), this.state(b), { from: true, D: this.fwd ? D_STEP : D_BACK, back: !this.fwd });
      this.tl = tl; this.rulerTo(b, this.fwd ? 1 : 0.8);
      tl.eventCallback('onComplete', () => this.arrive(b)); tl.play(0);
    }
    jump(f, gates) {
      f = Math.max(1, Math.min(12, f));
      if (gates) { if (f > 1) this.g.g1 = true; if (f > 4) this.g.g4 = true; if (f > 5) this.g.g5 = true; }
      this.popup(false);
      if (this.g.g1) this.hintEnd(true);
      if (f === this.cur && !this.tl) return;
      this.busy = true; this.kill(); this.holdReset(); this.pending = f; this.fwd = f > this.cur; if (f >= 6 && f <= 11) this.mirrorSet(f);
      this.sfx('tick'); this.pillText(f);
      if (f === 4) this.setP(0);
      this.typeTo(f, this.cur, D_JUMP * 0.5);
      if (this.reduced) return this.dip(f);
      const tl = this.build(this.state(this.cur), this.state(f), { from: false, D: D_JUMP, jump: true, back: f < this.cur });
      tl.eventCallback('onComplete', () => this.arrive(f));
      this.tl = tl; this.rulerTo(f, 0.8); tl.play(0);
    }
    skip() { this.g.g1 = this.g.g4 = this.g.g5 = true; this.reached = 12; this.jump(12, true); }
    // reduced motion: 300 ms crossfade, nothing moves
    dip(f) {
      const S = this.state(f), tl = gsap.timeline({ onComplete: () => this.arrive(f) });
      Object.keys(S).forEach(k => { if (this.map.s[k]) tl.to(this.map.s[k], Object.assign({}, S[k], { duration: 0.3, ease: 'none' }), 0); });
      tl.to(this.world, { autoAlpha: 0, duration: 0.15, ease: 'none' }, 0);
      tl.call(() => { Object.keys(S).forEach(k => { const e = this.map[this.L][k]; if (e) gsap.set(e, S[k]); }); }, null, 0.15);
      tl.to(this.world, { autoAlpha: 1, duration: 0.15, ease: 'none' }, 0.15);
      this.tl = tl; this.rulerTo(f, 0.3);
    }
    arrive(f, snap) {
      this.tl = null; this.pending = 0;
      const was = this.cur; this.cur = f; this.reached = Math.max(this.reached, f); this.mirrorSet(f);
      if (f === 1 && !this.g.g1 && this.hint && this.hint.done) this.hintArm();
      this.apply(this.state(f)); if (this.type) this.type.to(this.F.mix(f, this.g), null);
      this.claspSet(0); this.breathHold('sh', false); this.breathHold('sr', false);
      this.updateUI(true); this.writeHash();
      if (f !== was) this.announce();
      this.endT = now(); this.unlockLater();
    }
    // locked until the timeline has ended AND input has been quiet for 400 ms
    unlockLater() {
      clearTimeout(this.ut);
      const wait = Math.max(this.endT, this.last) + QUIET - now();
      if (wait <= 0) { this.busy = false; return; }
      this.ut = setTimeout(() => this.unlockLater(), wait + 4);
    }
    nudge() {
      this.busy = true; this.kill(); this.pillText(this.cur, true);
      const pill = this.els('pill');
      const tl = gsap.timeline({ onComplete: () => { this.tl = null; this.endT = now(); this.unlockLater(); } });
      if (this.reduced) tl.to(pill, { opacity: 0.55, duration: 0.15, yoyo: true, repeat: 1, ease: 'none' });
      else {
        tl.to(pill, { keyframes: { x: [0, -10, 9, -7, 5, -2, 0] }, duration: 0.5, ease: 'none' }, 0);
        if (this.cur === 1) tl.to(this.els('flip'), { keyframes: { rotationY: [0, 34, -12, 0] }, duration: 0.6, ease: 'sine.inOut' }, 0);
        else tl.to(this.els(this.cur === 4 ? 'ring4' : 'ring'), { keyframes: { scale: [1, 1.12, 0.96, 1] }, duration: 0.6, ease: 'sine.inOut' }, 0);
      }
      this.tl = tl;
      if (this.cur === 1 && this.hint) this.hint.lv = Math.min(1, this.hint.lv + 0.1);
      clearTimeout(this.pillT); this.pillT = setTimeout(() => this.pillText(this.cur), 2200);
    }

    // ---------- gates ----------
    bindGates() {
      ['d', 'm'].forEach(L => {
        (this.map[L].hit || []).forEach(el => this.bindSign(el));
        (this.map[L].ring || []).forEach(el => this.bindRing(el, 5, () => this.shakeDone()));
        (this.map[L].ring4 || []).forEach(el => this.bindRing(el, 4, () => this.crackDone()));
      });
    }
    bindSign(el) {
      const flips = () => this.els('flip');
      this.on(el, 'pointerdown', e => {
        if (this.cur !== 1 || this.g.g1 || this.tl) return;
        e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {}
        this.drag = { x: e.clientX, a: 0, moved: false, t: e.pointerType === 'touch' ? 0 : setTimeout(() => this.flipDone(1), 650) };
        if (!this.reduced) gsap.to(flips(), { rotationY: 16, duration: 0.25, ease: 'power2.out' });
      });
      this.on(el, 'pointermove', e => {
        const d = this.drag; if (!d) return;
        const dx = e.clientX - d.x;
        if (!d.moved && Math.abs(dx) > 6) { d.moved = true; clearTimeout(d.t); }
        if (d.moved) { d.a = Math.max(-180, Math.min(180, dx * 1.25)); gsap.set(flips(), { rotationY: d.a }); }
      });
      const up = () => {
        const d = this.drag; if (!d) return; this.drag = null; clearTimeout(d.t);
        if (!d.moved || Math.abs(d.a) > 70) this.flipDone(d.a < 0 ? -1 : 1);
        else gsap.to(flips(), { rotationY: 0, duration: 0.45, ease: 'back.out(2)' });
      };
      this.on(el, 'pointerup', up); this.on(el, 'pointercancel', up);
      this.on(el, 'click', e => { if (e.detail === 0) this.flipDone(1); });
    }
    flipDone(sign) {
      if (this.g.g1 || this.cur !== 1) return;
      if (this.drag) { clearTimeout(this.drag.t); this.drag = null; }
      const A = this.state(1); this.g.g1 = true; this.sfx('bell');
      gsap.to(this.els('flip'), { rotationY: 180 * sign, duration: this.reduced ? 0.01 : 0.6, ease: 'back.out(1.4)', onComplete: () => this.hintEnd(false) });
      this.gateDone(A, ['flip', 'hR'], null, 0.9);
    }
    bindRing(el, f, done) {
      const rk = f === 4 ? 'ring4' : 'ring', pk = rk + 'p', R = this.reach, fin = () => { this.tapHold = false; done(); };
      const start = e => {
        if (this.cur !== f || this.g['g' + f] || this.tl || this.holdTw) return;
        if (f === 4 && this.fall) this.fall.askGyro();
        this.tapHold = !!(e && e.pointerType === 'touch');
        if (e && e.pointerId != null) { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {} }
        gsap.to(this.els(rk), { scale: 0.94, duration: 0.2 });
        if (f === 5) {
          // the human hand reaches in while the ring is held
          if (this.backTw) { this.backTw.kill(); this.backTw = null; }
          this.breathHold('sh', true); this.breathHold('sr', true);
          this.holdTw = gsap.to(R, { v: 1, duration: Math.max(0.05, HOLD5 * (1 - R.v)), ease: 'none', onUpdate: () => this.reachSet(), onComplete: fin });
        } else this.holdTw = gsap.to(this.els(pk), { '--p': 100, duration: 1.2, ease: 'none', onComplete: fin });
      };
      const stop = () => {
        if (!this.holdTw || this.g['g' + f] || this.tapHold) return;
        this.holdTw.kill(); this.holdTw = null;
        if (f === 5) { this.backTw = gsap.to(R, { v: 0, duration: 0.25 + 0.45 * R.v, ease: 'power2.out', onUpdate: () => this.reachSet(), onComplete: () => { this.backTw = null; this.breathHold('sh', false); this.breathHold('sr', false); } }); }
        else gsap.to(this.els(pk), { '--p': 0, duration: 0.35, ease: 'power2.out' });
        gsap.to(this.els(rk), { scale: 1, duration: 0.3 });
      };
      this.on(el, 'pointerdown', start);
      ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(ev => this.on(el, ev, stop));
      this.on(el, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) start(); } });
      this.on(el, 'keyup', e => { if (e.key === 'Enter' || e.key === ' ') stop(); });
    }
    // hold progress v: the human hand comes in from the left; near the end the robot leans in too, so the palms meet
    reachSet() {
      const v = this.reach.v, H = this.F.hs(this.L), w = this.F.shWait(this.L, this.geo), e = 1 - Math.pow(1 - v, 1.7);
      const u = Math.max(0, (v - 0.45) / 0.55), er = u * u * (3 - 2 * u);
      gsap.set(this.els('hSH').concat(this.els('hSHb')), this.F.rig('hSH', w.map((a, i) => a + (H.hMeet[i] - a) * e)));
      gsap.set(this.els('hSR').concat(this.els('hSRf')), this.F.rig('hSR', H.rWait.map((a, i) => a + (H.rMeet[i] - a) * er)));
      gsap.set(this.els('ringp'), { '--p': v * 100 });
    }
    // c 0..1: open shake pose -> clasped. Robot knuckles bend first, then the tips hook over; the front tip copies fade in once they clear the human hand's edge
    claspSet(c) {
      const A = window.SWArt, ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      this.els('hSH').concat(this.els('hSHb')).forEach(el => A.morph(el, 'shake', 'hclasp', ss(0, 0.85, c), ss(0.12, 1, c)));
      // human fingertips swap to the copy behind the robot as they wrap round it
      const hb = ss(0.38, 0.6, c), hf = (1 - hb).toFixed(3);
      this.els('hSH').forEach(el => el.querySelectorAll('[data-fg]:not([data-fg="thumb"]) > [data-fj]').forEach(j => j.setAttribute('opacity', hf)));
      this.els('hSHb').forEach(el => { const t = el.querySelector('[data-tips]'); if (t) t.setAttribute('opacity', hb.toFixed(3)); });
      this.els('hSR').concat(this.els('hSRf')).forEach(el => A.morph(el, 'shake', 'rclasp', ss(0, 0.7, c), ss(0.28, 1, c)));
      const op = ss(0.5, 0.72, c).toFixed(3);
      this.els('hSRf').forEach(el => { const t = el.querySelector('[data-tips]'); if (t) t.setAttribute('opacity', op); });
      this.cl = c;
    }
    holdReset() {
      if (this.holdTw) { this.holdTw.kill(); this.holdTw = null; }
      this.tapHold = false;
      if (this.backTw) { this.backTw.kill(); this.backTw = null; }
      this.reach.v = 0; this.breathHold('sh', false); this.breathHold('sr', false);
      gsap.set(this.els('ringp').concat(this.els('ring4p')), { '--p': 0 });
      gsap.set(this.els('ring').concat(this.els('ring4')), { scale: 1 });
    }
    shakeDone() {
      this.holdTw = null; if (this.g.g5 || this.cur !== 5) return;
      const H = this.F.hs(this.L), A = this.state(5);
      A.hSH = this.F.rig('hSH', H.hMeet); A.hSHb = Object.assign({}, A.hSH); A.hSR = this.F.rig('hSR', H.rMeet); A.hSRf = Object.assign({}, A.hSR);
      this.g.g5 = true; this.sfx('chime');
      this.gateDone(A, this.reduced ? null : ['hSH', 'hSHb', 'hSR', 'hSRf', 'duo', 'hShadow'], {
        ring: [0, 0.12, 'power1.in'], 'hSH-red': [0.3, 0.5, 'sine.inOut'],
        bg5: [0.3, 0.7, 'power2.out'], vgA: [0.4, 0.5, 'none'], vgF: [0.4, 0.5, 'none'],
        t5a: [0.15, 0.2, 'power1.in'], t5b: [0.45, 0.4, 'power2.out'], stage: [0.35, 0.5, 'none']
      }, 1.6);
      if (!this.reduced && this.tl) this.tl.add(this.claspTl(H), 0);
      if (this.type) this.type.to(this.F.mix(5, this.g), s => s._chrome ? (s.offsetParent ? 0.35 + s._d * 0.4 : null) : s._f === 5 ? 0.55 + s._d * 0.5 : null);
    }
    // ~1 s clasp (the robot follows the human through the meet -> hold relation), 2 pumps, then the robot lets go and pulls back; the human hand rests
    claspTl(H) {
      const F = this.F, hsh = this.els('hSH').concat(this.els('hSHb')), rob = this.els('hSR').concat(this.els('hSRf')), duo = this.els('duo'), sh = this.els('hShadow');
      const M = H.meet, Hd = H.hold, C = { c: 0 }, mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
      const close = () => {
        const t = C.c, hv = mix(H.hMeet, H.hClasp, t);
        gsap.set(hsh, F.rig('hSH', hv)); gsap.set(rob, F.rig('hSR', F.follow(hv, mix(M, Hd, t)))); this.claspSet(t);
      };
      const rC = F.follow(H.hClasp, Hd), R = (k, v) => { const o = F.rig(k, v); delete o.autoAlpha; return o; }, IR = { immediateRender: false };
      gsap.set(duo, { transformOrigin: H.pivot[0] + 'px ' + H.pivot[1] + 'px' });
      const tl = gsap.timeline();
      tl.to(C, { c: 1, duration: 1, ease: 'power2.inOut', onUpdate: close }, 0);
      tl.fromTo(sh, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 0.25);
      tl.to(duo, { keyframes: { y: [0, 22, -7, 22, 0], rotation: [0, 1.8, -0.7, 1.8, 0] }, duration: 1.1, ease: 'sine.inOut' }, 1.05);
      tl.to(sh, { keyframes: { scaleX: [1, 1.1, 0.92, 1.1, 1], opacity: [1, 1, 0.7, 1, 1] }, duration: 1.1, ease: 'sine.inOut' }, 1.05);
      // let go: fingers open, the robot slides back out to the right, the human hand settles where it is
      const O = { c: 1 };
      tl.to(O, { c: 0, duration: 0.6, ease: 'power2.inOut', onUpdate: () => this.claspSet(O.c) }, 2.25);
      tl.fromTo(rob, R('hSR', rC), Object.assign(R('hSR', H.rOff), { duration: 1.0, ease: 'power2.in' }, IR), 2.3);
      tl.to(rob, { autoAlpha: 0, duration: 0.3, ease: 'none' }, 3.0);
      tl.fromTo(hsh, R('hSH', H.hClasp), Object.assign(R('hSH', H.hRest), { duration: 1.1, ease: 'power3.inOut' }, IR), 2.3);
      tl.to(sh, { autoAlpha: 0, duration: 0.5, ease: 'sine.out' }, 2.3);
      return tl;
    }
    gateDone(A, skip, over, D) {
      this.busy = true; this.kill(); this.pending = this.cur; this.pillText(this.cur);
      if (this.reduced) return this.dip(this.cur);
      const tl = this.build(A, this.state(this.cur), { from: false, D, skip, over });
      tl.eventCallback('onComplete', () => this.arrive(this.cur));
      this.tl = tl; tl.play(0);
    }

    crackDone() {
      this.holdTw = null; if (this.g.g4 || this.cur !== 4) return;
      const A = this.state(4); this.g.g4 = true; this.sfx('crack');
      this.setP(0); this.ensureCrack(true);
      this.gateDone(A, null, { ring4: [0, 0.2, 'power1.in'], gl4: [0, 0.02, 'none'], shopfx: [0, 0.02, 'none'], pieces: [0, 0.02, 'none'], crack: [0, 0.02, 'none'] }, 1);
      if (!this.reduced) gsap.from(this.roots[this.L].querySelectorAll('[data-f4^="pc"]'), { x: 0, y: 0, rotation: 0, duration: 0.5, ease: 'power3.out' });
    }
    ensureCrack(draw) {
      const host = this.stage.querySelector('[data-f4="crackin"]'), ring = this.els('ring4')[0];
      if (!host || !ring || !this.g.g4) return;
      const key = this.dims.vw + 'x' + this.dims.vh;
      if (!draw && host.firstChild && this.crackKey === key) return;
      this.crackKey = key;
      const r = ring.getBoundingClientRect(), sr = this.stage.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2 - sr.left), cy = Math.round(r.top + r.height / 2 - sr.top), anim = draw && !this.reduced;
      host.innerHTML = window.SWArt.crack(this.dims.vw, this.dims.vh, cx, cy, anim);
      if (!anim) return;
      gsap.to(host.querySelectorAll('[data-ck]'), { strokeDashoffset: 0, duration: 0.4, ease: 'power3.out', stagger: 0.003 });
      gsap.fromTo(host.querySelector('[data-flash]'), { opacity: 0.9, scale: 0.4 }, { opacity: 0, scale: 1.5, duration: 0.65, ease: 'power2.out' });
      gsap.fromTo(this.world, { x: 0, y: 0 }, { keyframes: { x: [0, -12, 10, -7, 4, -2, 0], y: [0, 7, -6, 4, -2, 1, 0] }, duration: 0.45, ease: 'none' });
    }
    // frame 4 timeline, progress 0..1 driven by smoothed scroll
    buildScrub() {
      if (this.sc) this.sc.kill();
      const D = this.roots[this.L], q = n => D.querySelector('[data-f4="' + n + '"]'), qa = p => Array.from(D.querySelectorAll('[data-f4^="' + p + '"]'));
      const head = q('head'); if (!head) return;
      const H = this.L === 'd' ? this.dims.H : 900, off = (H - 900) / 2;
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      tl.to({}, { duration: 1 }, 0);
      tl.fromTo(head, { y: 0, autoAlpha: 1 }, { y: -120, autoAlpha: 0, duration: 0.05, ease: 'power1.in' }, 0.03);
      const ci = this.stage.querySelector('[data-f4="crackin"]');
      if (ci) tl.fromTo(ci, { opacity: 1 }, { opacity: 0, duration: 0.07 }, 0.05);
      qa('pc').forEach((el, i) => {
        const px = +el.dataset.px, py = +el.dataset.py;
        tl.fromTo(el, { x: px, y: py, rotation: 0 }, { x: px + +el.dataset.dx, y: py + H + 320, rotation: +el.dataset.rot, duration: 0.1 + (i % 3) * 0.0125, ease: 'power2.in' }, 0.002 + i * 0.004);
      });
      const hd = q('hand');
      if (hd) {
        tl.fromTo(hd, { x: -295, y: 900, rotation: 90, scale: 1.1 }, { x: -215, y: 80, rotation: 78, scale: 1.1, duration: 0.2, ease: 'power2.out' }, 0.05);
        tl.fromTo(hd, { x: -215, y: 80, rotation: 78 }, { x: -195, y: 50, rotation: 70, duration: 0.7, ease: 'sine.inOut', immediateRender: false }, 0.27);
      }
      const SH = [[-14, 8, -30], [10, -9, 30], [-7, 12, -24], [13, -6, 26], [-10, 7, -18]];
      SH.forEach((v, i) => {
        const el = q('s' + i), sp = q('sp' + i); if (!el) return;
        const s0 = 0.14 + i * 0.145, T = 0.28, top = -off - 420, bot = 900 + off + 80, mid = 290 + (i % 2 ? 30 : -10), r0 = v[0], r1 = v[1], xd = v[2];
        tl.fromTo(el, { y: top, x: xd, rotation: r0, scaleX: 0.82, skewY: 5 }, { y: mid - 40, x: xd * 0.3, rotation: r0 * 0.3, scaleX: 1, skewY: 0, duration: T * 0.36, ease: 'power2.out' }, s0);
        tl.fromTo(el, { y: mid - 40, x: xd * 0.3, rotation: r0 * 0.3 }, { y: mid + 40, x: -xd * 0.2, rotation: r1 * 0.3, duration: T * 0.28, immediateRender: false }, s0 + T * 0.36);
        tl.fromTo(el, { y: mid + 40, x: -xd * 0.2, rotation: r1 * 0.3, scaleX: 1, skewY: 0 }, { y: bot, x: -xd, rotation: r1, scaleX: 0.84, skewY: -5, duration: T * 0.36, ease: 'power2.in', immediateRender: false }, s0 + T * 0.64);
        if (sp) tl.fromTo(sp, { xPercent: -30 }, { xPercent: 30, duration: T }, s0);
      });
      const deb = q('deb');
      if (deb) tl.fromTo(deb, { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.02);
      qa('db').forEach(el => tl.fromTo(el, { y: 0, rotation: 0 }, { y: +el.dataset.fall, rotation: +el.dataset.spin, duration: 0.94 }, 0.04));
      this.sc = tl; tl.progress(this.p);
    }
    setP(v) { this.p = this.pt = v; if (this.sc) this.sc.progress(v); this.ensureCrack(false); }
    // a fresh swipe inside a trackpad's momentum tail (macOS sends wheel events every ~16 ms for a second or more after
    // the fingers lift, so there is no 180 ms pause): the tail only ever slows down, a new swipe speeds up again
    freshWheel() {
      const w = this.wh; if (w.length < 6) return false;
      const a = (w[3] + w[4] + w[5]) / 3, b = (w[0] + w[1] + w[2]) / 3;
      return a > 8 && a > b * 1.5;
    }
    scrubIn(d, gap, touch) {
      const dir = d > 0 ? 1 : -1, edge = dir > 0 ? this.pt >= 1 : this.pt <= 0;
      if (edge) { if (!touch && (gap > 180 || (this.freshWheel() && now() - this.edgeAt > 250))) this.gesture(dir, 'wheel'); return; }
      this.pt = clamp(this.pt + d / SCRUB);
      if (this.pt === 0 || this.pt === 1) this.edgeAt = now();
    }
    scrubTick() {
      if (!this.sc) return;
      const d = this.pt - this.p;
      if (Math.abs(d) < 0.0005) { if (d !== 0) { this.p = this.pt; this.sc.progress(this.p); } return; }
      this.p += d * (1 - Math.pow(1 - 0.08, gsap.ticker.deltaRatio(60)));
      this.sc.progress(this.p);
    }
    // idle "breathing": each hand drifts on its own slow, out-of-phase sine loops, pivoting at the wrist. Layers that share a data-breath key move as one.
    breathe() {
      (this.br || []).forEach(t => t.kill()); this.br = []; this.brG = new Map();
      if (this.reduced) return;
      this.stage.querySelectorAll('[data-breath]').forEach((el, i) => {
        const k = el.getAttribute('data-breath') || 'b' + i;
        if (!this.brG.has(k)) this.brG.set(k, { els: [], i: this.brG.size, tw: [], held: false });
        this.brG.get(k).els.push(el);
      });
      this.brG.forEach((G, k) => this.breathLoop(k, false));
    }
    breathLoop(k, mid) {
      const G = this.brG && this.brG.get(k); if (!G) return;
      G.tw.forEach(t => t.kill());
      const a = 2.6 + (G.i % 3) * 0.35, o = { yoyo: true, repeat: -1, ease: 'sine.inOut' };
      G.tw = [gsap.fromTo(G.els, { rotation: -2.2 }, Object.assign({ rotation: 2.2, duration: a }, o)),
        gsap.fromTo(G.els, { y: -7 }, Object.assign({ y: 8, duration: a * 1.27 }, o)),
        gsap.fromTo(G.els, { x: -4 }, Object.assign({ x: 4, duration: a * 1.61 }, o))];
      // resume from the middle of each swing (about 0), so there is no jump
      if (mid) G.tw.forEach(t => t.time(t.duration() / 2));
      this.br.push(...G.tw);
    }
    // park a breathing group at rest (the clasp needs the hands to line up exactly), or set it drifting again
    breathHold(k, on) {
      const G = this.brG && this.brG.get(k); if (!G || G.held === on) return;
      G.held = on;
      if (on) { G.tw.forEach(t => t.kill()); G.tw = []; gsap.to(G.els, { x: 0, y: 0, rotation: 0, duration: 0.45, ease: 'power2.out', overwrite: 'auto' }); }
      else this.breathLoop(k, true);
    }

    // ---------- type ----------
    // chrome words flicker straight away; the incoming frame's words start from the old mix and flicker once they are in view
    typeTo(b, a, inD) {
      const T = this.type; if (!T) return;
      const rB = this.F.mix(b, this.g), rA = T.ratio;
      if (a == null) return T.to(rB, null);
      T.to(rB, s => {
        if (s._chrome) return s.offsetParent ? 0.04 + s._d * 0.4 : null;
        if (s._f === b) { T.setF(s, s._r < rA); return inD + s._d * 0.35; }
        return s._f === a && a !== b ? false : null;
      });
    }
    setText(el, str) { if (!el) return; if (this.type) this.type.setText(el, str); else el.textContent = str; }

    // ---------- frame-1 hint: the sign glows brighter as they look around; after 5 s the hand and the cursor point at it ----------
    // frames 6-11: the hand comes from the left (mirrored about the stage centre) and shows the back of the right hand; flipped only while it is hidden, so it never visibly squashes
    mirrorSet(f) {
      const m = f >= 6 && f <= 11;
      gsap.set(this.els('hRm'), { scaleX: m ? -1 : 1 });
      this.stage.querySelectorAll('[data-a="hR"] [data-face]').forEach(g => { g.style.display = (g.getAttribute('data-face') === 'b') === m ? '' : 'none'; });
    }
    hintSetup() {
      const st = this.stage;
      this.hint = { t: 0, lv: 0, sh: 0, mv: 0, ph: 0, on: false, hover: false, done: !!this.g.g1, mx: -1, my: -1, ang: 0, mouse: false };
      this.curEl = st.querySelector('[data-cursor]');
      this.els('hit').forEach(el => {
        this.on(el, 'pointerenter', e => { if (e.pointerType === 'mouse') this.hint.hover = true; });
        this.on(el, 'pointerleave', () => { this.hint.hover = false; });
      });
      this.on(st, 'pointerdown', e => {
        const H = this.hint; if (H.done || this.cur !== 1 || this.g.g1) return;
        H.mouse = e.pointerType === 'mouse';
        if (e.target.closest('[data-a="hit"],button,a,[data-ruler],[data-popup]')) return;
        H.lv = Math.min(1, H.lv + 0.16);
      });
      this.on(window, 'pointermove', e => {
        const H = this.hint; if (H.done) return;
        H.mouse = e.pointerType === 'mouse';
        if (H.mx >= 0) H.mv += Math.hypot(e.clientX - H.mx, e.clientY - H.my) * 0.0001;
        H.mx = e.clientX; H.my = e.clientY;
        if (H.on) this.cursorMove();
      }, { passive: true });
      this.on(st, 'pointerleave', () => { const H = this.hint; if (this.curEl && H.on && !H.done) { H.cs = false; H.mx = -1; gsap.to(this.curEl, { autoAlpha: 0, duration: 0.15 }); } });
    }
    // back on frame 1 with the shop still closed: start the hint over
    hintArm() { Object.assign(this.hint, { t: 0, lv: 0, sh: 0, mv: 0, ph: 0, on: false, done: false, cs: false }); }
    hintTick() {
      const H = this.hint; if (!H || H.done || this.cur !== 1 || this.g.g1 || this.pending) return;
      // deltaRatio can be NaN/0 on the first frames after a reload; a NaN here would freeze the 5 s countdown forever
      let dr = gsap.ticker.deltaRatio(60); if (!isFinite(dr) || dr <= 0) dr = 1;
      const dt = Math.min(0.1, dr / 60);
      if (!isFinite(H.t)) H.t = 0; if (!isFinite(H.lv)) H.lv = 0; if (!isFinite(H.sh)) H.sh = 0; if (!isFinite(H.ph)) H.ph = 0;
      if (!this.drag) H.t += dt;
      H.lv = Math.min(1, H.lv + dt * (0.04 + (H.hover && !this.drag ? 0.14 : 0)) + Math.min(H.mv, dt * 0.15)); H.mv = 0;
      if (!H.on && H.t >= 5 && !this.drag) this.pointOn();
      H.sh += (H.lv - H.sh) * (1 - Math.pow(0.88, dr)); H.ph += dt;
      const p = H.sh * (0.86 + 0.14 * Math.sin(H.ph * 3.4));
      gsap.set(this.els('sglowB'), { opacity: p, scale: 0.75 + 0.55 * H.sh });
      gsap.set(this.els('sglowF'), { opacity: Math.min(1, p * 1.1) });
      gsap.set(this.els('sgw'), { '--sg': p.toFixed(3) });
    }
    signAt() { const P = this.F.P[this.L], sh = P.shop[0]; return [sh[0] + 455 * sh[2], sh[1] + 339 * sh[2]]; }
    pointOn() {
      const H = this.hint; H.on = true;
      const hR = this.els('hR')[0]; if (!hR) return;
      const P = this.F.P[this.L], S = this.signAt(), A = P.aim, ar = A[0] * Math.PI / 180, T = [S[0] + Math.cos(ar) * A[1], S[1] + Math.sin(ar) * A[1]];
      const info = window.SWArt.pointInfo(), r = A[0] + 180 - info.dir, rr = r * Math.PI / 180, s = P.reach[0][2];
      const v = [info.d[0] * s, info.d[1] * s], rv = [v[0] * Math.cos(rr) - v[1] * Math.sin(rr), v[0] * Math.sin(rr) + v[1] * Math.cos(rr)];
      const sp = this.F.SPEC.hR, d = this.reduced ? 0.01 : 1;
      this.own.add('hR');
      gsap.to(hR, { x: T[0] - rv[0] - sp.ox, y: T[1] - rv[1] - sp.oy, rotation: r, duration: 0.7 * d, ease: 'power3.inOut', overwrite: 'auto' });
      this.morphTo(1, 0.5 * d);
      const art = hR.querySelector('[data-art]'), dr = info.dir * Math.PI / 180;
      if (art && !this.reduced) this.poke = gsap.to(art, { x: Math.cos(dr) * 12, y: Math.sin(dr) * 12, duration: 0.42, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.7 });
      this.cursorMove();
    }
    morphTo(t, dur) {
      const hR = this.els('hR')[0]; if (!hR) return;
      this.mo = this.mo || { t: 0 }; gsap.killTweensOf(this.mo);
      gsap.to(this.mo, { t, duration: Math.max(0.01, dur), ease: 'power2.inOut', onUpdate: () => window.SWArt.morph(hR, 'reach', 'point', this.mo.t) });
    }
    cursorMove() {
      const H = this.hint, el = this.curEl, f = this.els('flip')[0]; if (!el || !H.on || !f) return;
      if (!H.mouse || H.mx < 0) { if (H.cs) { H.cs = false; gsap.set(el, { autoAlpha: 0 }); this.stage.style.cursor = ''; } return; }
      if (!H.cs) { H.cs = true; this.stage.style.cursor = 'none'; this.els('hit').forEach(h => { h.style.cursor = 'none'; }); gsap.to(el, { autoAlpha: 1, duration: 0.2 }); }
      const sr = this.stage.getBoundingClientRect(), r = f.getBoundingClientRect();
      const dx = r.left + r.width / 2 - H.mx, dy = r.top + r.height / 2 - H.my;
      if (Math.hypot(dx, dy) > 26) H.ang = Math.atan2(dy, dx) * 180 / Math.PI;
      gsap.set(el, { x: H.mx - sr.left - 42, y: H.my - sr.top - 9, rotation: H.ang, transformOrigin: '42px 9px' });
    }
    hintEnd(instant) {
      const H = this.hint; if (!H || H.done) return; H.done = true;
      const d = instant || this.reduced ? 0.01 : 1;
      gsap.to(this.els('sglowB').concat(this.els('sglowF')), { opacity: 0, duration: 0.6 * d, ease: 'power2.out' });
      gsap.to(this.els('sgw'), { '--sg': 0, duration: 0.6 * d, ease: 'power2.out' });
      if (this.curEl) gsap.to(this.curEl, { autoAlpha: 0, duration: 0.25 * d });
      this.stage.style.cursor = ''; this.els('hit').forEach(el => { el.style.cursor = 'grab'; });
      if (!H.on) return;
      if (this.poke) { this.poke.kill(); this.poke = null; }
      const hR = this.els('hR')[0], art = hR && hR.querySelector('[data-art]'); if (!hR) return;
      if (art) gsap.to(art, { x: 0, y: 0, duration: 0.3 * d });
      this.morphTo(0, 0.5 * d);
      if (instant) { gsap.killTweensOf(hR); gsap.set(hR, this.state(this.cur).hR); this.own.delete('hR'); return; }
      gsap.to(hR, Object.assign({}, this.state(this.cur).hR, { duration: 0.8, ease: 'power3.inOut', overwrite: 'auto', onComplete: () => this.own.delete('hR') }));
    }

    // ---------- UI ----------
    bindUI() {
      const q = s => this.stage.querySelector(s);
      this.on(q('[data-skip]'), 'click', () => this.skip());
      this.on(q('[data-ruler]'), 'click', e => this.onRuler(e));
      this.on(q('[data-plus]'), 'click', e => { e.stopPropagation(); this.popup(!this.popOpen); });
      this.stage.querySelectorAll('[data-see]').forEach(b => this.on(b, 'click', () => {
        const f = +b.getAttribute('data-see'); this.reached = Math.max(this.reached, f); this.jump(f, true);
      }));
      this.on(document, 'pointerdown', e => { if (this.popOpen && !e.target.closest('[data-popup],[data-plus]')) this.popup(false); });
      this.on(q('[data-sound]'), 'click', () => this.sound(!this.soundOn));
      this.marquee();
    }
    buildRuler() {
      const r = this.stage.querySelector('[data-ruler]'); if (!r) return;
      const w = this.ui === 'm' ? 155 : 441; this.rw = w; this.rstep = w / 31;
      r.style.width = w + 'px';
      let html = '';
      for (let y = 1999; y <= 2030; y++) {
        const mj = y % 10 === 0 || y === 1999;
        html += `<span style="position:absolute;left:${((y - 1999) * this.rstep).toFixed(2)}px;top:${mj ? 2 : 9}px;width:1px;height:${mj ? 14 : 7}px;background:currentColor;opacity:${mj ? 1 : 0.45}"></span>`;
      }
      r.querySelector('[data-ticks]').innerHTML = html;
      this.rLabel = r.querySelector('[data-ruler-label]'); this.rPtr = r.querySelector('[data-ruler-ptr]'); this.rProg = r.querySelector('[data-ruler-prog]');
      this.rLabel.style.fontSize = this.ui === 'm' ? '10px' : '11px';
    }
    rpos(f) { return (this.F.FR[f - 1].year - 1999) * this.rstep; }
    rulerTo(f, dur) {
      const fr = this.F.FR[f - 1], x = this.rpos(f);
      this.setText(this.rLabel, fr.year + (fr.today ? ' · TODAY' : ''));
      const lw = this.rLabel.offsetWidth, lx = Math.max(0, Math.min(this.rw - lw, x - lw / 2));
      const o = { duration: dur, ease: 'power3.inOut', overwrite: true };
      gsap.to(this.rPtr, Object.assign({ x }, o));
      gsap.to(this.rProg, Object.assign({ width: x }, o));
      gsap.to(this.rLabel, Object.assign({ x: lx }, o));
      const r = this.stage.querySelector('[data-ruler]');
      r.setAttribute('aria-valuenow', f); r.setAttribute('aria-valuetext', fr.year + ', frame ' + f + ' of 12');
    }
    onRuler(e) {
      const r = e.currentTarget.getBoundingClientRect(), x = e.clientX - r.left, FR = this.F.FR;
      let best = 0, bd = 1e9;
      for (let f = 1; f <= this.reached; f++) {
        const fr = FR[f - 1], twins = FR.filter(q => q.year === fr.year);
        let px = this.rpos(f); if (twins.length > 1) px += (twins.indexOf(fr) ? 1 : -1) * this.rstep * 0.3;
        const d = Math.abs(px - x); if (d < bd) { bd = d; best = f; }
      }
      if (best && best !== this.cur) this.jump(best);
    }
    updateUI(snap) {
      const f = this.cur;
      if (snap) this.rulerTo(f, 0);
      this.pillText(f);
      const sk = this.stage.querySelector('[data-skip]');
      sk.disabled = f === 12; this.setText(sk, this.ui === 'm' ? 'SKIP TO THE END' : 'SKIP TO THE END →');
      sk.style.padding = this.ui === 'm' ? '0 12px' : '0 16px';
      sk.style.cursor = f === 12 ? 'default' : 'pointer';
      if (f === 5 && !this.g.g5 && !this.holdTw) gsap.set(this.els('ringp'), { '--p': 0 });
      if (f === 4 && !this.g.g4 && !this.holdTw) gsap.set(this.els('ring4p'), { '--p': 0 });
    }
    // touch screens: holding opens the browser's long-press menu, so the gates are taps there; say so in both layouts
    touchCopy() {
      if (!this.mqT.matches) return;
      this.stage.querySelectorAll('[data-a="t5a"]').forEach(el => { el.textContent = el.textContent.replace('Press and hold to agree.', 'Tap to agree.'); });
      this.stage.querySelectorAll('[data-a="ring"]').forEach(el => el.setAttribute('aria-label', 'Tap to shake on it'));
      this.stage.querySelectorAll('[data-a="ring4"]').forEach(el => el.setAttribute('aria-label', 'Tap to break the glass'));
    }
    // no long-press menu on touch screens, except on real links
    noLongPress() {
      this.on(this.stage, 'contextmenu', e => {
        if ((this.mqT.matches || e.pointerType === 'touch') && !(e.target.closest && e.target.closest('a[href]'))) e.preventDefault();
      });
    }
    pillText(f, hold) {
      const el = this.stage.querySelector('[data-pill-text]'), touch = this.mqT.matches;
      const next = touch ? 'SWIPE UP' : 'SCROLL ON ↓';
      let t = '';
      if (f === 1) t = this.g.g1 ? next : touch ? 'TAP THE SIGN' : hold ? 'HOLD THE SIGN' : 'DRAG THE SIGN';
      else if (f === 4) t = this.g.g4 ? next : touch ? 'TAP TO BREAK' : 'HOLD TO BREAK';
      else if (f === 5) t = this.g.g5 ? next : touch ? 'TAP' : 'HOLD';
      if (t) this.setText(el, t);
    }
    popup(open) {
      const p = this.stage.querySelector('[data-popup]'), b = this.stage.querySelector('[data-plus]');
      if (!p || open === this.popOpen) return; this.popOpen = open;
      b.setAttribute('aria-expanded', String(open)); b.textContent = open ? '×' : '+';
      gsap.killTweensOf(p);
      if (open) { gsap.set(p, { display: 'flex' }); gsap.fromTo(p, { autoAlpha: 0, y: this.reduced ? 0 : 10 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }); }
      else gsap.to(p, { autoAlpha: 0, duration: 0.18, onComplete: () => gsap.set(p, { display: 'none' }) });
    }
    marquee() {
      const t = this.stage.querySelector('[data-marquee]'); if (!t) return;
      if (this.mq) this.mq.kill(); gsap.set(t, { xPercent: 0 });
      if (!this.reduced) this.mq = gsap.to(t, { xPercent: -50, duration: 32, ease: 'none', repeat: -1 });
    }
    sound(on) {
      this.soundOn = on;
      const b = this.stage.querySelector('[data-sound]'), bars = Array.from(b.querySelectorAll('[data-bar]'));
      b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Sound is on' : 'Sound is off');
      (this.bars || []).forEach(t => t.kill());
      this.bars = on && !this.reduced ? bars.map((el, i) => gsap.to(el, { height: 7 + (i % 2) * 6, duration: 0.3 + i * 0.07, repeat: -1, yoyo: true, ease: 'sine.inOut' })) : [];
      if (!on || this.reduced) gsap.to(bars, { height: on ? 9 : 3, duration: 0.2 });
      if (on) this.sfx('tick');
    }
    sfx(kind) {
      if (!this.soundOn) return;
      try {
        const ac = this.ac || (this.ac = new (window.AudioContext || window.webkitAudioContext)()), t = ac.currentTime;
        const tone = (fq, d, v, type, at) => {
          const o = ac.createOscillator(), g = ac.createGain(); at = at || 0;
          o.type = type || 'sine'; o.frequency.value = fq;
          g.gain.setValueAtTime(0.0001, t + at); g.gain.linearRampToValueAtTime(v, t + at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + at + d);
          o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + d + 0.05);
        };
        if (kind === 'tick') tone(1800, 0.05, 0.03, 'triangle');
        if (kind === 'bell') { tone(1318, 1.3, 0.1); tone(1976, 0.9, 0.05); tone(1318, 1.1, 0.07, 'sine', 0.2); }
        if (kind === 'chime') [523, 659, 784, 1046].forEach((fq, i) => tone(fq, 1.2, 0.06, 'sine', i * 0.07));
        if (kind === 'crack') {
          const n = ac.createBufferSource(), buf = ac.createBuffer(1, ac.sampleRate * 0.35, ac.sampleRate), d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
          const g = ac.createGain(); g.gain.value = 0.18; n.buffer = buf; n.connect(g).connect(ac.destination); n.start(t);
        }
      } catch (_) {}
    }
    // a fresh load always starts at frame 1 with the shop closed (approved: no deep links), so the sign hint plays again after a reload.
    // Only in-page hash changes (menu links) jump.
    readHash(initial) {
      if (initial) return;
      const i = this.F.ids.indexOf((location.hash || '').slice(1));
      if (i < 0) return;
      const f = i + 1;
      if (f > 1) this.g.g1 = true; if (f > 4) this.g.g4 = true; if (f > 5) this.g.g5 = true;
      this.reached = Math.max(this.reached, f);
      if (!initial && this.g.g1) this.hintEnd(true);
      if (initial) this.cur = f; else if (f !== this.cur) this.jump(f, true);
    }
    writeHash() { try { history.replaceState(null, '', '#' + this.F.ids[this.cur - 1]); } catch (_) {} }
    announce() {
      const el = this.stage.querySelector('[data-live]');
      if (el) el.textContent = 'Frame ' + this.cur + ' of 12: ' + this.F.FR[this.cur - 1].name;
    }
    destroy() {
      this.offs.forEach(fn => fn()); this.offs = [];
      if (this.obs) this.obs.kill(); this.kill(); if (this.mq) this.mq.kill();
      if (this.tick) gsap.ticker.remove(this.tick); if (this.sc) this.sc.kill(); (this.br || []).forEach(t => t.kill());
      clearTimeout(this.rt); clearTimeout(this.pillT); if (this.type) this.type.destroy(); if (this.poke) this.poke.kill();
      if (this.fall) this.fall.destroy();
    }
  }

  window.SWEngine = {
    boot(stage) {
      gsap.registerPlugin(Observer);
      if (stage.__sw) stage.__sw.destroy();
      stage.__sw = new Engine(stage);
      window.__sw = stage.__sw;
      return stage.__sw;
    }
  };
})();
