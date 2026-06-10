/**
 * Single source of truth for every emission factor used by EcoTrace.
 * Units are kg CO2e per unit of activity. Each factor cites its source so
 * calculations are transparent and auditable (see the "Understand" page).
 */

/** The four activity categories supported by the app. */
export const CATEGORIES = ['transport', 'energy', 'food', 'shopping'] as const;

/** Union of supported category ids. */
export type Category = (typeof CATEGORIES)[number];

/** Human-readable labels for categories (used in UI and charts). */
export const CATEGORY_LABELS: Record<Category, string> = {
  transport: 'Transport',
  energy: 'Energy',
  food: 'Food',
  shopping: 'Shopping',
};

/** Describes one loggable activity and how its emissions are derived. */
export interface EmissionFactor {
  /** Human-readable name shown in the UI. */
  label: string;
  /** Category the activity belongs to. */
  category: Category;
  /** kg CO2e emitted per unit of quantity. */
  kgCo2ePerUnit: number;
  /** Unit the user enters quantity in. */
  unit: 'km' | 'kWh' | 'kg' | 'serving' | 'item';
  /** Upper bound for a single log entry — guards against typos/abuse. */
  maxQuantity: number;
  /** Citation for the factor value. */
  source: string;
}

/**
 * Emission factors keyed by activity type id.
 * Sources: UK DEFRA/BEIS GHG conversion factors 2024; CEA (Central
 * Electricity Authority, India) CO2 baseline 2023; Poore & Nemecek (2018),
 * "Reducing food's environmental impacts", Science; manufacturer lifecycle
 * reports (Apple/Dell product environmental reports).
 */
export const EMISSION_FACTORS = {
  car_petrol: {
    label: 'Car (petrol)',
    category: 'transport',
    kgCo2ePerUnit: 0.192, // DEFRA 2024, average petrol car per km
    unit: 'km',
    maxQuantity: 2000,
    source: 'DEFRA GHG conversion factors 2024',
  },
  car_diesel: {
    label: 'Car (diesel)',
    category: 'transport',
    kgCo2ePerUnit: 0.171, // DEFRA 2024, average diesel car per km
    unit: 'km',
    maxQuantity: 2000,
    source: 'DEFRA GHG conversion factors 2024',
  },
  car_ev: {
    label: 'Car (electric)',
    category: 'transport',
    kgCo2ePerUnit: 0.053, // DEFRA 2024, battery EV incl. grid electricity
    unit: 'km',
    maxQuantity: 2000,
    source: 'DEFRA GHG conversion factors 2024',
  },
  bus: {
    label: 'Bus',
    category: 'transport',
    kgCo2ePerUnit: 0.105, // DEFRA 2024, local bus average per passenger-km
    unit: 'km',
    maxQuantity: 1000,
    source: 'DEFRA GHG conversion factors 2024',
  },
  train: {
    label: 'Train',
    category: 'transport',
    kgCo2ePerUnit: 0.041, // DEFRA 2024, national rail per passenger-km
    unit: 'km',
    maxQuantity: 3000,
    source: 'DEFRA GHG conversion factors 2024',
  },
  metro: {
    label: 'Metro / subway',
    category: 'transport',
    kgCo2ePerUnit: 0.031, // DEFRA 2024, light rail & metro per passenger-km
    unit: 'km',
    maxQuantity: 500,
    source: 'DEFRA GHG conversion factors 2024',
  },
  flight_short: {
    label: 'Flight (short-haul)',
    category: 'transport',
    kgCo2ePerUnit: 0.255, // DEFRA 2024, short-haul economy incl. radiative forcing
    unit: 'km',
    maxQuantity: 4000,
    source: 'DEFRA GHG conversion factors 2024',
  },
  flight_long: {
    label: 'Flight (long-haul)',
    category: 'transport',
    kgCo2ePerUnit: 0.195, // DEFRA 2024, long-haul economy incl. radiative forcing
    unit: 'km',
    maxQuantity: 20000,
    source: 'DEFRA GHG conversion factors 2024',
  },
  bicycle: {
    label: 'Bicycle',
    category: 'transport',
    kgCo2ePerUnit: 0, // zero direct emissions — loggable as a green action
    unit: 'km',
    maxQuantity: 300,
    source: 'Zero direct emissions by definition',
  },
  walk: {
    label: 'Walk',
    category: 'transport',
    kgCo2ePerUnit: 0, // zero direct emissions — loggable as a green action
    unit: 'km',
    maxQuantity: 100,
    source: 'Zero direct emissions by definition',
  },
  electricity: {
    label: 'Grid electricity',
    category: 'energy',
    kgCo2ePerUnit: 0.82, // CEA India grid average 2023 per kWh
    unit: 'kWh',
    maxQuantity: 200,
    source: 'CEA (India) CO2 baseline database v19, 2023',
  },
  lpg: {
    label: 'LPG / cooking gas',
    category: 'energy',
    kgCo2ePerUnit: 2.98, // DEFRA 2024, LPG per kg burned
    unit: 'kg',
    maxQuantity: 50,
    source: 'DEFRA GHG conversion factors 2024',
  },
  meal_red_meat: {
    label: 'Meal — red meat',
    category: 'food',
    kgCo2ePerUnit: 7.2, // Poore & Nemecek 2018, beef/lamb meal average
    unit: 'serving',
    maxQuantity: 10,
    source: 'Poore & Nemecek (2018), Science',
  },
  meal_poultry: {
    label: 'Meal — poultry',
    category: 'food',
    kgCo2ePerUnit: 1.9, // Poore & Nemecek 2018, chicken meal average
    unit: 'serving',
    maxQuantity: 10,
    source: 'Poore & Nemecek (2018), Science',
  },
  meal_fish: {
    label: 'Meal — fish',
    category: 'food',
    kgCo2ePerUnit: 1.7, // Poore & Nemecek 2018, farmed fish meal average
    unit: 'serving',
    maxQuantity: 10,
    source: 'Poore & Nemecek (2018), Science',
  },
  meal_vegetarian: {
    label: 'Meal — vegetarian',
    category: 'food',
    kgCo2ePerUnit: 1.2, // Poore & Nemecek 2018, vegetarian meal average
    unit: 'serving',
    maxQuantity: 10,
    source: 'Poore & Nemecek (2018), Science',
  },
  meal_vegan: {
    label: 'Meal — vegan',
    category: 'food',
    kgCo2ePerUnit: 0.9, // Poore & Nemecek 2018, plant-based meal average
    unit: 'serving',
    maxQuantity: 10,
    source: 'Poore & Nemecek (2018), Science',
  },
  clothing_item: {
    label: 'Clothing item',
    category: 'shopping',
    kgCo2ePerUnit: 10, // UNEP 2023, average garment cradle-to-gate
    unit: 'item',
    maxQuantity: 20,
    source: 'UNEP Sustainable Fashion 2023',
  },
  electronics_small: {
    label: 'Electronics (small)',
    category: 'shopping',
    kgCo2ePerUnit: 70, // Apple iPhone product environmental report, lifecycle
    unit: 'item',
    maxQuantity: 5,
    source: 'Apple Product Environmental Reports 2024',
  },
  electronics_large: {
    label: 'Electronics (large)',
    category: 'shopping',
    kgCo2ePerUnit: 250, // Dell/Apple laptop & TV lifecycle reports, average
    unit: 'item',
    maxQuantity: 5,
    source: 'Dell & Apple product carbon footprint reports 2024',
  },
  misc_item: {
    label: 'Paper / misc goods',
    category: 'shopping',
    kgCo2ePerUnit: 1.5, // DEFRA 2024 spend-based approximation, small goods
    unit: 'item',
    maxQuantity: 50,
    source: 'DEFRA GHG conversion factors 2024 (spend-based approx.)',
  },
} as const satisfies Record<string, EmissionFactor>;

/** Union of supported activity type ids. */
export type ActivityType = keyof typeof EMISSION_FACTORS;

/** All activity type ids, in declaration order. */
export const ACTIVITY_TYPES = Object.keys(EMISSION_FACTORS) as ActivityType[];

/**
 * Returns the activity types belonging to a category, for building UI
 * selects and validating category/activity consistency.
 * @param category - category to filter by
 * @returns activity type ids within the category
 */
export function activityTypesForCategory(category: Category): ActivityType[] {
  return ACTIVITY_TYPES.filter((type) => EMISSION_FACTORS[type].category === category);
}
