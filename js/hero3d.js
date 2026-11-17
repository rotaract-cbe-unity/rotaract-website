/* Unity hero 3D: a network of linked nodes (members connected as one club).
   Desktop only, lazy-loaded, pauses off-screen, falls back to the existing hero when anything is missing. */
(function () {
  'use strict';
  var hero = document.getElementById('home');
  var canvas = document.getElementById('hero-3d');
  if (!hero || !canvas || !window.matchMedia) return;

  var conn = navigator.connection || {};
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(min-width: 1024px)').matches ||
      conn.saveData || /2g/.test(conn.effectiveType || '')) return;
  try {
    var probe = document.createElement('canvas');
    if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) return;
  } catch (e) { return; }

  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  function loadThree(done) {
    if (window.THREE) return done();
    var s = document.createElement('script');
    s.src = THREE_URL; s.async = true; s.onload = done; s.onerror = function () {};
    document.head.appendChild(s);
  }

  function brand(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/\s+/).map(Number);
    return v.length === 3 && v.every(isFinite) ? new THREE.Color(v[0] / 255, v[1] / 255, v[2] / 255) : new THREE.Color(fallback);
  }

  function dotTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.45, 'rgba(255,255,255,.9)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function build() {
    if (!window.THREE) return;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.z = 7;
    var group = new THREE.Group();
    scene.add(group);

    var palette = [brand('--b-blue', '#1a73e8'), brand('--b-blue', '#1a73e8'), brand('--b-cyan', '#06b6d4')];
    var N = 110, nodes = [], pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
      var k = 2.3 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.35;
      var p = new THREE.Vector3(Math.cos(th) * r * k, y * k, Math.sin(th) * r * k);
      nodes.push(p);
      var c = palette[i % 3];
      pos.set([p.x, p.y, p.z], i * 3); col.set([c.r, c.g, c.b], i * 3);
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var pm = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.9, map: dotTexture(), depthWrite: false });
    group.add(new THREE.Points(pg, pm));

    var seen = {}, lp = [], lc = [];
    nodes.forEach(function (a, i) {
      nodes.map(function (b, j) { return { j: j, d: a.distanceToSquared(b) }; })
        .filter(function (o) { return o.j !== i; })
        .sort(function (m, n) { return m.d - n.d; }).slice(0, 3)
        .forEach(function (o) {
          var key = i < o.j ? i + '-' + o.j : o.j + '-' + i;
          if (seen[key]) return; seen[key] = 1;
          var b = nodes[o.j], c1 = palette[i % 3], c2 = palette[o.j % 3];
          lp.push(a.x, a.y, a.z, b.x, b.y, b.z); lc.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
        });
    });
    var lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
    var lm = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35 });
    group.add(new THREE.LineSegments(lg, lm));

    function resize() {
      var w = hero.clientWidth, h = hero.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      group.position.x = camera.aspect > 1.4 ? 2.4 : 0;
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(hero); else addEventListener('resize', resize);

    var mx = 0, my = 0, tx = 0, ty = 0, visible = true, raf = 0, t0 = performance.now();
    hero.addEventListener('pointermove', function (e) {
      tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var p = Math.min(1, Math.max(0, (window.scrollY || 0) / Math.max(1, hero.offsetHeight)));
      var dark = document.documentElement.classList.contains('dark');
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      group.rotation.y = (now - t0) * 0.00008 + mx * 0.3 + p * 1.2;
      group.rotation.x = my * 0.15;
      camera.position.z = 7 + p * 2;
      pm.opacity = 0.9 * (1 - p); lm.opacity = (dark ? 0.5 : 0.3) * (1 - p);
      renderer.render(scene, camera);
      canvas.classList.add('is-ready');
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(hero);
    }
    document.addEventListener('visibilitychange', kick);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); visible = false; canvas.remove(); });
    addEventListener('pagehide', function () {
      pg.dispose(); lg.dispose(); pm.dispose(); lm.dispose(); renderer.dispose();
    });
    kick();
  }

  function start() {
    (window.requestIdleCallback || function (f) { setTimeout(f, 700); })(function () { loadThree(build); });
  }
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
