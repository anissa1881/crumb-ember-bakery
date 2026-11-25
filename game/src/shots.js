// The screenshot scenes behind ?shot=start|play|almanac|served. Each one plays the real
// rules forward from a fresh world, steered by a small scripted autopilot (walk to a station,
// use it, wait for the oven or the bowl), so the frame is what a real game looks like and the
// same seed always gives the same frame.
import { STEP, STATIONS, PANTRY, INGREDIENT_IDS } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_ALMANAC } from './render.js';

const STEP_CAP = 60 * 150;

/** Approach point for a station kind ('bowl', 'oven', …, or 'pantry:flour'). */
function approachFor(kind) {
  if (kind.startsWith('pantry:')) {
    const index = INGREDIENT_IDS.indexOf(kind.slice('pantry:'.length));
    return [PANTRY.approachX, PANTRY.y + index * (PANTRY.h + PANTRY.gap) + PANTRY.h / 2];
  }
  return STATIONS[kind].approach;
}

/**
 * Walk to a station (the world's A* path does the walking) and keep using it until
 * `until(world)` is true (a take, a drop, a bake). Gives up after a few uses so a missed
 * condition never hangs the staging.
 */
function useStation(kind, until) {
  const [ax, ay] = approachFor(kind);
  let targeted = false;
  let uses = 0;
  let wait = 0;
  return (world) => {
    if (until(world)) return null;
    const chef = world.state.chef;
    const distance = Math.hypot(ax - chef.x, ay - chef.y);
    if (!targeted) {
      world.state.moveTarget = { x: ax, y: ay };
      world.state.moveStation = kind;
      targeted = true;
      wait = 0;
    }
    if (world.state.moveTarget) {
      // Still walking there; the world drives the chef along its path.
      wait += 1;
      if (wait > 60 * 20) return null; // A walk that takes 20 s is stuck; give up.
      return { dx: 0, dy: 0, interact: false, dash: false };
    }
    if (distance > 30) {
      // Arrived somewhere else (or the walk was cut short): walk again.
      targeted = false;
      return { dx: 0, dy: 0, interact: false, dash: false };
    }
    if (uses >= 6) return null;
    uses += 1;
    return { dx: 0, dy: 0, interact: true, dash: false };
  };
}

/** Stand still until `condition(world)` holds, or the seconds run out. */
function waitUntil(condition, seconds = 40) {
  let elapsed = 0;
  return (world) => {
    if (condition(world)) return null;
    elapsed += STEP;
    if (elapsed > seconds) return null;
    return { dx: 0, dy: 0, interact: false, dash: false };
  };
}

/** Stand still for a fixed number of seconds. */
function waitSeconds(seconds) {
  let elapsed = 0;
  return (world) => {
    elapsed += STEP;
    if (elapsed >= seconds) return null;
    return { dx: 0, dy: 0, interact: false, dash: false };
  };
}

function handsHave(world, item) {
  return world.state.hands.includes(item);
}

/** Run the script's steps against the world, each step returning its input per tick. */
function runScript(world, steps) {
  let total = 0;
  for (const stepFn of steps) {
    let guard = 0;
    while (guard < 60 * 90 && total < STEP_CAP) {
      guard += 1;
      total += 1;
      const input = stepFn(world);
      if (input === null) break;
      world.step(STEP, input);
      if (world.state.gameOver || world.state.victory || world.state.shiftWon) return;
    }
  }
}

/** The croissant, from pantry to plate, carried ready to serve. */
function bakeAndPlateCroissant() {
  return [
    useStation('pantry:flour', (world) => handsHave(world, 'flour')),
    useStation('pantry:butter', (world) => handsHave(world, 'butter')),
    useStation('bowl', (world) => world.state.bowl.contents.includes('flour')),
    useStation('bowl', (world) => world.state.bowl.mixing > 0),
    waitUntil((world) => world.state.bowl.dough === 'croissant'),
    useStation('bowl', (world) => handsHave(world, 'dough:croissant')),
    useStation('oven', (world) => world.state.oven.item === 'dough:croissant'),
    waitUntil((world) => world.state.oven.ready),
    useStation('oven', (world) => handsHave(world, 'baked:croissant')),
    useStation('plating', (world) => handsHave(world, 'plated:croissant')),
  ];
}

/** Fixed, readable orders for the staged scenes (the live game deals them randomly). */
function setOrders(world, recipeIds, seconds) {
  world.state.orders = recipeIds.map((recipeId, index) => ({
    id: index + 1,
    recipeId,
    timeLeft: seconds[index],
    total: seconds[index],
  }));
  world.state.nextOrderId = recipeIds.length + 1;
  world.state.spawnTimer = 999;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title. play: a plated croissant in hand, sourdough mixing in the bowl.
 * almanac: the recipe book open over a live kitchen. served: just after a serve.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    setOrders(world, ['croissant', 'berrytart', 'honeycake', 'cinnamon'], [45, 50, 40, 48]);
    runScript(world, [
      ...bakeAndPlateCroissant(),
      useStation('pantry:flour', (w) => handsHave(w, 'flour')),
      useStation('bowl', (w) => w.state.bowl.contents.includes('flour')),
      useStation('pantry:honey', (w) => handsHave(w, 'honey')),
      useStation('bowl', (w) => w.state.bowl.mixing > 0),
      waitUntil((w) => w.state.bowl.mixing > 0.4),
    ]);
    // Fresh order timers for the frame: the staging took most of a minute.
    setOrders(world, ['croissant', 'berrytart', 'honeycake', 'cinnamon'], [42, 48, 38, 45]);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'served') {
    setOrders(world, ['croissant', 'berrytart', 'babka', 'honeycake'], [50, 45, 40, 55]);
    runScript(world, [
      ...bakeAndPlateCroissant(),
      useStation('serve', (w) => w.state.served === 1),
      waitSeconds(0.5),
    ]);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'almanac') {
    setOrders(world, ['berrytart', 'croissant', 'cinnamon', 'babka'], [48, 44, 52, 38]);
    runScript(world, [
      useStation('pantry:flour', (w) => handsHave(w, 'flour')),
      useStation('pantry:butter', (w) => handsHave(w, 'butter')),
      useStation('bowl', (w) => w.state.bowl.contents.includes('flour')),
      useStation('bowl', (w) => w.state.bowl.mixing > 0),
    ]);
    return { screen: SCREEN_ALMANAC };
  }
  for (let index = 0; index < 5 / STEP; index += 1) world.step(STEP, { dx: 0, dy: 0, interact: false, dash: false });
  return { screen: SCREEN_TITLE };
}
