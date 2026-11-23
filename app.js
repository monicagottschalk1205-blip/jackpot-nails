/* ============ STUDIO INFO (swap these for a real client) ============ */
const STUDIO = {
  name: "Mia's Jackpot Nails",
  tech: 'Mia',                 // the nail tech's first name (About section)
  city: 'Kansas City, MO',
  handle: '@jackpotnails',
  igUrl: '#',                  // Instagram link
  bookUrl: '#'            // where "Book" goes (Instagram DM link, GlossGenius, Booksy, etc.)
};

/* ============ THE NAILS: cut-out press-on photos in /nails ============
   Each spin lands 5 random nails, one per reel. Add or remove files here. */
const NAILS = ('c04_01 c04_02 c04_03 c04_04 c04_05 c04_07 c04_08 c04_09 c04_10 c20_03 c20_04 c20_09 c22_02 ' +
  'c22_03 c22_04 c22_05 c23_02 c23_05 c23_08 c23_09 c24_01 c24_02 c24_04 c24_05 c24_10 c28_01 ' +
  'c28_03 c28_04 c28_05 c31_01 c31_04 c31_05 c31_07 k00_01 k00_02 k00_03 k00_04 k00_06 k00_07 ' +
  'k01_02 k01_03 k01_04 k01_05 k01_07 k01_09 k03_01 k03_02 k03_04 k03_05 k03_09 k07_01 k07_03 ' +
  'k07_04 k07_05 k07_08 k09_01 k09_03 k09_04 k09_06 k09_08 k09_10 k11_01 k11_02 k11_03 k11_04 ' +
  'k11_06 k11_08 k16_01 k16_03 k16_04 k17_01 k17_02 k17_03 k17_04 k17_05 k17_06 k17_07 k17_09 ' +
  'k19_01 k19_02 k19_03 k19_05 k19_06 k19_07 k19_09 k19_10 p0_01 p0_02 p0_03 p0_04 p0_05 p5_05 ' +
  'p5_07 p5_08 p5_09 p6_01 p6_03 p9_01 p9_02 p9_03 p9_04 p9_06 u0_01 u0_02 u0_03 u0_04 u0_05 y0_01 ' +
  'y0_02 y0_03 y0_04 y0_06 y0_08 y0_10 y2_01 y2_02 y2_03 y2_04 y2_05 y2_06 y2_07 y2_09').split(' ');

/* ============ helpers ============ */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const hasG = !!window.gsap;
const toEl = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

const symOf = id => toEl(`<div class="sym"><img src="nails/${id}.png" alt="" draggable="false"></div>`);
const fillerSym = () => symOf(pick(NAILS));
NAILS.forEach(id => { const i = new Image(); i.src = `nails/${id}.png`; });   // preload

// a fresh random mix every time: 5 different nails from 5 different sets,
// never repeating a nail that's already showing in the window
function shuffle(arr) {                       // fair Fisher-Yates shuffle
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
let showing = [];                              // nail id on each reel's centre line
// pick nails for the given reels: new each time, never a nail already showing,
// and from different sets than each other and the held nails where possible
function randomMix(slots) {
  const held = showing.filter((id, i) => id && !slots.includes(i));
  const pool = shuffle(NAILS.filter(id => !showing.includes(id)));
  const used = new Set(held.map(id => id.split('_')[0])), out = [];
  for (const id of pool) { if (out.length === slots.length) break; const set = id.split('_')[0]; if (!used.has(set)) { used.add(set); out.push(id); } }
  for (const id of pool) { if (out.length === slots.length) break; if (!out.includes(id)) out.push(id); }
  return out;
}

$$('[data-studio]').forEach(el => { el.textContent = STUDIO[el.dataset.studio]; });
$$('[data-book]').forEach(el => { el.href = STUDIO.bookUrl; });
$$('[data-ig]').forEach(el => { el.href = STUDIO.igUrl; });
document.title = STUDIO.name;

/* ============ build reels ============
   Each reel is a tall window: the chosen nail sits on the centre line with the
   next nails peeking in above and below, like a real cylinder. */
const machine = $('#machine'), reelsEl = $('#reels');
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const reels = [];
let spinning = false;
const startIds = randomMix([0, 1, 2, 3, 4]);
for (let i = 0; i < 5; i++) {
  const reel = document.createElement('div');
  reel.className = 'reel';
  reel.innerHTML = '<div class="strip"></div>';
  reelsEl.appendChild(reel);
  const strip = $('.strip', reel);
  strip.append(fillerSym(), symOf(startIds[i]), fillerSym());
  showing[i] = startIds[i];
  reels.push({ reel, strip, idx: 1, held: false });
  reel.addEventListener('click', () => toggleHold(i));
}
function geom(r) {
  const cell = r.strip.firstElementChild.getBoundingClientRect().height;
  return { cell, off: (r.reel.getBoundingClientRect().height - cell) / 2 };
}
function place(r) {                         // put symbol r.idx on the centre line, no animation
  const { cell, off } = geom(r);
  r.strip.style.transition = 'none';
  r.strip.style.transform = `translateY(${off - r.idx * cell}px)`;
}
reels.forEach(place);
addEventListener('resize', () => { if (!spinning) reels.forEach(place); });

/* ============ finger buttons: tap to hold a nail while the others spin ============ */
const fingersEl = $('#fingers');
FINGERS.forEach((name, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'finger'; b.textContent = name;
  b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => toggleHold(i));
  fingersEl.appendChild(b);
  reels[i].btn = b;
});
function toggleHold(i) {
  if (spinning) return;
  const r = reels[i];
  r.held = !r.held;
  r.reel.classList.toggle('held', r.held);
  r.btn.classList.toggle('held', r.held);
  r.btn.textContent = r.held ? 'Held' : FINGERS[i];
  r.btn.setAttribute('aria-pressed', String(r.held));
}

/* ============ lights: bulbs along the dome + glowing crystals beside the reels ============ */
(() => {
  const arch = $('#arch'), N = 19;
  for (let k = 0; k < N; k++) {
    const t = Math.PI * k / (N - 1);                 // left end of the dome -> right end
    const b = document.createElement('i');
    b.className = 'bulb';
    b.style.setProperty('--i', k);
    b.style.left = (50 - 46.5 * Math.cos(t)) + '%';
    b.style.top = (7.3 - 6.1 * Math.sin(t)) + 'em';
    arch.appendChild(b);
  }
  const jewel = (parent, i) => {
    const j = document.createElement('i');
    j.className = 'jewel';
    j.style.setProperty('--i', i);
    parent.appendChild(j);
  };
  for (let k = 0; k < 8; k++) jewel($('#jewelsL'), 7 - k);   // chase runs up the left...
  for (let k = 0; k < 8; k++) jewel($('#jewelsR'), 8 + k);   // ...and down the right
})();

/* ============ coins: burst out from BEHIND the machine after each spin ============ */
const cv = $('#coins'), ctx = cv.getContext('2d');
let coins = [], coinRaf = null, W = 0, H = 0, DPR = 1;
function sizeCoins() {
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
sizeCoins();
addEventListener('resize', sizeCoins);

/* Realistic gold coin faces, drawn once: reeded rim, bevel, dotted ring,
   embossed emblem (a nail on the front, a heart on the back) and a polished sheen. */
function coinFace(kind) {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), m = S / 2, R = m - 4;
  let gr = g.createRadialGradient(m * .62, m * .5, S * .04, m, m, R);
  gr.addColorStop(0, '#fff9d6'); gr.addColorStop(.35, '#f6cf5a'); gr.addColorStop(.75, '#d39a22'); gr.addColorStop(1, '#8a5a0e');
  g.fillStyle = gr; g.beginPath(); g.arc(m, m, R, 0, 7); g.fill();
  // reeded rim
  g.save(); g.translate(m, m);
  for (let k = 0; k < 150; k++) { g.rotate(Math.PI * 2 / 150); g.fillStyle = k % 2 ? 'rgba(110,65,0,.38)' : 'rgba(255,245,200,.38)'; g.fillRect(R - 13, -1.5, 12, 3); }
  g.restore();
  // raised rim bevel: lit top-left, shadowed bottom-right
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(255,246,205,.85)'; g.beginPath(); g.arc(m, m, R - 16, Math.PI * .85, Math.PI * 1.85); g.stroke();
  g.strokeStyle = 'rgba(95,55,0,.6)'; g.beginPath(); g.arc(m, m, R - 16, Math.PI * 1.85, Math.PI * 2.85); g.stroke();
  // recessed field
  gr = g.createLinearGradient(m - R, m - R, m + R, m + R);
  gr.addColorStop(0, '#e9b03a'); gr.addColorStop(.5, '#f8d978'); gr.addColorStop(1, '#c48918');
  g.fillStyle = gr; g.beginPath(); g.arc(m, m, R - 19, 0, 7); g.fill();
  g.lineWidth = 2; g.strokeStyle = 'rgba(110,65,0,.45)'; g.stroke();
  // dotted ring
  g.fillStyle = 'rgba(120,70,0,.5)';
  for (let k = 0; k < 44; k++) { const a = k / 44 * Math.PI * 2; g.beginPath(); g.arc(m + Math.cos(a) * (R - 33), m + Math.sin(a) * (R - 33), 2.4, 0, 7); g.fill(); }
  // embossed emblem
  const path = kind === 'front'
    ? () => { g.beginPath(); g.moveTo(m, m - 56); g.bezierCurveTo(m + 20, m - 56, m + 33, m - 10, m + 33, m + 20); g.bezierCurveTo(m + 33, m + 48, m + 18, m + 60, m, m + 60); g.bezierCurveTo(m - 18, m + 60, m - 33, m + 48, m - 33, m + 20); g.bezierCurveTo(m - 33, m - 10, m - 20, m - 56, m, m - 56); g.closePath(); }
    : () => { g.beginPath(); g.moveTo(m, m + 48); g.bezierCurveTo(m - 74, m + 2, m - 38, m - 64, m, m - 26); g.bezierCurveTo(m + 38, m - 64, m + 74, m + 2, m, m + 48); g.closePath(); };
  g.save(); g.translate(3.5, 4.5); path(); g.fillStyle = 'rgba(105,60,0,.6)'; g.fill(); g.restore();
  g.save(); g.translate(-2.5, -2.5); path(); g.fillStyle = 'rgba(255,249,220,.95)'; g.fill(); g.restore();
  path(); gr = g.createLinearGradient(m - 40, m - 55, m + 40, m + 55);
  gr.addColorStop(0, '#ffe896'); gr.addColorStop(.55, '#e0a429'); gr.addColorStop(1, '#f5cf66');
  g.fillStyle = gr; g.fill();
  if (kind === 'front') { g.fillStyle = 'rgba(255,252,235,.75)'; g.beginPath(); g.ellipse(m - 12, m - 10, 5, 22, -.12, 0, 7); g.fill(); }
  // polished sheen
  g.save(); g.beginPath(); g.arc(m, m, R, 0, 7); g.clip();
  gr = g.createLinearGradient(0, 0, S, S);
  gr.addColorStop(.22, 'rgba(255,255,255,0)'); gr.addColorStop(.36, 'rgba(255,255,255,.5)'); gr.addColorStop(.44, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); g.restore();
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(90,52,0,.75)'; g.beginPath(); g.arc(m, m, R, 0, 7); g.stroke();
  return c;
}
const FACE = { front: coinFace('front'), back: coinFace('back') };

function drawCoin(p) {
  const sx = Math.cos(p.ph), w = Math.max(Math.abs(sx), 0.05);
  const thick = p.r * 0.17 * Math.sin(p.ph);         // the coin's edge shows as it turns
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  // edge band
  const eg = ctx.createLinearGradient(0, -p.r, 0, p.r);
  eg.addColorStop(0, '#f3c75a'); eg.addColorStop(.5, '#a8701a'); eg.addColorStop(1, '#6e4508');
  ctx.fillStyle = eg;
  ctx.beginPath(); ctx.ellipse(thick, 0, w * p.r, p.r, 0, 0, 7); ctx.fill();
  ctx.fillRect(Math.min(0, thick), -p.r, Math.abs(thick), p.r * 2);
  // face
  ctx.save();
  ctx.scale(w, 1);
  ctx.drawImage(sx >= 0 ? FACE.front : FACE.back, -p.r, -p.r, p.r * 2, p.r * 2);
  ctx.fillStyle = `rgba(70,40,0,${(1 - w) * 0.5})`;   // darker when turned away from the light
  ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill();
  ctx.restore();
  // a quick glint when the coin faces you
  if (w > 0.93) {
    const a = (w - 0.93) / 0.07, s = p.r * 0.55;
    ctx.globalAlpha = a; ctx.fillStyle = '#fff';
    ctx.translate(-p.r * 0.35, -p.r * 0.4);
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s); ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s); ctx.fill();
  }
  ctx.restore();
}

function tickCoins() {
  ctx.clearRect(0, 0, W, H);
  for (const p of coins) {
    p.vy += 0.42; p.vx *= 0.995; p.x += p.vx; p.y += p.vy; p.ph += p.vp; p.rot += p.vr;
    drawCoin(p);
  }
  coins = coins.filter(p => p.y < H + 80);
  coinRaf = coins.length ? requestAnimationFrame(tickCoins) : null;
  if (!coins.length) ctx.clearRect(0, 0, W, H);
}
function coinBurst() {
  const r = machine.getBoundingClientRect();
  const wave = (n) => {
    for (let k = 0; k < n; k++) {
      coins.push({
        x: r.left + r.width / 2 + rand(-r.width * .3, r.width * .3),
        y: r.top + r.height * rand(.2, .45),
        vx: rand(-11, 11), vy: rand(-21, -9),
        r: rand(13, 23), ph: rand(0, 6), vp: rand(.1, .28), rot: rand(-.5, .5), vr: rand(-.04, .04)
      });
    }
    if (!coinRaf) coinRaf = requestAnimationFrame(tickCoins);
  };
  wave(40);
  setTimeout(() => wave(30), 160);
  setTimeout(() => wave(24), 340);
}

/* ============ spin ============ */
const spinBtn = $('#spinBtn'), lever = $('#lever'), arm = $('.lever-arm', lever);
let spunOnce = false;

function pullLever() {
  if (hasG) gsap.timeline().to(arm, { scaleY: -0.85, duration: 0.28, ease: 'power2.in' }).to(arm, { scaleY: 1, duration: 0.8, ease: 'elastic.out(1,0.45)' });
  spinBtn.classList.add('pressed');
  setTimeout(() => spinBtn.classList.remove('pressed'), 260);
}

function spin() {
  if (spinning) return;
  const slots = [0, 1, 2, 3, 4].filter(i => !reels[i].held);
  if (!slots.length) {                      // everything is held: nudge the buttons
    fingersEl.classList.remove('nope'); void fingersEl.offsetWidth; fingersEl.classList.add('nope');
    return;
  }
  spinning = true;
  spinBtn.disabled = true;
  spinBtn.classList.remove('pulse');
  machine.classList.remove('win');
  machine.classList.add('busy');
  pullLever();
  spunOnce = true;

  const picks = randomMix(slots);
  let last = 0;
  slots.forEach((i, n) => {
    const r = reels[i], s = r.strip, { cell, off } = geom(r);
    const kids = Array.from(s.children);
    const above = kids[r.idx - 1], cur = kids[r.idx], below = kids[r.idx + 1];
    s.style.transition = 'none';
    s.replaceChildren(above, cur, below);
    const len = 9 + i * 4;
    for (let k = 0; k < len; k++) s.appendChild(fillerSym());
    s.append(symOf(picks[n]), fillerSym());
    r.idx = 3 + len;
    showing[i] = picks[n];
    s.style.transform = `translateY(${off - cell}px)`;
    r.reel.classList.remove('stop');
    void s.offsetHeight;
    const dur = 2000 + i * 430;
    last = Math.max(last, dur);
    s.classList.add('blur');
    s.style.transition = `transform ${dur}ms cubic-bezier(.14,.86,.3,1.04)`;
    s.style.transform = `translateY(${off - r.idx * cell}px)`;
    setTimeout(() => s.classList.remove('blur'), dur * 0.55);
    setTimeout(() => r.reel.classList.add('stop'), dur - 120);
  });
  setTimeout(land, last + 100);
}

function land() {
  spinning = false;
  spinBtn.disabled = false;
  machine.classList.remove('busy');
  void machine.offsetWidth;
  machine.classList.add('win');
  coinBurst();
}

spinBtn.addEventListener('click', spin);
lever.addEventListener('click', spin);
addEventListener('keydown', e => { if (e.code === 'Space' && !e.target.closest('button,a,input,textarea,select')) { e.preventDefault(); spin(); } });
setTimeout(() => { if (!spunOnce) spinBtn.classList.add('pulse'); }, 4500);

/* ============ entrance ============ */
function splitWords(el) {
  const walk = node => Array.from(node.childNodes).forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(t => {
        if (!t) return;
        if (/^\s+$/.test(t)) frag.appendChild(document.createTextNode(' '));
        else frag.appendChild(toEl(`<span class="w"><span class="wi">${t}</span></span>`));
      });
      node.replaceChild(frag, n);
    } else if (n.nodeType === 1) walk(n);
  });
  walk(el);
}
$$('.split').forEach(splitWords);

if (hasG) {
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.nav', { opacity: 0, y: -20, duration: 0.8, clearProps: 'transform,opacity' })
    .from('.split .wi', { yPercent: 110, duration: 1, stagger: 0.07, clearProps: 'transform' }, 0.1)
    .from('.lede, .pick', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, clearProps: 'transform,opacity' }, 0.7)
    .from('.machine', { opacity: 0, y: 70, duration: 1.2, clearProps: 'transform,opacity' }, 0.25);
}

/* ============ THE WORK: recent sets, each shown as a fan of 5 nails ============ */
const GALLERY = [
  { name: 'Strawberry Picnic', note: 'Gingham, strawberries and bows', bg: 'linear-gradient(160deg,#fff0f2,#fbd6dc)', nails: ['k17_01', 'k17_02', 'k17_03', 'k17_04', 'k17_07'] },
  { name: 'Cherry Wine', note: 'Burgundy, cherries and gold', bg: 'linear-gradient(160deg,#fbe4e8,#f3c4cd)', nails: ['k19_01', 'k19_02', 'k19_03', 'k19_05', 'k19_09'] },
  { name: 'Choco Swirl', note: 'Pink, cocoa, swirls and plaid', bg: 'linear-gradient(160deg,#fbeee8,#f2d6cb)', nails: ['k00_01', 'k00_02', 'k00_03', 'k00_04', 'k00_06'] },
  { name: 'Pink Petals', note: '3D flowers, bows and sparkle', bg: 'linear-gradient(160deg,#fdeef4,#f7d4e3)', nails: ['k09_01', 'k09_03', 'k09_04', 'k09_06', 'k09_10'] },
  { name: 'Teal Leopard', note: 'Bright, bold and a little wild', bg: 'linear-gradient(160deg,#eaf7f5,#cdebe6)', nails: ['c04_01', 'c04_02', 'c04_03', 'c04_08', 'c04_09'] },
  { name: 'Liquid Hearts', note: 'Chrome hearts, stars and swirls', bg: 'linear-gradient(160deg,#f6eef2,#e7d6de)', nails: ['y2_01', 'y2_02', 'y2_04', 'y2_05', 'y2_06'] }
];
$('#sets').innerHTML = GALLERY.map((s, k) => `
  <article class="set reveal" style="--bg:${s.bg};transition-delay:${(k % 3) * 0.1}s">
    <div class="fan">${s.nails.map(id => `<img src="nails/${id}.png" alt="" loading="lazy" draggable="false">`).join('')}</div>
    <h3>${s.name}</h3>
    <p>${s.note}</p>
  </article>`).join('');

/* ============ scroll reveal + nav background ============ */
document.documentElement.classList.add('js');
const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }) : null;
$$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));
const navEl = $('.nav');
const onScroll = () => navEl.classList.toggle('scrolled', scrollY > 20);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
