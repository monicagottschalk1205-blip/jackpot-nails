/* NailArt v2: realistic press-on nails drawn as SVG (no photos).
   NailArt.nail({ shape, d, v, seed }) -> svg string
   shapes:  almond  stiletto  oval
   designs: cherryFrench bows cowFrench holo liquidChrome cateye midnight aura mocha wildflower jelly
   v = variant (0-3) so the 5 nails in a set are not all identical */
window.NailArt = (function () {
  let uid = 0;
  const cache = new Map();

  const SH = {
    almond: {
      ty: 3,
      P: 'M50 3C57 3 66 22 74 52C80 74 83 100 82 130C81 150 70 164 50 164C30 164 19 150 18 130C17 100 20 74 26 52C34 22 43 3 50 3Z',
      gloss: 'M36 44C29 66 27 98 31 134C36 139 42 135 43 128C41 98 41 66 41 48C40 41 37 40 36 44Z',
      rim: 'M73 58C78 82 80 106 80 130', dot: [42, 27]
    },
    stiletto: {
      ty: 0,
      P: 'M50 1C55 18 70 58 79 106C83 130 82 150 70 160C64 164 56 165 50 165C44 165 36 164 30 160C18 150 17 130 21 106C30 58 45 18 50 1Z',
      gloss: 'M40 50C33 76 29 104 30 134C34 140 40 136 42 128C41 102 42 78 44 56C44 48 41 46 40 50Z',
      rim: 'M64 62C72 86 78 108 79 132', dot: [46, 34]
    },
    oval: {
      ty: 14,
      P: 'M50 14C70 14 82 38 82 76C82 110 82 132 80 140C78 156 66 164 50 164C34 164 22 156 20 140C18 132 18 110 18 76C18 38 30 14 50 14Z',
      gloss: 'M32 44C27 64 26 98 28 134C33 138 39 134 40 128C39 98 40 66 41 50C40 42 35 40 32 44Z',
      rim: 'M74 50C79 76 80 104 79 132', dot: [38, 34]
    }
  };

  /* ---------- helpers ---------- */
  function rng(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f = n => (+n).toFixed(1);
  const R = 'x="-6" y="-6" width="112" height="180"';
  const blurF = (id, sd) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="-30" y="-30" width="160" height="230"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
  const vgrad = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('')}</linearGradient>`;

  // irregular organic blob (cow spots, leopard, chrome drops)
  function blob(r, cx, cy, rx, ry, n) {
    n = n || 7;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, k = 0.7 + r() * 0.55;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(pts[0], pts[1]);
    let d = `M${f(m0[0])} ${f(m0[1])}`;
    for (let i = 1; i <= n; i++) {
      const p = pts[i % n], m = mid(p, pts[(i + 1) % n]);
      d += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
    }
    return d + 'Z';
  }

  const cherry = (x, y, k, rot) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot || 0}) scale(${k})"><path d="M6 -15Q3 -8 0 -1M6 -15Q10 -8 12 -1" stroke="#2f7d3c" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M6 -15Q14 -21 18 -14Q11 -11 6 -15Z" fill="#43a854"/><circle cx="0" cy="3.4" r="4.3" fill="url(#§ch)"/><circle cx="12" cy="3.4" r="4.3" fill="url(#§ch)"/><circle cx="-1.4" cy="1.8" r="1.15" fill="#fff" opacity=".9"/><circle cx="10.6" cy="1.8" r="1.15" fill="#fff" opacity=".9"/></g>`;
  const cherryDefs = `<radialGradient id="§ch" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#ff7686"/><stop offset=".5" stop-color="#d3122e"/><stop offset="1" stop-color="#76091a"/></radialGradient>`;

  const bow = (x, y, k, col, rot) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot || 0}) scale(${k})" fill="none" stroke="${col}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M0 0C-4 -7 -13 -8 -13 -2C-13 4 -5 3 0 0Z" fill="${col}" fill-opacity=".14"/><path d="M0 0C4 -7 13 -8 13 -2C13 4 5 3 0 0Z" fill="${col}" fill-opacity=".14"/><path d="M-.5 .5Q-3 6 -6.5 11.5M.5 .5Q3 6 6.5 11.5"/><circle r="1.9" fill="${col}" stroke="none"/></g>`;

  const daisy = (x, y, k, center) => {
    let s = `<g transform="translate(${f(x)} ${f(y)}) scale(${f(k * 1.2)})">`;
    for (let i = 0; i < 6; i++) s += `<ellipse cx="0" cy="-5.6" rx="2.9" ry="5" fill="#fff" stroke="rgba(120,60,60,.12)" stroke-width=".5" transform="rotate(${i * 60})"/>`;
    return s + `<circle r="2.7" fill="${center || '#f6b23a'}"/><circle cx="-.8" cy="-.8" r=".9" fill="#fff" opacity=".6"/></g>`;
  };
  const heart = (x, y, k, col) => `<path transform="translate(${f(x)} ${f(y)}) scale(${k})" d="M0 5C-7 0 -5 -6 0 -3C5 -6 7 0 0 5Z" fill="${col}"/>`;

  /* ---------- designs ---------- */
  function design(o, sh, r) {
    const ty = sh.ty, v = o.v || 0;
    let defs = '', s = '';
    const nude = (a, b) => { defs += vgrad('§n', [[0, a], [1, b]]); s += `<rect ${R} fill="url(#§n)"/>`; };

    switch (o.d) {
      case 'cherryFrench': {
        nude('#f8ddd6', '#eeb9b5');
        defs += vgrad('§r', [[0, '#ec2a40'], [0.7, '#c10f27'], [1, '#a30c20']]) + cherryDefs + blurF('§b2', 2);
        const depth = [86, 80, 90, 84][v];
        s += `<path d="M-6 -6H106V${ty + 26}C78 ${ty + depth} 22 ${ty + depth} -6 ${ty + 26}Z" fill="url(#§r)"/>`;
        s += `<path d="M30 ${ty + 18}Q36 ${ty + 8} 46 ${ty + 6}" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none" filter="url(#§b2)"/>`;
        const spots = [[[36, 102, .8, -8], [54, 114, .72, 6]], [[44, 104, .84, 0]], [[34, 110, .72, -12], [52, 100, .72, 8]], []][v];
        spots.forEach(c => { s += cherry(c[0], c[1], c[2], c[3]); });
        break;
      }
      case 'bows': {
        const base = [['#f7c7d5', '#ef9fb8'], ['#f8e4df', '#efc8c3'], ['#f9d3de', '#f2acc0'], ['#f8e4df', '#efc8c3']][v];
        nude(base[0], base[1]);
        s += bow(50, 92 + (v % 2) * 6, 1.45, '#fffaf8', v === 2 ? -10 : 0);
        [[36, 50], [62, 62], [44, 128], [64, 120], [52, 40]].slice(0, v === 1 ? 5 : 3).forEach(p => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="1.3" fill="#fffaf8"/>`; });
        if (v === 3) s += heart(54, 134, 1.1, '#e0213f');
        break;
      }
      case 'cowFrench': {
        nude('#f7d4cd', '#edb3ad');
        defs += vgrad('§w', [[0, '#fffefb'], [1, '#f1ebe5']]) + `<clipPath id="§tc"><path d="M-6 -6H106V${ty + 28}C78 ${ty + 84} 22 ${ty + 84} -6 ${ty + 28}Z"/></clipPath>`;
        s += `<path d="M-6 -6H106V${ty + 28}C78 ${ty + 84} 22 ${ty + 84} -6 ${ty + 28}Z" fill="url(#§w)"/><g clip-path="url(#§tc)">`;
        const spots = [[30, ty + 34, 10, 7], [60, ty + 20, 8, 6], [72, ty + 48, 9, 8], [42, ty + 62, 8, 5], [54, ty + 42, 5, 4], [24, ty + 52, 5, 4]];
        spots.forEach((p, i) => { s += `<path d="${blob(r, p[0] + v * 3, p[1], p[2], p[3])}" fill="${i % 3 === 2 ? '#15100d' : '#3c2418'}"/>`; });
        s += `</g>`;
        break;
      }
      case 'holo': {
        defs += `<linearGradient id="§h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5fbff"/><stop offset=".2" stop-color="#bcdcff"/><stop offset=".36" stop-color="#f6d6ff"/><stop offset=".5" stop-color="#ffffff"/><stop offset=".64" stop-color="#c7f7e6"/><stop offset=".8" stop-color="#cfd5ff"/><stop offset="1" stop-color="#f9f2ff"/></linearGradient>` + blurF('§b6', 6) + blurF('§b2', 2);
        s += `<rect ${R} fill="url(#§h)"/><g filter="url(#§b6)" opacity=".75"><path d="M-10 ${120 - v * 8}C30 90 60 140 110 ${86 + v * 6}" stroke="#8fb8ff" stroke-width="16" fill="none"/><path d="M-10 ${60 + v * 6}C30 40 66 84 110 46" stroke="#ffb8ec" stroke-width="13" fill="none"/></g><g filter="url(#§b2)"><path d="M20 ${100 + v * 4}C40 84 60 104 86 86" stroke="#fff" stroke-width="5" fill="none" opacity=".9"/><path d="M40 30C46 50 44 70 50 86" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/></g><rect ${R} fill="#6d7fa6" opacity=".1"/>`;
        break;
      }
      case 'liquidChrome': {
        nude('#f5d6cd', '#ebb8b0');
        defs += `<linearGradient id="§m" x1="0" y1="0" x2="1" y2=".6"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#9aa0aa"/><stop offset=".45" stop-color="#f2f4f7"/><stop offset=".7" stop-color="#4f555e"/><stop offset="1" stop-color="#d5d9de"/></linearGradient><radialGradient id="§s" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#a7adb6"/><stop offset="1" stop-color="#3f444b"/></radialGradient>`;
        const swoosh = [
          'M28 30C22 60 26 100 40 132C46 112 42 80 50 52C50 36 40 20 28 30Z',
          'M70 24C76 56 72 96 58 128C52 108 58 78 52 50C50 34 60 16 70 24Z',
          'M30 120C40 108 56 112 66 96C72 86 80 92 76 104C70 124 46 136 30 120Z',
          'M44 18C58 22 64 44 58 70C52 60 44 50 36 40C32 30 36 18 44 18Z'
        ][v];
        s += `<path d="${swoosh}" fill="url(#§m)" stroke="#555b64" stroke-width=".7"/>`;
        [[60, 70, 3.2], [36, 110, 2.4], [64, 132, 2.8]].slice(0, 2 + (v % 2)).forEach(p => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="url(#§s)" stroke="#555b64" stroke-width=".5"/>`; });
        break;
      }
      case 'cateye':
      case 'midnight': {
        const c = o.d === 'cateye' ? ['#4c0a15', '#1d0207', '#ff2b3c', '#ff8a86', '#ffe0da'] : ['#0b1a4d', '#030719', '#2f6bff', '#8cc3ff', '#e9f6ff'];
        defs += vgrad('§k', [[0, c[0]], [1, c[1]]]) + blurF('§b8', 7) + blurF('§b3', 3) + blurF('§b1', 1);
        const y = 92 + [0, -10, 8, -4][v], tilt = [-8, -14, -4, -10][v];
        const band = `M-14 ${y + 14}Q50 ${y - 26} 114 ${y + 14}`;
        s += `<rect ${R} fill="url(#§k)"/><g transform="rotate(${tilt} 50 90)"><path d="${band}" stroke="${c[2]}" stroke-width="44" stroke-opacity=".55" fill="none" filter="url(#§b8)"/><path d="${band}" stroke="${c[3]}" stroke-width="16" stroke-opacity=".7" fill="none" filter="url(#§b3)"/><path d="${band}" stroke="${c[4]}" stroke-width="2.2" stroke-opacity=".75" fill="none" filter="url(#§b1)"/></g>`;
        break;
      }
      case 'aura': {
        nude('#f8e1db', '#f0c6c1');
        const k = [1, .85, 1.1, .95][v];
        defs += blurF('§b9', 9) + blurF('§b5', 5);
        s += `<g filter="url(#§b9)"><ellipse cx="50" cy="${108 - v * 3}" rx="${f(40 * k)}" ry="${f(60 * k)}" fill="#ff6f95" opacity=".85"/></g><g filter="url(#§b5)"><ellipse cx="50" cy="${116 - v * 3}" rx="${f(20 * k)}" ry="${f(34 * k)}" fill="#ff2f62" opacity=".9"/></g>`;
        break;
      }
      case 'mocha': {
        defs += vgrad('§k', [[0, '#5a2a1b'], [1, '#2e1209']]) + blurF('§b9', 8) + blurF('§b5', 5);
        s += `<rect ${R} fill="url(#§k)"/><g filter="url(#§b9)"><ellipse cx="50" cy="${100 + v * 3}" rx="16" ry="58" fill="#f3a6c8"/></g><g filter="url(#§b5)"><ellipse cx="50" cy="${104 + v * 3}" rx="10" ry="44" fill="#ffd3e6" opacity=".95"/></g>`;
        break;
      }
      case 'wildflower': {
        nude('#f9dfe1', '#f0bec7');
        defs += cherryDefs;
        const layouts = [
          () => daisy(38, 60, .95) + daisy(62, 100, .85) + cherry(34, 118, .7, -10) + bow(56, 134, .75, '#c8102e'),
          () => daisy(50, 48, .8) + daisy(36, 88, .75) + daisy(64, 82, .7) + cherry(44, 120, .75, 6),
          () => bow(48, 66, .9, '#c8102e', -8) + daisy(60, 104, .9) + daisy(36, 128, .75) + cherry(58, 136, .62, 0),
          () => cherry(40, 62, .78, -6) + daisy(58, 92, .9) + daisy(40, 124, .7) + bow(62, 130, .65, '#c8102e', 10)
        ];
        s += layouts[v]();
        break;
      }
      default: { // jelly / solid gloss
        const c = o.c || ['#f7c3cf', '#ee9fb3'];
        nude(c[0], c[1]);
      }
    }
    return { defs, s };
  }

  /* ---------- assemble with realistic finish ---------- */
  function build(o) {
    const sh = SH[o.shape] || SH.almond;
    const r = rng(o.seed || 7);
    const { defs, s } = design(o, sh, r);
    const [dx, dy] = sh.dot;
    return `<svg class="nail" viewBox="12 -4 76 174" aria-hidden="true"><defs><clipPath id="§c"><path d="${sh.P}"/></clipPath>${defs}`
      + `<linearGradient id="§sh" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#2a0a18" stop-opacity=".36"/><stop offset=".2" stop-color="#2a0a18" stop-opacity=".05"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset=".8" stop-color="#2a0a18" stop-opacity=".06"/><stop offset="1" stop-color="#2a0a18" stop-opacity=".4"/></linearGradient>`
      + vgrad('§cu', [[0, '#fff', .16], [0.14, '#fff', 0], [0.74, '#2a0a18', 0], [1, '#2a0a18', .32]])
      + vgrad('§gl', [[0, '#fff', 0], [0.2, '#fff', .9], [0.6, '#fff', .42], [1, '#fff', 0]])
      + blurF('§g1', 0.9)
      + `</defs><g clip-path="url(#§c)">${s}<rect ${R} fill="url(#§sh)"/><rect ${R} fill="url(#§cu)"/>`
      + `<path d="${sh.gloss}" fill="url(#§gl)" filter="url(#§g1)"/>`
      + `<path d="${sh.rim}" stroke="#fff" stroke-opacity=".45" stroke-width="2.2" fill="none" stroke-linecap="round" filter="url(#§g1)"/>`
      + `<ellipse cx="${dx}" cy="${dy}" rx="3.4" ry="1.7" fill="#fff" fill-opacity=".9" transform="rotate(-20 ${dx} ${dy})" filter="url(#§g1)"/>`
      + `<path d="${sh.P}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.4"/></g>`
      + `<path d="${sh.P}" fill="none" stroke="rgba(50,8,25,.32)" stroke-width=".9"/></svg>`;
  }

  function nail(o) {
    const key = JSON.stringify(o);
    let t = cache.get(key);
    if (!t) { t = build(o); cache.set(key, t); }
    return t.replace(/§/g, 'n' + (++uid) + '_');
  }

  return { nail, shapes: Object.keys(SH) };
})();
