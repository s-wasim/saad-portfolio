// v1 3D handshake (frame 5): draws the two hands from assets/hands/handshake.glb with three.js on top of the engine's SVG rigs.
// The engine keeps driving its SVG hands exactly as before (hold-to-reach, clasp, pumps, exits, both layouts); this module hides
// their artwork and, every frame, puts a 3D hand where each SVG hand is (two pins on the SVG's thumb crotch give position,
// turn and size). The engine's clasp value (eng.cl, 0..1) scrubs the Blender "clasp" actions, the squeeze shape key and the
// skin/chrome shader effects. If WebGL or the model fails, nothing changes: the SVG hands stay.
// Model source: hands/src (Blender scripts) -> hands/handshake.blend -> assets/hands/handshake.glb.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const S = 1850;                     // svg units per metre (hands/src/hs_lib.py)
const WEB = [392, 212];             // thumb crotch in both shake SVGs (art5.js CLASP.hw, and CLASP.rw mirrored)
const ZOOM = 2.0;                   // camera pushed in on the clasp: the hands read larger and the arms leave the screen at the elbow
const TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.16, 0.2, 0, 'YXZ'));  // a slight 3/4 view from above-right
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const now = () => performance.now() / 1000;

// ---------------------------------------------------------------- shaders (patched into MeshPhysicalMaterial)
const PERTURB = `
vec3 hsPerturb(vec3 p, vec3 n, vec2 dH, float fd) {
  vec3 sx = normalize(dFdx(p)), sy = normalize(dFdy(p)), r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1) * fd;
  return normalize(abs(det) * n - sign(det) * (dH.x * r1 + dH.y * r2));
}`;

function skinMaterial(src, detail) {
  const m = new THREE.MeshPhysicalMaterial({
    map: src.map, normalMap: detail, normalScale: new THREE.Vector2(0.18, 0.18), roughness: 0.5, metalness: 0,
    sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color(1.0, 0.72, 0.62), envMapIntensity: 0.35
  });
  const u = {
    uSqueeze: { value: 0 }, uFlush: { value: 0 }, uRed: { value: 0 }, uKnuck: { value: 0 }, uFold: { value: 0 }, uDebug: { value: 0 }
  };
  m.userData.u = u;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 hsmask;\nvarying vec4 vMask;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMask = hsmask;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vMask;
uniform float uSqueeze, uFlush, uRed, uKnuck, uFold, uDebug;
${PERTURB}`)
      // colour: pressure pales the skin (blood pushed out), a darker ring sits round it, a pink flush follows the release,
      // stretched knuckles go paler as the fingers close, and the frame-3..5 alarm mood tints the skin red
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  vec3 c = diffuseColor.rgb;
  float press = smoothstep(0.0, 0.6, vMask.r) * uSqueeze;
  float ring = clamp(vMask.g - vMask.r * 1.5, 0.0, 1.0) * uSqueeze;
  c = mix(c, c * vec3(1.28, 1.16, 1.0) + vec3(0.09, 0.07, 0.05), press * 0.9);
  c = mix(c, c * vec3(1.1, 0.56, 0.5), ring * 0.5);
  c = mix(c, c * vec3(1.16, 0.6, 0.54) + vec3(0.04, 0.0, 0.0), vMask.g * uFlush * 0.75);
  c = mix(c, c * 1.12 + vec3(0.03), vMask.a * uKnuck * 0.45);
  c = mix(c, c * vec3(1.22, 0.5, 0.46), uRed * 0.42);
  diffuseColor.rgb = uDebug > 0.5 ? vMask.rgb : c;   // debug: hands3d.debug(1) shows the pressure / flush / fold masks
}`)
      // fold rings: soft ridges round each pressure point (the flesh bunching up), only while squeezed
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  float b = vMask.b;
  float env = smoothstep(0.02, 0.1, b) * (1.0 - smoothstep(0.3, 0.62, b)) * uFold;
  float h = sin(b * 46.0) * env * 0.0045;
  normal = hsPerturb(-vViewPosition, normal, vec2(dFdx(h), dFdy(h)), faceDirection);
}`)
      // a little light scattered back out of the skin at grazing angles (cheap subsurface look)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float f = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0);
  totalEmissiveRadiance += vec3(0.55, 0.16, 0.1) * f * 0.12 * mix(1.0, 1.6, uRed);
}`);
  };
  return m;
}

function chromeMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xc9d2de, metalness: 1, roughness: 0.16, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 1.0
  });
  const u = { uGlow: { value: 0.7 }, uWarm: { value: 0 }, uGlowCol: { value: new THREE.Color(0x3aa8ff) } };
  m.userData.u = u;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 hsmask;\nvarying vec4 vMask;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMask = hsmask;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vMask;
uniform float uGlow, uWarm;
uniform vec3 uGlowCol;
${PERTURB}
float hsSeam(float s) { float w = 0.07, aa = fwidth(s) * 1.2; return 1.0 - smoothstep(w - aa, w + aa, s); }
float hsPad(float s) { float w = 0.36, aa = fwidth(s) * 1.2; return 1.0 - smoothstep(w - aa, w + aa, s); }`)
      // panel seams: a dark groove with a lit core; sensor pads: dark lens discs
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  float s = vMask.g, p = vMask.b;
  float groove = 1.0 - smoothstep(0.07, 0.2, s);
  diffuseColor.rgb *= mix(1.0, 0.18, groove);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.04, 0.07), hsPad(p));
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.55, 1.0 - smoothstep(0.07, 0.2, vMask.g));`)
      // bevel either side of each seam
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  float h = smoothstep(0.06, 0.22, vMask.g) * 0.0018 + smoothstep(0.3, 0.55, vMask.b) * 0.0009;
  normal = hsPerturb(-vViewPosition, normal, vec2(dFdx(h), dFdy(h)), faceDirection);
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float line = hsSeam(vMask.g), pad = hsPad(vMask.b);
  float halo = (1.0 - smoothstep(0.07, 0.26, vMask.g)) * 0.3;
  totalEmissiveRadiance += uGlowCol * (line * 4.5 + halo * 1.6 + pad * 2.6) * uGlow;
  // warm skin seen in the chrome where it touches the hand
  float f = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.0);
  totalEmissiveRadiance += vec3(0.42, 0.2, 0.13) * vMask.r * uWarm * (0.25 + 0.75 * f);
}`);
  };
  return m;
}

// chrome needs something to reflect: a dark studio with a few bright softboxes and strips (tinted by the mood)
function studio(tint) {
  const sc = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0x0a0d14 }));
  sc.add(room);
  const box = (w, h, x, y, z, col, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m);
  };
  box(7, 3, -2, 7, 3, 0xffffff, 3.2);          // top softbox
  box(0.6, 9, -8, 1, 3, 0xffffff, 2.4);        // long strip, front left
  box(0.5, 8, 8, 0, -2, tint, 3.0);            // rim strip, back right (mood colour)
  box(5, 0.5, 0, -7, 4, tint, 1.2);            // low bounce
  box(3, 3, 4, 3, 8, 0xfff2e8, 1.4);           // fill behind the camera
  return sc;
}

// ---------------------------------------------------------------- the module
class Hands3D {
  constructor(stage) {
    this.stage = stage;
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('data-hs3d-canvas', '');
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none', display: 'none' });
    this.r = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.r.setClearColor(0x000000, 0);
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.05;
    this.r.shadowMap.enabled = true;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    // two environments (alarm red / future cyan strips); the mood picks the closer one
    const pm = new THREE.PMREMGenerator(this.r);
    this.envs = [pm.fromScene(studio(0x39e6ff), 0.02).texture, pm.fromScene(studio(0xff3b3b), 0.02).texture];
    pm.dispose();
    this.scene.environment = this.envs[0];
    this.cam = new THREE.OrthographicCamera(0, 100, 0, -100, 1, 8000);
    this.cam.quaternion.copy(TILT);
    this.cam.position.set(0, 0, 4000).applyQuaternion(TILT);
    this.key = new THREE.DirectionalLight(0xffffff, 2.6);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.0004;
    this.rim = new THREE.DirectionalLight(0xffffff, 2);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
    this.scene.add(this.key, this.key.target, this.rim, this.rim.target, this.hemi);
    this.size = [0, 0]; this.flush = { full: false, t0: -1, prev: 0 }; this.jit = 0; this.shown = false;
  }

  async load(url, detailUrl) {
    const [gltf, detail] = await Promise.all([
      new GLTFLoader().loadAsync(url),
      new THREE.TextureLoader().loadAsync(detailUrl)
    ]);
    detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
    detail.repeat.set(12, 19);
    this.root = gltf.scene;
    this.scene.add(this.root);
    this.ha = this.root.getObjectByName('human_anchor');
    this.ra = this.root.getObjectByName('robot_anchor');
    this.root.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry, col = g.getAttribute('color');
      if (col) { g.setAttribute('hsmask', col); g.deleteAttribute('color'); }
      o.castShadow = o.receiveShadow = true;
      o.frustumCulled = false;
      const m = o.name.startsWith('human') ? skinMaterial(o.material, detail) : chromeMaterial();
      // an opaque and a see-through twin sharing uniforms: fading in/out swaps between them instead of recompiling a shader
      const t = m.clone(); t.transparent = true; t.onBeforeCompile = m.onBeforeCompile; t.userData = m.userData;
      o.userData.mats = [m, t]; o.material = m;
      if (o.name.startsWith('human')) this.human = o; else this.robot = o;
    });
    if (!this.ha || !this.ra || !this.human || !this.robot) throw new Error('hands3d: unexpected model');
    this.sq = this.human.morphTargetDictionary ? this.human.morphTargetDictionary.squeeze : undefined;
    this.mixer = new THREE.AnimationMixer(this.root);
    this.acts = gltf.animations.map(c => { const a = this.mixer.clipAction(c); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.play(); a.paused = true; return a; });
    this.dur = Math.max(...gltf.animations.map(c => c.duration));
    this.fingers = [];
    this.root.traverse(o => { if (o.isBone && /_0[23](_\d+)?$/.test(o.name) && /robot/.test(this.rigOf(o))) this.fingers.push(o); });
    this.bind();
    // compile both twins now so neither the swap to 3D nor a fade ever stalls on a shader compile
    // (compileAsync lets browsers with KHR_parallel_shader_compile build them off the main thread)
    const compile = () => this.r.compileAsync ? this.r.compileAsync(this.scene, this.cam) : Promise.resolve(this.r.compile(this.scene, this.cam));
    for (const o of [this.human, this.robot]) { o.material = o.userData.mats[1]; }
    await compile();
    for (const o of [this.human, this.robot]) { o.material = o.userData.mats[0]; }
    await compile();
  }

  rigOf(o) { while (o && !/_rig/.test(o.name)) o = o.parent; return o ? o.name : ''; }

  // pins: two invisible points on each shake SVG (the web and 100 svg units to its right) in both layouts
  bind() {
    const NS = 'http://www.w3.org/2000/svg';
    this.sets = [...this.stage.querySelectorAll('[data-layout]')].map(L => {
      const get = k => L.querySelector('[data-a="' + k + '"]');
      const pin = el => {
        const svg = el && el.querySelector('svg'); if (!svg) return null;
        return [0, 100].map(dx => {
          const c = document.createElementNS(NS, 'circle');
          c.setAttribute('cx', WEB[0] + dx); c.setAttribute('cy', WEB[1]); c.setAttribute('r', '0.5'); c.setAttribute('fill', 'none');
          c.setAttribute('data-hs3d-pin', ''); svg.appendChild(c); return c;
        });
      };
      const hSH = get('hSH'), hSR = get('hSR'), duo = get('duo');
      return { L, hSH, hSR, duo, pinH: pin(hSH), pinR: pin(hSR), red: hSH && hSH.querySelector('[data-a="hSH-red"]') };
    }).filter(s => s.hSH && s.hSR && s.pinH && s.pinR && s.duo);
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

  place(anchor, pins, rect, piv) {
    const a = pins[0].getBoundingClientRect(), b = pins[1].getBoundingClientRect();
    const x0 = a.left + a.width / 2 - rect.left, y0 = a.top + a.height / 2 - rect.top;
    const dx = b.left + b.width / 2 - a.left - a.width / 2, dy = b.top + b.height / 2 - a.top - a.height / 2;
    const k = Math.hypot(dx, dy) / 100;
    anchor.position.set(piv[0] + (x0 - piv[0]) * ZOOM, -(piv[1] + (y0 - piv[1]) * ZOOM), 0).applyQuaternion(TILT);
    anchor.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.atan2(dy, dx));
    anchor.scale.setScalar(k * S * ZOOM);
    return k * S * ZOOM;
  }

  tick() {
    const eng = window.__sw;
    const set = this.sets.find(s => s.hSH.offsetParent !== null);
    if (!eng || !set) return this.hide();
    const oh = this.alpha(set.hSH), or = this.alpha(set.hSR);
    if (oh < 0.004 && or < 0.004) return this.hide();
    const host = set.duo.parentElement;
    if (this.canvas.parentElement !== host || this.canvas.previousElementSibling !== set.duo) set.duo.after(this.canvas);
    // size from the layout itself: on touch screens the parallax layer it sits in can report zero height
    // and stretch it over the whole screen (wide screens letterbox the layout), so the arms always run to the screen edge
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
    // zoom centre: the clasp point the engine pumps the pair around (frames5 hs.pivot, layout px -> canvas px)
    const pv = eng.F.hs(eng.L).pivot, piv = [hr.left + pv[0] * ls - rect.left, hr.top + pv[1] * ls - rect.top];
    const pxm = this.place(this.ha, set.pinH, rect, piv);
    this.place(this.ra, set.pinR, rect, piv);
    // pumps: the engine bobs the pair (duo); let the hands also roll a touch in depth with it
    const py = parseFloat(gsap.getProperty(set.duo, 'y')) || 0, pump = py / 22;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(TILT);
    this.ha.rotateOnWorldAxis(right, pump * 0.08); this.ra.rotateOnWorldAxis(right, pump * 0.08);

    const c = clamp(eng.cl || 0);
    const t = now();
    // release flush: once fully clasped, the first opening starts a pink flush that fades over ~3 s
    const F = this.flush;
    if (c >= 0.98) { F.full = true; F.t0 = -1; }
    if (F.full && F.t0 < 0 && c < F.prev - 1e-4) F.t0 = t;
    if (c <= 0.001 && F.t0 < 0) F.full = false;
    F.prev = c;
    const ft = F.t0 < 0 ? 0 : (t - F.t0), flush = F.t0 < 0 ? 0 : ss(0, 0.35, ft) * (1 - ss(0.8, 3.4, ft));
    // squeeze follows the robot's grip: builds as its fingers land, overshoots a little, settles; each pump adds a pulse
    const grip = ss(0.5, 0.8, c) * (1 + 0.08 * ss(0.6, 0.8, c) * (1 - ss(0.84, 1, c)));
    const squeeze = clamp(grip * (1 + 0.07 * Math.abs(pump)), 0, 1.15);
    if (this.sq !== undefined) this.human.morphTargetInfluences[this.sq] = squeeze;
    const red = set.red && set.red.style.visibility !== 'hidden' ? clamp(parseFloat(gsap.getProperty(set.red, 'opacity'))) : 0;
    const hu = this.human.material.userData.u, ru = this.robot.material.userData.u;
    hu.uSqueeze.value = squeeze; hu.uFold.value = squeeze; hu.uFlush.value = flush; hu.uKnuck.value = ss(0.15, 0.9, c); hu.uRed.value = red;
    ru.uGlow.value = 0.75 + 0.9 * grip + 0.7 * Math.abs(pump) * grip; ru.uWarm.value = grip;

    for (const a of this.acts) a.time = Math.min(c * this.dur, this.dur - 1e-4);
    this.mixer.update(0);
    // servo micro-motion: tiny jitter on the robot's finger joints, strongest as the grip locks and on each pump, then settling
    const lock = ss(0.82, 0.95, c) * (1 - ss(0.95, 1, c)) + Math.abs(pump) * grip * 0.6 + (c > 0.99 ? 0.12 : 0);
    if (lock > 0.001) {
      this.fingers.forEach((b, i) => {
        const n = Math.sin(t * 61 + i * 1.7) * Math.sin(t * 23 + i * 2.9);
        b.rotateX(n * 0.012 * lock);
      });
    }
    this.mood(red);
    this.light(pxm);
    for (const [mesh, o] of [[this.human, oh], [this.robot, or]]) {
      mesh.material = mesh.userData.mats[o < 0.999 ? 1 : 0];
      mesh.material.opacity = o;
    }
    this.human.visible = oh > 0.004; this.robot.visible = or > 0.004;
    this.r.render(this.scene, this.cam);
  }

  // lights follow the mood: red alarm before the shake, cool future light after it
  mood(red) {
    const A = { key: 0xffd0c2, rim: 0xff3b3b, sky: 0xff9a8a, gnd: 0x3a0508 }, B = { key: 0xf3f6ff, rim: 0x39e6ff, sky: 0xa8c8ff, gnd: 0x0a1a4a };
    const mix = (a, b) => new THREE.Color(b).lerp(new THREE.Color(a), red);
    this.key.color.copy(mix(A.key, B.key)); this.rim.color.copy(mix(A.rim, B.rim));
    this.hemi.color.copy(mix(A.sky, B.sky)); this.hemi.groundColor.copy(mix(A.gnd, B.gnd));
    this.robot.material.userData.u.uGlowCol.value.set(0x3aa8ff).lerp(new THREE.Color(0xff5a6a), red * 0.35);
    this.scene.environment = this.envs[red > 0.5 ? 1 : 0];
  }

  light(pxm) {
    const c = this.ha.position, R = 0.3 * pxm;
    this.key.target.position.copy(c); this.rim.target.position.copy(c);
    this.key.position.copy(c).add(new THREE.Vector3(-0.45, 0.75, 0.55).normalize().multiplyScalar(2 * R));
    this.rim.position.copy(c).add(new THREE.Vector3(0.7, 0.25, -0.65).normalize().multiplyScalar(2 * R));
    const sc = this.key.shadow.camera;
    Object.assign(sc, { left: -R, right: R, top: R, bottom: -R, near: 0.1 * R, far: 4 * R }); sc.updateProjectionMatrix();
    this.key.shadow.normalBias = 0.0025 * pxm;
  }

  hide() {
    if (!this.shown) return;
    this.shown = false; this.canvas.style.display = 'none';
  }
}

async function start() {
  if (/[?&]no3d\b/.test(location.search)) return;
  const stage = document.querySelector('[data-stage]');
  if (!stage || stage.__hs3d) return;
  let h;
  try {
    h = new Hands3D(stage);
    await h.load('assets/hands/handshake.glb', 'assets/hands/skin_detail_n.jpg');
  } catch (e) {
    console.warn('hands3d: falling back to the SVG hands', e);
    if (window.SW3D) window.SW3D.fail('hands', e);
    if (h) try { h.r.dispose(); } catch (_) {}
    return;
  }
  stage.__hs3d = h;
  h.debug = on => { h.human.material.userData.u.uDebug.value = on ? 1 : 0; };
  h.tick = h.tick.bind(h);
  gsap.ticker.add(h.tick);
  stage.setAttribute('data-hs3d', '');
  if (window.SW3D) window.SW3D.ok('hands');
}

// wait for the engine (it creates window.__sw), then load in idle time so the first paint is not held up;
// behind the loading glass there is no first paint to protect, so start at once (the glass waits for every hand)
(function wait(t0) {
  if (window.__sw && window.gsap) {
    const go = () => start();
    if (window.SWGate && !window.SWGate.done) go();
    else if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 300);
  } else if (performance.now() - t0 < 20000) setTimeout(() => wait(t0), 100);
})(performance.now());

// shared with the reach hand (site/reach3d.js)
export { skinMaterial, studio, TILT };
