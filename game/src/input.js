// Keyboard and mouse input. The game reads a direction vector, a held interact key and
// one-shot actions (confirm, pause, almanac, restart, dash, mute) each frame.
import { STATIONS, PANTRY, INGREDIENT_IDS } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ALMANAC = 4;
export const ACTION_RESTART = 8;
export const ACTION_DASH = 16;
export const ACTION_MUTE = 32;
export const ACTION_INTERACT = 64;

export function createInput(canvas, onClickStation) {
  const keys = new Set();
  let actions = 0;
  let clickTarget = null;

  function keyDown(event) {
    const key = event.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    if (key === ' ' || key === 'enter') actions |= ACTION_CONFIRM;
    if (key === ' ' || key === 'e') actions |= ACTION_INTERACT;
    if (key === 'p' || key === 'escape') actions |= ACTION_PAUSE;
    if (key === 'b') actions |= ACTION_ALMANAC;
    if (key === 'r') actions |= ACTION_RESTART;
    if (key === 'q') actions |= ACTION_DASH;
    if (key === 'm') actions |= ACTION_MUTE;
  }
  function keyUp(event) {
    keys.delete(event.key.toLowerCase());
  }
  function pointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    clickTarget = { x, y };
    if (onClickStation) onClickStation(x, y);
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointerDown);

  return {
    /** Normalised WASD / arrow direction, or {x:0,y:0}. */
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) {
        const length = Math.hypot(x, y);
        x /= length;
        y /= length;
      }
      return { x, y };
    },
    interactHeld() {
      return keys.has('e');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const target = clickTarget;
      clickTarget = null;
      return target;
    },
  };
}

/** Which station (or pantry shelf) a point belongs to, for click-to-walk. */
export function stationAtPoint(x, y) {
  for (const station of Object.values(STATIONS)) {
    if (x >= station.x && x <= station.x + station.w && y >= station.y && y <= station.y + station.h) {
      return { kind: station.kind, approach: station.approach };
    }
  }
  for (let index = 0; index < INGREDIENT_IDS.length; index += 1) {
    const shelfY = PANTRY.y + index * (PANTRY.h + PANTRY.gap);
    if (x >= PANTRY.x && x <= PANTRY.x + PANTRY.w && y >= shelfY && y <= shelfY + PANTRY.h) {
      return { kind: `pantry:${INGREDIENT_IDS[index]}`, approach: [PANTRY.approachX, shelfY + PANTRY.h / 2] };
    }
  }
  return null;
}
