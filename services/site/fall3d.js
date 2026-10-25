// v1 3D falling hand (frame 4): the same human hand, palm towards us, reaching up for the store as it falls away. Drawn inside the
// fall's own WebGL scene (site/fall3.js handScene, the back layer the glass shards refract), where the frame-4 hand sprite was.
// Motion is all computed fresh every frame (no mixer, nothing accumulated on bones or camera):
//   vigour  v = 1 - smoothstep(0.15, 0.95, p): a desperate, repeated clutch at the start of the fall, slower and weaker grasps
//           as it goes on, a slack half-open reach by the end (it follows p both ways); the hand sinks and tilts a little as it gives up
//   fear    a fast tremble (8-11 Hz) on the hand and every finger
//   wind    finger flutter (4-7 Hz) and a slower buffet of the whole hand; both surge while the visitor scrolls fast (fall3 boost)
//   camera  a faint shared tremor of the view, also surging with the scroll
// Reduced motion: the grasp level still follows the fall, but nothing trembles, flutters or shakes.
// Model source: hands/src/fall_build.py -> hands/hand_fall.blend -> assets/hands/hand_fall.glb.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { skinMaterial, studio } from './hands3d.js';

const S = 1850;                          // svg units per metre (hands/src/hs_lib.py)
const SPRITE_PX = 0.62 * 1.1;            // sprite texture px per svg unit (art5.js K, fall3.js rasterise scale)
const WEB = [42.7, -200.8];              // the sprite hand's thumb crotch relative to its index tip (sprite plane units, y up)
const LEAN = 12 * Math.PI / 180;         // sprite fingers lean this far left of straight up
const PITCH = -0.14;                     // fingers tipped a little away from us, reaching up past the camera
const GROW = 1.5;                        // the model draws ~2/3 the size of the vector hand at the same svg scale: match the sprite
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const FING = ['index', 'middle', 'ring', 'pinky', 'thumb'];
const LAG = { thumb: -0.03, index: 0, middle: 0.045, ring: 0.075, pinky: 0.095 };   // grasp lag per finger (s)

// smooth noise from three incommensurate sines: never visibly loops; f = base frequency (Hz), k = channel seed
function nz(t, f, k) {
  const w = 2 * Math.PI * f;
  return (Math.sin(t * w + k * 1.7) * 0.55 + Math.sin(t * w * 1.618 + k * 4.1) * 0.3 + Math.sin(t * w * 2.414 + k * 2.3) * 0.15);
}

// the fall renderer outputs linear colour with no tone mapping; the skin is tuned for the other hands' ACES + sRGB output
function fallSkin(src, detail) {
  const m = skinMaterial(src, detail), base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base(sh, r);
    // three's ACES filmic curve (its own copy is only compiled in when the renderer tone-maps)
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', `vec3 hsRRT(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 hsACES(vec3 c) {
  const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c *= 1.05 / 0.6; c = O * hsRRT(I * c); return clamp(c, 0.0, 1.0);
}
void main() {`)
      .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = hsACES(gl_FragColor.rgb);')
      .replace('#include <colorspace_fragment>', `#include <colorspace_fragment>
{ vec3 c = clamp(gl_FragColor.rgb, 0.0, 1.0);
  gl_FragColor.rgb = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }`);
  };
  m.customProgramCacheKey = () => 'fall-skin';
  return m;
}

class Fall3D {
  constructor(ext) {
    this.ext = ext; this.scene = ext.scene; this.sprite = ext.sprite;
    this.f3 = 0; this.fadeT = -1; this.ph = 0; this.sur = 0; this.time = 0;
    const R = ext.renderer, pm = new THREE.PMREMGenerator(R);
    this.env = pm.fromScene(studio(0xff3b3b), 0.02).texture; pm.dispose();
    // red alarm light, as the frame-3 hand: warm-pink key from the upper left, red rim from behind right, red bounce
    this.key = new THREE.DirectionalLight(0xffd0c2, 2.4);
    this.rim = new THREE.DirectionalLight(0xff3b3b, 2.2);
    this.hemi = new THREE.HemisphereLight(0xff9a8a, 0x3a0508, 0.65);
  }

  async load(url, detailUrl) {
    const [gltf, detail] = await Promise.all([new GLTFLoader().loadAsync(url), new THREE.TextureLoader().loadAsync(detailUrl)]);
    detail.wrapS = detail.wrapT = THREE.RepeatWrapping; detail.repeat.set(12, 19);
    this.root = gltf.scene;
    this.anchor = this.root.getObjectByName('fall_anchor');
    this.root.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry, col = g.getAttribute('color');
      if (col) { g.setAttribute('hsmask', col); g.deleteAttribute('color'); }
      o.frustumCulled = false;
      const m = fallSkin(o.material, detail);
      m.envMap = this.env; m.envMapIntensity = 0.35;
      const t = m.clone(); t.transparent = true; t.onBeforeCompile = m.onBeforeCompile; t.customProgramCacheKey = m.customProgramCacheKey; t.userData = m.userData;
      o.userData.mats = [m, t]; o.material = m; this.hand = o;
    });
    if (!this.anchor || !this.hand) throw new Error('fall3d: unexpected model');
    // the three key poses, read once from the clips: bone name -> quaternion
    this.poses = {};
    for (const c of gltf.animations) {
      const P = {};
      for (const tr of c.tracks) {
        const m = /^(.+)\.quaternion$/.exec(tr.name); if (!m) continue;
        P[m[1]] = new THREE.Quaternion().fromArray(tr.values, 0);
      }
      this.poses[c.name.replace(/^fall_/, '')] = P;
    }
    if (!this.poses.splay || !this.poses.claw || !this.poses.slack) throw new Error('fall3d: missing poses');
    this.bones = [];
    this.root.traverse(o => {
      if (!o.isBone || !this.poses.splay[o.name]) return;
      const m = /^(index|middle|ring|pinky|thumb)_0([123])$/.exec(o.name), i = this.bones.length;
      this.bones.push({ b: o, n: o.name, f: m ? m[1] : null, j: m ? +m[2] : 0, k: i * 0.731 + 0.37 });
    });
    this.root.visible = false;
    this.scene.add(this.root, this.key, this.key.target, this.rim, this.rim.target, this.hemi);
    const cam = this.ext.cam;
    const compile = () => { const r = this.ext.renderer; return r.compileAsync ? r.compileAsync(this.scene, cam) : Promise.resolve(r.compile(this.scene, cam)); };
    this.root.visible = true;
    this.hand.material = this.hand.userData.mats[1]; await compile();
    this.hand.material = this.hand.userData.mats[0]; await compile();
    this.root.visible = false;
  }

  // one frame, called by fall3.js after it has placed the sprite
  step({ p, t, dt, boost, reduced, vh }) {
    const sp = this.sprite, live = !reduced;
    // takeover: cross-fade from the sprite over 0.3 s the first time the model is ready
    if (this.f3 < 1) { this.fadeT = this.fadeT < 0 ? this.time : this.fadeT; this.f3 = clamp((this.time - this.fadeT) / 0.3); }
    this.time += dt;
    sp.material.opacity = 1 - this.f3; sp.material.visible = this.f3 < 1;
    // scroll surge 0..1: rises quickly with the fall's boost, falls back slowly
    const target = clamp(boost / 2.2);
    this.sur += (target - this.sur) * (1 - Math.pow(target > this.sur ? 0.82 : 0.96, dt * 60));
    const sur = live ? this.sur : 0;
    const v = 1 - ss(0.15, 0.95, p), give = ss(0.3, 1, p);

    // ---- placement: the sprite's thumb crotch, turn and size; then buffet + sink
    const sc = sp.scale.x, rz = sp.rotation.z, c = Math.cos(rz), s = Math.sin(rz);
    const wx = sp.position.x + (WEB[0] * c - WEB[1] * s) * sc, wy = sp.position.y + (WEB[0] * s + WEB[1] * c) * sc;
    // world units per screen px at the hand's depth (z -600 with the camera 1000 in front of z 0: 1.6), times the layout scale
    const px = 1.6 * (sc / 1.6);
    const bu = live ? 0.5 + 0.5 * sur : 0, tr = live ? (0.4 + 0.6 * v) * (1 + 1.2 * sur) : 0;
    const bx = (nz(t, 0.9, 1) * 9 + nz(t, 1.7, 2) * 4) * bu * px + nz(t, 9.3, 3) * 1.6 * tr * px;
    const by = (nz(t, 0.7, 4) * 6 + nz(t, 1.5, 5) * 3) * bu * px + nz(t, 10.1, 6) * 1.4 * tr * px;
    // 6% of the screen lower by the end (2% on phones, where the hand already sits low)
    const sink = -(window.__sw && window.__sw.L === 'm' ? 0.02 : 0.06) * vh * give * 1.6;
    this.anchor.position.set(wx + bx, wy + by + sink, sp.position.z);
    const roll = rz + LEAN - 0.16 * give + (nz(t, 0.8, 7) * 0.035 + nz(t, 1.6, 8) * 0.015) * bu + nz(t, 8.7, 9) * 0.006 * tr;
    this.anchor.rotation.set(PITCH + nz(t, 0.6, 10) * 0.05 * bu + 0.08 * give, nz(t, 0.75, 11) * 0.06 * bu, roll);
    this.anchor.scale.setScalar(S * SPRITE_PX * sc * GROW);

    // ---- pose: slack <-> tense splay by vigour, clutching into the claw on an irregular rhythm, every finger a little behind the last
    const freq = (1 / 2.5 + (1 / 0.9 - 1 / 2.5) * v) * (1 + 0.22 * nz(t, 0.13, 12));
    if (live) this.ph += dt * freq;     // reduced motion: no clutching, the grip just holds at the fall's level
    const depth = 0.18 + 0.82 * v;
    const P = this.poses, q = new THREE.Quaternion(), e = new THREE.Euler();
    const deg = Math.PI / 180;
    for (const B of this.bones) {
      const base = P.slack[B.n].clone().slerp(P.splay[B.n], v);
      let g = 0;
      if (B.f) {
        const u = this.ph - LAG[B.f] * freq, fr = u - Math.floor(u);
        // snap shut quickly, hold a moment, open slowly
        g = fr < 0.3 ? ss(0, 0.3, fr) : fr < 0.42 ? 1 : 1 - ss(0.42, 1, fr);
        g *= depth * (0.85 + 0.15 * nz(Math.floor(u) * 3.1, 1, B.k));   // no two grasps quite alike
        if (!live) g = 0.4 * depth;
      }
      base.slerp(P.claw[B.n], g);
      if (B.f && live) {
        // fear tremble (fast, small) + wind flutter (slower, bigger on the outer joints, less on the thumb)
        const th = B.f === 'thumb' ? 0.6 : 1, jw = [0, 0.7, 1, 1.25][B.j];
        const ax = (nz(t, 9.2 + B.k % 1.6, B.k) * 1.1 * tr + nz(t, 4.6 + (B.k * 1.3) % 2.2, B.k + 5) * 2.4 * (0.5 + 0.6 * sur)) * jw * th * deg;
        const az = B.j === 1 ? nz(t, 5.1 + B.k % 1.4, B.k + 9) * 1.4 * (0.5 + 0.6 * sur) * th * deg : 0;
        base.multiply(q.setFromEuler(e.set(ax, 0, az)));
      }
      B.b.quaternion.copy(base);
    }

    // ---- light, fade, show
    const ap = this.anchor.position, D = 3000;
    this.key.target.position.copy(ap); this.rim.target.position.copy(ap);
    this.key.position.copy(ap).add(new THREE.Vector3(-0.45, 0.75, 0.55).normalize().multiplyScalar(D));
    this.rim.position.copy(ap).add(new THREE.Vector3(0.7, 0.25, -0.65).normalize().multiplyScalar(D));
    const u = this.hand.material.userData.u;
    u.uRed.value = 1; u.uKnuck.value = 0.5 * depth; u.uSqueeze.value = 0; u.uFold.value = 0; u.uFlush.value = 0;
    this.hand.material = this.hand.userData.mats[this.f3 < 0.999 ? 1 : 0];
    this.hand.material.opacity = this.f3;
    this.root.visible = this.f3 > 0.004;

    // ---- camera: a faint shared tremor, a few px and a hair of roll, surging with the scroll
    if (!live) return null;
    const ck = (0.35 + 0.65 * sur) * (sc / 1.6);     // camera offsets are screen px at the shards' depth
    return { cam: [(nz(t, 6.3, 20) * 1.2 + nz(t, 2.1, 21) * 1.4) * ck, (nz(t, 7.1, 22) * 1.2 + nz(t, 2.6, 23) * 1.2) * ck, (nz(t, 3.3, 24) * 0.0026) * (0.3 + 0.7 * sur)] };
  }
}

async function start() {
  if (/[?&]no3d\b/.test(location.search)) return;
  const eng = window.__sw, ext = eng && eng.fall && eng.fall.ext;
  if (!ext || ext.__f3d) return;
  ext.__f3d = true;
  let h;
  try {
    h = new Fall3D(ext);
    await h.load('assets/hands/hand_fall.glb', 'assets/hands/skin_detail_n.jpg');
  } catch (e) {
    console.warn('fall3d: keeping the sprite hand', e);
    if (window.SW3D) window.SW3D.fail('fall', e);
    return;
  }
  window.__fall3d = h;
  ext.on(a => h.step(a));
  if (window.SW3D) window.SW3D.ok('fall');
}

// wait for the engine and its fall (frame 4 is a few frames in, so load in idle time)
(function wait(t0) {
  const eng = window.__sw;
  if (eng && eng.fall && eng.fall.ext && window.gsap) {
    const go = () => start();
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 3000 }); else setTimeout(go, 800);
  } else if (performance.now() - t0 < 30000) setTimeout(() => wait(t0), 200);
})(performance.now());
