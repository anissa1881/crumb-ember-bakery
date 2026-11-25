// Crumb & Ember Bakery — the world: the chef, the stations, the orders and the money.
// One job: the rules. No drawing, no sound, no DOM here; step() advances the world by dt
// and reports what happened as event flags, so the loop can play sounds and announce.
import {
  STEP, CHEF_SPEED, CHEF_RADIUS, DASH_SPEED, DASH_TIME, DASH_COOLDOWN, HAND_SLOTS,
  INTERACT_RANGE, MIX_SECONDS, BAKE_SECONDS, BURN_GRACE_SECONDS, MAX_ORDERS,
  ORDER_SECONDS, ORDER_SPAWN_DELAY, COMBO_WINDOW_SECONDS, SHIFTS, INGREDIENTS,
  RECIPES, RECIPE_BY_ID, STATIONS, PANTRY, INGREDIENT_IDS, FLOOR, CHEF_START,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_DROP = 2;
export const EVENT_MIX_START = 4;
export const EVENT_DOUGH = 8;
export const EVENT_OVEN_READY = 16;
export const EVENT_BURNT = 32;
export const EVENT_SERVED = 64;
export const EVENT_WRONG = 128;
export const EVENT_EXPIRED = 256;
export const EVENT_SHIFT_WIN = 512;
export const EVENT_GAME_OVER = 1024;
export const EVENT_VICTORY = 2048;
export const EVENT_ERROR = 4096;
export const EVENT_DECORATE = 8192;
export const EVENT_PLATE = 16384;

/** True when the bowl's contents are exactly one recipe's ingredients. */
function matchRecipe(contents) {
  if (contents.length === 0) return null;
  for (const recipe of RECIPES) {
    if (recipe.ingredients.length !== contents.length) continue;
    if (recipe.ingredients.every((ingredient) => contents.includes(ingredient))) return recipe;
  }
  return null;
}

/** True when the contents could still become some recipe (a subset of its ingredients). */
function canStillMatch(contents) {
  return RECIPES.some((recipe) => contents.every((ingredient) => recipe.ingredients.includes(ingredient)));
}

function stationRects() {
  const rects = Object.values(STATIONS).map((station) => ({ x: station.x, y: station.y, w: station.w, h: station.h }));
  for (let index = 0; index < INGREDIENT_IDS.length; index += 1) {
    rects.push({ x: PANTRY.x, y: PANTRY.y + index * (PANTRY.h + PANTRY.gap), w: PANTRY.w, h: PANTRY.h });
  }
  return rects;
}
const OBSTACLES = stationRects();

function hitsObstacle(x, y, radius) {
  for (const rect of OBSTACLES) {
    if (x + radius > rect.x && x - radius < rect.x + rect.w && y + radius > rect.y && y - radius < rect.y + rect.h) return true;
  }
  return false;
}

/** Distance from a point to the closest point of a rectangle. */
function distanceToRect(x, y, rect) {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return Math.hypot(x - closestX, y - closestY);
}

const CELL = 40;
const GRID_W = Math.ceil(1280 / CELL);
const GRID_H = Math.ceil(720 / CELL);

function cellBlocked(cx, cy) {
  // A cell is walkable when a chef-sized circle at its centre clears every counter.
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  if (x < FLOOR.x + CHEF_RADIUS || y < FLOOR.y + CHEF_RADIUS
    || x > FLOOR.x + FLOOR.w - CHEF_RADIUS || y > FLOOR.y + FLOOR.h - CHEF_RADIUS) return true;
  return hitsObstacle(x, y, CHEF_RADIUS + 2);
}

/**
 * A* over the kitchen floor (4-directional, one cell = 40 px). Returns waypoints from the
 * chef to the target, the target itself last; never empty. The greedy straight-line walk
 * deadlocks on station corners, so click-to-walk and the autopilot both go through this.
 */
function findPath(x0, y0, x1, y1) {
  const startX = Math.max(0, Math.min(GRID_W - 1, Math.floor(x0 / CELL)));
  const startY = Math.max(0, Math.min(GRID_H - 1, Math.floor(y0 / CELL)));
  const goalX = Math.max(0, Math.min(GRID_W - 1, Math.floor(x1 / CELL)));
  const goalY = Math.max(0, Math.min(GRID_H - 1, Math.floor(y1 / CELL)));
  const key = (x, y) => y * GRID_W + x;
  const open = [{ x: startX, y: startY, g: 0, f: 0, parent: null }];
  const best = new Map([[key(startX, startY), 0]]);
  const closed = new Set();
  const heuristic = (x, y) => Math.abs(x - goalX) + Math.abs(y - goalY);
  while (open.length > 0) {
    let lowest = 0;
    for (let index = 1; index < open.length; index += 1) {
      if (open[index].f < open[lowest].f) lowest = index;
    }
    const current = open.splice(lowest, 1)[0];
    if (current.x === goalX && current.y === goalY) {
      const cells = [];
      let node = current;
      while (node) {
        cells.push(node);
        node = node.parent;
      }
      cells.reverse();
      const points = cells.map((cell) => ({ x: cell.x * CELL + CELL / 2, y: cell.y * CELL + CELL / 2 }));
      points.push({ x: x1, y: y1 });
      return points;
    }
    closed.add(key(current.x, current.y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
      if (closed.has(key(nx, ny))) continue;
      if (cellBlocked(nx, ny) && !(nx === goalX && ny === goalY)) continue;
      const g = current.g + 1;
      if (best.has(key(nx, ny)) && best.get(key(nx, ny)) <= g) continue;
      best.set(key(nx, ny), g);
      open.push({ x: nx, y: ny, g, f: g + heuristic(nx, ny), parent: current });
    }
  }
  return [{ x: x1, y: y1 }];
}

export function createWorld(random) {
  const state = {
    time: 0,
    shiftIndex: 0,
    shiftTime: SHIFTS[0].seconds,
    shiftMoney: 0,
    money: 0,
    streak: 0,
    lastServeAt: -999,
    chef: { x: CHEF_START.x, y: CHEF_START.y, facing: 1, dashTime: 0, dashCooldown: 0 },
    hands: [],
    bowl: { contents: [], mixing: 0, dough: null },
    oven: { item: null, bake: 0, ready: false, burn: 0 },
    orders: [],
    nextOrderId: 1,
    spawnTimer: 0,
    floats: [],
    served: 0,
    expired: 0,
    gameOver: false,
    victory: false,
    shiftWon: false,
    events: 0,
    moveTarget: null,
    moveStation: null,
    path: null,
  };

  function addFloat(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 1.4 });
    if (state.floats.length > 12) state.floats.shift();
  }

  function spawnOrder() {
    const recipe = random.pick(RECIPES);
    state.orders.push({ id: state.nextOrderId, recipeId: recipe.id, timeLeft: ORDER_SECONDS, total: ORDER_SECONDS });
    state.nextOrderId += 1;
  }

  function reset() {
    state.time = 0;
    state.shiftIndex = 0;
    state.shiftTime = SHIFTS[0].seconds;
    state.shiftMoney = 0;
    state.money = 0;
    state.streak = 0;
    state.lastServeAt = -999;
    state.chef.x = CHEF_START.x;
    state.chef.y = CHEF_START.y;
    state.chef.facing = 1;
    state.chef.dashTime = 0;
    state.chef.dashCooldown = 0;
    state.hands = [];
    state.bowl = { contents: [], mixing: 0, dough: null };
    state.oven = { item: null, bake: 0, ready: false, burn: 0 };
    state.orders = [];
    state.nextOrderId = 1;
    state.spawnTimer = 0;
    state.floats = [];
    state.served = 0;
    state.expired = 0;
    state.gameOver = false;
    state.victory = false;
    state.shiftWon = false;
    state.events = 0;
    state.moveTarget = null;
    state.moveStation = null;
    state.path = null;
    for (let index = 0; index < MAX_ORDERS; index += 1) spawnOrder();
  }

  /** The station (or pantry shelf) nearest the chef, with its distance. */
  function nearestStation() {
    let best = null;
    let bestDistance = Infinity;
    const { x, y } = state.chef;
    for (const station of Object.values(STATIONS)) {
      const distance = distanceToRect(x, y, station);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { kind: station.kind, station };
      }
    }
    for (let index = 0; index < INGREDIENT_IDS.length; index += 1) {
      const rect = { x: PANTRY.x, y: PANTRY.y + index * (PANTRY.h + PANTRY.gap), w: PANTRY.w, h: PANTRY.h };
      const distance = distanceToRect(x, y, rect);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { kind: `pantry:${INGREDIENT_IDS[index]}`, station: rect };
      }
    }
    return { target: best, distance: bestDistance };
  }

  function comboMultiplier() {
    return 1 + 0.25 * Math.min(state.streak, 8);
  }

  function interact() {
    const { target, distance } = nearestStation();
    if (!target || distance > INTERACT_RANGE) return;
    const kind = target.kind;
    const hands = state.hands;

    if (kind.startsWith('pantry:')) {
      const ingredient = kind.slice('pantry:'.length);
      if (hands.length >= HAND_SLOTS) {
        state.events |= EVENT_ERROR;
        addFloat(state.chef.x, state.chef.y - 34, 'Hands full!', '#e74c3c');
        return;
      }
      hands.push(ingredient);
      state.events |= EVENT_PICKUP;
      return;
    }

    if (kind === 'bowl') {
      const bowl = state.bowl;
      if (bowl.dough) {
        if (hands.length >= HAND_SLOTS) {
          state.events |= EVENT_ERROR;
          addFloat(state.chef.x, state.chef.y - 34, 'Hands full!', '#e74c3c');
          return;
        }
        hands.push(`dough:${bowl.dough}`);
        bowl.dough = null;
        state.events |= EVENT_PICKUP;
        return;
      }
      if (bowl.mixing > 0) return; // Busy mixing; wait for the dough.
      if (hands.length === 0) {
        // Empty hands: dump a mix that can never become a recipe.
        if (bowl.contents.length > 0 && !canStillMatch(bowl.contents)) {
          bowl.contents = [];
          state.events |= EVENT_DROP;
          addFloat(target.station.x + 65, target.station.y - 8, 'Mix dumped', '#95a5a6');
        }
        return;
      }
      const item = hands[hands.length - 1];
      if (!INGREDIENTS[item]) {
        state.events |= EVENT_ERROR;
        addFloat(state.chef.x, state.chef.y - 34, 'Only ingredients go in the bowl', '#e74c3c');
        return;
      }
      if (bowl.contents.length >= 3) {
        state.events |= EVENT_ERROR;
        addFloat(state.chef.x, state.chef.y - 34, 'Bowl is full', '#e74c3c');
        return;
      }
      hands.pop();
      bowl.contents.push(item);
      state.events |= EVENT_DROP;
      const recipe = matchRecipe(bowl.contents);
      if (recipe) {
        bowl.mixing = 0.0001;
        bowl.mixingRecipe = recipe.id;
        state.events |= EVENT_MIX_START;
      }
      return;
    }

    if (kind === 'oven') {
      const oven = state.oven;
      if (oven.item === 'burnt') {
        if (hands.length >= HAND_SLOTS) {
          state.events |= EVENT_ERROR;
          return;
        }
        hands.push('burnt');
        oven.item = null;
        oven.burn = 0;
        state.events |= EVENT_PICKUP;
        return;
      }
      if (oven.item && oven.ready) {
        if (hands.length >= HAND_SLOTS) {
          state.events |= EVENT_ERROR;
          addFloat(state.chef.x, state.chef.y - 34, 'Hands full!', '#e74c3c');
          return;
        }
        const recipeId = oven.item.split(':')[1];
        hands.push(`baked:${recipeId}`);
        oven.item = null;
        oven.bake = 0;
        oven.ready = false;
        oven.burn = 0;
        state.events |= EVENT_PICKUP;
        return;
      }
      if (!oven.item) {
        const doughIndex = hands.findIndex((item) => item.startsWith('dough:'));
        if (doughIndex === -1) {
          state.events |= EVENT_ERROR;
          addFloat(state.chef.x, state.chef.y - 34, 'Bring dough to bake', '#e74c3c');
          return;
        }
        oven.item = hands.splice(doughIndex, 1)[0];
        oven.bake = 0;
        oven.ready = false;
        oven.burn = 0;
        state.events |= EVENT_DROP;
        return;
      }
      return; // Still baking.
    }

    if (kind === 'decorate') {
      const index = hands.findIndex((item) => item.startsWith('baked:'));
      if (index === -1) {
        state.events |= EVENT_ERROR;
        addFloat(state.chef.x, state.chef.y - 34, 'Bring a baked dish', '#e74c3c');
        return;
      }
      const recipeId = hands[index].split(':')[1];
      const recipe = RECIPE_BY_ID[recipeId];
      if (!recipe.garnish) {
        state.events |= EVENT_ERROR;
        addFloat(state.chef.x, state.chef.y - 34, 'No garnish needed — plate it!', '#e74c3c');
        return;
      }
      hands[index] = `decorated:${recipeId}`;
      state.events |= EVENT_DECORATE;
      addFloat(state.chef.x, state.chef.y - 34, 'Garnished!', '#f5a623');
      return;
    }

    if (kind === 'plating') {
      const index = hands.findIndex((item) => item.startsWith('baked:') || item.startsWith('decorated:'));
      if (index === -1) {
        state.events |= EVENT_ERROR;
        addFloat(state.chef.x, state.chef.y - 34, 'Bring a baked dish', '#e74c3c');
        return;
      }
      const [stage, recipeId] = hands[index].split(':');
      const recipe = RECIPE_BY_ID[recipeId];
      if (stage === 'baked' && recipe.garnish) {
        state.events |= EVENT_ERROR;
        addFloat(state.chef.x, state.chef.y - 34, 'Garnish it first!', '#e74c3c');
        return;
      }
      hands[index] = `plated:${recipeId}`;
      state.events |= EVENT_PLATE;
      return;
    }

    if (kind === 'serve') {
      const index = hands.findIndex((item) => item.startsWith('plated:'));
      if (index === -1) {
        state.events |= EVENT_ERROR;
        addFloat(state.chef.x, state.chef.y - 34, 'Bring a plated dish', '#e74c3c');
        return;
      }
      const recipeId = hands[index].split(':')[1];
      const orderIndex = state.orders.findIndex((order) => order.recipeId === recipeId);
      if (orderIndex === -1) {
        hands.splice(index, 1);
        state.streak = 0;
        state.events |= EVENT_WRONG;
        addFloat(target.station.x + 75, target.station.y - 8, 'No order for that dish!', '#e74c3c');
        return;
      }
      const recipe = RECIPE_BY_ID[recipeId];
      const earned = Math.round(recipe.price * comboMultiplier());
      state.money += earned;
      state.shiftMoney += earned;
      state.streak += 1;
      state.lastServeAt = state.time;
      state.served += 1;
      state.orders.splice(orderIndex, 1);
      state.spawnTimer = ORDER_SPAWN_DELAY;
      hands.splice(index, 1);
      state.events |= EVENT_SERVED;
      addFloat(target.station.x + 75, target.station.y - 8, `ORDER SERVED! +$${earned}`, '#27ae60');
      return;
    }

    if (kind === 'trash') {
      if (hands.length === 0) return;
      hands.length = 0;
      state.events |= EVENT_DROP;
      addFloat(target.station.x + 65, target.station.y - 8, 'Tossed', '#95a5a6');
    }
  }

  function step(dt, input) {
    state.events = 0;
    if (state.gameOver || state.victory || state.shiftWon) return 0;
    state.time += dt;

    // Combo streak fades if too long passes between serves.
    if (state.streak > 0 && state.time - state.lastServeAt > COMBO_WINDOW_SECONDS) state.streak = 0;

    // Movement: keyboard wins over click-to-walk, which follows the A* path.
    const chef = state.chef;
    let dx = input.dx;
    let dy = input.dy;
    if (dx === 0 && dy === 0 && state.moveTarget) {
      if (!state.path || state.path.length === 0) {
        state.path = findPath(chef.x, chef.y, state.moveTarget.x, state.moveTarget.y);
      }
      const waypoint = state.path[0];
      if (waypoint) {
        const distX = waypoint.x - chef.x;
        const distY = waypoint.y - chef.y;
        const distance = Math.hypot(distX, distY);
        if (distance < 12) {
          state.path.shift();
        } else {
          dx = distX / distance;
          dy = distY / distance;
        }
      }
      if (state.path.length === 0) {
        state.moveTarget = null;
        state.path = null;
        if (state.moveStation) {
          state.moveStation = null;
          interact();
        }
      }
    } else if (dx !== 0 || dy !== 0) {
      state.moveTarget = null;
      state.moveStation = null;
      state.path = null;
    }
    if (dx !== 0) chef.facing = dx > 0 ? 1 : -1;
    if (input.dash && chef.dashCooldown <= 0) {
      chef.dashTime = DASH_TIME;
      chef.dashCooldown = DASH_COOLDOWN;
    }
    chef.dashCooldown = Math.max(0, chef.dashCooldown - dt);
    const speed = chef.dashTime > 0 ? DASH_SPEED : CHEF_SPEED;
    chef.dashTime = Math.max(0, chef.dashTime - dt);
    const nextX = chef.x + dx * speed * dt;
    const nextY = chef.y + dy * speed * dt;
    if (!hitsObstacle(nextX, chef.y, CHEF_RADIUS)) {
      chef.x = Math.max(FLOOR.x + CHEF_RADIUS, Math.min(FLOOR.x + FLOOR.w - CHEF_RADIUS, nextX));
    }
    if (!hitsObstacle(chef.x, nextY, CHEF_RADIUS)) {
      chef.y = Math.max(FLOOR.y + CHEF_RADIUS, Math.min(FLOOR.y + FLOOR.h - CHEF_RADIUS, nextY));
    }
    if (input.interact) interact();

    // Bowl mixing.
    const bowl = state.bowl;
    if (bowl.mixing > 0) {
      bowl.mixing += dt / MIX_SECONDS;
      if (bowl.mixing >= 1) {
        bowl.dough = bowl.mixingRecipe;
        bowl.contents = [];
        bowl.mixing = 0;
        bowl.mixingRecipe = null;
        state.events |= EVENT_DOUGH;
      }
    }

    // Oven baking and burning.
    const oven = state.oven;
    if (oven.item && oven.item !== 'burnt') {
      if (!oven.ready) {
        oven.bake += dt / BAKE_SECONDS;
        if (oven.bake >= 1) {
          oven.bake = 1;
          oven.ready = true;
          state.events |= EVENT_OVEN_READY;
        }
      } else {
        oven.burn += dt / BURN_GRACE_SECONDS;
        if (oven.burn >= 1) {
          oven.item = 'burnt';
          oven.ready = false;
          oven.burn = 0;
          state.events |= EVENT_BURNT;
          addFloat(605, 140, 'Burnt!', '#e74c3c');
        }
      }
    }

    // Orders: timers, expiry, respawn.
    for (let index = state.orders.length - 1; index >= 0; index -= 1) {
      const order = state.orders[index];
      order.timeLeft -= dt;
      if (order.timeLeft <= 0) {
        state.orders.splice(index, 1);
        state.streak = 0;
        state.expired += 1;
        state.spawnTimer = ORDER_SPAWN_DELAY;
        state.events |= EVENT_EXPIRED;
      }
    }
    if (state.orders.length < MAX_ORDERS) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnOrder();
        state.spawnTimer = ORDER_SPAWN_DELAY;
      }
    }

    // Floating feedback.
    for (let index = state.floats.length - 1; index >= 0; index -= 1) {
      const float = state.floats[index];
      float.life -= dt;
      float.y -= 28 * dt;
      if (float.life <= 0) state.floats.splice(index, 1);
    }

    // Shift clock.
    state.shiftTime -= dt;
    if (state.shiftTime <= 0) {
      state.shiftTime = 0;
      const shift = SHIFTS[state.shiftIndex];
      if (state.shiftMoney >= shift.goal) {
        state.shiftWon = true;
        state.events |= EVENT_SHIFT_WIN;
        if (state.shiftIndex >= SHIFTS.length - 1) {
          state.victory = true;
          state.events |= EVENT_VICTORY;
        }
      } else {
        state.gameOver = true;
        state.events |= EVENT_GAME_OVER;
      }
    }
    return state.events;
  }

  /** Begin the next shift after a win (keeps total money and streak). */
  function nextShift() {
    state.shiftIndex += 1;
    state.shiftTime = SHIFTS[state.shiftIndex].seconds;
    state.shiftMoney = 0;
    state.shiftWon = false;
    state.bowl = { contents: [], mixing: 0, dough: null };
    state.oven = { item: null, bake: 0, ready: false, burn: 0 };
    state.hands = [];
    state.orders = [];
    state.spawnTimer = 0;
    state.chef.x = CHEF_START.x;
    state.chef.y = CHEF_START.y;
    for (let index = 0; index < MAX_ORDERS; index += 1) spawnOrder();
  }

  return {
    state,
    reset,
    step,
    interact,
    nearestStation,
    nextShift,
    comboMultiplier,
    shift() {
      return SHIFTS[state.shiftIndex];
    },
  };
}
