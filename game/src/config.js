// Crumb & Ember Bakery — all the numbers and names the game runs on.
// One job: the constants. Recipes, ingredients, the kitchen layout and the shifts.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const STEP = 1 / 60;

export const CHEF_SPEED = 250;
export const CHEF_RADIUS = 20;
export const DASH_SPEED = 460;
export const DASH_TIME = 0.35;
export const DASH_COOLDOWN = 1.2;
export const HAND_SLOTS = 2;
export const INTERACT_RANGE = 78;

export const MIX_SECONDS = 2.5;
export const BAKE_SECONDS = 8;
export const BURN_GRACE_SECONDS = 8;
export const DECORATE_SECONDS = 1.2;

export const MAX_ORDERS = 4;
export const ORDER_SECONDS = 55;
export const ORDER_SPAWN_DELAY = 2.5;
export const COMBO_WINDOW_SECONDS = 20;

export const SHIFTS = [
  { name: 'Morning Bake', goal: 55, seconds: 100, blurb: 'The ovens are warm and the first customers are queuing.' },
  { name: 'Lunch Rush', goal: 95, seconds: 100, blurb: 'The lunch crowd wants everything at once. Keep the line moving.' },
  { name: 'Evening Gala', goal: 140, seconds: 100, blurb: 'The gala dinner. Every plate counts and the tips are big.' },
];

// Ingredients live on the pantry shelves, left wall, top to bottom.
export const INGREDIENTS = {
  flour: { name: 'Flour', color: '#f3e5c3', dark: '#c9b285', shelf: 0 },
  butter: { name: 'Butter', color: '#ffd94d', dark: '#d9a400', shelf: 1 },
  eggs: { name: 'Eggs', color: '#fff8e7', dark: '#c98f4e', shelf: 2 },
  berries: { name: 'Berries', color: '#d64560', dark: '#8e2a3d', shelf: 3 },
  choc: { name: 'Chocolate', color: '#6b4226', dark: '#3e2412', shelf: 4 },
  honey: { name: 'Honey', color: '#f5a623', dark: '#b97a0e', shelf: 5 },
};
export const INGREDIENT_IDS = ['flour', 'butter', 'eggs', 'berries', 'choc', 'honey'];

// A recipe is ingredients -> mix -> bake -> (decorate) -> plate -> serve.
export const RECIPES = [
  {
    id: 'sourdough', name: 'Sourdough Loaf', short: 'Sourdough',
    ingredients: ['flour', 'honey'], garnish: false, price: 8,
    blurb: 'Slow-fermented, crackling crust, warm honey heart.',
  },
  {
    id: 'croissant', name: 'Butter Croissant', short: 'Croissant',
    ingredients: ['flour', 'butter'], garnish: false, price: 10,
    blurb: 'Seventy-two layers of butter and patience.',
  },
  {
    id: 'berrytart', name: 'Berry Tart', short: 'Berry Tart',
    ingredients: ['flour', 'butter', 'berries'], garnish: true, price: 14,
    blurb: 'Buttery shell, custard cream, a crown of fresh berries.',
  },
  {
    id: 'cinnamon', name: 'Cinnamon Roll', short: 'Cinnamon Roll',
    ingredients: ['flour', 'butter', 'honey'], garnish: true, price: 12,
    blurb: 'Swirled with cinnamon and honey, iced while warm.',
  },
  {
    id: 'babka', name: 'Chocolate Babka', short: 'Choc Babka',
    ingredients: ['flour', 'choc', 'eggs'], garnish: false, price: 13,
    blurb: 'Twisted chocolate ribbons in a soft enriched loaf.',
  },
  {
    id: 'honeycake', name: 'Honey Cake', short: 'Honey Cake',
    ingredients: ['flour', 'eggs', 'honey'], garnish: true, price: 16,
    blurb: 'Golden sponge soaked in honey, crowned with cream.',
  },
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((recipe) => [recipe.id, recipe]));

// Stations. x/y/w/h are the counter's rectangle; the chef stands at its approach point.
export const STATIONS = {
  bowl: { kind: 'bowl', label: 'MIX BOWL', x: 330, y: 170, w: 130, h: 96, approach: [395, 300] },
  oven: { kind: 'oven', label: 'STONE OVEN', x: 520, y: 150, w: 170, h: 116, approach: [605, 300] },
  decorate: { kind: 'decorate', label: 'DECORATE', x: 750, y: 170, w: 130, h: 96, approach: [815, 300] },
  plating: { kind: 'plating', label: 'PLATING', x: 920, y: 170, w: 130, h: 96, approach: [985, 300] },
  serve: { kind: 'serve', label: 'SERVE PASS', x: 1060, y: 470, w: 150, h: 100, approach: [1085, 440] },
  trash: { kind: 'trash', label: 'SINK · TRASH', x: 330, y: 500, w: 130, h: 96, approach: [395, 470] },
};
export const PANTRY = {
  x: 48, y: 140, w: 150, h: 76, gap: 12,
  approachX: 232,
};
// The floor the chef may walk on (inside the walls, below the order board).
export const FLOOR = { x: 36, y: 108, w: 1208, h: 592 };
export const CHEF_START = { x: 640, y: 430 };

/** A dish item's readable name: 'dough:croissant' -> 'Croissant dough'. */
export function itemName(item) {
  if (!item) return '';
  if (INGREDIENTS[item]) return INGREDIENTS[item].name;
  const [stage, recipeId] = item.split(':');
  const recipe = RECIPE_BY_ID[recipeId];
  if (!recipe) return item;
  if (stage === 'dough') return `${recipe.short} dough`;
  if (stage === 'baked') return `Baked ${recipe.short}`;
  if (stage === 'decorated') return `Decorated ${recipe.short}`;
  if (stage === 'plated') return recipe.name;
  if (stage === 'burnt') return 'Burnt loaf';
  return item;
}
