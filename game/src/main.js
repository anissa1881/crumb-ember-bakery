// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps, and the renderer paints what is there. The game moves between screens: title,
// play, almanac, paused, shift end, game over and victory.
//
// ?seed=N fixes the dealt orders. ?shot=start|play|almanac|served (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady.
import { STEP, SHIFTS } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_SERVED, EVENT_EXPIRED, EVENT_BURNT, EVENT_WRONG, EVENT_SHIFT_WIN, EVENT_GAME_OVER, EVENT_VICTORY, EVENT_PICKUP, EVENT_DROP, EVENT_MIX_START, EVENT_DOUGH, EVENT_OVEN_READY, EVENT_ERROR, EVENT_DECORATE, EVENT_PLATE } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_ALMANAC, ACTION_RESTART, ACTION_DASH, ACTION_MUTE, ACTION_INTERACT, createInput, stationAtPoint } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_ALMANAC, SCREEN_PAUSED, SCREEN_SHIFT_END, SCREEN_OVER, SCREEN_VICTORY, TITLE_OPEN_BUTTON, TITLE_RECIPES_BUTTON } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

const MAX_FRAME = 0.25;
const BEST_KEY = 'crumb-ember-best';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

// A small handle for automated play-testing (harmless in normal play).
window.__bakery = { world };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function playSound(events) {
  if (events & EVENT_SERVED) audio.serve();
  else if (events & EVENT_OVEN_READY) audio.ovenDing();
  else if (events & EVENT_DOUGH) audio.doughReady();
  else if (events & EVENT_MIX_START) audio.mixStart();
  else if (events & EVENT_PICKUP) audio.pickup();
  else if (events & EVENT_DROP) audio.drop();
  else if (events & EVENT_DECORATE) audio.pickup();
  else if (events & EVENT_PLATE) audio.drop();
  else if (events & EVENT_BURNT) audio.error();
  else if (events & EVENT_WRONG) audio.error();
  else if (events & EVENT_EXPIRED) audio.expire();
  else if (events & EVENT_ERROR) audio.error();
  if (events & EVENT_SHIFT_WIN) audio.shiftWin();
  if (events & EVENT_GAME_OVER) audio.gameOver();
  if (events & EVENT_VICTORY) audio.shiftWin();
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let almanacReturn = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let announcedShift = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    announcedShift = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${SHIFTS[0].name}, goal $${SHIFTS[0].goal}.`);
  }

  function openAlmanac(from) {
    almanacReturn = from;
    screen = SCREEN_ALMANAC;
    announce('Recipe almanac. Press B to close.');
  }

  function closeAlmanac() {
    screen = almanacReturn;
    announce(screen === SCREEN_PLAY ? 'Playing.' : 'Crumb and Ember Bakery.');
  }

  function handleClick() {
    const click = input.takeClick();
    if (!click) return;
    audio.unlock();
    if (screen === SCREEN_TITLE) {
      if (click.x >= TITLE_OPEN_BUTTON.x && click.x <= TITLE_OPEN_BUTTON.x + TITLE_OPEN_BUTTON.w
        && click.y >= TITLE_OPEN_BUTTON.y && click.y <= TITLE_OPEN_BUTTON.y + TITLE_OPEN_BUTTON.h) {
        startGame();
        return;
      }
      if (click.x >= TITLE_RECIPES_BUTTON.x && click.x <= TITLE_RECIPES_BUTTON.x + TITLE_RECIPES_BUTTON.w
        && click.y >= TITLE_RECIPES_BUTTON.y && click.y <= TITLE_RECIPES_BUTTON.y + TITLE_RECIPES_BUTTON.h) {
        openAlmanac(SCREEN_TITLE);
        return;
      }
      return;
    }
    if (screen === SCREEN_ALMANAC) {
      closeAlmanac();
      return;
    }
    if (screen === SCREEN_SHIFT_END) {
      world.nextShift();
      screen = SCREEN_PLAY;
      announce(`Playing. ${SHIFTS[world.state.shiftIndex].name}, goal $${SHIFTS[world.state.shiftIndex].goal}.`);
      return;
    }
    if (screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const station = stationAtPoint(click.x, click.y);
    if (station) {
      world.state.moveTarget = { x: station.approach[0], y: station.approach[1] };
      world.state.moveStation = station.kind;
    } else {
      world.state.moveTarget = { x: click.x, y: click.y };
      world.state.moveStation = null;
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame();
      else if (actions & ACTION_ALMANAC) openAlmanac(SCREEN_TITLE);
      return;
    }
    if (screen === SCREEN_ALMANAC) {
      if (actions & (ACTION_ALMANAC | ACTION_CONFIRM | ACTION_PAUSE)) closeAlmanac();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (actions & ACTION_RESTART) startGame();
      return;
    }
    if (screen === SCREEN_SHIFT_END) {
      if (actions & ACTION_CONFIRM) {
        world.nextShift();
        screen = SCREEN_PLAY;
        announce(`Playing. ${SHIFTS[world.state.shiftIndex].name}, goal $${SHIFTS[world.state.shiftIndex].goal}.`);
      } else if (actions & ACTION_RESTART) startGame();
      return;
    }
    if (screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
      if (actions & ACTION_RESTART) startGame();
      return;
    }
    // SCREEN_PLAY
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & ACTION_ALMANAC) {
      openAlmanac(SCREEN_PLAY);
    } else if (actions & ACTION_RESTART) {
      startGame();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE || screen === SCREEN_ALMANAC) {
      // The title kitchen idles behind the almanac; nothing advances.
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const actions = input.takeActions();
    const events = world.step(STEP, {
      dx: input.direction().x,
      dy: input.direction().y,
      interact: (actions & ACTION_INTERACT) !== 0,
      dash: (actions & ACTION_DASH) !== 0,
    });
    // The action bits were consumed above; handle the rest from the same frame.
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_ALMANAC) {
      openAlmanac(SCREEN_PLAY);
      return;
    }
    if (actions & ACTION_RESTART) {
      startGame();
      return;
    }
    playSound(events);
    if (events & EVENT_SERVED) announce(`Order served. $${world.state.money} total, streak ${world.state.streak}.`);
    if (events & EVENT_EXPIRED) announce('An order expired. Streak lost.');
    if (world.state.shiftIndex !== announcedShift) announcedShift = world.state.shiftIndex;
    if (world.state.victory) {
      screen = SCREEN_VICTORY;
      if (world.state.money > best) {
        best = world.state.money;
        saveBest(best);
      }
      announce(`Bakery legend! Total $${world.state.money}.`);
    } else if (world.state.gameOver) {
      screen = SCREEN_OVER;
      if (world.state.money > best) {
        best = world.state.money;
        saveBest(best);
      }
      announce('Game over. The shift goal was missed.');
    } else if (world.state.shiftWon) {
      screen = SCREEN_SHIFT_END;
      announce(`${SHIFTS[world.state.shiftIndex].name} complete!`);
    }
  }

  function highlightKind() {
    if (screen !== SCREEN_PLAY) return null;
    const { target, distance } = world.nearestStation();
    if (!target || distance > 78) return null;
    return target.kind;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleClick();
    if (screen === SCREEN_TITLE || screen === SCREEN_ALMANAC || screen === SCREEN_PAUSED
      || screen === SCREEN_SHIFT_END || screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
      handleActions();
      renderer.draw(world, screen, highlightKind());
      accumulator = 0;
      return;
    }
    while (accumulator >= STEP) {
      step();
      accumulator -= STEP;
      if (screen !== SCREEN_PLAY) break;
    }
    renderer.draw(world, screen, highlightKind());
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Crumb and Ember Bakery. Press Space or click Open Bakery to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
