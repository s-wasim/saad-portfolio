// v3b frame 4, "falling with the glass": a WebGL (three.js) layer under the DOM world.
// Store falls first; then stat shards and random debris rise past us (we fall faster). Thick slabs, natural fracture
// outlines, hairline cracks / impact stars / edge flakes that refract and glint, refraction scaled by size.
(function () {
  const D0 = 1000, PS = 0.19, MAXP = 40;
  const PH_K = 0.8;   // phone: the frame-4 hand's scale (desktop 1.6), palm about a quarter of the screen width
  const clamp = (v, a, b) => Math.max(a == null ? 0 : a, Math.min(b == null ? 1 : b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rng = seed => () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const STATS = [
    { k: '17%', line: 'of small businesses still have no website.', body: "When someone searches for what you sell, the first click goes to whoever shows up. Without a site, you aren't even in the running.", src: 'CLUTCH, 2025' },
    { k: '47%', line: "of customers won't use a business with fewer than 20 reviews.", body: 'Reviews are the new word of mouth. A quiet profile reads as a risky one, so people pick the shop next door with more stars.', src: 'BRIGHTLOCAL, 2026' },
    { k: '7×', line: 'more likely to turn a web inquiry into a real conversation when you reply within the hour.', body: 'Speed wins the job. The question that waits until tomorrow usually gets answered by someone else tonight.', src: 'HARVARD BUSINESS REVIEW, 2011' },
    { k: '76%', line: 'of small businesses already use AI; only 14% have built it into how they work.', body: 'Most are trying it. Very few have it answering, booking and following up for them. That gap is where you get ahead.', src: 'GOLDMAN SACHS 10,000 SMALL BUSINESSES, 2026' },
    { k: '$17.5K', line: 'what small businesses with unpaid invoices are owed, on average.', body: "That's money already earned, sitting in someone else's account. Chasing it by hand takes hours nobody has, so it slips.", src: 'QUICKBOOKS, 2025' }
  ];

  const VS = 'varying vec3 vLocal; varying vec3 vObjN; varying vec3 vN; varying vec3 vView;\n' +
    'void main(){ vLocal = position; vObjN = normal; vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }';
  const EDGE = String.raw`
uniform vec2 uPoly[40]; uniform int uN;
float sq(float v){ return v * v; }
float edgeDist(vec2 p, out vec2 nrm){
  float best = 1e9; nrm = vec2(0.0, 1.0);
  for (int i = 0; i < 40; i++) {
    if (i >= uN) break;
    int j = i + 1; if (j >= uN) j = 0;
    vec2 a = uPoly[i]; vec2 ba = uPoly[j] - a; vec2 pa = p - a;
    float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float dd = length(pa - ba * t);
    if (dd < best) { best = dd; nrm = normalize(vec2(ba.y, -ba.x)); }
  }
  return best;
}
vec3 rainbow(float h){ return 0.5 + 0.5 * cos(6.2831853 * (h + vec3(0.0, 0.33, 0.67))); }
`;
  const FS = EDGE + `
uniform sampler2D tScene, tCrack; uniform vec2 uRes; uniform float uCk;
uniform float uThick, uMag, uBend, uBand, uSweep, uSeed; uniform vec2 uCenter, uHalf;
varying vec3 vLocal; varying vec3 vObjN; varying vec3 vN; varying vec3 vView;
vec3 samp(vec2 uv, vec2 off, float k){
  return vec3(texture2D(tScene, uv + off).r, texture2D(tScene, uv + off * k).g, texture2D(tScene, uv + off * k * k).b);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 asp = vec2(uRes.y / uRes.x, 1.0);
  vec3 V = normalize(-vView); vec3 N = normalize(vN);
  float side = 1.0 - abs(vObjN.z);
  vec2 en; float d = edgeDist(vLocal.xy, en);
  float e = 1.0 - clamp(d / uBand, 0.0, 1.0);
  float bend = e * e;
  vec2 cuv = clamp(vLocal.xy / (uHalf * 2.0) + 0.5, 0.0, 1.0);
  vec3 ck = texture2D(tCrack, cuv).rgb * uCk;
  float ang = ck.b * 3.14159265;
  vec2 cd = vec2(cos(ang), -sin(ang)), cn = vec2(-cd.y, cd.x);
  vec2 m = uCenter + (uv - uCenter) / uMag;
  vec2 off = (-en * bend * uBend + N.xy * 0.02 + cn * ck.g * 0.014) * asp;
  vec3 front = samp(m, off, 1.18 + bend * 0.6 + ck.g * 0.5);
  front = front * 1.07 + vec3(0.03, 0.022, 0.022);
  front = mix(front, front * vec3(0.7, 1.0, 0.84) + vec3(0.0, 0.035, 0.022), bend * 0.6);
  front += vec3(0.86, 1.0, 0.93) * (1.0 - smoothstep(0.0, 1.8, d)) * 0.6;
  front += vec3(0.7, 1.0, 0.86) * exp(-sq((d - uThick * 0.9) / (uThick * 0.14 + 0.6))) * 0.2;
  front += vec3(0.0, 0.05, 0.03) * (1.0 - smoothstep(0.0, uThick * 0.9, d));
  float sw = dot(vLocal.xy / uHalf, normalize(vec2(0.5, 1.0)));
  float ph = fract(sw * 0.22 - uSweep - uSeed) - 0.5;
  front += vec3(1.0, 0.96, 0.96) * (exp(-sq(ph / 0.035)) * 0.22 + exp(-sq(ph / 0.12)) * 0.06);
  front += pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.3;
  float tw = dot(cn, N.xy) * 3.2 + uSweep * 2.4 + cuv.x * 1.3 + cuv.y * 0.7 + uSeed * 7.0;
  float glint = pow(0.5 + 0.5 * sin(tw * 6.2831853), 5.0);
  front = front * (1.0 - ck.r * 0.3) + ck.r * (vec3(0.42, 0.46, 0.45) + rainbow(fract(tw * 0.6)) * glint * 1.5) + ck.g * vec3(0.05, 0.07, 0.06);
  vec3 sideC = texture2D(tScene, uv + N.xy * 0.07 * asp).rgb;
  float lam = max(dot(N, normalize(vec3(-0.3, 0.85, 0.45))), 0.0);
  sideC = mix(sideC * vec3(0.45, 0.95, 0.7), vec3(0.14, 0.45, 0.33), 0.5) * (0.5 + 1.05 * lam);
  sideC += vec3(0.75, 1.0, 0.88) * smoothstep(uThick * 0.2, uThick * 0.55, vLocal.z) * 0.45;
  sideC *= 0.75 + 0.25 * smoothstep(-uThick * 0.55, -uThick * 0.1, vLocal.z);
  gl_FragColor = vec4(mix(front, sideC, smoothstep(0.25, 0.75, side)), 1.0);
}`;
  // a shard right at the lens: out of focus, soft edged, smeared refraction
  const FSL = EDGE + `
uniform sampler2D tScene; uniform vec2 uRes, uCenter; uniform float uSoft, uBlur, uSweep, uAlpha;
varying vec3 vLocal; varying vec3 vObjN; varying vec3 vN; varying vec3 vView;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 asp = vec2(uRes.y / uRes.x, 1.0);
  vec2 en; float d = edgeDist(vLocal.xy, en);
  float a = smoothstep(0.0, uSoft, d);
  vec2 m = uCenter + (uv - uCenter) / 1.22 - en * (1.0 - a) * 0.06 * asp;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    vec2 o = vec2(cos(fi * 2.39996), sin(fi * 2.39996)) * uBlur * sqrt((fi + 0.5) / 12.0) * asp;
    col += vec3(texture2D(tScene, m + o).r, texture2D(tScene, m + o * 1.06).g, texture2D(tScene, m + o * 1.12).b);
  }
  col = col / 12.0 * 1.12 + vec3(0.07, 0.06, 0.06);
  col += rainbow(fract(d * 0.004 + uSweep)) * a * (1.0 - a) * 0.5;
  gl_FragColor = vec4(col, a * uAlpha);
}`;
  const VQ = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const FCOPY = 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }';
  const FBG = `
uniform vec2 uRes, uSize, uPar; uniform float uT, uS;
float h1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float sq(float v){ return v * v; }
vec3 grad(float d){
  vec3 c0 = vec3(0.702, 0.071, 0.122), c1 = vec3(0.478, 0.035, 0.078), c2 = vec3(0.227, 0.016, 0.039), c3 = vec3(0.165, 0.012, 0.027);
  if (d < 0.38) return mix(c0, c1, d / 0.38);
  if (d < 0.72) return mix(c1, c2, (d - 0.38) / 0.34);
  return mix(c2, c3, clamp((d - 0.72) / 0.28, 0.0, 1.0));
}
void main(){
  vec2 px = gl_FragCoord.xy / uRes * uSize;
  vec2 c = vec2(0.5, 0.44) * uSize + uPar * 0.5;
  vec2 rad = vec2(max(c.x, uSize.x - c.x), max(c.y, uSize.y - c.y)) * 1.4142;
  vec3 col = grad(length((px - c) / rad));
  float x = px.x - uPar.x, y = px.y - uPar.y, acc = 0.0, ln = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float bx = (0.03 + fi * 0.118 + (h1(fi + 3.0) - 0.5) * 0.05) * uSize.x;
    float w = (18.0 + h1(fi + 7.0) * 70.0) * uS;
    float sp = (420.0 + h1(fi + 11.0) * 560.0) * uS;
    float L = (380.0 + h1(fi + 5.0) * 760.0) * uS;
    float ph = fract((y - uT * sp) / L + h1(fi + 1.0));
    acc += exp(-sq((x - bx) / w)) * smoothstep(0.0, 0.4, ph) * (1.0 - smoothstep(0.6, 1.0, ph)) * (0.1 + h1(fi + 9.0) * 0.2);
  }
  for (int i = 0; i < 11; i++) {
    float fi = float(i) + 20.0;
    float bx = h1(fi) * uSize.x;
    float sp = (1500.0 + h1(fi + 2.0) * 1600.0) * uS;
    float per = (1000.0 + h1(fi + 4.0) * 1500.0) * uS;
    float len = 0.2 + h1(fi + 6.0) * 0.25;
    float ph = fract((y - uT * sp) / per + h1(fi + 8.0));
    float wd = 0.8 + h1(fi + 10.0) * 1.1;
    ln += step(ph, len) * pow(ph / len, 1.8) * (1.0 - smoothstep(0.0, wd * 1.6, abs(x - bx))) * (0.3 + h1(fi + 12.0) * 0.45);
  }
  col += vec3(1.0, 0.7, 0.7) * acc + vec3(1.0, 0.9, 0.9) * ln;
  gl_FragColor = vec4(col, 1.0);
}`;


  // natural fracture outline in a [-1,1] box (y up, CCW): long curved breaks, ripples, chipped corners
  function segX(a, b, c, d) {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
  }
  function inside(P, x, y) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[i], b = P[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function outline(r, asp, kind) {
    const text = kind === 'text', sliver = kind === 'sliver';
    for (let tries = 0; tries < 60; tries++) {
      const n = text ? 5 + (r() < 0.5 ? 1 : 0) : sliver ? 3 + (r() < 0.4 ? 1 : 0) : 4 + Math.floor(r() * 3);
      const ex = text ? 3.4 + r() * 1.6 : sliver ? 1.1 + r() * 0.6 : 1.5 + r() * 1.8;
      const a0 = r() * 6.2832, base = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + (i + (r() - 0.5) * (text ? 0.45 : 0.8)) / n * 6.2832, c = Math.cos(a), s = Math.sin(a);
        const rr = Math.pow(Math.pow(Math.abs(c), ex) + Math.pow(Math.abs(s), ex), -1 / ex) * (text ? 1.05 + r() * 0.1 : 0.62 + r() * 0.5);
        base.push([c * rr * asp, s * rr]);
      }
      const pts = [], corner = [];
      for (let i = 0; i < n; i++) {
        const A = base[i], B = base[(i + 1) % n], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = dy / L, ny = -dx / L;
        corner.push(pts.length); pts.push(A);
        const t = r();
        if (t < 0.5) {
          const b = (text ? -0.02 + r() * 0.13 : (r() - 0.45) * 0.32) * L, k = text ? 6 : 7, sk = (r() - 0.5) * 0.8;
          for (let j = 1; j < k; j++) { const u = j / k, w = 4 * u * (1 - u) * (1 + sk * (u - 0.5)); pts.push([A[0] + dx * u + nx * b * w, A[1] + dy * u + ny * b * w]); }
        } else if (t < 0.74) {
          const k = 3 + Math.floor(r() * 2);
          for (let j = 1; j < k; j++) { const u = (j + (r() - 0.5) * 0.5) / k, o = (r() - 0.5) * 0.06 * L * (text ? 0.5 : 1); pts.push([A[0] + dx * u + nx * o, A[1] + dy * u + ny * o]); }
        } else {
          const u = 0.3 + r() * 0.4, o = (r() - 0.5) * 0.025 * L; pts.push([A[0] + dx * u + nx * o, A[1] + dy * u + ny * o]);
        }
      }
      // chipped corners: a small bite out of some corners
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      let out = pts.slice();
      const chipP = text ? 0.3 : sliver ? 0.2 : 0.42;
      for (let ci = corner.length - 1; ci >= 0; ci--) {
        if (r() > chipP) continue;
        const k = corner[ci], V = out[k], Pp = out[(k - 1 + out.length) % out.length], Pn = out[(k + 1) % out.length];
        const lp = Math.hypot(Pp[0] - V[0], Pp[1] - V[1]), lnx = Math.hypot(Pn[0] - V[0], Pn[1] - V[1]);
        const cl = (0.06 + r() * 0.1) * (text ? 0.7 : 1), c1 = Math.min(cl, lp * 0.7), c2 = Math.min(cl * (0.6 + r() * 0.8), lnx * 0.7);
        const p1 = [V[0] + (Pp[0] - V[0]) / lp * c1, V[1] + (Pp[1] - V[1]) / lp * c1], p2 = [V[0] + (Pn[0] - V[0]) / lnx * c2, V[1] + (Pn[1] - V[1]) / lnx * c2];
        const ix = cx - V[0], iy = cy - V[1], il = Math.hypot(ix, iy) || 1, dep = (c1 + c2) * (0.18 + r() * 0.2);
        const pm = [(p1[0] + p2[0]) / 2 + ix / il * dep, (p1[1] + p2[1]) / 2 + iy / il * dep];
        out.splice(k, 1, p1, pm, p2);
      }
      if (out.length > MAXP) continue;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      out.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
      out = out.map(p => [(p[0] - x0) / (x1 - x0) * 2 - 1, (p[1] - y0) / (y1 - y0) * 2 - 1]);
      let area = 0; for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; area += a[0] * b[1] - b[0] * a[1]; }
      if (area < 0) out.reverse();
      let bad = false;
      for (let i = 0; i < out.length && !bad; i++) for (let j = i + 2; j < out.length; j++) {
        if (i === 0 && j === out.length - 1) continue;
        if (segX(out[i], out[(i + 1) % out.length], out[j], out[(j + 1) % out.length])) { bad = true; break; }
      }
      if (bad) continue;
      if (text && ![[-0.82, -0.68], [0.82, -0.68], [0.82, 0.68], [-0.82, 0.68], [0, 0.7], [0, -0.7], [0.84, 0], [-0.84, 0]].every(q => inside(out, q[0], q[1]))) continue;
      return out;
    }
    return [[-1, -0.3], [-0.9, 0.86], [0.2, 1], [0.96, 0.76], [1, -0.5], [0.64, -1], [-0.56, -0.96]];
  }

  // crack map: R = hairline, G = refraction halo, B = crack direction (0..pi)
  function crackTex(r, poly, W, H, o) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const P = poly.map(p => [(p[0] * 0.5 + 0.5) * W, (0.5 - p[1] * 0.5) * H]);
    c.save(); c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.clip();
    c.globalCompositeOperation = 'lighten'; c.lineCap = 'round'; c.lineJoin = 'round';
    const S = Math.min(W, H), px = o.px, cen = [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
    const st = (a, b, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
    const seg = (a, b, k) => {
      let q = Math.atan2(b[1] - a[1], b[0] - a[0]) % Math.PI; if (q < 0) q += Math.PI;
      st(a, b, 'rgb(0,0,' + Math.round(q / Math.PI * 255) + ')', 9 * px);
      st(a, b, 'rgb(0,' + Math.round(60 * k) + ',0)', 9 * px);
      st(a, b, 'rgb(0,' + Math.round(140 * k) + ',0)', 4.5 * px);
      st(a, b, 'rgb(' + Math.round(255 * k) + ',' + Math.round(210 * k) + ',0)', 1.25 * px);
    };
    const walk = (p0, ang, len, k, dep, out) => {
      let p = p0, a = ang, d = 0; if (out) out.push(p);
      while (d < len) {
        const sl = S * (0.022 + r() * 0.03); a += (r() - 0.5) * 0.55;
        const q = [p[0] + Math.cos(a) * sl, p[1] + Math.sin(a) * sl];
        seg(p, q, k * (0.3 + 0.7 * (1 - d / len)));
        if (out) out.push(q);
        if (dep < 2 && r() < 0.17) walk(q, a + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.65), (len - d) * (0.3 + r() * 0.4), k * 0.8, dep + 1, null);
        p = q; d += sl;
      }
    };
    const edgePt = () => { const i = Math.floor(r() * P.length), a = P[i], b = P[(i + 1) % P.length], t = 0.15 + r() * 0.7; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, b[0] - a[0], b[1] - a[1]]; };
    for (let i = 0; i < o.hair; i++) {
      const e = edgePt(), a = Math.atan2(cen[1] - e[1], cen[0] - e[0]) + (r() - 0.5) * 1.3;
      walk([e[0], e[1]], a, S * (0.22 + r() * 0.5), 0.85 + r() * 0.15, 0, null);
    }
    if (o.star) {
      const C = o.star.map((v, i) => i ? (0.5 - v * 0.5) * H : (v * 0.5 + 0.5) * W), n = 7 + Math.floor(r() * 5), rays = [], a0 = r() * 6.28;
      for (let i = 0; i < n; i++) { const rp = []; walk(C, a0 + (i + (r() - 0.5) * 0.5) / n * 6.2832, S * (0.16 + r() * 0.32), 1, 1, rp); rays.push(rp); }
      [0.3, 0.62].forEach(f => rays.forEach((rp, i) => {
        if (r() > 0.72) return; const q = rays[(i + 1) % n];
        const a = rp[Math.min(rp.length - 1, Math.max(1, Math.round(rp.length * f)))], b = q[Math.min(q.length - 1, Math.max(1, Math.round(q.length * f)))];
        const m = [(a[0] + b[0]) / 2 + (r() - 0.5) * S * 0.03, (a[1] + b[1]) / 2 + (r() - 0.5) * S * 0.03];
        seg(a, m, 0.75); seg(m, b, 0.75);
      }));
      for (let i = 0; i < 5; i++) {
        c.fillStyle = 'rgb(' + (140 + Math.round(r() * 80)) + ',' + (200 + Math.round(r() * 55)) + ',' + Math.round(r() * 255) + ')';
        c.beginPath(); const rr = S * (0.008 + r() * 0.018), aa = r() * 6.28;
        for (let k = 0; k < 3; k++) { const q = aa + k * 2.1 + r() * 0.5; c.lineTo(C[0] + Math.cos(q) * rr + (r() - 0.5) * S * 0.02, C[1] + Math.sin(q) * rr + (r() - 0.5) * S * 0.02); }
        c.fill();
      }
    }
    for (let i = 0; i < o.flakes; i++) {
      const e = edgePt(), L = Math.hypot(e[2], e[3]) || 1, ux = e[2] / L, uy = e[3] / L;
      const ix = -uy, iy = ux, sgn = (cen[0] - e[0]) * ix + (cen[1] - e[1]) * iy > 0 ? 1 : -1;
      const ra = S * (0.035 + r() * 0.05), rb = S * (0.018 + r() * 0.03), rot = Math.atan2(uy, ux);
      let q = rot % Math.PI; if (q < 0) q += Math.PI;
      const bcol = Math.round(q / Math.PI * 255);
      c.save(); c.translate(e[0], e[1]); c.rotate(rot); c.scale(1, sgn);
      c.fillStyle = 'rgb(0,' + (90 + Math.round(r() * 60)) + ',' + bcol + ')';
      c.beginPath(); c.ellipse(0, 0, ra, rb, 0, 0, Math.PI); c.fill();
      for (let k = 1; k <= 3; k++) { c.strokeStyle = 'rgb(' + Math.round(150 / k) + ',' + Math.round(120 / k) + ',' + bcol + ')'; c.lineWidth = 1.1 * px; c.beginPath(); c.ellipse(0, 0, ra * k / 3, rb * k / 3, 0, 0, Math.PI); c.stroke(); }
      c.restore();
    }
    c.restore();
    return cv;
  }
  function wrap(ctx, text, maxW) {
    const out = []; let cur = '';
    text.split(' ').forEach(w => { const t = cur ? cur + ' ' + w : w; if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = w; } else cur = t; });
    if (cur) out.push(cur); return out;
  }
  // stat copy printed on the shard's front face. w, h in screen px; k = canvas px per screen px
  function drawStat(cv, S, w, h, k, tall) {
    cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, w, h);
    c.shadowColor = 'rgba(50,0,6,.55)'; c.shadowBlur = Math.max(6, w * 0.012);
    const F = (wt, sz, fam) => wt + ' ' + sz.toFixed(1) + 'px ' + fam;
    const HG = '"Hanken Grotesk", sans-serif', MONO = '"IBM Plex Mono", monospace', SER = 'Cormorant, serif';
    const sp = sz => { try { c.letterSpacing = (sz * 0.12).toFixed(2) + 'px'; } catch (_) {} };
    const nosp = () => { try { c.letterSpacing = '0px'; } catch (_) {} };
    let sc = 1, L1, L2, L3, f0, f1, f2, f3, cw, Ht;
    const x0 = 0.1 * w, colX = tall ? x0 : 0.43 * w;
    cw = tall ? 0.8 * w : 0.9 * w - colX;
    for (let it = 0; it < 4; it++) {
      f0 = (tall ? 0.17 : 0.128) * w * sc; f1 = (tall ? 0.05 : 0.0235) * w * sc; f2 = (tall ? 0.037 : 0.0172) * w * sc; f3 = (tall ? 0.026 : 0.0112) * w * sc;
      c.font = F(600, f1, HG); L1 = wrap(c, S.line, cw);
      c.font = F(400, f2, HG); L2 = wrap(c, S.body, cw);
      sp(f3); c.font = F(500, f3, MONO); L3 = wrap(c, S.src, cw); nosp();
      Ht = L1.length * f1 * 1.24 + f2 * 0.7 + L2.length * f2 * 1.45 + f3 * 1.1 + L3.length * f3 * 1.35 + (tall ? f0 * 0.92 + f1 * 0.5 : 0);
      const room = (tall ? 0.72 : 0.66) * h;
      if (Ht <= room) break; sc *= room / Ht * 0.98;
    }
    let y = h / 2 - Ht / 2;
    c.fillStyle = '#ffffff'; c.textBaseline = 'alphabetic';
    c.font = F(500, f0, SER);
    const sw = c.measureText(S.k).width, maxS = tall ? cw : colX - x0 - 0.035 * w;
    if (sw > maxS) { f0 *= maxS / sw; c.font = F(500, f0, SER); }
    if (tall) { c.fillText(S.k, x0, y + f0 * 0.78); y += f0 * 0.92 + f1 * 0.5; }
    else c.fillText(S.k, x0, h / 2 + f0 * 0.3);
    c.font = F(600, f1, HG); L1.forEach(l => { y += f1 * 1.24; c.fillText(l, colX, y - f1 * 0.24); });
    y += f2 * 0.7;
    c.fillStyle = 'rgba(255,236,232,.94)'; c.font = F(400, f2, HG); L2.forEach(l => { y += f2 * 1.45; c.fillText(l, colX, y - f2 * 0.4); });
    y += f3 * 1.1;
    c.fillStyle = '#ffd6d0'; sp(f3); c.font = F(500, f3, MONO); L3.forEach(l => { y += f3 * 1.35; c.fillText(l, colX, y - f3 * 0.3); }); nosp();
  }


  function create(host, eng) {
    const THREE = window.THREE;
    if (!host || !THREE) return null;
    let R;
    try { R = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return null; }
    if (THREE.ColorManagement) THREE.ColorManagement.enabled = false;
    R.outputColorSpace = THREE.LinearSRGBColorSpace; R.autoClear = false;
    const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));
    R.domElement.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
    host.appendChild(R.domElement);

    const qCam = new THREE.Camera(), cam = new THREE.PerspectiveCamera(48, 1, 10, 30000);
    const quad = new THREE.PlaneGeometry(2, 2);
    const mkQuad = mat => { const m = new THREE.Mesh(quad, mat); m.frustumCulled = false; const s = new THREE.Scene(); s.add(m); return s; };
    const bgMat = new THREE.ShaderMaterial({ vertexShader: VQ, fragmentShader: FBG, depthTest: false, depthWrite: false,
      uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uSize: { value: new THREE.Vector2(1, 1) }, uPar: { value: new THREE.Vector2() }, uT: { value: 0 }, uS: { value: 1 } } });
    const cpMat = new THREE.ShaderMaterial({ vertexShader: VQ, fragmentShader: FCOPY, depthTest: false, depthWrite: false, uniforms: { t: { value: null } } });
    const bgScene = mkQuad(bgMat), cpScene = mkQuad(cpMat);
    const handScene = new THREE.Scene(), L = { back: new THREE.Scene(), mid: new THREE.Scene(), front: new THREE.Scene(), lens: new THREE.Scene() };
    const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); black.needsUpdate = true;
    let rtA = null, rtB = null, rtC = null, vw = 1, vh = 1, dbw = 1, dbh = 1, PX = 100, PY = 60, V = 1000, shards = [], fonts = false;
    const tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    let t = 0, uT = 0, lastP = 0, boost = 0, raf = 0, last = performance.now(), alive = true;
    // hooks (site/fall3d.js, the 3D hand): called every frame after the hand sprite is placed; may return { cam: [dx, dy, roll] }
    const hooks = [];

    // hand: the frame-4 vector hand, rasterised once, posed like the old DOM rig (pivot at the index tip)
    const hand = new THREE.Mesh(new THREE.PlaneGeometry(1700, 1900).translate(-120, -465, 0), new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false }));
    hand.visible = false; handScene.add(hand);
    (function () {
      const html = window.SWArt.hand('reach4');
      const m = html.match(/left:([-\d.]+)px;top:([-\d.]+)px;width:([\d.]+)px;height:([\d.]+)px/);
      const i0 = html.indexOf('<svg'), i1 = html.lastIndexOf('</svg>') + 6;
      if (!m || i0 < 0) return;
      const inner = html.slice(i0, i1).replace(/^<svg[^>]*>/, '<svg x="' + m[1] + '" y="' + m[2] + '" width="' + m[3] + '" height="' + m[4] + '" viewBox="0 0 760 520" overflow="visible">');
      const src = '<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="1900" viewBox="-200 -100 1700 1900"><g transform="translate(770 385) rotate(74) scale(1.1) translate(-975 -320)">' + inner + '</g></svg>';
      const img = new Image(), url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = 1700; cv.height = 1900;
        cv.getContext('2d').drawImage(img, 0, 0, 1700, 1900); URL.revokeObjectURL(url);
        const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4;
        hand.material.map = tx; hand.material.needsUpdate = true; hand.visible = true;
      };
      img.src = url;
    })();

    function dispose() {
      shards.forEach(o => {
        o.mesh.geometry.dispose(); o.mesh.material.dispose(); if (o.ckTex) o.ckTex.dispose();
        if (o.text) { o.text.geometry.dispose(); o.text.material.map.dispose(); o.text.material.dispose(); }
        if (o.mesh.parent) o.mesh.parent.remove(o.mesh);
      });
      shards = [];
    }
    function add(o, r) {
      const kz = (D0 - o.z) / D0, w = o.ws * kz, hh = o.ws / o.asp * kz, T = Math.max(3, o.ws * (o.thick || 0.042)) * kz, bev = T * 0.2;
      const poly = outline(r, o.asp, o.kind);
      const pts = poly.map(p => new THREE.Vector2(p[0] * w / 2, p[1] * hh / 2));
      const shape = new THREE.Shape(pts), P = [];
      for (let i = 0; i < MAXP; i++) P.push(pts[Math.min(i, pts.length - 1)].clone());
      const sz = o.ws / (0.65 * vw);
      o.w = o.ws; o.h = o.ws / o.asp; o.kz = kz; o.ext = Math.max(o.w, o.h) * (o.kind === 'text' ? 0.55 : 0.75);
      if (o.lens) {
        const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FSL, transparent: true, depthTest: false, depthWrite: false, uniforms: {
          tScene: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uPoly: { value: P }, uN: { value: pts.length }, uCenter: { value: new THREE.Vector2(0.5, 0.5) },
          uSoft: { value: 0.22 * hh }, uBlur: { value: 0.016 }, uSweep: { value: 0 }, uAlpha: { value: 0.92 } } });
        o.mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
      } else {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 1, steps: 1 });
        geo.translate(0, 0, -T / 2);
        if (o.ck) {
          const W = Math.round(clamp(o.ws * 1.05, 96, 1024)), H = Math.max(32, Math.round(W / o.asp));
          o.ckTex = new THREE.CanvasTexture(crackTex(r, poly, W, H, Object.assign({ px: W / o.ws }, o.ck)));
          o.ckTex.anisotropy = 4;
        }
        const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: {
          tScene: { value: null }, tCrack: { value: o.ckTex || black }, uCk: { value: o.ckTex ? 1 : 0 },
          uRes: { value: new THREE.Vector2(1, 1) }, uPoly: { value: P }, uN: { value: pts.length },
          uThick: { value: T }, uMag: { value: 1 + 0.17 * Math.min(1.3, sz) * Math.min(1.3, sz) }, uBend: { value: 0.008 + 0.04 * Math.min(1.2, sz) },
          uBand: { value: clamp(0.24 * hh, 4, 90) }, uSweep: { value: 0 }, uSeed: { value: r() }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uHalf: { value: new THREE.Vector2(w / 2, hh / 2) } } });
        o.mesh = new THREE.Mesh(geo, mat);
      }
      if (o.kind === 'text') {
        const tg = new THREE.ShapeGeometry(shape), pa = tg.attributes.position, uv = new Float32Array(pa.count * 2);
        for (let i = 0; i < pa.count; i++) { uv[i * 2] = pa.getX(i) / w + 0.5; uv[i * 2 + 1] = pa.getY(i) / hh + 0.5; }
        tg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        o.cv = document.createElement('canvas');
        const tx = new THREE.CanvasTexture(o.cv); tx.anisotropy = 8; tx.minFilter = THREE.LinearMipmapLinearFilter;
        o.text = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }));
        o.text.position.z = T / 2 + bev + 0.6; o.text.renderOrder = 2; o.mesh.add(o.text);
        if (fonts) paint(o);
      }
      o.mesh.visible = false;
      L[o.layer].add(o.mesh);
      shards.push(o);
    }
    function paint(o) {
      if (!o.cv) return;
      const dpr = Math.min(2, R.getPixelRatio()), k = dpr * Math.min(1, 2048 / (o.w * dpr));
      drawStat(o.cv, STATS[o.stat], o.w, o.h, k, o.tall);
      o.text.material.map.needsUpdate = true;
    }
    // y0: screen y (px from centre, + down) at p = PS; it moves up by (p - PS) * V * kd
    function build() {
      dispose();
      const r = rng(7), tall = vw / vh < 0.9, asp = tall ? 1.2 : 3, K = tall ? 1.42 : 1;
      PX = (tall ? 0.1 : 0.16) * vw; PY = (tall ? 0.08 : 0.13) * vh;
      const ws = [0.64, 0.58, 0.65, 0.6, 0.62].map(k => k * vw * K), gap = [0.3, 0.8, 0.36, 0.74], zs = [-120, 150, -40, 110, 10], y0 = [];
      let Y = vh / 2 + ws[0] / asp / 2 + 40;
      for (let i = 0; i < 5; i++) { y0.push(Y); if (i < 4) Y += (ws[i] + ws[i + 1]) / asp / 2 + gap[i] * vh; }
      V = (y0[4] + 0.04 * vh) / (1 - PS);
      const enter = (pe, h, kd) => vh / 2 + h / 2 + 80 + (pe - PS) * V * kd;
      for (let i = 0; i < 5; i++) {
        add({ kind: 'text', layer: 'mid', stat: i, tall, ws: ws[i], asp, z: zs[i], y0: y0[i], kd: 1 + (r() - 0.5) * 0.04,
          sx: (i % 2 ? 1 : -1) * (tall ? 0.02 : 0.09 + r() * 0.05) * vw, rz: (r() - 0.5) * 0.08, ph: r() * 6.28,
          ck: { hair: 3 + Math.floor(r() * 2), flakes: 3 + Math.floor(r() * 3), star: r() < 0.6 ? [(i % 2 ? -1 : 1) * (0.68 + r() * 0.18), (r() - 0.5) * 1.1] : null } }, r);
      }
      for (let i = 0; i < 15; i++) {
        const pe = PS + 0.015 + (i + r() * 0.85) / 15 * (1.02 - PS), back = r() < 0.62, kind = r() < 0.3 ? 'sliver' : 'rand';
        const s = vw * K * (back ? 0.05 + Math.pow(r(), 1.3) * 0.3 : 0.035 + Math.pow(r(), 1.7) * 0.15), a = kind === 'sliver' ? 2.6 + r() * 2.6 : 1 + r() * 1.8, kd = 0.75 + r() * 0.6;
        add({ kind, layer: back ? 'back' : 'front', ws: s, asp: a, z: back ? -1350 + r() * 1080 : 260 + r() * 380, kd, y0: enter(pe, s, kd), sx: (r() - 0.5) * 1.15 * vw,
          tumble: [(r() - 0.5) * 1.8, (r() - 0.5) * 1.8, r() * 6.28, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5, (r() - 0.5) * 0.7, (r() - 0.5) * 5, (r() - 0.5) * 5, (r() - 0.5) * 4],
          thick: 0.042 + r() * 0.03, ck: s > 0.07 * vw ? { hair: 1 + Math.floor(r() * 3), flakes: 1 + Math.floor(r() * 3), star: r() < 0.35 ? [(r() - 0.5) * 0.8, (r() - 0.5) * 0.8] : null } : null }, r);
      }
      for (let i = 0; i < 8; i++) {
        const s = vw * K * (0.008 + r() * 0.016), kd = 0.7 + r() * 0.8, back = r() < 0.5;
        add({ kind: 'rand', layer: back ? 'back' : 'front', ws: s, asp: 1 + r() * 1.5, z: back ? -900 + r() * 700 : 250 + r() * 300, kd, y0: enter(PS + r() * (1 - PS), s, kd), sx: (r() - 0.5) * vw,
          tumble: [r() * 6, r() * 6, r() * 6, (r() - 0.5) * 3, (r() - 0.5) * 3, (r() - 0.5) * 3, (r() - 0.5) * 12, (r() - 0.5) * 12, (r() - 0.5) * 12], thick: 0.12 }, r);
      }
      [[0.45, -1, 0.56], [0.8, 1, 0.7]].forEach(l => {
        const s = l[2] * vw * K, kd = 3;
        add({ kind: 'rand', layer: 'lens', lens: true, ws: s, asp: 1.7, z: 760, kd, y0: enter(l[0], s, kd), sx: l[1] * 0.22 * vw, tumble: [0, 0, r() * 6.28, 0, 0, 0.2, 0, 0, 1.5] }, r);
      });
    }
    function resize() {
      const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
      if (w === vw && h === vh && shards.length) return;
      vw = w; vh = h;
      R.setSize(vw, vh, false);
      const db = R.getDrawingBufferSize(new THREE.Vector2()); dbw = db.x; dbh = db.y;
      const q = touch ? 0.6 : 1, rw = Math.max(2, Math.round(dbw * q)), rh = Math.max(2, Math.round(dbh * q));
      [rtA, rtB, rtC].forEach(x => x && x.dispose());
      rtA = new THREE.WebGLRenderTarget(rw, rh, { samples: touch ? 0 : 4, depthBuffer: true });   // depth + MSAA: the 3D hand is drawn in here
      rtB = new THREE.WebGLRenderTarget(rw, rh, { samples: touch ? 0 : 4, depthBuffer: true });
      rtC = new THREE.WebGLRenderTarget(rw, rh, { samples: touch ? 0 : 4, depthBuffer: true });
      cam.aspect = vw / vh; cam.fov = 2 * Math.atan(vh / 2 / D0) * 180 / Math.PI; cam.updateProjectionMatrix();
      bgMat.uniforms.uRes.value.set(rw, rh); bgMat.uniforms.uSize.value.set(vw, vh); bgMat.uniforms.uS.value = clamp(vw / 1440, 0.45, 1.5);
      build();
    }

    const SRC = { back: () => rtA, mid: () => rtB, front: () => rtC, lens: () => rtC };
    function update(dt) {
      const red = eng.reduced, p = eng.p || 0;
      if (!red) t += dt;
      const vel = Math.abs(p - lastP) / Math.max(dt, 1e-3); lastP = p;
      boost = lerp(boost, Math.min(vel * 8, 3), 0.08);
      if (!red) uT += dt * (1 + boost);
      const a = 1 - Math.pow(1 - 0.06, dt * 60);
      cur.x = lerp(cur.x, red ? 0 : tgt.x, a); cur.y = lerp(cur.y, red ? 0 : tgt.y, a);
      const cx = cur.x * PX, cy = -cur.y * PY;
      cam.position.set(cx, cy, D0); cam.updateMatrixWorld();
      bgMat.uniforms.uT.value = uT; bgMat.uniforms.uPar.value.set(-cx * 0.15, -cy * 0.15);
      // hand: rises in while the store falls, then hangs with us
      const d = eng.dims, s = d ? d.s : vw / 1440;
      const e1 = clamp((p - 0.025) / 0.1), e2 = clamp((p - 0.135) / 0.865), o1 = 1 - (1 - e1) * (1 - e1), s2 = -(Math.cos(Math.PI * e2) - 1) / 2;
      const hdx = lerp(-90, -10, o1) + 20 * s2, hdy = lerp(835, 15, o1) - 30 * s2 + Math.sin(t * 0.45) * 5, hr = lerp(16, 4, o1) - 8 * s2 + Math.sin(t * 0.6) * 1.2;
      const kh = 1.6;
      if (d && eng.L === 'm') {
        // phone: the hand stays low (fingertips at about 0.75 of the screen height, just clear of the pill), rising in from below the bottom edge, so the
        // end of the forearm never shows; positions are layout px from the screen centre (ZK: layout px -> world at the hand's depth)
        const H = d.H, ZK = (D0 + 600) / D0, px = lerp(-30, -12, o1) + 8 * s2, py = lerp(0.82 * H, 0.235 * H, o1) + 0.01 * H * s2 + Math.sin(t * 0.45) * 3;
        hand.position.set(px * s * ZK, -py * s * ZK, -600);
        hand.scale.setScalar(s * PH_K); hand.rotation.z = -hr * Math.PI / 180;
      } else {
        hand.position.set((50 + hdx) * s * kh, -(-65 + hdy) * s * kh, -600);
        hand.scale.setScalar(s * kh); hand.rotation.z = -hr * Math.PI / 180;
      }
      // the camera shake (if a hook asks for one) is set fresh each frame on top of the parallax position, never accumulated
      let shake = null;
      for (const f of hooks) { const r = f({ p, t, dt, boost, s, reduced: red, vw, vh }); if (r && r.cam) shake = r.cam; }
      if (shake) { cam.position.x += shake[0]; cam.position.y += shake[1]; }
      cam.rotation.z = shake ? shake[2] : 0; cam.updateMatrixWorld();
      const sweep = cur.x * 0.35 + cur.y * 0.2 + t * 0.012, dp = p - PS;
      shards.forEach(o => {
        const sx = o.sx, sy = o.y0 - dp * V * o.kd;
        const scrX = sx - cx / o.kz, scrY = sy + cy / o.kz;
        const vis = Math.abs(scrY) < vh / 2 + o.ext + 40 && Math.abs(scrX) < vw / 2 + o.ext + 40;
        o.mesh.visible = vis; if (!vis) return;
        o.mesh.position.set(sx * o.kz, -sy * o.kz, o.z);
        const nx = scrX / (vw / 2), ny = -scrY / (vh / 2);
        if (o.tumble) { const q = o.tumble; o.mesh.rotation.set(q[0] + q[3] * t + q[6] * p, q[1] + q[4] * t + q[7] * p, q[2] + q[5] * t + q[8] * p); }
        else o.mesh.rotation.set(-ny * 0.28 + Math.sin(t * 0.13 + o.ph) * 0.03, nx * 0.16 + Math.cos(t * 0.09 + o.ph) * 0.04, o.rz + Math.sin(t * 0.11 + o.ph) * 0.02);
        const u = o.mesh.material.uniforms, src = SRC[o.layer]();
        u.uCenter.value.set(scrX / vw + 0.5, 0.5 - scrY / vh); u.uSweep.value = sweep; u.tScene.value = src.texture;
        if (o.layer === 'back' || o.layer === 'mid') u.uRes.value.set(src.width, src.height); else u.uRes.value.set(dbw, dbh);
      });
    }
    function pass(target, srcRT, scene) {
      R.setRenderTarget(target); R.clear(); cpMat.uniforms.t.value = srcRT.texture; R.render(cpScene, qCam);
      if (scene) { R.clearDepth(); R.render(scene, cam); }
    }
    function render() {
      R.setRenderTarget(rtA); R.clear(); R.render(bgScene, qCam); R.render(handScene, cam);
      pass(rtB, rtA, L.back); pass(rtC, rtB, L.mid); pass(null, rtC, L.front);
      R.render(L.lens, cam);
    }
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const st = host.style, on = st.visibility !== 'hidden' && st.opacity !== '0' && !document.hidden;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!on) return;
      update(dt); render();
    }

    let gyro = false, base = null;
    const onOri = e => { if (e.gamma == null) return; if (!base) base = [e.beta, e.gamma]; tgt.x = clamp((e.gamma - base[1]) / 18, -1, 1); tgt.y = clamp((e.beta - base[0]) / 18, -1, 1); };
    function askGyro() {
      if (gyro || !touch) return;
      const D = window.DeviceOrientationEvent, go = () => { gyro = true; addEventListener('deviceorientation', onOri); };
      if (!D) return;
      if (typeof D.requestPermission === 'function') D.requestPermission().then(s => { if (s === 'granted') go(); }).catch(() => {});
      else go();
    }
    if (touch && !(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')) askGyro();

    const fl = ['500 100px Cormorant', '600 20px "Hanken Grotesk"', '400 20px "Hanken Grotesk"', '500 12px "IBM Plex Mono"'];
    Promise.all(fl.map(f => document.fonts.load(f))).catch(() => {}).then(() => { fonts = true; shards.forEach(paint); });

    resize();
    raf = requestAnimationFrame(frame);
    return {
      resize,
      pointer(nx, ny) { if (!gyro) { tgt.x = clamp(nx, -1, 1); tgt.y = clamp(ny, -1, 1); } },
      askGyro,
      burst() {},
      ext: { scene: handScene, sprite: hand, cam, renderer: R, on: fn => { hooks.push(fn); } },
      destroy() {
        alive = false; cancelAnimationFrame(raf); removeEventListener('deviceorientation', onOri);
        dispose(); [rtA, rtB, rtC].forEach(x => x && x.dispose()); black.dispose();
        if (hand.material.map) hand.material.map.dispose();
        R.dispose(); R.domElement.remove();
      }
    };
  }

  window.SWFall = { create, STATS, outline, crackTex };
})();
