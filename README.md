[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/anissa1881/crumb-ember-bakery/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/anissa1881/crumb-ember-bakery/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

# Crumb & Ember Bakery

An original cooking game for the [make.fun "Make the best cooking game" bounty](https://make.fun/bounty/best-cooking-game-20261125-0137). Run a warm little bakery through three shifts: take ingredients from the pantry, mix dough, bake it in the stone oven, garnish, plate and serve — before the orders' timers run out and the streak goes cold.

## How to play

Serve the orders on the board. Each dish is a little route through the kitchen:

1. **Pantry** — take ingredients (flour, butter, eggs, berries, chocolate, honey).
2. **Mix bowl** — drop in exactly a recipe's ingredients; it mixes itself.
3. **Stone oven** — bake the dough. Take it out when it dings, or it burns.
4. **Decorate** — garnish the dishes that need it.
5. **Plating** — put the finished bake on a plate.
6. **Serve pass** — ring the bell and hand it to the matching order.

Serving in a row builds a streak and a combo multiplier (up to ×3). A wrong dish or an expired order breaks the streak. Each shift has a money goal: Morning Bake ($55), Lunch Rush ($95), Evening Gala ($140). Miss a goal and the ovens go cold.

## Controls

- **WASD / arrows** — move the chef (or click a station to walk there)
- **Space / E** — use the nearest station
- **Q** — dash
- **B** — recipe almanac
- **P** — pause · **R** — restart · **M** — mute

## The six signature bakes

| Dish | Ingredients | Price |
| --- | --- | --- |
| Sourdough Loaf | Flour + Honey | $8 |
| Butter Croissant | Flour + Butter | $10 |
| Berry Tart | Flour + Butter + Berries | $14 |
| Cinnamon Roll | Flour + Butter + Honey | $12 |
| Chocolate Babka | Flour + Chocolate + Eggs | $13 |
| Honey Cake | Flour + Eggs + Honey | $16 |

## Play it

Any static server works — the game is plain files under `game/` with no network requests:

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots are deterministic staged scenes of the real game: `?shot=start|play|almanac|served&seed=1`.

## How it is built

- `game/index.html` — the page shell (one canvas, one module script).
- `game/src/config.js` — recipes, ingredients, station layout, shifts.
- `game/src/world.js` — the rules: chef, stations, orders, scoring.
- `game/src/render.js` — everything drawn on the canvas.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — WebAudio synth sounds, no audio files.
- `game/src/shots.js` — the autopilot that stages the screenshot scenes.
- `game/src/random.js` — the seeded random generator.
- `game/src/main.js` — boot, the fixed-step loop, screens.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## License

MIT — see [LICENSE](LICENSE).
