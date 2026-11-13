// Every 3D asset is generated from Three.js primitives and canvas gradients. Zero asset files.
// Colour roles: player colour = owner, LOOT_C = loot (crystals, fields, cargo glow), GOLD_C = home/objective/Vault.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { T } from "../shared/tuning";

export const LOOT_C = "#7fffd4", GOLD_C = "#ffd23f", NEUTRAL_C = "#3a5a88";
const TAU = Math.PI * 2;
const WHITE = new THREE.Color("#ffffff");

// ---------- Building blocks ----------
/** Shared materials/geometry survive dispose(); everything else belongs to one object. */
function shared<X extends THREE.Material | THREE.BufferGeometry>(x: X) { x.userData.shared = true; return x; }
const lambert = (color: THREE.ColorRepresentation, glow = 0.3) =>
  new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: new THREE.Color(color).multiplyScalar(glow) });
/** Unlit, for authored light: trim, nozzles, zones, beams. */
function unlit(color: THREE.ColorRepresentation, opacity = 1, additive = false, map: THREE.Texture | null = null, fog = true) {
  const see = opacity < 1 || additive;
  return new THREE.MeshBasicMaterial({ color, map, opacity, transparent: see, depthWrite: !see, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, fog });
}
const DARK = shared(lambert("#1c2642", 0.12));
const GLASS = shared(new THREE.MeshLambertMaterial({ color: "#0d1d3a", emissive: "#1b6d8c", flatShading: true }));
const GOLD = shared(lambert(GOLD_C, 0.45));
const flat = <G extends THREE.BufferGeometry>(geo: G) => geo.rotateX(-Math.PI / 2); // XY-plane shapes → lie on XZ
const prep = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; n.clearGroups(); return n; };
/** One geometry from parts (or one group per part with `groups`, for a material array). */
const merge = (parts: THREE.BufferGeometry[], groups = false) => mergeGeometries(parts.map(prep), groups)!;
function poly(pts: number[]) {
  const s = new THREE.Shape();
  s.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) s.lineTo(pts[i], pts[i + 1]);
  return s;
}
/** A top-view outline (x, z) extruded upward and centred on y = 0. */
const slab = (pts: number[], depth: number, bevel = 0) =>
  new THREE.ExtrudeGeometry(poly(pts), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 }).rotateX(Math.PI / 2).translate(0, depth / 2, 0);
const lift = <O extends THREE.Object3D>(o: O, y: number) => { o.position.y = y; return o; };
const around = (n: number, make: (a: number, i: number) => THREE.BufferGeometry) => Array.from({ length: n }, (_, i) => make((i / n) * TAU, i));
/** n+1 points on a circle (closed when drawn as a Line). */
const circle = (n: number, r: number, y: number) => Array.from({ length: n + 1 }, (_, i) => new THREE.Vector3(Math.cos((i / n) * TAU) * r, y, Math.sin((i / n) * TAU) * r));

function canvasTex(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  [c.width, c.height] = [w, h];
  paint(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const radial = (stops: [number, string][]) => canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
});
const GLOW_TEX = radial([[0, "#fff"], [0.22, "rgba(255,255,255,.6)"], [1, "rgba(255,255,255,0)"]]);
/** Zone floors: faint centre, bright rim — reads as "an area you enter". */
const ZONE_TEX = radial([[0, "rgba(255,255,255,.06)"], [0.7, "rgba(255,255,255,.16)"], [0.96, "rgba(255,255,255,.55)"], [1, "rgba(255,255,255,0)"]]);
/** Vertical fade for beams and the map wall: opaque at the bottom (uv.y = 0), clear at the top. */
const FADE_TEX = canvasTex(4, 128, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "rgba(255,255,255,0)");
  gr.addColorStop(1, "#fff");
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 128);
});

export function glow(color: THREE.ColorRepresentation, size: number, fog = true) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog }));
  s.scale.setScalar(size);
  return s;
}

/** Text that keeps its screen size (h ≈ fraction of screen height). Callers hide it when far. */
export function label(text: string, color: string, h = 0.05) {
  const tex = canvasTex(256, 64, (g) => {
    g.font = `bold ${Math.min(40, Math.floor(400 / Math.max(1, text.length)))}px ui-monospace, Menlo, Consolas, monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 9;
    g.lineJoin = "round";
    g.strokeStyle = "rgba(6,11,26,.92)";
    g.strokeText(text, 128, 34);
    g.fillStyle = color;
    g.fillText(text, 128, 34);
  });
  const m = new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false, sizeAttenuation: false }); // fogged text turns into a dark smudge
  m.userData.ownMap = true;
  const s = new THREE.Sprite(m);
  s.scale.set(h * 4, h, 1);
  s.renderOrder = 2;
  return s;
}

/** Free an object's own GPU resources; shared geometry and materials stay. */
export function dispose(o: THREE.Object3D) {
  o.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (mesh.geometry && !mesh.geometry.userData.shared && mesh.geometry.userData.own) mesh.geometry.dispose();
    const mats = mesh.material;
    for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
      if (m.userData.shared) continue;
      if (m.userData.ownMap) (m as THREE.SpriteMaterial).map?.dispose();
      m.dispose();
    }
    if ((n as THREE.InstancedMesh).isInstancedMesh) (n as THREE.InstancedMesh).dispose();
  });
}

// ---------- Ships ----------
/** Dart hull, swept wings, dorsal fin, twin nacelles; one mesh, 4 material groups: hull, dark, trim, canopy. Nose → +X. */
const SHIP_GEO = (() => {
  const hull = merge([
    slab([14, 0, 5, 3.2, -8, 3.8, -11, 2.4, -11, -2.4, -8, -3.8, 5, -3.2], 3.4, 0.8),
    slab([3, 3, -5, 12.5, -9.5, 13, -8.5, 3.2], 1.2, 0.3),
    slab([3, -3, -8.5, -3.2, -9.5, -13, -5, -12.5], 1.2, 0.3),
    new THREE.ExtrudeGeometry(poly([-4, 0, -10.5, 0, -11.5, 6, -8.5, 6]), { depth: 0.8, bevelEnabled: false }).translate(0, 1.6, -0.4),
  ]);
  const nacelle = (z: number) => new THREE.CylinderGeometry(1.9, 2.4, 8, 6).rotateZ(Math.PI / 2).translate(-8, 0, z);
  const dark = merge([nacelle(5.4), nacelle(-5.4), new THREE.BoxGeometry(7, 1.2, 1.6).translate(-5, -1.9, 0)]);
  const nozzle = (z: number) => new THREE.CircleGeometry(1.7, 6).rotateY(-Math.PI / 2).translate(-12.1, 0, z);
  const tip = (z: number) => new THREE.BoxGeometry(4.5, 0.7, 0.9).translate(-7.6, 0, z);
  const trim = merge([nozzle(5.4), nozzle(-5.4), tip(12.9), tip(-12.9), new THREE.BoxGeometry(10, 0.35, 0.9).translate(-4, 2.55, 0)]);
  const canopy = new THREE.OctahedronGeometry(1, 0).scale(4.2, 1.5, 2).translate(3.5, 2.5, 0);
  return shared(merge([hull, dark, trim, canopy], true));
})();
const FLAME_GEO = shared(merge([5.4, -5.4].map((z) => new THREE.ConeGeometry(1.5, 10, 6).rotateZ(Math.PI / 2).translate(-5, 0, z))));
const SHIELD_GEO = shared(new THREE.SphereGeometry(19, 20, 12));
/** Fresnel bubble: clear in the middle so the ship stays visible, bright at the rim. */
const SHIELD_MAT = shared(new THREE.ShaderMaterial({
  uniforms: { c: { value: new THREE.Color("#2ee6e6") } },
  vertexShader: "varying float f; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal); f = 1.0 - abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }",
  fragmentShader: "uniform vec3 c; varying float f; void main() { gl_FragColor = vec4(c, 0.04 + 0.75 * pow(f, 3.0)); \n#include <colorspace_fragment>\n }",
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
}));

export interface ShipModel {
  group: THREE.Group; body: THREE.Group; hull: THREE.Mesh; flames: THREE.Mesh; engine: THREE.Sprite; cargo: THREE.Sprite;
  shield: THREE.Mesh; crown: THREE.Object3D; label: THREE.Sprite | null; color: string;
  setColor(c: string): void; hit(): void; tick(dt: number): void;
}
export function ship(color: string, name = ""): ShipModel {
  const hullMat = lambert(color, 0.3), trimMat = unlit(color), flameMat = unlit(color, 0.9, true);
  const hull = new THREE.Mesh(SHIP_GEO, [hullMat, DARK, trimMat, GLASS]);
  const flames = new THREE.Mesh(FLAME_GEO, flameMat);
  flames.position.x = -12.1;
  const engine = glow(color, 14);
  engine.position.x = -15;
  const cargo = glow(LOOT_C, 1); // "your ship glows brighter the more you carry"
  cargo.position.y = -3;
  const shield = new THREE.Mesh(SHIELD_GEO, SHIELD_MAT);
  const crown = crownMesh(0.45);
  crown.position.y = 13;
  const body = new THREE.Group().add(hull, flames); // rolls into turns
  const group = new THREE.Group().add(body, engine, cargo, shield, crown);
  const lbl = name ? label(name, color, 0.042) : null;
  if (lbl) group.add(lift(lbl, 24));
  let flash = 0;
  const base = new THREE.Color();
  const m: ShipModel = {
    group, body, hull, flames, engine, cargo, shield, crown, label: lbl, color,
    setColor(c) {
      m.color = c;
      hullMat.color.set(c);
      base.set(c).multiplyScalar(0.3);
      hullMat.emissive.copy(base);
      trimMat.color.set(c);
      flameMat.color.set(c).lerp(WHITE, 0.4);
      engine.material.color.set(c);
    },
    hit() { flash = 1; },
    tick(dt) {
      if (flash <= 0) return;
      flash = Math.max(0, flash - dt * 6);
      hullMat.emissive.copy(base).lerp(WHITE, flash * 0.9);
    },
  };
  m.setColor(color);
  return m;
}

// ---------- Structures ----------
/** Tall beam that ignores fog: the way home is visible from anywhere on the map. Unit cylinder, scaled per use. */
const BEAM_GEO = shared(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0));
function beam(color: string, r: number, h: number, opacity: number, from: number) {
  const b = new THREE.Mesh(BEAM_GEO, unlit(color, opacity, true, FADE_TEX, false));
  b.scale.set(r, h, r);
  b.position.y = from;
  b.renderOrder = 1;
  return b;
}
function zone(color: string, r: number, opacity: number) {
  const z = new THREE.Mesh(r === T.HQ_R ? HQ_ZONE : r === T.RING_R ? RING_ZONE : BANK_ZONE, unlit(color, opacity, true, ZONE_TEX));
  z.position.y = -9;
  z.userData.base = opacity;
  return z;
}
const HQ_ZONE = shared(flat(new THREE.CircleGeometry(T.HQ_R, 64)));
const RING_ZONE = shared(flat(new THREE.CircleGeometry(T.RING_R, 64)));
const BANK_ZONE = shared(flat(new THREE.CircleGeometry(T.BANK_R, 48)));

// Ships fly at y = 0 and nothing collides, so structures keep out of that plane: docks sit below it, halos float above the camera.
const HQ_DARK = shared(merge([new THREE.CylinderGeometry(50, 58, 8, 6).translate(0, -18, 0), new THREE.CylinderGeometry(6, 10, 26, 6).translate(0, -35, 0)]));
const HQ_DECK = shared(new THREE.CylinderGeometry(44, 48, 2, 6).translate(0, -13, 0));
const HQ_LIGHTS = shared(merge([
  new THREE.TorusGeometry(16, 1.6, 4, 6).rotateX(Math.PI / 2).translate(0, -11.5, 0),
  ...around(6, (a) => new THREE.BoxGeometry(5, 1.5, 5).translate(Math.sin(a) * 40, -11.5, Math.cos(a) * 40)),
]));
const HQ_SPIN = shared(merge([new THREE.TorusGeometry(62, 2.4, 6, 48).rotateX(Math.PI / 2), new THREE.BoxGeometry(124, 1.2, 1.8), new THREE.BoxGeometry(1.8, 1.2, 124), new THREE.CylinderGeometry(6, 6, 6, 6)]).translate(0, 66, 0));
/** Bank-zone rim plus 12 chevrons pointing in: "fly in here". */
const HQ_EDGE = shared(merge([
  flat(new THREE.RingGeometry(T.HQ_R - 3, T.HQ_R, 96)),
  ...around(12, (a) => flat(new THREE.ShapeGeometry(poly([7, 0, -4, 6, -1, 0, -4, -6]))).rotateY(Math.PI - a).translate(Math.cos(a) * (T.HQ_R - 14), 0, Math.sin(a) * (T.HQ_R - 14))),
]).translate(0, -8.5, 0));

/** obj: placed in the world; detail: hidden when far (fog has eaten it anyway); spin: turns slowly. */
export interface Base { obj: THREE.Group; detail: THREE.Group; zone: THREE.Mesh; spin: THREE.Object3D; pulse: number }
/** HQ: hex platform, tower, spinning ring, bank zone with inward chevrons, sky beam. Yours gets the HUD's HOME marker instead of a label. */
export function hq(color: string, mine: boolean, text: string): Base {
  const hullMat = lambert(new THREE.Color(color).multiplyScalar(0.45), 0.25), lights = unlit(color);
  const z = zone(color, T.HQ_R, mine ? 0.5 : 0.3);
  const spin = new THREE.Mesh(HQ_SPIN, lambert(color, 0.7));
  const detail = new THREE.Group().add(new THREE.Mesh(HQ_DARK, DARK), new THREE.Mesh(HQ_DECK, hullMat), new THREE.Mesh(HQ_LIGHTS, lights), spin, lift(glow(color, 80), 66), lift(glow(color, 60), -10));
  const obj = new THREE.Group().add(detail, z, new THREE.Mesh(HQ_EDGE, unlit(color, mine ? 0.85 : 0.5, true)), beam(color, mine ? 7 : 4, mine ? 900 : 500, mine ? 0.55 : 0.3, 66));
  if (!mine) detail.add(lift(label(text, color, 0.05), 95));
  return { obj, detail, zone: z, spin, pulse: 0 };
}

const ST_DARK = shared(merge([new THREE.CylinderGeometry(20, 24, 10, 8).translate(0, -17, 0), new THREE.BoxGeometry(18, 3, 3).translate(13, -8, 0)]));
const ST_DECK = shared(merge([new THREE.CylinderGeometry(16, 18, 3, 8).translate(0, -10.5, 0), new THREE.SphereGeometry(8, 8, 4, 0, TAU, 0, Math.PI / 2).translate(0, -9, 0)]));
const ST_LIGHTS = shared(merge([new THREE.TorusGeometry(12, 1, 4, 8).rotateX(Math.PI / 2).translate(0, -8.5, 0), new THREE.BoxGeometry(2, 2, 2).translate(22.5, -8, 0)]));
const ST_SPIN = shared(new THREE.TorusGeometry(30, 1.6, 6, 32).rotateX(Math.PI / 2).translate(0, -12, 0));
const ST_EDGE = shared(flat(new THREE.RingGeometry(T.BANK_R - 2, T.BANK_R, 64)).translate(0, -8.5, 0));
export function station(color: string, glyph: string): Base {
  const spin = new THREE.Mesh(ST_SPIN, lambert(color, 0.7));
  const detail = new THREE.Group().add(new THREE.Mesh(ST_DARK, DARK), new THREE.Mesh(ST_DECK, lambert(color, 0.3)), new THREE.Mesh(ST_LIGHTS, unlit(color)), spin);
  const z = zone(color, T.BANK_R, 0.22);
  detail.add(lift(label(glyph, color, 0.045), 50));
  const obj = new THREE.Group().add(detail, z, new THREE.Mesh(ST_EDGE, unlit(color, 0.5, true)), beam(color, 2.5, 260, 0.35, 45));
  return { obj, detail, zone: z, spin, pulse: 0 };
}

const RING_EDGE = shared(merge([
  new THREE.TorusGeometry(T.RING_R, 2.2, 4, 72).rotateX(Math.PI / 2),
  ...around(36, (a) => new THREE.BoxGeometry(1.6, 1.4, 9).rotateY(Math.PI / 2 - a).translate(Math.cos(a) * (T.RING_R - 7), 0, Math.sin(a) * (T.RING_R - 7))),
]));
export interface RingModel extends Base { arc: THREE.Mesh; arcMat: THREE.MeshBasicMaterial; prog: number; setProg(p: number, color: string): void }
/** Capture zone: ticked rim in the owner's colour, a progress arc that fills while someone claims it. */
export function ring(color: string | null, glyph: string): RingModel {
  const c = color ?? NEUTRAL_C;
  const edge = new THREE.Mesh(RING_EDGE, lambert(c, color ? 0.7 : 0.5));
  const arcGeo = flat(new THREE.RingGeometry(T.RING_R + 5, T.RING_R + 12, 72));
  arcGeo.userData.own = true;
  const arcMat = unlit("#ffffff", 0.9, true);
  const arc = new THREE.Mesh(arcGeo, arcMat);
  arc.position.y = -6;
  const z = zone(c, T.RING_R, color ? 0.35 : 0.18);
  edge.position.y = -8;
  const detail = new THREE.Group().add(edge, arc);
  const obj = new THREE.Group().add(detail, z);
  if (color) detail.add(lift(label(glyph, color, 0.05), 30));
  const r: RingModel = {
    obj, detail, zone: z, spin: edge, pulse: 0, arc, arcMat, prog: -1,
    setProg(p, col) {
      const n = Math.round(Math.max(0, Math.min(1, p)) * 72);
      if (n === r.prog) return;
      r.prog = n;
      arcGeo.setDrawRange(0, n * 6);
      arcMat.color.set(col);
    },
  };
  r.setProg(0, c);
  return r;
}

/** A loot field is a glowing nebula with a dashed rim — nothing solid, so it doesn't read as an obstacle. */
const FIELD_DASH = shared(new THREE.LineDashedMaterial({ color: LOOT_C, dashSize: 14, gapSize: 10, transparent: true, opacity: 0.45 }));
const FIELD_RIM = (() => {
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circle(96, T.FIELD_R, -9)));
  line.computeLineDistances();
  return shared(line.geometry);
})();
export interface FieldModel { obj: THREE.Group; detail: THREE.Group; spin: THREE.Object3D; setFill(f: number): void }
export function field(id: number): FieldModel {
  let s = id * 9301 + 49297;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const n = 7, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tint = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * T.FIELD_R * 0.7;
    pos.set([Math.cos(a) * d, -4 + r() * 10, Math.sin(a) * d], i * 3);
    tint.set(LOOT_C).lerp(new THREE.Color("#4dabff"), r() * 0.6).toArray(col, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.userData.own = true;
  const cloud = new THREE.PointsMaterial({ map: GLOW_TEX, size: 170, vertexColors: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
  const puffs = new THREE.Points(geo, cloud);
  const detail = new THREE.Group().add(puffs);
  const obj = new THREE.Group().add(detail, new THREE.Line(FIELD_RIM, FIELD_DASH));
  return { obj, detail, spin: puffs, setFill: (f) => void (cloud.opacity = 0.05 + 0.11 * f) };
}

// ---------- Loot, bolts, Vault, Crown ----------
const LOOT_GEO = shared(new THREE.OctahedronGeometry(4.5, 0).scale(1, 1.5, 1));
const LOOT_MAT = shared(new THREE.MeshLambertMaterial({ color: LOOT_C, emissive: "#2fd6a6", flatShading: true }));
export function loot(max: number) {
  const m = new THREE.InstancedMesh(LOOT_GEO, LOOT_MAT, max);
  m.frustumCulled = false;
  m.count = 0;
  return m;
}
/** Soft halo under every crystal, one draw call (Points billboard for free). */
export function halos(max: number, color: string, size: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(max * 3), 3));
  geo.setDrawRange(0, 0);
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: GLOW_TEX, color, size, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  p.frustumCulled = false;
  return p;
}

/** Bright core + coloured glow sleeve; both instanced. */
export function bolts(max: number) {
  const mk = (geo: THREE.BufferGeometry, opacity: number) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, transparent: true, opacity, depthWrite: false }), max);
    m.frustumCulled = false;
    m.count = 0;
    return m;
  };
  return { core: mk(new THREE.BoxGeometry(16, 1.4, 1.4), 1), sleeve: mk(new THREE.BoxGeometry(26, 5, 5), 0.35) };
}

/** Gold dodecahedron in a wire cage; cracked = the halves drift apart and the core blazes. userData.mat fades it up close. */
export function vault() {
  const g = new THREE.Group();
  const mat = Object.assign(lambert(GOLD_C, 0.45), { transparent: true });
  g.userData.mat = mat;
  for (const side of [1, -1]) {
    const half = new THREE.Mesh(new THREE.DodecahedronGeometry(T.VAULT_R * 0.8), mat);
    half.scale.set(1, 1, 0.5);
    half.position.z = side * T.VAULT_R * 0.2;
    half.name = side === 1 ? "a" : "b";
    g.add(half);
  }
  const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(T.VAULT_R * 1.2, 0)), new THREE.LineBasicMaterial({ color: GOLD_C, transparent: true, opacity: 0.5 }));
  cage.name = "cage";
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(T.VAULT_R * 1.6, 1.2, 4, 64).rotateX(Math.PI / 2 - 0.25), unlit(GOLD_C, 0.6, true));
  orbit.name = "orbit";
  const core = glow(GOLD_C, T.VAULT_R * 2.4);
  core.name = "core";
  const lbl = label("VAULT", GOLD_C, 0.055);
  lbl.position.y = T.VAULT_R + 34;
  g.add(cage, orbit, core, lbl);
  return g;
}

const CROWN_GEO = shared(merge([
  new THREE.CylinderGeometry(8, 7, 5, 10),
  ...around(5, (a) => new THREE.ConeGeometry(1.9, 6, 4).translate(Math.cos(a) * 7.3, 5.5, Math.sin(a) * 7.3)),
  new THREE.OctahedronGeometry(2.4).translate(0, 0, 7.6),
]));
const crownMesh = (s: number) => { const m = new THREE.Mesh(CROWN_GEO, GOLD); m.scale.setScalar(s); return m; };
export function crown() {
  const g = new THREE.Group();
  g.add(crownMesh(1.5), glow(GOLD_C, 80));
  return g;
}

// ---------- The objective arrow ----------
/**
 * A thick 3D arrow (shaft + head) hovering over your ship. obj yaws with the ship; its card is tilted toward the
 * chase camera (a flat arrow seen at the camera's ~15° would be a sliver); mesh yaws within the card to the target.
 */
export function arrow() {
  const mat = new THREE.MeshLambertMaterial({ color: GOLD_C, emissive: new THREE.Color(GOLD_C).multiplyScalar(0.6), flatShading: true });
  const mesh = new THREE.Mesh(slab([-11, -3.2, 2, -3.2, 2, -9, 15, 0, 2, 9, 2, 3.2, -11, 3.2], 3, 0.9), mat);
  const halo = glow(GOLD_C, 40);
  halo.material.opacity = 0.3;
  const card = new THREE.Group().add(mesh, halo);
  card.rotation.z = 0.7;
  card.scale.setScalar(0.8);
  const obj = new THREE.Group().add(card);
  return {
    obj, mesh,
    setColor(c: string) {
      if (mat.userData.c === c) return;
      mat.userData.c = c;
      mat.color.set(c);
      mat.emissive.set(c).multiplyScalar(0.6);
      halo.material.color.set(c);
    },
  };
}

// ---------- World and backdrop ----------
export function world(R: number) {
  const grid = new THREE.GridHelper(R * 2, Math.round(R / 50), "#16406a", "#0c2444");
  grid.position.y = -24;
  // Map edge: a glowing curtain you can see coming, not an invisible wall.
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 110, 128, 1, true), unlit("#2ee6e6", 0.35, true, FADE_TEX));
  wall.position.y = 31;
  const rim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circle(128, R, -22)), new THREE.LineBasicMaterial({ color: "#2ee6e6" }));
  return new THREE.Group().add(grid, wall, rim);
}

/** Things at infinity: follow the camera's position, never its rotation. */
export function backdrop() {
  const g = new THREE.Group();
  const skyTex = canvasTex(1024, 512, (c) => {
    const v = c.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0, "#02040c");
    v.addColorStop(0.36, "#08112a");
    v.addColorStop(0.47, "#141238");
    v.addColorStop(0.53, "#0a1430");
    v.addColorStop(1, "#02040b");
    c.fillStyle = v;
    c.fillRect(0, 0, 1024, 512);
    let s = 11;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const tints = ["199,125,255", "46,230,230", "255,77,109", "77,171,255"];
    for (let i = 0; i < 18; i++) {
      const x = r() * 1024, y = 170 + r() * 150, rad = 50 + r() * 150;
      const gr = c.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${tints[i % 4]},${0.08 + r() * 0.1})`);
      gr.addColorStop(1, `rgba(${tints[i % 4]},0)`);
      c.fillStyle = gr;
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -2;
  // Stars: brightness and tint vary per vertex; a few big ones in a second layer.
  const layer = (n: number, size: number) => {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * TAU, rr = Math.sqrt(1 - u * u);
      pos.set([Math.cos(a) * rr * 2000, u * 2000, Math.sin(a) * rr * 2000], i * 3);
      c.set(["#ffffff", "#9fb6ff", "#ffe2b0", "#bfe9ff"][i % 4]).multiplyScalar(0.35 + Math.random() * 0.65).toArray(col, i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: false, fog: false, depthWrite: false }));
    p.renderOrder = -1;
    return p;
  };
  // A ringed planet low on one horizon gives the void a sense of scale and direction.
  const planet = new THREE.Mesh(new THREE.SphereGeometry(190, 32, 20), new THREE.MeshLambertMaterial({ color: "#6a4bd0", emissive: "#1d1046", fog: false }));
  const prings = new THREE.Mesh(flat(new THREE.RingGeometry(250, 360, 72)), new THREE.MeshBasicMaterial({ color: "#c77dff", transparent: true, opacity: 0.22, side: THREE.DoubleSide, fog: false, depthWrite: false }));
  prings.rotation.set(0.3, 0, 0.35);
  const pg = new THREE.Group().add(planet, prings);
  pg.position.set(-1050, 240, -1250);
  g.add(sky, layer(1400, 1.6), layer(160, 3), pg);
  return g;
}

/** Space dust that wraps around the camera: the only thing that shows speed in empty space. */
export function dust(n = 360, box = 700) {
  const base = new Float32Array(n * 3), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) base.set([Math.random() * box, -30 + Math.random() * 90, Math.random() * box], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const obj = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#9fb6ff", size: 2, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false }));
  obj.frustumCulled = false;
  const wrap = (v: number) => ((v % box) + box) % box - box / 2;
  return {
    obj,
    update(cx: number, cz: number) {
      for (let i = 0; i < n * 3; i += 3) {
        pos[i] = cx + wrap(base[i] - cx);
        pos[i + 1] = base[i + 1];
        pos[i + 2] = cz + wrap(base[i + 2] - cz);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// ---------- Pooled effects: sparks, shockwaves, flashes, crystals flying home ----------
export function effects(scene: THREE.Scene) {
  const N = 400;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3), base = new Float32Array(N * 3);
  const life = new Float32Array(N), max = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const sparks = new THREE.Points(geo, new THREE.PointsMaterial({ size: 6, map: GLOW_TEX, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  let next = 0, live = 0;
  const tc = new THREE.Color();

  const RING_GEO = flat(new THREE.RingGeometry(0.8, 1, 48));
  const rings = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(RING_GEO, unlit("#ffffff", 1, true));
    m.visible = false;
    scene.add(m);
    return { m, t: 0, d: 1, r: 1 };
  });
  const flashes = Array.from({ length: 8 }, () => {
    const s = glow("#ffffff", 1);
    s.visible = false;
    scene.add(s);
    return { s, t: 0, d: 1, size: 1 };
  });
  const crystals = new THREE.InstancedMesh(LOOT_GEO, LOOT_MAT, 24);
  crystals.count = 0;
  crystals.frustumCulled = false;
  scene.add(crystals);
  const flights: { fx: number; fz: number; tx: number; tz: number; t: number }[] = [];
  const o = new THREE.Object3D();
  let ri = 0, fi = 0;

  return {
    /** n sparks from (x, y, z), flying out at up to `speed`, fading over `dur` seconds. */
    burst(x: number, y: number, z: number, color: string, n: number, speed: number, dur: number) {
      tc.set(color);
      for (let k = 0; k < n; k++) {
        const i = next;
        next = (next + 1) % N;
        const a = Math.random() * TAU, b = (Math.random() - 0.3) * Math.PI * 0.6, v = speed * (0.35 + Math.random() * 0.65);
        vel.set([Math.cos(a) * Math.cos(b) * v, Math.sin(b) * v, Math.sin(a) * Math.cos(b) * v], i * 3);
        pos.set([x, y, z], i * 3);
        tc.toArray(base, i * 3);
        life[i] = max[i] = dur * (0.6 + Math.random() * 0.4);
      }
      live = 1;
    },
    shock(x: number, z: number, color: string, radius: number, dur: number) {
      const r = rings[ri++ % rings.length];
      (r.m.material as THREE.MeshBasicMaterial).color.set(color);
      r.m.position.set(x, -4, z);
      Object.assign(r, { t: 0, d: dur, r: radius });
      r.m.visible = true;
    },
    flash(x: number, y: number, z: number, color: string, size: number, dur: number) {
      const f = flashes[fi++ % flashes.length];
      f.s.material.color.set(color);
      f.s.position.set(x, y, z);
      Object.assign(f, { t: 0, d: dur, size });
      f.s.visible = true;
    },
    /** Crystals arc from the ship into the bank. */
    bankFlight(fx: number, fz: number, tx: number, tz: number, n: number) {
      for (let k = 0; k < n && flights.length < 24; k++) flights.push({ fx: fx + (Math.random() - 0.5) * 16, fz: fz + (Math.random() - 0.5) * 16, tx, tz, t: -k * 0.05 });
    },
    tick(dt: number) {
      if (live) {
        live = 0;
        for (let i = 0; i < N; i++) {
          if (life[i] <= 0) continue;
          life[i] -= dt;
          const k = Math.max(0, life[i] / max[i]), j = i * 3;
          for (let a = 0; a < 3; a++) {
            pos[j + a] += vel[j + a] * dt;
            vel[j + a] *= 1 - 2.2 * dt;
            col[j + a] = base[j + a] * k;
          }
          live = 1;
        }
        geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
      }
      for (const r of rings) {
        if (!r.m.visible) continue;
        r.t += dt;
        const u = r.t / r.d;
        r.m.scale.setScalar(4 + r.r * (1 - (1 - u) ** 3));
        (r.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - u);
        r.m.visible = u < 1;
      }
      for (const f of flashes) {
        if (!f.s.visible) continue;
        f.t += dt;
        const u = f.t / f.d;
        f.s.scale.setScalar(f.size * (0.6 + 0.6 * u));
        f.s.material.opacity = Math.max(0, 1 - u);
        f.s.visible = u < 1;
      }
      let n = 0;
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i];
        f.t += dt / 0.55;
        if (f.t >= 1) { flights.splice(i, 1); continue; }
        const u = Math.max(0, f.t), e = u * u * (3 - 2 * u);
        o.position.set(f.fx + (f.tx - f.fx) * e, 6 + Math.sin(u * Math.PI) * 45, f.fz + (f.tz - f.fz) * e);
        o.rotation.set(0, u * 9, 0);
        o.scale.setScalar(f.t < 0 ? 0 : 1 - 0.5 * u);
        o.updateMatrix();
        crystals.setMatrixAt(n++, o.matrix);
      }
      crystals.count = n;
      crystals.instanceMatrix.needsUpdate = true;
    },
  };
}
export type Effects = ReturnType<typeof effects>;
