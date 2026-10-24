// Okładki projektów (projects[].live) - mikroanimacje na żywo (4:5):
//   teraz       - czerń z dużą niebieską plamą z projektu, która organicznie płynie (sam CSS), logo na środku.
//   loom.studio - papier, trzy figury Bauhausu na środku pływające na sprężynach (fizyka z loom.studio:
//                 dryf, odbicia, uspokojenie pod kursorem); na dole pas płynnego gradientu z hero
//                 (WebGL, reaguje na kursor; pod spodem ten sam gradient w CSS); pionowe logo przy lewej
//                 krawędzi (tuszem na papierze, papierem na gradiencie), PL / EN wg języka strony, znak trybu.
//   reh.ab      - nagłówek w jednej linii z ciasnym odstępem, przycięty prawą krawędzią (pisanie,
//                 przygaszenie „impact” / „toget”), wielkie „her” z poświatą przy lewej krawędzi,
//                 zmieniające się słowa w prawym dolnym rogu. Sam CSS, pętla 21 s.
// Źródła: repozytoria loomstudio (components/ui/flow-gl.ts, lib/hero-physics.ts, styles/hero.css)
// i reh.ab (css/style.css, js/main.js).
// main.js ładuje ten moduł leniwie i wstawia grafikę tylko do aktywnego podglądu (karta sfery; teraz - tylko tam,
// w panelu teraz gra dłuższa plansza reel) i otwartego panelu, nad statyczną planszą (cover). Bez JS i przy ograniczonym ruchu zostaje cover - to jej pierwsza klatka
// (generuje ją npm run covers z liveMarkup(p, { static: true })).

import { RP, svgi } from './render.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Zasoby od katalogu głównego strony (strona / i /en/)
const abs = src => esc(new URL(src, import.meta.url).href);

/* ==========================================================================
   teraz - czerń z dużą niebieską plamą z projektu (Figma, assets/teraz/cover-blob.webp: cała plama z rozmyciem)
   i logo na środku. Plama płynie organicznie (dryf, obrót, „oddech”); w PDF i bez ruchu stoi jak w projekcie.
   ========================================================================== */
function terazMarkup(p) {
  return `
          <span class="tz-blob" style="background-image:url('${abs('assets/teraz/cover-blob.webp')}')"></span>
          <img class="tz-logo" src="${abs(p.logo.src)}" width="${p.logo.w}" height="${p.logo.h}" alt="">`;
}

/* ==========================================================================
   loom.studio
   ========================================================================== */

// Gradient hero (preset „hero-ink”, motyw jasny): baza, 4 plamy, tempo „calm” (content/gradients.ts)
const OG_BLOBS = [
  { c: '#0F2A33', x: 20, y: 25, s: 75 },
  { c: '#1B1F5E', x: 78, y: 70, s: 80 },
  { c: '#2D0532', x: 30, y: 88, s: 60 },
  { c: '#3A0A12', x: 88, y: 12, s: 50 },
];
const CALM = { d1: [29, 34, 41, 37], d2: [23, 31, 37, 27], d3: [47, 59, 71, 53] };
// Rampa WebGL (content/flow-palettes.ts → hero.light), od najciemniejszego
const FLOW_RAMP = ['#000000', '#0F2A33', '#1B1F5E', '#2D0532', '#3A0A12'];

// Kwadrat z 16 odłamków: wektor „wybuchu” od środka (BauhausComposition.tsx), w % boku odłamka.
const TILE = 77 / 4;
const ROT = [-12, -6, 6, 12];
const JITTER = [[2, -1], [-3, 2], [1, 3], [-2, -3], [3, 1], [-1, -2], [2, 2], [0, -3], [-3, 0], [1, -1], [3, -2], [-2, 3], [0, 2], [-1, 1], [2, -3], [-3, -1]];
function tiles() {
  return Array.from({ length: 16 }, (_, n) => {
    const i = n % 4, j = Math.floor(n / 4);
    const dx = i - 1.5, dy = j - 1.5, len = Math.hypot(dx, dy), dist = 8 + 6 * len;
    const [jx, jy] = JITTER[n];
    const corner = (i === 0 || i === 3) && (j === 0 || j === 3);
    const pct = v => ((v / TILE) * 100).toFixed(1);
    return `<span class="bh-tile" style="left:${i * 25}%;top:${j * 25}%;--tx:${pct((dx / len) * dist + jx)}%;--ty:${pct((dy / len) * dist + jy)}%;--rot:${ROT[(i + 2 * j) % 4]}deg;--sc:${corner ? 0.86 : 1}"></span>`;
  }).join('');
}

// Znak trybu (koło, lewa połowa wypełniona) jak w nagłówku loom.studio
const MODE = '<svg class="lm-mode" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12 1.75a10.25 10.25 0 0 0 0 20.5z" fill="currentColor"/></svg>';

function loomMarkup(p, { lang = 'pl' } = {}) {
  const blobs = OG_BLOBS.map((b, i) => {
    const k = i % 4;
    return `<span class="og-blob" style="--c:${b.c};--x:${b.x}%;--y:${b.y}%;--s:${b.s};--d1:${CALM.d1[k]}s;--d2:${CALM.d2[k]}s;--d3:${CALM.d3[k]}s;--p:${-(7 * i + 3)}s"></span>`;
  }).join('');
  // Pionowe logo dwa razy: tuszem (przycięte do papieru) i papierem (przycięte do pasa gradientu)
  const word = tone => `<span class="lm-word lm-word--${tone}"><img src="${abs(`assets/deck/loom-logo-${tone}.svg`)}" width="4531" height="700" alt=""></span>`;
  return `
          <div class="lv-flow"><div class="og">${blobs}<span class="og-grain"></span></div></div>
          <span class="lm-lang">${lang === 'en' ? 'EN' : 'PL'}</span>${MODE}
          ${word('ink')}${word('paper')}
          <div class="lv-paper">
            <div class="bauhaus">
              <div class="bh-body bh-body--square" data-body="square"><span class="bh-fx">${tiles()}</span><span class="bh-square"></span></div>
              <div class="bh-body bh-body--circle" data-body="circle"><span class="bh-circle"></span></div>
              <div class="bh-body bh-body--triangle" data-body="triangle"><span class="bh-tri"><svg viewBox="0 0 87 76"><path d="M43.5 0 87 76H0z"/></svg></span></div>
            </div>
          </div>`;
}

/* ---- Fizyka figur (lib/hero-physics.ts): sprężyna do sumy sinusów, kontakty z odbiciem.
   Jednostki: px kompozycji 179 × 138 - renderer mnoży przez skalę ramki. */
const PHYSICS = { dt: 1 / 60, maxFrame: 1 / 30, K: 14, C: 3.2, Kc: 60, restitution: 0.35, amp: 6, maxOffset: 12, maxRot: 5, breath: 0.015, hoverStiffness: 4, calmRate: 1 / 0.3, kick: 26 };
const ROT_AMP = { square: 3, circle: 2, triangle: 4 };
const HOMES = { square: { x: 38.5, y: 38.5 }, circle: { x: 85.5, y: 85.5 }, triangle: { x: 135.5, y: 100 } };
const TAU = Math.PI * 2;
const rnd = (seed, k) => { const s = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
const freq = (seed, k) => 0.13 + 0.18 * rnd(seed, k);
const phase = (seed, k) => TAU * rnd(seed, k + 50);

function createWorld() {
  return {
    bodies: ['square', 'circle', 'triangle'].map((id, i) => ({ id, home: HOMES[id], p: { x: 0, y: 0 }, v: { x: 0, y: 0 }, rot: 0, w: 0, seed: 1 + i * 17, calm: 0 })),
    t: 0, acc: 0, hovered: null,
  };
}
function step(world, dt) {
  const { bodies } = world, t = world.t;
  for (const b of bodies) {
    const target = b.id === world.hovered ? 1 : 0;
    b.calm += Math.sign(target - b.calm) * Math.min(Math.abs(target - b.calm), PHYSICS.calmRate * dt);
    const k = PHYSICS.K * (1 + (PHYSICS.hoverStiffness - 1) * b.calm);
    const amp = PHYSICS.amp * (1 - b.calm), s = b.seed;
    const gx = ((Math.sin(TAU * freq(s, 1) * t + phase(s, 1)) + Math.sin(TAU * freq(s, 2) * t + phase(s, 2))) / 2) * amp;
    const gy = ((Math.sin(TAU * freq(s, 3) * t + phase(s, 3)) + Math.sin(TAU * freq(s, 4) * t + phase(s, 4))) / 2) * amp;
    b.v.x += (k * (gx - b.p.x) - PHYSICS.C * b.v.x) * dt;
    b.v.y += (k * (gy - b.p.y) - PHYSICS.C * b.v.y) * dt;
    const goalRot = ROT_AMP[b.id] * (1 - b.calm) * Math.sin(TAU * freq(s, 5) * t + phase(s, 5));
    b.w += (k * (goalRot - b.rot) - PHYSICS.C * b.w) * dt;
  }
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], c = bodies[j];
      const rest = Math.hypot(a.home.x - c.home.x, a.home.y - c.home.y);
      const dx = a.home.x + a.p.x - (c.home.x + c.p.x), dy = a.home.y + a.p.y - (c.home.y + c.p.y);
      const d = Math.hypot(dx, dy) || 1e-6;
      if (d >= rest - 1) continue;
      const nx = dx / d, ny = dy / d, f = PHYSICS.Kc * (rest - 1 - d) * dt;
      a.v.x += nx * f; a.v.y += ny * f; c.v.x -= nx * f; c.v.y -= ny * f;
      const vn = (a.v.x - c.v.x) * nx + (a.v.y - c.v.y) * ny;
      if (vn < 0) {
        const jn = (-(1 + PHYSICS.restitution) * vn) / 2;
        a.v.x += jn * nx; a.v.y += jn * ny; c.v.x -= jn * nx; c.v.y -= jn * ny;
      }
    }
  }
  for (const b of bodies) {
    b.p.x += b.v.x * dt; b.p.y += b.v.y * dt;
    const len = Math.hypot(b.p.x, b.p.y);
    if (len > PHYSICS.maxOffset) {
      const nx = b.p.x / len, ny = b.p.y / len;
      b.p.x = nx * PHYSICS.maxOffset; b.p.y = ny * PHYSICS.maxOffset;
      const out = b.v.x * nx + b.v.y * ny;
      if (out > 0) { b.v.x -= out * nx; b.v.y -= out * ny; }
    }
    b.rot += b.w * dt;
    if (Math.abs(b.rot) > PHYSICS.maxRot) { b.rot = Math.sign(b.rot) * PHYSICS.maxRot; if (Math.sign(b.w) === Math.sign(b.rot)) b.w = 0; }
  }
  world.t = t + dt;
}
function advance(world, frameDt) {
  world.acc += Math.min(Math.max(frameDt, 0), PHYSICS.maxFrame);
  while (world.acc >= PHYSICS.dt) { step(world, PHYSICS.dt); world.acc -= PHYSICS.dt; }
}
// Kursor na figurze: ona się uspokaja, sąsiedzi dostają lekkie pchnięcie.
function setHovered(world, id) {
  if (world.hovered === id) return;
  world.hovered = id;
  if (!id) return;
  const h = world.bodies.find(b => b.id === id);
  for (const b of world.bodies) {
    if (b === h) continue;
    const dx = b.home.x + b.p.x - (h.home.x + h.p.x), dy = b.home.y + b.p.y - (h.home.y + h.p.y), d = Math.hypot(dx, dy) || 1;
    b.v.x += (dx / d) * PHYSICS.kick; b.v.y += (dy / d) * PHYSICS.kick;
  }
}
const scaleOf = (b, t) => 1 + PHYSICS.breath * (1 - b.calm) * Math.sin(TAU * freq(b.seed, 6) * t + phase(b.seed, 6));

/* ---- Płynny gradient (components/ui/flow-gl.ts): domain warping fBm, rampa 5 kolorów,
   kursor zakrzywia i ciągnie ciecz. Połowa rozdzielczości, ≤ 30 kl./s. */
const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FRAG = `precision mediump float;
uniform vec2 u_res;uniform float u_time;uniform vec3 u_colors[5];
uniform float u_scale;uniform float u_warp;uniform float u_seed;
uniform vec2 u_mouse;uniform vec2 u_vel;uniform float u_hover;uniform float u_reach;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.;float a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);
for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
void main(){
vec2 uv=gl_FragCoord.xy/u_res;
vec2 asp=vec2(u_res.x/u_res.y,1.);
vec2 p=(uv-.5)*asp*u_scale+u_seed;
float t=u_time;
vec2 dm=(uv-u_mouse)*asp;
float fall=u_hover*exp(-dot(dm,dm)/(u_reach*u_reach));
vec2 m=(u_mouse-.5)*asp*u_scale+u_seed;
float ang=fall*1.3;
p=m+mat2(cos(ang),sin(ang),-sin(ang),cos(ang))*(p-m)*(1.-.22*fall);
p-=u_vel*asp*u_scale*fall*14.;
p+=.18*vec2(sin(p.y*1.4+t*.9),cos(p.x*1.2-t*.7));
vec2 q=vec2(fbm(p+vec2(0.,t*.35)),fbm(p+vec2(5.2,1.3)-t*.3));
vec2 r=vec2(fbm(p+u_warp*4.*q+vec2(1.7,9.2)+t*.25),fbm(p+u_warp*4.*q+vec2(8.3,2.8)-t*.2));
float f=fbm(p+u_warp*4.*r);
float x=clamp(f*1.5-.2+.3*length(q)-.15,0.,1.)*4.;
vec3 c=mix(u_colors[0],u_colors[1],smoothstep(0.,1.,x));
c=mix(c,u_colors[2],smoothstep(1.,2.,x));
c=mix(c,u_colors[3],smoothstep(2.,3.,x));
c=mix(c,u_colors[4],smoothstep(3.,4.,x));
c+=(hash(gl_FragCoord.xy+fract(t))-.5)/255.;
gl_FragColor=vec4(c,1.);}`;
const REACH_PX = 260;
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);

// zone: obszar reagujący na kursor (cała grafika - na małej karcie kursor nad figurami też porusza ciecz)
function startFlow(host, zone = host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'lv-canvas';
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  if (!gl) return null;
  const release = () => gl.getExtension('WEBGL_lose_context')?.loseContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  if (/swiftshader|llvmpipe|software/i.test(String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)))) { release(); return null; }
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { release(); return null; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = n => gl.getUniformLocation(prog, n);
  const [uRes, uTime, uMouse, uVel, uHover, uReach] = ['u_res', 'u_time', 'u_mouse', 'u_vel', 'u_hover', 'u_reach'].map(u);
  const SEED = 5;
  gl.uniform1f(u('u_warp'), 1);
  gl.uniform1f(u('u_seed'), SEED);
  gl.uniform1f(u('u_scale'), 1.5);
  gl.uniform3fv(u('u_colors'), new Float32Array(FLOW_RAMP.flatMap(rgb)));
  gl.uniform1f(uHover, 0);
  gl.uniform2f(uMouse, 0.5, 0.5);
  gl.uniform2f(uVel, 0, 0);

  const size = () => {
    const r = host.getBoundingClientRect();
    const k = Math.min(0.5, 1280 / Math.max(1, r.width), 720 / Math.max(1, r.height));
    canvas.width = Math.max(1, Math.round(r.width * k));
    canvas.height = Math.max(1, Math.round(r.height * k));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  size();
  host.appendChild(canvas);

  // Kursor (tylko mysz / rysik): pozycja z opóźnieniem, prędkość, siła dotyku.
  const interactive = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pointer = { x: -1e5, y: -1e5 };
  const onMove = e => { if (e.pointerType !== 'touch') { pointer.x = e.clientX; pointer.y = e.clientY; } };
  const onLeave = () => { pointer.x = pointer.y = -1e5; };
  if (interactive) { addEventListener('pointermove', onMove, { passive: true }); zone.addEventListener('pointerleave', onLeave); }
  let mx = 0.5, my = 0.5, vx = 0, vy = 0, hover = 0;
  const follow = () => {
    const r = zone.getBoundingClientRect();            // cała strefa mapowana na ciecz
    const inside = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
    if (inside) {
      const tx = (pointer.x - r.left) / r.width, ty = 1 - (pointer.y - r.top) / r.height;
      if (hover < 0.02) { mx = tx; my = ty; }
      const nx = mx + (tx - mx) * 0.16, ny = my + (ty - my) * 0.16;
      vx = vx * 0.75 + (nx - mx) * 0.25; vy = vy * 0.75 + (ny - my) * 0.25;
      mx = nx; my = ny;
    } else { vx *= 0.9; vy *= 0.9; }
    const len = Math.hypot(vx, vy);
    if (len > 0.03) { vx *= 0.03 / len; vy *= 0.03 / len; }
    hover += ((inside ? 1 : 0) - hover) * (inside ? 0.07 : 0.035);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform2f(uVel, vx, vy);
    gl.uniform1f(uHover, hover);
    // Zasięg zawirowania: 260 px jak na loom.studio, ale najwyżej 0,4 wysokości - na małej karcie
    // inaczej obracałaby się cała ciecz naraz i nie byłoby widać zawirowania wokół kursora.
    gl.uniform1f(uReach, Math.min(0.4, REACH_PX / Math.max(1, r.height)));
  };
  gl.uniform1f(uReach, 0.3);

  const ro = new ResizeObserver(() => size());
  ro.observe(host);
  const speed = 0.11;
  const frameMs = 1000 / (matchMedia('(pointer: coarse)').matches ? 24 : 30);
  let last = 0, clock = 0, frames = 0;
  return {
    frame(now) {
      if (now - last < frameMs - 1) return;
      const dt = last ? Math.min(100, now - last) : 0;
      last = now;
      if (interactive) follow();
      clock += (dt / 1000) * speed * (1 + 0.6 * hover);
      gl.uniform1f(uTime, clock + SEED * 7);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (++frames === 1) canvas.setAttribute('data-live', '');
    },
    pause() { last = 0; },
    stop() {
      ro.disconnect();
      removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerleave', onLeave);
      canvas.remove();
      if (!gl.isContextLost()) release();
    },
  };
}

function startLoom(root) {
  const flow = startFlow(root.querySelector('.lv-flow'), root);
  const comp = root.querySelector('.bauhaus');
  const els = new Map([...root.querySelectorAll('[data-body]')].map(el => [el.dataset.body, el]));
  const world = createWorld();
  for (const [id, el] of els) {
    el.addEventListener('pointerenter', () => setHovered(world, id));
    el.addEventListener('pointerleave', () => { if (world.hovered === id) setHovered(world, null); });
  }
  let last = 0;
  return {
    frame(now) {
      flow?.frame(now);
      advance(world, last ? (now - last) / 1000 : 0);
      last = now;
      const k = comp.offsetWidth / 179;   // px kompozycji → px ekranu
      for (const b of world.bodies) {
        els.get(b.id).style.transform = `translate3d(${(b.p.x * k).toFixed(2)}px, ${(b.p.y * k).toFixed(2)}px, 0) rotate(${b.rot.toFixed(2)}deg) scale(${scaleOf(b, world.t).toFixed(4)})`;
      }
    },
    pause() { last = 0; flow?.pause(); },
    stop() { flow?.stop(); },
  };
}

/* ==========================================================================
   reh.ab - hero w pętli (cały ruch w CSS, sekcja „Interaktywne plansze” w styles.css)
   ========================================================================== */
// Nagłówek „Make an impact toget” w jednej linii, ściśnięty do szerokości kadru (rozmiar i odstępy w live.css,
// liczone na metryce Helvetica = Arial), pod spodem wielkie „her” - razem „together”.
// Litery pełne białe (--i = kolejność pisania, 26 ms na znak); „impact toget” gaśnie ku prawej jedną maską na całej
// grupie - litery nachodzą na siebie, więc krycie na literę dawałoby ciemniejsze zakładki.
function rehabMarkup(p) {
  const L = p.live;
  const [lead, dim1, dim2, her] = L.title;
  let n = 0;
  const glyphs = str => [...str].map(ch => (ch === ' ' ? ' ' : `<i class="ch" style="--i:${n++}">${esc(ch)}</i>`)).join('');
  const line = `${glyphs(lead)} <span class="rh-dim">${glyphs(`${dim1} ${dim2}`)}</span>`;
  const herChars = [...her].map(ch => `<i class="ch">${esc(ch)}</i>`).join('');
  // 4 widoczne linie, przesuw o 3 słowa i skok do identycznej klatki: lista + jej powtórka + pierwsze słowo
  const ticker = [...L.ticker, ...L.ticker, L.ticker[0]].map(w => `<span>${esc(w)}</span>`).join('');
  return `
          <p class="rh-h">${line}</p>
          <p class="rh-her"><span class="her-light"><span class="her-glow"></span></span><span class="her-word">${herChars}</span></p>
          <div class="rh-ticker"><div class="rh-track">${ticker}</div></div>`;
}

/* ==========================================================================
   API
   ========================================================================== */
const MARKUP = { teraz: terazMarkup, loom: loomMarkup, rehab: rehabMarkup };

// Style grafik (live.css) - wczytywane przy pierwszej grafice, nie blokują pierwszego wyświetlenia strony.
let css = null;
export function loadCss() {
  css ??= new Promise(resolve => {
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('live.css', import.meta.url).href });
    link.onload = link.onerror = resolve;
    document.head.append(link);
  });
  return css;
}

// HTML grafiki. static: bez ruchu (stan końcowy) - do generowania statycznej planszy (cover) i PDF.
// lite: karta na sferze (ta sama grafika, mniejsza). lang: język strony (loom.studio: PL / EN).
export function liveMarkup(p, { static: still = false, lite = false, lang = 'pl' } = {}) {
  const inner = MARKUP[p.id]?.(p, { lite, lang });
  if (!inner) return '';
  return `<div class="live live--${p.id}${lite ? ' live--lite' : ''}${still ? ' live--static' : ''}" aria-hidden="true">${inner}
        </div>`;
}

// Grafika gra, gdy jest widoczna, bez pauzy: w otwartym panelu albo na karcie sfery - w trybie kart
// (sekcja Portfolio) na karcie z przodu, w trybie logo na karcie pod kursorem.
const cardOn = card => (card.closest('.is-cards') ? card.classList.contains('is-active') : card.matches(':hover'));
const isOn = el => {
  if (!el.isConnected || el.offsetParent === null || el.classList.contains('is-paused') || document.hidden) return false;
  if (el.closest('.sheet:target')) return true;
  const card = el.closest('.sphere__card');
  return !!card && cardOn(card);
};

// Zachowanie w JS (loom: gradient WebGL + fizyka; reh.ab: sam CSS). Jedna pętla rAF na grafikę,
// zatrzymana, gdy grafiki nie widać; co 250 ms sprawdza, czy ruszyć.
export function startLive(el) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const runner = el.classList.contains('live--loom') ? startLoom(el) : null;
  if (!runner) return () => {};
  let raf = 0;
  const loop = now => {
    raf = 0;
    if (!isOn(el)) { runner.pause(); return; }
    runner.frame(now);
    raf = requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf && isOn(el)) raf = requestAnimationFrame(loop); };
  const timer = setInterval(() => { if (!el.isConnected) stop(); else wake(); }, 250);
  wake();
  function stop() { clearInterval(timer); cancelAnimationFrame(raf); runner.stop(); }
  return stop;
}
