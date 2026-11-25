// Crumb & Ember Bakery — everything the eye sees, drawn on one canvas.
// One job: paint a world state and a screen (title, play, almanac, paused, shift end,
// game over, victory). No rules and no input here.
import {
  VIEW_WIDTH, VIEW_HEIGHT, SHIFTS, INGREDIENTS, INGREDIENT_IDS, RECIPES, RECIPE_BY_ID,
  STATIONS, PANTRY, FLOOR, itemName,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_ALMANAC = 'almanac';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_SHIFT_END = 'shiftEnd';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

export const TITLE_OPEN_BUTTON = { x: 440, y: 470, w: 400, h: 66 };
export const TITLE_RECIPES_BUTTON = { x: 500, y: 552, w: 280, h: 52 };

const CREAM = '#f7ead2';
const WALL = '#e8d3ae';
const WOOD = '#a9713f';
const WOOD_DARK = '#7d4f27';
const BROWN = '#4a2c17';
const TERRA = '#c96f3f';
const GREEN = '#27ae60';
const RED = '#e74c3c';
const GOLD = '#f5a623';

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, align = 'center', font = 'system-ui, sans-serif', weight = '600') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

/** Small food drawing: an ingredient or a dish stage, centred at (x, y), size s. */
export function drawItem(ctx, item, x, y, s) {
  if (!item) return;
  if (INGREDIENTS[item]) {
    drawIngredient(ctx, item, x, y, s);
    return;
  }
  const [stage, recipeId] = item.split(':');
  if (stage === 'burnt') {
    ctx.fillStyle = '#2b1a10';
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.55, s * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y - s * 0.1);
    ctx.lineTo(x + s * 0.3, y - s * 0.1);
    ctx.stroke();
    return;
  }
  if (stage === 'dough') {
    ctx.fillStyle = '#f3e5c3';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.08, s * 0.55, s * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0c896';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.2, y - s * 0.08, s * 0.2, s * 0.14, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.22, y - s * 0.05, s * 0.18, s * 0.12, 0.4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // baked / decorated / plated: the dish itself, on a plate when plated.
  if (stage === 'plated') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.12, s * 0.62, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8c9a8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  drawDish(ctx, recipeId, x, y - (stage === 'plated' ? s * 0.06 : 0), s * (stage === 'plated' ? 0.8 : 1));
  if (stage === 'decorated') {
    ctx.fillStyle = '#ffffff';
    for (const [dx, dy] of [[-0.3, -0.2], [0.25, -0.28], [0.05, 0.1]]) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#d64560';
    ctx.beginPath();
    ctx.arc(x + s * 0.32, y - s * 0.05, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawIngredient(ctx, id, x, y, s) {
  if (id === 'flour') {
    ctx.fillStyle = '#f3e5c3';
    roundRect(ctx, x - s * 0.4, y - s * 0.42, s * 0.8, s * 0.84, s * 0.12);
    ctx.fill();
    ctx.strokeStyle = '#c9b285';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#c9b285';
    ctx.fillRect(x - s * 0.28, y - s * 0.55, s * 0.56, s * 0.16);
    if (s >= 30) text(ctx, 'FLOUR', x, y + s * 0.18, Math.max(9, s * 0.22), '#8a6d3b', 'center', 'system-ui, sans-serif', '700');
  } else if (id === 'butter') {
    ctx.fillStyle = '#ffd94d';
    roundRect(ctx, x - s * 0.42, y - s * 0.28, s * 0.84, s * 0.56, s * 0.1);
    ctx.fill();
    ctx.strokeStyle = '#d9a400';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(x - s * 0.42, y - s * 0.28, s * 0.84, s * 0.18);
  } else if (id === 'eggs') {
    ctx.fillStyle = '#fff8e7';
    ctx.strokeStyle = '#c98f4e';
    ctx.lineWidth = 2;
    for (const [dx, dy] of [[-0.22, -0.1], [0.2, 0.05], [0, 0.28]]) {
      ctx.beginPath();
      ctx.ellipse(x + dx * s, y + dy * s, s * 0.2, s * 0.27, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (id === 'berries') {
    const berries = [['#d64560', -0.22, -0.08], ['#8e44ad', 0.2, -0.12], ['#d64560', 0.02, 0.22]];
    for (const [color, dx, dy] of berries) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.3);
    ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.5, x + s * 0.35, y - s * 0.42);
    ctx.stroke();
  } else if (id === 'choc') {
    ctx.fillStyle = '#6b4226';
    roundRect(ctx, x - s * 0.4, y - s * 0.3, s * 0.8, s * 0.6, s * 0.08);
    ctx.fill();
    ctx.strokeStyle = '#3e2412';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.3);
    ctx.lineTo(x, y + s * 0.3);
    ctx.moveTo(x - s * 0.4, y);
    ctx.lineTo(x + s * 0.4, y);
    ctx.stroke();
    ctx.fillStyle = '#8a5a34';
    ctx.fillRect(x - s * 0.4, y - s * 0.3, s * 0.8, s * 0.14);
  } else if (id === 'honey') {
    ctx.fillStyle = '#f5a623';
    roundRect(ctx, x - s * 0.34, y - s * 0.3, s * 0.68, s * 0.66, s * 0.14);
    ctx.fill();
    ctx.strokeStyle = '#b97a0e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.3, s * 0.34, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a5a10';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.1, y - s * 0.55);
    ctx.lineTo(x + s * 0.15, y - s * 0.42);
    ctx.stroke();
  }
}

/** The finished dish for a recipe, drawn at (x, y), size s. */
export function drawDish(ctx, recipeId, x, y, s) {
  if (recipeId === 'sourdough') {
    ctx.fillStyle = '#c98f4e';
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.55, s * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b877';
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.1, s * 0.45, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a5a10';
    ctx.lineWidth = Math.max(2, s * 0.05);
    for (const dx of [-0.2, 0.05, 0.28]) {
      ctx.beginPath();
      ctx.moveTo(x + dx * s - s * 0.08, y - s * 0.22);
      ctx.lineTo(x + dx * s + s * 0.08, y - s * 0.02);
      ctx.stroke();
    }
  } else if (recipeId === 'croissant') {
    ctx.fillStyle = '#e8a94e';
    ctx.beginPath();
    ctx.arc(x, y + s * 0.1, s * 0.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.arc(x + s * 0.28, y + s * 0.28, s * 0.22, Math.PI * 0.9, Math.PI * 1.7);
    ctx.arc(x - s * 0.28, y + s * 0.28, s * 0.22, Math.PI * 1.3, Math.PI * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b97a0e';
    ctx.lineWidth = Math.max(2, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y - s * 0.05);
    ctx.quadraticCurveTo(x, y + s * 0.15, x + s * 0.3, y - s * 0.05);
    ctx.stroke();
  } else if (recipeId === 'berrytart') {
    ctx.fillStyle = '#d9a05b';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fdf0c8';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    for (const [dx, dy, color] of [[-0.2, -0.12, '#d64560'], [0.18, -0.15, '#8e44ad'], [0, 0.18, '#d64560']]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (recipeId === 'cinnamon') {
    ctx.fillStyle = '#d9a05b';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a5a10';
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath();
    ctx.arc(x, y, s * 0.36, 0.3, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, s * 0.2, 0.8, Math.PI * 1.9);
    ctx.stroke();
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath();
    ctx.arc(x - s * 0.15, y - s * 0.2, s * 0.1, 0, Math.PI * 2);
    ctx.arc(x + s * 0.2, y + s * 0.12, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (recipeId === 'babka') {
    ctx.fillStyle = '#c98f4e';
    roundRect(ctx, x - s * 0.5, y - s * 0.3, s, s * 0.6, s * 0.2);
    ctx.fill();
    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = Math.max(3, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y - s * 0.15);
    ctx.quadraticCurveTo(x, y + s * 0.15, x + s * 0.4, y - s * 0.15);
    ctx.moveTo(x - s * 0.4, y + s * 0.12);
    ctx.quadraticCurveTo(x, y - s * 0.18, x + s * 0.4, y + s * 0.12);
    ctx.stroke();
  } else if (recipeId === 'honeycake') {
    ctx.fillStyle = '#f5c95c';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y + s * 0.3);
    ctx.lineTo(x - s * 0.42, y - s * 0.25);
    ctx.lineTo(x + s * 0.42, y - s * 0.25);
    ctx.lineTo(x + s * 0.5, y + s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8a94e';
    ctx.fillRect(x - s * 0.46, y - s * 0.02, s * 0.92, s * 0.1);
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.25, s * 0.42, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d64560';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.32, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFlame(ctx, x, y, s) {
  ctx.fillStyle = '#e67e22';
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x + s * 0.7, y - s * 0.2, x + s * 0.45, y + s * 0.4);
  ctx.quadraticCurveTo(x + s * 0.2, y + s * 0.7, x, y + s * 0.7);
  ctx.quadraticCurveTo(x - s * 0.2, y + s * 0.7, x - s * 0.45, y + s * 0.4);
  ctx.quadraticCurveTo(x - s * 0.7, y - s * 0.2, x, y - s);
  ctx.fill();
  ctx.fillStyle = '#f5d76e';
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.4);
  ctx.quadraticCurveTo(x + s * 0.35, y, x, y + s * 0.45);
  ctx.quadraticCurveTo(x - s * 0.35, y, x, y - s * 0.4);
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawStationBase(station, highlight) {
    ctx.fillStyle = highlight ? '#ffe9b8' : '#e8c9a0';
    roundRect(ctx, station.x, station.y, station.w, station.h, 12);
    ctx.fill();
    ctx.strokeStyle = highlight ? GOLD : WOOD_DARK;
    ctx.lineWidth = highlight ? 4 : 2;
    ctx.stroke();
    ctx.fillStyle = WOOD;
    ctx.fillRect(station.x, station.y + station.h - 14, station.w, 14);
    text(ctx, station.label, station.x + station.w / 2, station.y + station.h - 26, 13, BROWN, 'center', 'system-ui, sans-serif', '800');
  }

  function drawPantry(highlightKind) {
    for (let index = 0; index < INGREDIENT_IDS.length; index += 1) {
      const id = INGREDIENT_IDS[index];
      const ingredient = INGREDIENTS[id];
      const y = PANTRY.y + index * (PANTRY.h + PANTRY.gap);
      const highlight = highlightKind === `pantry:${id}`;
      ctx.fillStyle = highlight ? '#ffe9b8' : '#e8c9a0';
      roundRect(ctx, PANTRY.x, y, PANTRY.w, PANTRY.h, 12);
      ctx.fill();
      ctx.strokeStyle = highlight ? GOLD : WOOD_DARK;
      ctx.lineWidth = highlight ? 4 : 2;
      ctx.stroke();
      drawIngredient(ctx, id, PANTRY.x + 34, y + PANTRY.h / 2, 34);
      text(ctx, ingredient.name, PANTRY.x + 66, y + PANTRY.h / 2 - 8, 15, BROWN, 'left', 'system-ui, sans-serif', '800');
      text(ctx, 'take · E', PANTRY.x + 66, y + PANTRY.h / 2 + 14, 11, '#8a6d3b', 'left');
    }
    text(ctx, 'PANTRY', PANTRY.x + PANTRY.w / 2, PANTRY.y - 14, 13, '#8a6d3b', 'center', 'system-ui, sans-serif', '800');
  }

  function drawBowl(world, highlight) {
    const station = STATIONS.bowl;
    drawStationBase(station, highlight);
    const cx = station.x + station.w / 2;
    const cy = station.y + 42;
    const bowl = world.state.bowl;
    // The bowl (kept clear of the station label at the bottom).
    ctx.fillStyle = '#fdf6e3';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 34, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9b285';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (bowl.dough) {
      drawItem(ctx, `dough:${bowl.dough}`, cx, cy - 4, 40);
      text(ctx, 'DOUGH READY', cx, station.y - 12, 12, GREEN, 'center', 'system-ui, sans-serif', '800');
    } else if (bowl.mixing > 0) {
      const recipe = RECIPE_BY_ID[bowl.mixingRecipe];
      ctx.fillStyle = '#f3e5c3';
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = TERRA;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + bowl.mixing * Math.PI * 2);
      ctx.stroke();
      text(ctx, `mixing ${recipe.short}…`, cx, station.y - 12, 12, TERRA, 'center', 'system-ui, sans-serif', '800');
    } else if (bowl.contents.length > 0) {
      bowl.contents.forEach((ingredient, index) => {
        drawIngredient(ctx, ingredient, cx - 18 + index * 18, cy, 20);
      });
    } else {
      text(ctx, 'drop ingredients', cx, cy + 4, 12, '#8a6d3b');
    }
  }

  function drawOven(world, highlight) {
    const station = STATIONS.oven;
    drawStationBase(station, highlight);
    const oven = world.state.oven;
    const cx = station.x + station.w / 2;
    const cy = station.y + 52;
    // The oven mouth.
    ctx.fillStyle = oven.item ? '#3a2417' : '#5d3a1a';
    roundRect(ctx, cx - 58, cy - 26, 116, 52, 10);
    ctx.fill();
    if (oven.item && oven.item !== 'burnt') {
      const recipeId = oven.item.split(':')[1];
      drawDish(ctx, recipeId, cx, cy, 52);
      if (oven.ready) {
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 4;
        roundRect(ctx, cx - 62, cy - 30, 124, 60, 12);
        ctx.stroke();
        text(ctx, 'READY!', cx, station.y - 12, 13, GREEN, 'center', 'system-ui, sans-serif', '800');
      } else {
        // Bake progress bar.
        ctx.fillStyle = '#e8d3ae';
        roundRect(ctx, cx - 50, cy + 34, 100, 8, 4);
        ctx.fill();
        ctx.fillStyle = TERRA;
        roundRect(ctx, cx - 50, cy + 34, 100 * oven.bake, 8, 4);
        ctx.fill();
      }
    } else if (oven.item === 'burnt') {
      drawItem(ctx, 'burnt', cx, cy, 52);
      text(ctx, 'BURNT — trash it', cx, station.y - 12, 12, RED, 'center', 'system-ui, sans-serif', '800');
    } else {
      // Idle glow.
      ctx.fillStyle = '#e8a94e';
      ctx.beginPath();
      ctx.arc(cx - 30, cy, 5, 0, Math.PI * 2);
      ctx.arc(cx + 30, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSimpleStation(world, station, highlight) {
    drawStationBase(station, highlight);
  }

  function drawChef(world) {
    const chef = world.state.chef;
    const { x, y } = chef;
    // Shadow.
    ctx.fillStyle = 'rgba(74, 44, 23, 0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y + 22, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: white apron.
    ctx.fillStyle = '#fdf6e3';
    roundRect(ctx, x - 16, y - 6, 32, 30, 10);
    ctx.fill();
    ctx.strokeStyle = '#c9b285';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Head.
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(x, y - 16, 13, 0, Math.PI * 2);
    ctx.fill();
    // Toque.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 8, y - 28, 8, 0, Math.PI * 2);
    ctx.arc(x, y - 32, 9, 0, Math.PI * 2);
    ctx.arc(x + 8, y - 28, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 13, y - 28, 26, 8);
    // Eyes face the walking direction.
    ctx.fillStyle = BROWN;
    ctx.beginPath();
    ctx.arc(x - 5 + chef.facing * 2, y - 17, 1.8, 0, Math.PI * 2);
    ctx.arc(x + 5 + chef.facing * 2, y - 17, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Carried items above the toque.
    world.state.hands.forEach((item, index) => {
      drawItem(ctx, item, x - 14 + index * 28, y - 52, 26);
    });
  }

  function drawOrderBoard(world) {
    const boardX = 300;
    const cardW = 196;
    const cardH = 76;
    const gap = 10;
    text(ctx, 'ORDER BOARD', boardX + (cardW * 4 + gap * 3) / 2, 14, 12, '#8a6d3b', 'center', 'system-ui, sans-serif', '800');
    for (let index = 0; index < 4; index += 1) {
      const x = boardX + index * (cardW + gap);
      const y = 22;
      const order = world.state.orders[index];
      ctx.fillStyle = '#fffdf6';
      roundRect(ctx, x, y, cardW, cardH, 10);
      ctx.fill();
      ctx.strokeStyle = order && order.timeLeft < 12 ? RED : '#d8c9a8';
      ctx.lineWidth = order && order.timeLeft < 12 ? 3 : 1.5;
      ctx.stroke();
      if (!order) {
        text(ctx, '—', x + cardW / 2, y + cardH / 2, 20, '#b8a888');
        continue;
      }
      const recipe = RECIPE_BY_ID[order.recipeId];
      drawDish(ctx, order.recipeId, x + 34, y + 30, 44);
      text(ctx, recipe.short, x + 62, y + 20, 14, BROWN, 'left', 'system-ui, sans-serif', '800');
      text(ctx, `$${recipe.price}`, x + 62, y + 42, 13, TERRA, 'left', 'system-ui, sans-serif', '800');
      // Timer bar.
      const ratio = Math.max(0, order.timeLeft / order.total);
      ctx.fillStyle = '#eee2c8';
      roundRect(ctx, x + 62, y + 56, 120, 8, 4);
      ctx.fill();
      ctx.fillStyle = ratio > 0.5 ? GREEN : ratio > 0.25 ? GOLD : RED;
      roundRect(ctx, x + 62, y + 56, 120 * ratio, 8, 4);
      ctx.fill();
      text(ctx, `${Math.ceil(order.timeLeft)}s`, x + cardW - 8, y + 20, 12, ratio > 0.25 ? BROWN : RED, 'right', 'system-ui, sans-serif', '800');
    }
  }

  function drawHud(world) {
    const shift = SHIFTS[world.state.shiftIndex];
    // Shift + timer, top left.
    text(ctx, shift.name.toUpperCase(), 24, 20, 13, '#8a6d3b', 'left', 'system-ui, sans-serif', '800');
    const minutes = Math.floor(world.state.shiftTime / 60);
    const seconds = Math.floor(world.state.shiftTime % 60);
    text(ctx, `${minutes}:${String(seconds).padStart(2, '0')}`, 24, 52, 34, world.state.shiftTime < 15 ? RED : BROWN, 'left', 'Georgia, serif', '700');
    text(ctx, `goal $${shift.goal}`, 24, 84, 13, BROWN, 'left');
    // Money + streak, top right.
    text(ctx, `$${world.state.money}`, 1256, 34, 30, BROWN, 'right', 'Georgia, serif', '700');
    text(ctx, `shift $${world.state.shiftMoney} / $${shift.goal}`, 1256, 62, 13, '#8a6d3b', 'right');
    if (world.state.streak > 1) {
      drawFlame(ctx, 1150, 88, 10);
      text(ctx, `streak ${world.state.streak} · x${world.comboMultiplier().toFixed(2)}`, 1168, 88, 14, TERRA, 'left', 'system-ui, sans-serif', '800');
    }
    // Progress to the shift goal (right of the order board, clear of its cards).
    const ratio = Math.min(1, world.state.shiftMoney / shift.goal);
    ctx.fillStyle = '#eee2c8';
    roundRect(ctx, 1130, 100 - 4, 126, 8, 4);
    ctx.fill();
    if (ratio > 0) {
      ctx.fillStyle = GREEN;
      roundRect(ctx, 1130, 100 - 4, 126 * ratio, 8, 4);
      ctx.fill();
    }
  }

  function drawKitchen(world, highlightKind) {
    // Floor.
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.strokeStyle = '#eadfc6';
    ctx.lineWidth = 1;
    for (let x = 0; x <= VIEW_WIDTH; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 108);
      ctx.lineTo(x, VIEW_HEIGHT);
      ctx.stroke();
    }
    for (let y = 108; y <= VIEW_HEIGHT; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_WIDTH, y);
      ctx.stroke();
    }
    // Wall band under the HUD.
    ctx.fillStyle = WALL;
    ctx.fillRect(0, 100, VIEW_WIDTH, 8);
    drawOrderBoard(world);
    drawHud(world);
    drawPantry(highlightKind);
    drawBowl(world, highlightKind === 'bowl');
    drawOven(world, highlightKind === 'oven');
    drawSimpleStation(world, STATIONS.decorate, highlightKind === 'decorate');
    drawSimpleStation(world, STATIONS.plating, highlightKind === 'plating');
    drawSimpleStation(world, STATIONS.serve, highlightKind === 'serve');
    drawSimpleStation(world, STATIONS.trash, highlightKind === 'trash');
    // Decorate counter garnish jars.
    ctx.fillStyle = '#d64560';
    ctx.beginPath();
    ctx.arc(STATIONS.decorate.x + 30, STATIONS.decorate.y + 40, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.arc(STATIONS.decorate.x + 65, STATIONS.decorate.y + 40, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.arc(STATIONS.decorate.x + 100, STATIONS.decorate.y + 40, 9, 0, Math.PI * 2);
    ctx.fill();
    // Plating counter plates.
    ctx.fillStyle = '#ffffff';
    for (const dx of [30, 65, 100]) {
      ctx.beginPath();
      ctx.ellipse(STATIONS.plating.x + dx, STATIONS.plating.y + 40, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d8c9a8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Serve pass bell.
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(STATIONS.serve.x + 75, STATIONS.serve.y + 40, 16, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(STATIONS.serve.x + 71, STATIONS.serve.y + 40, 8, 4);
    text(ctx, 'ring the bell', STATIONS.serve.x + 75, STATIONS.serve.y + 62, 11, '#8a6d3b');
    // Trash bin.
    ctx.fillStyle = '#95a5a6';
    roundRect(ctx, STATIONS.trash.x + 45, STATIONS.trash.y + 22, 40, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(STATIONS.trash.x + 40, STATIONS.trash.y + 16, 50, 8);
    drawChef(world);
    // Floating feedback.
    for (const float of world.state.floats) {
      ctx.globalAlpha = Math.min(1, float.life);
      text(ctx, float.text, float.x, float.y, 18, float.color, 'center', 'system-ui, sans-serif', '800');
      ctx.globalAlpha = 1;
    }
    // Bottom hint.
    text(ctx, 'WASD / arrows move · Space / E use station · Q dash · B recipes · P pause · M mute · click a station to walk there', VIEW_WIDTH / 2, 712, 12, '#8a6d3b');
  }

  function drawTitle(world) {
    // Warm backdrop with bunting.
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    gradient.addColorStop(0, '#fbeecf');
    gradient.addColorStop(1, '#f3d9a4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    for (let index = 0; index < 9; index += 1) {
      const x = 40 + index * 145;
      ctx.fillStyle = ['#d64560', '#f5a623', '#27ae60', '#e67e22'][index % 4];
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 70, 0);
      ctx.lineTo(x + 35, 34);
      ctx.closePath();
      ctx.fill();
    }
    text(ctx, 'CRUMB & EMBER', VIEW_WIDTH / 2, 108, 72, BROWN, 'center', 'Georgia, serif', '800');
    text(ctx, '— B A K E R Y —', VIEW_WIDTH / 2, 158, 22, TERRA, 'center', 'Georgia, serif', '700');
    text(ctx, 'Bake fast. Serve warm. Don’t burn the babka.', VIEW_WIDTH / 2, 196, 18, '#8a6d3b', 'center', 'Georgia, serif', '400');
    // Six signature bakes.
    const cardW = 180;
    const cardH = 170;
    const gap = 16;
    const startX = (VIEW_WIDTH - (cardW * 6 + gap * 5)) / 2;
    RECIPES.forEach((recipe, index) => {
      const x = startX + index * (cardW + gap);
      const y = 250;
      ctx.fillStyle = '#fffdf6';
      roundRect(ctx, x, y, cardW, cardH, 14);
      ctx.fill();
      ctx.strokeStyle = '#d8c9a8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawDish(ctx, recipe.id, x + cardW / 2, y + 48, 64);
      text(ctx, recipe.name, x + cardW / 2, y + 100, 15, BROWN, 'center', 'system-ui, sans-serif', '800');
      text(ctx, `$${recipe.price}`, x + cardW / 2, y + 124, 15, TERRA, 'center', 'system-ui, sans-serif', '800');
      text(ctx, recipe.ingredients.map((id) => INGREDIENTS[id].name).join(' + '), x + cardW / 2, y + 148, 11, '#8a6d3b');
    });
    // Buttons.
    ctx.fillStyle = TERRA;
    roundRect(ctx, TITLE_OPEN_BUTTON.x, TITLE_OPEN_BUTTON.y, TITLE_OPEN_BUTTON.w, TITLE_OPEN_BUTTON.h, 16);
    ctx.fill();
    ctx.strokeStyle = WOOD_DARK;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'OPEN BAKERY', VIEW_WIDTH / 2, TITLE_OPEN_BUTTON.y + 34, 26, '#fff8e7', 'center', 'system-ui, sans-serif', '800');
    ctx.fillStyle = '#fffdf6';
    roundRect(ctx, TITLE_RECIPES_BUTTON.x, TITLE_RECIPES_BUTTON.y, TITLE_RECIPES_BUTTON.w, TITLE_RECIPES_BUTTON.h, 12);
    ctx.fill();
    ctx.strokeStyle = WOOD_DARK;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'RECIPE ALMANAC  (B)', VIEW_WIDTH / 2, TITLE_RECIPES_BUTTON.y + 27, 16, BROWN, 'center', 'system-ui, sans-serif', '800');
    text(ctx, 'WASD / arrows move · Space / E use a station · Q dash · B recipes · P pause · R restart · click a station to walk there', VIEW_WIDTH / 2, 640, 14, '#8a6d3b');
    text(ctx, 'Three shifts. Morning Bake · Lunch Rush · Evening Gala. Serve the orders before their timers run out.', VIEW_WIDTH / 2, 668, 13, '#8a6d3b');
  }

  function drawAlmanac(world) {
    drawKitchen(world, null);
    ctx.fillStyle = 'rgba(74, 44, 23, 0.55)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    const panelX = 140;
    const panelY = 60;
    const panelW = 1000;
    const panelH = 600;
    ctx.fillStyle = '#fffdf6';
    roundRect(ctx, panelX, panelY, panelW, panelH, 18);
    ctx.fill();
    ctx.strokeStyle = WOOD_DARK;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, 'RECIPE ALMANAC', VIEW_WIDTH / 2, panelY + 40, 30, BROWN, 'center', 'Georgia, serif', '800');
    text(ctx, 'Six signature bakes — mix, bake, garnish, plate, serve', VIEW_WIDTH / 2, panelY + 72, 14, '#8a6d3b');
    RECIPES.forEach((recipe, index) => {
      const y = panelY + 110 + index * 78;
      drawDish(ctx, recipe.id, panelX + 60, y + 26, 56);
      text(ctx, recipe.name, panelX + 110, y + 12, 18, BROWN, 'left', 'system-ui, sans-serif', '800');
      text(ctx, recipe.blurb, panelX + 110, y + 36, 13, '#8a6d3b', 'left', 'Georgia, serif', '400');
      const steps = recipe.garnish ? 'Mix → Bake → Garnish → Plate → Serve' : 'Mix → Bake → Plate → Serve';
      text(ctx, steps, panelX + 110, y + 58, 13, TERRA, 'left', 'system-ui, sans-serif', '700');
      text(ctx, recipe.ingredients.map((id) => INGREDIENTS[id].name).join(' + '), panelX + panelW - 130, y + 12, 14, BROWN, 'right', 'system-ui, sans-serif', '700');
      text(ctx, `$${recipe.price}`, panelX + panelW - 130, y + 40, 20, TERRA, 'right', 'Georgia, serif', '700');
      if (index < RECIPES.length - 1) {
        ctx.strokeStyle = '#eee2c8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 30, y + 74);
        ctx.lineTo(panelX + panelW - 30, y + 74);
        ctx.stroke();
      }
    });
    text(ctx, 'Press B or click anywhere to close', VIEW_WIDTH / 2, panelY + panelH - 24, 13, '#8a6d3b');
  }

  function dimOverlay() {
    ctx.fillStyle = 'rgba(74, 44, 23, 0.6)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  function drawPaused() {
    dimOverlay();
    text(ctx, 'PAUSED', VIEW_WIDTH / 2, 320, 56, '#fff8e7', 'center', 'Georgia, serif', '800');
    text(ctx, 'The ovens wait for no one — except now. Press P or Space to keep baking.', VIEW_WIDTH / 2, 372, 16, '#ffe9b8');
  }

  function drawShiftEnd(world) {
    const shift = SHIFTS[world.state.shiftIndex];
    dimOverlay();
    text(ctx, `${shift.name.toUpperCase()} — COMPLETE!`, VIEW_WIDTH / 2, 300, 48, '#fff8e7', 'center', 'Georgia, serif', '800');
    text(ctx, `You baked $${world.state.shiftMoney} against a $${shift.goal} goal. Total so far: $${world.state.money}.`, VIEW_WIDTH / 2, 356, 18, '#ffe9b8');
    text(ctx, 'Press Space for the next shift', VIEW_WIDTH / 2, 400, 18, '#ffe9b8', 'center', 'system-ui, sans-serif', '800');
  }

  function drawOver(world) {
    const shift = SHIFTS[world.state.shiftIndex];
    dimOverlay();
    text(ctx, 'THE OVENS WENT COLD', VIEW_WIDTH / 2, 300, 48, '#fff8e7', 'center', 'Georgia, serif', '800');
    text(ctx, `${shift.name}: $${world.state.shiftMoney} of the $${shift.goal} goal. The customers drifted away.`, VIEW_WIDTH / 2, 356, 18, '#ffe9b8');
    text(ctx, `Total earned: $${world.state.money} · Dishes served: ${world.state.served}`, VIEW_WIDTH / 2, 390, 16, '#ffe9b8');
    text(ctx, 'Press R to try again', VIEW_WIDTH / 2, 440, 18, '#ffe9b8', 'center', 'system-ui, sans-serif', '800');
  }

  function drawVictory(world) {
    dimOverlay();
    text(ctx, 'BAKERY LEGEND!', VIEW_WIDTH / 2, 290, 56, '#ffe9b8', 'center', 'Georgia, serif', '800');
    text(ctx, 'Three shifts, every goal met. The gala crowd is still talking about your honey cake.', VIEW_WIDTH / 2, 348, 17, '#fff8e7');
    text(ctx, `Total earned: $${world.state.money} · Dishes served: ${world.state.served} · Orders lost: ${world.state.expired}`, VIEW_WIDTH / 2, 388, 16, '#ffe9b8');
    text(ctx, 'Press R to bake again', VIEW_WIDTH / 2, 436, 18, '#ffe9b8', 'center', 'system-ui, sans-serif', '800');
  }

  return {
    draw(world, screen, highlightKind) {
      ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      if (screen === SCREEN_TITLE) {
        drawTitle(world);
        return;
      }
      drawKitchen(world, highlightKind);
      if (screen === SCREEN_ALMANAC) drawAlmanac(world);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_SHIFT_END) drawShiftEnd(world);
      else if (screen === SCREEN_OVER) drawOver(world);
      else if (screen === SCREEN_VICTORY) drawVictory(world);
    },
  };
}
