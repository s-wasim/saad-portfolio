// v2 3D reach hand (frames 1-4, 6-12): the handshake's human hand drawn with three.js over the engine's SVG hand rigs.
// The engine keeps driving its SVG hands exactly as before (breathing, the frame-1 sign hint, the frames 6-11 mirror, frame 12's
// presenting hand); this module fades that artwork out and, every frame, puts a 3D hand where each SVG hand is: two pins on the
// SVG's thumb crotch give turn and size, and the 3D index fingertip is laid on the SVG one (the 3D hand, drawn GROW x larger, grows
// away from its fingertip).
//   frames 1-4   reach rig hR, palm side; the engine's morph value (eng.mo.t) scrubs the Blender "point" action
//   frames 6-11  the same rig mirrored by the engine: the model is turned round to show the back of the hand. One part per frame
//                turns robot (index, middle, thumb, ring, pinky, palm): the chrome sweeps from fingertip to base behind a glowing
//                seam, grafts onto the skin with a plated edge and a seam ring, and faint chrome veins creep into the skin nearby.
//   frame 12     a second copy on the presenting rig hP: the "present" pose, the whole hand chrome on the human forearm
// Chrome parts move like the robot (held, then a crisp snap, plus a faint servo jitter); skin parts keep the soft human drift.
// If WebGL or the model fails, the SVG hands stay. Model source: hands/src/reach_build.py -> assets/hands/hand_open.glb.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { skinMaterial, studio, TILT } from './hands3d.js';

const S = 1850;                      // svg units per metre (hands/src/hs_lib.py)
const WEB = [388, 214];              // thumb crotch of the reach SVG (art5.js POSE.reach thumb base, mirrored about x = 380)
const WEB_P = [380, 226];            // ... of the presenting SVG (POSE.open)
const GROW = 1.3;                    // the 3D hand is drawn a little larger than the SVG one
const SWEEP = 1.1;                   // seconds for the chrome to sweep one part
const PART = { index: 0, middle: 1, thumb: 2, ring: 3, pinky: 4 }, PALM = 5;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const hash = x => { const s = Math.sin(x) * 43758.5453; return s - Math.floor(s); };
const now = () => performance.now() / 1000;
const FWD = new THREE.Vector3(0, 0, 1).applyQuaternion(TILT), RIGHT = new THREE.Vector3(1, 0, 0).applyQuaternion(TILT), UP = new THREE.Vector3(0, 1, 0).applyQuaternion(TILT);
const ZA = new THREE.Vector3(0, 0, 1), FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
// mood light sets: warm shop lamp (frames 1-2), red alarm (frame 3), the cool future (frames 6-12, as the handshake after the deal)
const WARM = { key: 0xffd2a8, rim: 0xffc090, sky: 0xfff0dc, gnd: 0x5a3a24 }, RED = { key: 0xffd0c2, rim: 0xff3b3b, sky: 0xff9a8a, gnd: 0x3a0508 };
const FUT = { key: 0xf3f6ff, rim: 0x39e6ff, sky: 0xa8c8ff, gnd: 0x0a1a4a };

// ---------------------------------------------------------------- hybrid skin / chrome material
// uG (0..6) = how many parts are chrome, in conversion order; the vertex data (hands/src/reach_build.py) gives each vertex its sweep
// coordinate g = part + u (u 0 at the tip, 1 at the base) and its distance to each part. With uG = 0 every term below is zero and
// the shader is exactly the skin shader (frames 1-4 unchanged).
const HY_COMMON = `
attribute_dummy
uniform float uG, uMove, uGlow; uniform vec3 uGlowCol;
varying vec3 vHyA; varying vec3 vHyB; varying float vHyG; varying vec3 vRest;
float hsM; float hsD; float hsVein; float hsRing; vec3 hsN0;
float hsSeamL(float s) { float w = 0.07, aa = fwidth(s) * 1.2; return 1.0 - smoothstep(w - aa, w + aa, s); }
float hsPadL(float s) { float w = 0.36, aa = fwidth(s) * 1.2; return 1.0 - smoothstep(w - aa, w + aa, s); }
// distance (m) from this point to the chrome: converted parts by their baked distance (plus how far the sweep still has to go),
// the part being swept along its own length
float hsDist() {
  float g = vHyG, own = floor(g + 0.001), u = g - own, d = 1.0;
  float dk[6]; dk[0] = vHyA.x; dk[1] = vHyA.y; dk[2] = vHyA.z; dk[3] = vHyB.x; dk[4] = vHyB.y; dk[5] = vHyB.z;
  for (int k = 0; k < 6; k++) {
    float c = clamp(uG - float(k), 0.0, 1.0);
    if (c <= 0.0) continue;
    float dd = abs(own - float(k)) < 0.5 ? max(0.0, u - c) * 0.085 : dk[k] + (1.0 - c) * 0.085;
    d = min(d, dd);
  }
  return d;
}
// thin wavy lines on the rest-pose surface (~4 mm cells): the chrome veins creeping into the skin
float hsVeinPat(vec3 p) {
  p *= 200.0;
  float a = sin(p.x + 1.7 * sin(p.y * 0.8 + p.z * 0.6)), b = sin(p.y * 1.3 + 1.3 * sin(p.z * 0.9 + p.x * 0.7));
  float l = min(abs(a), abs(b)), w = fwidth(l) * 1.5 + 0.09;
  return 1.0 - smoothstep(0.0, w, l);
}`;

function hybridMaterial(src, detail) {
  const m = skinMaterial(src, detail), base = m.onBeforeCompile;
  const h = { uG: { value: 0 }, uMove: { value: 0 }, uGlow: { value: 1 }, uGlowCol: { value: new THREE.Color(0x3aa8ff) } };
  m.userData.h = h;
  m.clearcoat = 1e-4;                 // switches the clearcoat layer on; its strength is set per fragment (0 on skin)
  m.onBeforeCompile = (sh, r) => {
    base(sh, r);
    Object.assign(sh.uniforms, h);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 hyA; attribute vec3 hyB; attribute float hyG;\nvarying vec3 vHyA; varying vec3 vHyB; varying float vHyG; varying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHyA = hyA; vHyB = hyB; vHyG = hyG; vRest = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + HY_COMMON.replace('attribute_dummy', ''))
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  hsD = hsDist();
  hsM = (1.0 - smoothstep(0.0, 0.0012, hsD)) * step(0.0001, uG);
  hsVein = hsVeinPat(vRest) * smoothstep(0.0015, 0.003, hsD) * (1.0 - smoothstep(0.003, 0.016, hsD)) * step(0.0001, uG);
  hsRing = exp(-pow((hsD - 0.002) / 0.0009, 2.0)) * step(0.0001, uG);`)
      // colour: chrome with dark seam grooves and lens pads; veins darken the skin; a plated edge where chrome meets it
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  float s = vMask.r, pd = vMask.g, groove = 1.0 - smoothstep(0.07, 0.2, s);
  vec3 ch = vec3(0.58, 0.64, 0.73) * mix(1.0, 0.18, groove);
  ch = mix(ch, vec3(0.03, 0.04, 0.07), hsPadL(pd));
  vec3 sk = diffuseColor.rgb;
  sk = mix(sk, sk * 0.35 + vec3(0.05, 0.08, 0.13), hsVein * 0.9);
  float edge = exp(-pow((hsD - 0.0009) / 0.0006, 2.0)) * step(0.0001, uG);
  sk *= 1.0 - 0.55 * edge;
  diffuseColor.rgb = mix(sk, ch, hsM);
}`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 1.0, max(hsM, hsVein * 0.6));')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, mix(0.16, 0.55, 1.0 - smoothstep(0.07, 0.2, vMask.r)), hsM);
roughnessFactor = mix(roughnessFactor, 0.3, hsVein * 0.6);`)
      .replace('material.clearcoat = clearcoat;', 'material.clearcoat = 0.6 * hsM;')
      .replace('material.clearcoatRoughness = clearcoatRoughness;', 'material.clearcoatRoughness = 0.1;')
      .replace('material.sheenColor = sheenColor;', 'material.sheenColor = sheenColor * (1.0 - hsM);')
      .replace(/return envMapColor\.rgb \* envMapIntensity;/, 'return envMapColor.rgb * envMapIntensity * mix(1.0, 2.86, hsM);')
      .replace('#include <normal_fragment_maps>', 'hsN0 = normal;\n#include <normal_fragment_maps>')
      // chrome: no skin pores, a bevel either side of each seam; then its glow, the seam ring on the graft, the veins' faint glow
      .replace('#include <lights_fragment_begin>', `{
  normal = normalize(mix(normal, hsN0, hsM));
  float hb = (smoothstep(0.06, 0.22, vMask.r) * 0.0018 + smoothstep(0.3, 0.55, vMask.g) * 0.0009) * hsM;
  normal = hsPerturb(-vViewPosition, normal, vec2(dFdx(hb), dFdy(hb)), faceDirection);
  totalEmissiveRadiance *= 1.0 - hsM;
  float line = hsSeamL(vMask.r), pad = hsPadL(vMask.g), halo = (1.0 - smoothstep(0.07, 0.26, vMask.r)) * 0.3;
  totalEmissiveRadiance += uGlowCol * (line * 4.5 + halo * 1.6 + pad * 2.6) * uGlow * hsM;
  totalEmissiveRadiance += uGlowCol * hsRing * (1.1 + 3.2 * uMove) * (1.0 - hsM * 0.6);
  totalEmissiveRadiance += uGlowCol * hsVein * 0.55;
}
#include <lights_fragment_begin>`);
  };
  return m;
}

// ---------------------------------------------------------------- one hand (the reach hand, or frame 12's presenting copy)
class Hand {
  constructor(scene0, first, clip, detail) {
    this.root = first ? scene0 : skClone(scene0);
    this.anchor = this.root.getObjectByName('reach_anchor');
    this.tipN = this.root.getObjectByName('tip');
    this.dip = this.root.getObjectByName('index_03');
    this.root.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const m = hybridMaterial(o.userData.src || o.material, detail);
      o.userData.src = o.userData.src || o.material;
      // an opaque and a see-through twin sharing uniforms: fading swaps between them instead of recompiling a shader
      const t = m.clone(); t.transparent = true; t.onBeforeCompile = m.onBeforeCompile; t.userData = m.userData;
      o.userData.mats = [m, t]; o.material = m; this.hand = o;
    });
    if (!this.anchor || !this.tipN || !this.dip || !this.hand) throw new Error('reach3d: unexpected model');
    this.mixer = new THREE.AnimationMixer(this.root);
    this.act = this.mixer.clipAction(clip); this.act.setLoop(THREE.LoopOnce); this.act.clampWhenFinished = true; this.act.play(); this.act.paused = true;
    this.dur = clip.duration;
    // finger bones for the idle "life": each joint drifts on its own slow sine, out of phase with the others
    this.life = [];
    this.root.traverse(o => {
      const m = o.isBone && /^(index|middle|ring|pinky|thumb)_0([123])$/.exec(o.name); if (!m) return;
      const i = this.life.length, base = m[2] === '1';
      this.life.push({ b: o, f: m[1], part: PART[m[1]], a: (base ? 1.6 : 1.0) * Math.PI / 180, sp: base && m[1] !== 'thumb' ? 0.8 * Math.PI / 180 : 0,
        w: 2 * Math.PI * (0.35 + ((i * 0.37) % 0.25)), p: i * 1.93, i, q: new THREE.Quaternion() });
    });
    this.wristB = this.root.getObjectByName('hand'); this.wq = new THREE.Quaternion();
    this.G = 0; this.mv = 0;
  }
  get u() { return this.hand.material.userData; }
}

// a chrome joint's micro-move: holds on a random target, then snaps to the next (rate ~1/s), in -1..1
function servo(t, L) {
  const x = t * (0.8 + (L.p % 0.5)) + L.p * 3.7, n = Math.floor(x), e = ss(0, 0.16, x - n);
  const r = k => hash(k * 12.9898 + L.i * 78.233) * 2 - 1;
  return r(n) + (r(n + 1) - r(n)) * e;
}

class Reach3D {
  constructor(stage) {
    this.stage = stage;
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('data-hr3d-canvas', '');
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none', display: 'none' });
    this.r = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.r.setClearColor(0x000000, 0);
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.r);
    this.envs = [pm.fromScene(studio(0xffb070), 0.02).texture, pm.fromScene(studio(0xff3b3b), 0.02).texture, pm.fromScene(studio(0x39e6ff), 0.02).texture];
    pm.dispose();
    this.scene.environment = this.envs[0];
    this.cam = new THREE.OrthographicCamera(0, 100, 0, -100, 1, 8000);
    this.cam.quaternion.copy(TILT);
    this.cam.position.set(0, 0, 4000).applyQuaternion(TILT);
    this.key = new THREE.DirectionalLight(0xffffff, 2.6);
    this.rim = new THREE.DirectionalLight(0xffffff, 1.6);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
    this.scene.add(this.key, this.key.target, this.rim, this.rim.target, this.hemi);
    this.size = [0, 0]; this.shown = false; this.f3 = 0; this.fadeT = -1; this.shadowCss = ''; this.fut = -1; this.lastT = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
  }

  async load(url, detailUrl) {
    const [gltf, detail] = await Promise.all([new GLTFLoader().loadAsync(url), new THREE.TextureLoader().loadAsync(detailUrl)]);
    detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
    detail.repeat.set(12, 19);
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry, col = g.getAttribute('color');
      if (col) { g.setAttribute('hsmask', col); g.deleteAttribute('color'); }
      for (const [a, b] of [['_ha', 'hyA'], ['_hb', 'hyB'], ['_hg', 'hyG']]) { const x = g.getAttribute(a); if (!x) throw new Error('reach3d: no ' + a); g.setAttribute(b, x); g.deleteAttribute(a); }
    });
    const clip = n => gltf.animations.find(c => c.name === n);
    if (!clip('human_point') || !clip('human_present')) throw new Error('reach3d: missing actions');
    this.R = new Hand(gltf.scene, false, clip('human_point'), detail);
    this.P = new Hand(gltf.scene, false, clip('human_present'), detail);
    this.P.G = 6;
    this.scene.add(this.R.root, this.P.root);
    this.bind();
    const compile = () => this.r.compileAsync ? this.r.compileAsync(this.scene, this.cam) : Promise.resolve(this.r.compile(this.scene, this.cam));
    for (const k of [1, 0]) { for (const H of [this.R, this.P]) H.hand.material = H.hand.userData.mats[k]; await compile(); }
  }

  // pins on each layout's SVG hands: the thumb crotch, 100 svg units towards the wrist, and the index fingertip + its last joint
  bind() {
    const NS = 'http://www.w3.org/2000/svg', dot = (parent, x, y) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', '0.5'); c.setAttribute('fill', 'none'); c.setAttribute('data-hr3d-pin', '');
      parent.appendChild(c); return c;
    };
    // the distal segment ends in a round cap: fingertip = segment length + cap radius (read from the cap path "M0 -a/2 L l -b/2 A ...":
    // getBBox is empty while a layout is hidden)
    const tipPins = root => {
      const fj = root && root.querySelector('[data-fg="index"] > [data-fj]'); if (!fj) return null;
      const m = /^M0 \S+ L(\S+) (\S+)/.exec(fj.querySelector('path').getAttribute('d') || ''); if (!m) return null;
      return [dot(fj, 0, 0), dot(fj, +m[1] - +m[2], 0)];
    };
    this.sets = [...this.stage.querySelectorAll('[data-layout]')].map(L => {
      const hRm = L.querySelector('[data-a="hRm"]'), hR = hRm && hRm.querySelector('[data-a="hR"]');
      const art = hR && hR.querySelector('[data-v="reach_human"]'), svg = art && art.querySelector('svg');
      const fp = svg && svg.querySelector('[data-face="p"]'), fb = svg && svg.querySelector('[data-face="b"]');
      const hP = L.querySelector('[data-a="hP"]'), pArt = hP && hP.querySelector('[data-v="present_bionic"]'), pSvg = pArt && pArt.querySelector('svg');
      const tp = tipPins(fp), tb = tipPins(fb), tq = tipPins(pSvg);
      if (!tp || !tb || !tq) return null;
      return { L, hRm, hR, art, fp, red: fp.querySelector('[data-a="hR-red"]'),
        web: [dot(svg, WEB[0], WEB[1]), dot(svg, WEB[0] + 100, WEB[1])], tipP: tp, tipB: tb,
        pArt, pWeb: [dot(pSvg, WEB_P[0], WEB_P[1]), dot(pSvg, WEB_P[0] + 100, WEB_P[1])], pTip: tq };
    }).filter(Boolean);
  }

  alpha(el) {
    let o = 1;
    for (let n = el; n && n !== this.stage; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      o *= parseFloat(cs.opacity);
    }
    return o;
  }

  // screen point (canvas px) of a DOM pin / of a 3D point
  pinAt(el, rect) { const b = el.getBoundingClientRect(); return [b.left + b.width / 2 - rect.left, b.top + b.height / 2 - rect.top]; }
  scr(v) { const p = v.clone().project(this.cam); return [(p.x + 1) / 2 * this.size[0], (1 - p.y) / 2 * this.size[1]]; }
  world(node) { return node.getWorldPosition(new THREE.Vector3()); }
  svgFade(v) { this.stage.style.setProperty('--hr3d-svg', v.toFixed(3)); }

  // put hand H on its SVG rig: turn + size from the web pins (mirrored rigs show the back: the model is turned round), then the
  // fingertip on the SVG fingertip; while pointing (mo), the 3D index is also turned onto the SVG one
  place(H, web, tip, mirrored, mo, rect) {
    H.act.time = Math.min(mo * H.dur, H.dur - 1e-4);
    H.mixer.update(0);
    const w0 = this.pinAt(web[0], rect), w1 = this.pinAt(web[1], rect);
    const k = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]) / 100, pxm = k * S * GROW, al = Math.atan2(w1[1] - w0[1], w1[0] - w0[0]);
    H.anchor.position.set(w0[0], -w0[1], 0).applyQuaternion(TILT);
    H.anchor.quaternion.copy(TILT).multiply(new THREE.Quaternion().setFromAxisAngle(ZA, mirrored ? -al - Math.PI : -al));
    if (mirrored) H.anchor.quaternion.multiply(FLIP);
    H.anchor.scale.setScalar(pxm);
    H.root.updateMatrixWorld(true);
    const st = this.pinAt(tip[1], rect), sj = this.pinAt(tip[0], rect);
    if (mo > 0.001) {
      const tw = this.world(H.tipN), p3 = this.scr(tw), j3 = this.scr(this.world(H.dip));
      let d = Math.atan2(st[1] - sj[1], st[0] - sj[0]) - Math.atan2(p3[1] - j3[1], p3[0] - j3[0]);
      d = Math.atan2(Math.sin(d), Math.cos(d)) * mo;
      const q = new THREE.Quaternion().setFromAxisAngle(FWD, -d);
      H.anchor.position.sub(tw).applyQuaternion(q).add(tw);
      H.anchor.quaternion.premultiply(q);
      H.root.updateMatrixWorld(true);
    }
    const p3 = this.scr(this.world(H.tipN));
    H.anchor.position.addScaledVector(RIGHT, st[0] - p3[0]).addScaledVector(UP, -(st[1] - p3[1]));
    H.root.updateMatrixWorld(true);
    return pxm;
  }

  // idle life on top of the pose (undone after the render: the mixer only writes a bone when the action time changes, so an offset
  // left in place would pile up while the pose holds still). Skin joints drift on soft sines; chrome joints hold, then snap, with a
  // faint servo jitter; the curled fingers stay tucked while pointing.
  lifeOn(H, t, mo) {
    for (const L of H.life) L.q.copy(L.b.quaternion);
    if (H.wristB) H.wq.copy(H.wristB.quaternion);
    for (const L of H.life) {
      const c = clamp(H.G - L.part), damp = L.f === 'index' ? 1 - 0.5 * mo : 1 - 0.85 * mo;
      const soft = Math.sin(t * L.w + L.p), hard = servo(t, L) * 0.8;
      const jit = Math.sin(t * 61 + L.i * 1.7) * Math.sin(t * 23 + L.i * 2.9) * 0.15 * Math.PI / 180;
      L.b.rotateX((L.a * (soft + (hard - soft) * c)) * damp + jit * c);
      if (L.sp) L.b.rotateZ(L.sp * (Math.sin(t * L.w * 0.7 + L.p * 1.3) * (1 - c) + servo(t * 0.8 + 5, L) * 0.6 * c) * damp);
    }
    if (H.wristB) H.wristB.rotateX(0.9 * Math.PI / 180 * Math.sin(t * 2 * Math.PI * 0.23));
  }
  lifeOff(H) {
    for (const L of H.life) L.b.quaternion.copy(L.q);
    if (H.wristB) H.wristB.quaternion.copy(H.wq);
  }

  tick() {
    const eng = window.__sw;
    const set = this.sets.find(s => s.hR.offsetParent !== null);
    if (!eng || !set) return this.hide();
    const t = now(), dt = clamp(t - (this.lastT || t), 0, 0.3); this.lastT = t;   // (allows slow devices to finish a sweep on time)
    const cur = eng.cur, mirrored = set.fp.style.display === 'none';
    // conversion: one part per frame from frame 6; it sweeps (about SWEEP s a part, quicker on a multi-frame jump) both ways
    const R = this.R, P = this.P, Gt = cur >= 6 ? Math.min(6, cur - 5) : 0, dG = Gt - R.G;
    if (Math.abs(dG) > 1e-4) R.G += Math.sign(dG) * Math.min(Math.abs(dG), dt * Math.max(1 / SWEEP, Math.abs(dG) / 2.5));
    else R.G = Gt;
    R.mv += ((Math.abs(dG) > 1e-3 ? 1 : 0) - R.mv) * (1 - Math.pow(0.9, dt * 60));
    const fT = cur >= 6 ? 1 : 0; this.fut = this.fut < 0 ? fT : this.fut + (fT - this.fut) * (1 - Math.pow(0.95, dt * 60));
    const aR = this.alpha(set.art), aP = this.alpha(set.pArt);
    // takeover: the first time the 3D hand is ready, cross-fade from the SVG over 0.3 s (instantly if the hand is hidden)
    if (this.f3 < 1) {
      if (Math.max(aR, aP) < 0.004) this.f3 = 1;
      else { if (this.fadeT < 0) this.fadeT = t; this.f3 = clamp((t - this.fadeT) / 0.3); }
    }
    this.svgFade(1 - this.f3);
    const oR = aR * this.f3, oP = aP * this.f3;
    if (oR < 0.004 && oP < 0.004) return this.hide();
    const host = set.hRm.parentElement;
    if (this.canvas.parentElement !== host || this.canvas.previousElementSibling !== set.hRm) set.hRm.after(this.canvas);
    // size from the layout itself (as the handshake does): the parallax layer can report zero height on touch screens
    const lr = set.L.getBoundingClientRect(), ls = lr.width / set.L.offsetWidth, hr = host.getBoundingClientRect(), sr = this.stage.getBoundingClientRect(), mg = sr.width * 0.05;
    const cs = { left: (sr.left - mg - hr.left) / ls + 'px', top: (sr.top - mg - hr.top) / ls + 'px', width: (sr.width + 2 * mg) / ls + 'px', height: (sr.height + 2 * mg) / ls + 'px' };
    if (Object.keys(cs).some(k => this.canvas.style[k] !== cs[k])) Object.assign(this.canvas.style, cs);
    this.canvas.style.display = 'block';
    this.shown = true;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5);
    if (rect.width !== this.size[0] || rect.height !== this.size[1] || dpr !== this.size[2]) {
      this.size = [rect.width, rect.height, dpr];
      this.r.setPixelRatio(dpr); this.r.setSize(rect.width, rect.height, false);
      Object.assign(this.cam, { left: 0, right: rect.width, top: 0, bottom: -rect.height }); this.cam.updateProjectionMatrix();
    }

    const mo = clamp(eng.mo ? eng.mo.t : 0), live = !this.reduced.matches;
    const shown = [];
    let pxm = 0, lead = R;
    if (oR >= 0.004) { pxm = this.place(R, set.web, mirrored ? set.tipB : set.tipP, mirrored, mirrored ? 0 : mo, rect); shown.push([R, oR]); }
    if (oP >= 0.004) { const k = this.place(P, set.pWeb, set.pTip, false, 0, rect); if (oP > oR) { pxm = k; lead = P; } shown.push([P, oP]); }
    R.root.visible = oR >= 0.004; P.root.visible = oP >= 0.004;
    if (live) for (const [H] of shown) this.lifeOn(H, t, H === R && !mirrored ? mo : 0);

    // colour + light: red alarm read from the SVG's own red layer (frame 3), warm shop light before it, the cool future from frame 6
    const red = set.red && getComputedStyle(set.red).visibility !== 'hidden' ? clamp(parseFloat(getComputedStyle(set.red).opacity)) : 0;
    for (const [H, o] of shown) {
      const u = H.u.u, h = H.u.h;
      u.uRed.value = H === R ? red : 0; u.uKnuck.value = H === R && !mirrored ? 0.6 * mo : 0; u.uSqueeze.value = 0; u.uFold.value = 0; u.uFlush.value = 0;
      h.uG.value = H.G; h.uMove.value = H === R ? R.mv : 0; h.uGlow.value = 0.75 + 0.1 * Math.sin(t * 1.3);
    }
    this.mood(red, this.fut);
    this.light(lead, rect);
    // soft shadow on the scene behind: the hands' own silhouette, dropped a little below and blurred (a CSS filter on the canvas)
    const sk = pxm / 1800, f = this.fut, sc = [Math.round(52 * (1 - f) + 2 * f), Math.round(30 * (1 - f) + 8 * f), Math.round(14 * (1 - f) + 30 * f)];
    const sh = `drop-shadow(${(7 * sk).toFixed(1)}px ${((20 - 4 * mo) * sk).toFixed(1)}px ${(15 * sk).toFixed(1)}px rgba(${sc.join(', ')}, ${(0.3 + 0.12 * mo + 0.1 * f).toFixed(2)}))`;
    if (sh !== this.shadowCss) { this.shadowCss = sh; this.canvas.style.filter = sh; }
    for (const [H, o] of shown) { H.hand.material = H.hand.userData.mats[o < 0.999 ? 1 : 0]; H.hand.material.opacity = o; }
    this.r.render(this.scene, this.cam);
    if (live) for (const [H] of shown) this.lifeOff(H);
  }

  mood(red, fut) {
    const mix = k => new THREE.Color(WARM[k]).lerp(new THREE.Color(RED[k]), red).lerp(new THREE.Color(FUT[k]), fut);
    this.key.color.copy(mix('key')); this.rim.color.copy(mix('rim'));
    this.hemi.color.copy(mix('sky')); this.hemi.groundColor.copy(mix('gnd'));
    this.scene.environment = this.envs[fut > 0.5 ? 2 : red > 0.5 ? 1 : 0];
  }

  light(H, rect) {
    const c = H.anchor.position;
    this.key.target.position.copy(c); this.rim.target.position.copy(c);
    const D = Math.hypot(rect.width, rect.height);
    this.key.position.copy(c).add(new THREE.Vector3(-0.45, 0.75, 0.55).normalize().multiplyScalar(D));
    this.rim.position.copy(c).add(new THREE.Vector3(0.7, 0.25, -0.65).normalize().multiplyScalar(D));
  }

  hide() {
    if (!this.shown) return;
    this.shown = false; this.canvas.style.display = 'none';
  }
}

async function start() {
  if (/[?&]no3d\b/.test(location.search)) return;
  const stage = document.querySelector('[data-stage]');
  if (!stage || stage.__hr3d) return;
  let h;
  try {
    h = new Reach3D(stage);
    await h.load('assets/hands/hand_open.glb', 'assets/hands/skin_detail_n.jpg');
  } catch (e) {
    console.warn('reach3d: falling back to the SVG hand', e);
    if (window.SW3D) window.SW3D.fail('reach', e);
    if (h) try { h.r.dispose(); } catch (_) {}
    return;
  }
  stage.__hr3d = h;
  h.tick = h.tick.bind(h);
  gsap.ticker.add(h.tick);
  stage.setAttribute('data-hr3d', '');
  if (window.SW3D) window.SW3D.ok('reach');
}

// wait for the engine (it creates window.__sw); frame 1 is the first thing seen, so load soon after the first paint
(function wait(t0) {
  if (window.__sw && window.gsap) {
    const go = () => start();
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 600 }); else setTimeout(go, 200);
  } else if (performance.now() - t0 < 20000) setTimeout(() => wait(t0), 100);
})(performance.now());
