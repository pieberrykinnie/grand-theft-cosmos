// Every 3D asset is generated from Three.js primitives. Zero asset files.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { T } from "../shared/tuning";

const FLAT = (color: THREE.ColorRepresentation, glow = 0.3) =>
  new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: new THREE.Color(color).multiplyScalar(glow) });
const flat = (geo: THREE.BufferGeometry) => { geo.rotateX(-Math.PI / 2); return geo; }; // XY-plane shapes → lie on XZ

let glowTex: THREE.Texture | null = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return (glowTex = new THREE.CanvasTexture(c));
}
export function glow(color: THREE.ColorRepresentation, size: number) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(size);
  return s;
}

const SHIP_GEO = (() => {
  const body = new THREE.ConeGeometry(5, 22, 6).rotateZ(-Math.PI / 2); // nose → +X
  const wing = new THREE.BoxGeometry(10, 1.5, 9);
  return mergeGeometries([body, wing.clone().translate(-5, 0, 8), wing.translate(-5, 0, -8)]);
})();
const SHIELD_MAT = new THREE.MeshBasicMaterial({ color: "#2ee6e6", wireframe: true, transparent: true, opacity: 0.35 });
const GOLD = FLAT("#ffd23f", 0.5);

export interface ShipModel { group: THREE.Group; hull: THREE.Mesh; engine: THREE.Sprite; shield: THREE.Mesh; crown: THREE.Mesh }
/** Cone + 2 wings in one draw call; the engine glows brighter with loot carried. */
export function ship(color: string): ShipModel {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(SHIP_GEO, FLAT(color, 0.35));
  const engine = glow(color, 10);
  engine.position.x = -12;
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(17, 1), SHIELD_MAT);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(5), GOLD);
  crown.position.y = 14;
  group.add(hull, engine, shield, crown);
  return { group, hull, engine, shield, crown };
}

export function hq(color: string) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(34, 44, 16, 12), FLAT(color, 0.25)));
  const torus = new THREE.Mesh(new THREE.TorusGeometry(58, 2.5, 6, 40), FLAT(color, 0.8));
  torus.rotation.x = Math.PI / 2;
  torus.position.y = 14;
  torus.name = "spin";
  const zone = new THREE.Mesh(flat(new THREE.RingGeometry(T.HQ_R - 3, T.HQ_R, 64)), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  zone.position.y = -6;
  g.add(torus, zone);
  return g;
}

export function station(color: string) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 26, 8), FLAT(color, 0.25)));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(30, 2, 6, 24), FLAT(color, 0.8));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 16;
  ring.name = "spin";
  const bank = new THREE.Mesh(flat(new THREE.RingGeometry(T.BANK_R - 2, T.BANK_R, 48)), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  bank.position.y = -6;
  g.add(ring, bank);
  return g;
}

export function ring() {
  const m = new THREE.Mesh(new THREE.TorusGeometry(T.RING_R, 3, 6, 64), FLAT("#2a4466", 0.6));
  m.rotation.x = Math.PI / 2;
  return m;
}

const ROCK = new THREE.IcosahedronGeometry(1, 0), ROCK_MAT = FLAT("#4a5570", 0.15);
/** ~30 low-detail rocks, laid out deterministically from the field id. */
export function field(id: number) {
  const m = new THREE.InstancedMesh(ROCK, ROCK_MAT, 30);
  let s = id * 9301 + 49297;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const o = new THREE.Object3D();
  for (let i = 0; i < 30; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * T.FIELD_R;
    o.position.set(Math.cos(a) * d, (r() - 0.5) * 20, Math.sin(a) * d);
    o.rotation.set(r() * 6, r() * 6, r() * 6);
    o.scale.setScalar(4 + r() * 12);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  }
  return m;
}

export function loot(max: number) {
  const m = new THREE.InstancedMesh(new THREE.OctahedronGeometry(4), new THREE.MeshLambertMaterial({ color: "#7fffd4", emissive: "#2fd6a6", flatShading: true }), max);
  m.frustumCulled = false;
  m.count = 0;
  return m;
}

export function bolts(max: number) {
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(18, 2, 2), new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), max);
  m.frustumCulled = false;
  m.count = 0;
  return m;
}

/** Gold dodecahedron; cracked = two halves drift apart. */
export function vault() {
  const g = new THREE.Group();
  for (const side of [1, -1]) {
    const half = new THREE.Mesh(new THREE.DodecahedronGeometry(T.VAULT_R * 0.8), GOLD);
    half.scale.set(side === 1 ? 1 : 1, 1, 0.5);
    half.position.z = side * T.VAULT_R * 0.2;
    half.name = side === 1 ? "a" : "b";
    g.add(half);
  }
  return g;
}

export function crown() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(10), GOLD), glow("#ffd23f", 60));
  return g;
}

export function stars() {
  const pos = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * r * 2000, u * 2000, Math.sin(a) * r * 2000], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: "#9fb6ff", size: 2, sizeAttenuation: false, fog: false }));
}

/** A 0.6 s burst of points. Returns the object and a tick(dt) → alive. */
export function explosion(color: string, x: number, z: number) {
  const n = 40, pos = new Float32Array(n * 3), vel: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2, v = 40 + Math.random() * 90;
    vel.push(Math.cos(a) * Math.cos(b) * v, Math.sin(b) * v, Math.sin(a) * Math.cos(b) * v);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size: 5, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.position.set(x, 0, z);
  let t = 0;
  return {
    obj: pts,
    tick(dt: number) {
      t += dt;
      for (let i = 0; i < n * 3; i++) pos[i] = vel[i] * t;
      geo.attributes.position.needsUpdate = true;
      mat.opacity = Math.max(0, 1 - t / 0.6);
      return t < 0.6;
    },
  };
}
