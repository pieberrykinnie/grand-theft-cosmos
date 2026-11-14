// Every number in GDD §15. Perks and sector rules are override tables on BASE.

export const T = {
  // Room
  MAX_PLAYERS: 12,
  TARGETS: [600, 2500, 8000],
  LEVELS: 10, // level up every target / LEVELS banked
  LATE_PICKS: 3,
  // Network
  TICK_HZ: 10,
  PUB_HOST_EVERY: 5, // ticks → 2 Hz
  PUB_PHONE_EVERY: 10, // ticks → 1 Hz
  INPUT_HZ: 5,
  HEARTBEAT_S: 2,
  SAVE_S: 10,
  CLIENT_DEAD_S: 3,
  OFFLINE_S: 6,
  STASIS_S: 10,
  AUTOPAUSE_S: 30,
  MAX_MSG: 512,
  RATE: 15,
  BURST: 30,
  FLOOD_S: 3,
  MAX_DT: 0.25,
  // Map
  MIN_WEDGES: 4,
  R0: 800,
  R_PER_WEDGE: 150,
  HQ_AT: 0.92,
  HOME_AT: 0.75,
  RING_AT: [0.47, 0.63],
  WILD_AT: [0.3, 0.45],
  NEW_WILD_AT: [0.25, 0.7],
  STATION_GAP: 300,
  // Ship
  SHIP_R: 10,
  TURN: Math.PI, // 180°/s
  TURN_SLACK: 1.2,
  TH_MIN: -0.4,
  RESPAWN_S: 5,
  RESPAWN_SHIELD: 3,
  ROOKIE_SHIELD: 60,
  RECONNECT_SHIELD: 2,
  DASH_FX: 0.3, // s the BOOST flag stays up after a dash: outlives one MAX_DT step, so a snapshot carries it
  // Weapon
  KILL_WINDOW: 10,
  // Loot
  CRYSTAL: 5,
  SPILL_LIFE: 120,
  // Fields
  FIELD_R: 120,
  HOME_MAX: 6,
  WILD_MAX: 15,
  WILD_BUDGET: 600,
  WILD_REFORM: 30,
  // Ring
  RING_R: 110,
  CAPTURE_S: 10,
  RING_DECAY: 0.1,
  RING_PAY_EVERY: 5,
  RADAR: 450,
  // HQ
  HQ_R: 140,
  // Station
  STATION_R: 30,
  STATION_MAX: 3,
  BUILD_S: 5,
  BUILD_SPEED: 5,
  STATION_RANGE: 200,
  BANK_R: 110,
  STATION_PAY_EVERY: 10,
  TAKEN_AT: 0.5,
  TURRET_RATE: 4, // turret bolts per second; dps is split across them
  // Vault and Crown
  VAULT_R: 60,
  VAULT_HP: 600,
  VAULT_REGEN: 20,
  VAULT_REGEN_AFTER: 5,
  CROWN_RETURN: 30,
  // Scanner pings
  PING_FADE: 8,
  FIRE_PING_EVERY: 2,
  WRECK_S: 12,
};

// Stats that perks (per player) and sectors (global) may modify: stat = base × sector × perks + adds.
export const BASE = {
  speed: 70,
  accel: 140,
  drag: 0.8,
  boostDist: 120, // "boost" is the DASH: an instant hop this far
  boostCd: 5,
  hull: 100,
  regen: 5,
  regenDelay: 6,
  sensors: 450,
  dmg: 10,
  fireRate: 4,
  boltSpeed: 450,
  range: 320,
  aimCone: (15 * Math.PI) / 180,
  guns: 1,
  hold: 50,
  pickup: 25,
  dropFrac: 1,
  ghost: 0,
  stationHp: 400,
  stationDps: 12,
  hqDps: 30,
  homeEvery: 10,
  wildEvery: 4,
  ringPay: 1,
  stationPay: 1,
  crownValue: 0.15,
  crownSpeed: 0.6,
  spillMul: 1,
  blackout: 0,
};
export type StatKey = keyof typeof BASE;

export interface Mod {
  mul?: Partial<Record<StatKey, number>>;
  add?: Partial<Record<StatKey, number>>;
}
export interface PerkDef extends Mod { name: string; desc: string; max: number }
export interface SectorDef extends Mod { name: string; desc: string }

export const PERKS = {
  heavy: { name: "Heavy Bolts", desc: "+30% damage", max: 3, mul: { dmg: 1.3 } },
  rapid: { name: "Rapid Fire", desc: "+30% fire rate", max: 3, mul: { fireRate: 1.3 } },
  twin: { name: "Twin Guns", desc: "Fire 2 bolts at once", max: 1, add: { guns: 1 } },
  thick: { name: "Thick Hull", desc: "+40 max hull", max: 3, add: { hull: 40 } },
  thrust: { name: "Thrusters", desc: "+12% top speed", max: 3, mul: { speed: 1.12 } },
  burner: { name: "Afterburner", desc: "−35% dash cooldown", max: 2, mul: { boostCd: 0.65 } },
  bighold: { name: "Big Hold", desc: "+25 hold", max: 3, add: { hold: 25 } },
  magnet: { name: "Magnet", desc: "+60% pickup radius", max: 2, mul: { pickup: 1.6 } },
  ghost: { name: "Ghost", desc: "Dash and bank without pinging", max: 1, add: { ghost: 1 } },
  fortify: { name: "Fortify", desc: "Stations +50% HP and turret damage", max: 2, mul: { stationHp: 1.5, stationDps: 1.5 } },
  patch: { name: "Patch Kit", desc: "Regen starts 2 s after damage", max: 1, mul: { regenDelay: 1 / 3 } },
  insurance: { name: "Insurance", desc: "Drop only half your hold on death", max: 1, mul: { dropFrac: 0.5 } },
} satisfies Record<string, PerkDef>;
export type PerkId = keyof typeof PERKS;

export const SECTORS = {
  calm: { name: "Calm", desc: "No change" },
  lode: { name: "Mother Lode", desc: "Fields grow 2× faster", mul: { homeEvery: 0.5, wildEvery: 0.5 } },
  blackout: { name: "Blackout", desc: "Scanner shows only deaths, the leader and the Crown", add: { blackout: 1 } },
  glass: { name: "Glass Cannons", desc: "All damage ×2", mul: { dmg: 2, stationDps: 2, hqDps: 2 } },
  hotrings: { name: "Hot Rings", desc: "Rings pay ×2", mul: { ringPay: 2 } },
  burners: { name: "Afterburners", desc: "Everyone ×1.25 speed, dash cooldown halved", mul: { speed: 1.25, boostCd: 0.5 } },
  fatcrown: { name: "Fat Crown", desc: "Crown worth ×2, carrier flies at ×0.45", mul: { crownValue: 2, crownSpeed: 0.75 } },
  pirate: { name: "Pirate Code", desc: "Loot spilled on death is worth ×1.5", mul: { spillMul: 1.5 } },
} satisfies Record<string, SectorDef>;
export type SectorId = keyof typeof SECTORS;
