// Rendu ASCII 3D : projette un solide filaire en rotation dans un buffer de
// caractères, rafraîchi en continu. Pas de dépendance, pas d'appel backend.

const ASCII3D_SHAPES = {
  cube: {
    color: "cyan",
    vertices: [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ],
  },
  tetrahedron: {
    color: "magenta",
    vertices: [
      [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1],
    ].map((v) => v.map((c) => c * 1.15)),
    edges: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]],
  },
  octahedron: {
    color: "accent",
    vertices: [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
    ].map((v) => v.map((c) => c * 1.3)),
    edges: [
      [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [1, 3], [1, 4], [1, 5],
      [2, 4], [2, 5], [3, 4], [3, 5],
    ],
  },
};

function mountAscii3D(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const pre = document.createElement("pre");
  const names = Object.keys(ASCII3D_SHAPES);
  const shapeName = names[Math.floor(Math.random() * names.length)];
  const shape = ASCII3D_SHAPES[shapeName];
  pre.className = `ascii-3d ascii-3d-${shape.color}`;
  target.replaceWith(pre);

  const WIDTH = 46;
  const HEIGHT = 22;
  const DIST = 4.2;
  const K1 = 12;

  let angleX = Math.random() * Math.PI;
  let angleY = Math.random() * Math.PI;
  const speedX = 0.02 + Math.random() * 0.01;
  const speedY = 0.015 + Math.random() * 0.015;

  function project(v) {
    const [x, y, z] = v;
    const y1 = y * Math.cos(angleX) - z * Math.sin(angleX);
    const z1 = y * Math.sin(angleX) + z * Math.cos(angleX);
    const x2 = x * Math.cos(angleY) + z1 * Math.sin(angleY);
    const z2 = -x * Math.sin(angleY) + z1 * Math.cos(angleY);
    const z3 = z2 + DIST;
    const ooz = 1 / z3;
    return [
      Math.round(WIDTH / 2 + K1 * x2 * ooz * 2),
      Math.round(HEIGHT / 2 + K1 * y1 * ooz),
    ];
  }

  function drawLine(buf, x0, y0, x1, y1, ch) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      if (y0 >= 0 && y0 < HEIGHT && x0 >= 0 && x0 < WIDTH) buf[y0][x0] = ch;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  let stopped = false;
  function frame() {
    if (stopped) return;
    if (!document.hidden) {
      angleX += speedX;
      angleY += speedY;
      const buf = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(" "));
      const projected = shape.vertices.map(project);
      shape.edges.forEach(([a, b]) => {
        drawLine(buf, projected[a][0], projected[a][1], projected[b][0], projected[b][1], "#");
      });
      pre.textContent = buf.map((row) => row.join("")).join("\n");
    }
    setTimeout(frame, 60);
  }
  frame();

  // Coupe l'animation si l'élément est retiré du DOM (changement de page SPA, etc.)
  const observer = new MutationObserver(() => {
    if (!document.body.contains(pre)) {
      stopped = true;
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
