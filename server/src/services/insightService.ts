import { roundKg } from '../../../shared/calculateEmissions';
import { EMISSION_FACTORS, CATEGORY_LABELS, type Category } from '../../../shared/emissionFactors';
import type { Insight } from '../../../shared/types';
import { SHORT_TRIP_KM, type WeekStats } from './insightStats';

/** Input to the pure insights engine. */
export interface InsightInput {
  /** Aggregated stats for the current rolling 7-day window. */
  stats: WeekStats;
  /** Total emissions of the previous rolling 7-day window. */
  lastWeekKg: number;
}

// Rule thresholds — named so the reasoning is explicit, not magic.
const CAR_KM_THRESHOLD = 30;
const TRANSPORT_SHARE_THRESHOLD = 0.4;
const SWAPPABLE_CAR_KM = 20;
const RED_MEAT_MEALS_THRESHOLD = 4;
const RED_MEAT_SWAPS = 2;
const ELECTRICITY_KWH_THRESHOLD = 35; // ~5 kWh/day, above a frugal baseline
const ELECTRICITY_TRIM_SHARE = 0.1;
const SHORT_TRIPS_THRESHOLD = 3;
const SHOPPING_KG_THRESHOLD = 20;
const SHOPPING_SECONDHAND_SHARE = 0.3;
const LPG_KG_THRESHOLD = 5;
const LPG_EFFICIENCY_SHARE = 0.15;
const RISING_THRESHOLD = 1.1;
const TOP_CATEGORY_TRIM_SHARE = 0.1;

const F = EMISSION_FACTORS;
type Rule = (stats: WeekStats, input: InsightInput) => Insight | null;

const make = (
  id: string,
  category: Category | 'general',
  title: string,
  body: string,
  savingKg: number,
): Insight => ({ id, category, title, body, estimatedWeeklySavingKg: roundKg(savingKg) });

const swapCarForTransit: Rule = (s) => {
  const share = s.totalKg > 0 ? s.categoryKg.transport / s.totalKg : 0;
  if (s.carKm <= CAR_KM_THRESHOLD || share <= TRANSPORT_SHARE_THRESHOLD) return null;
  const km = Math.min(SWAPPABLE_CAR_KM, s.carKm);
  const saving = km * (F.car_petrol.kgCo2ePerUnit - F.metro.kgCo2ePerUnit);
  return make(
    'swap-car-for-transit',
    'transport',
    'Shift some car km to metro or bus',
    `Transport is over ${TRANSPORT_SHARE_THRESHOLD * 100}% of your footprint and you drove ${roundKg(s.carKm)} km this week. Moving ${km} km to the metro saves about ${roundKg(saving)} kg CO2e a week.`,
    saving,
  );
};

const cycleShortTrips: Rule = (s) => {
  if (s.shortCarTripCount < SHORT_TRIPS_THRESHOLD) return null;
  const saving = s.shortCarTripKm * F.car_petrol.kgCo2ePerUnit;
  return make(
    'cycle-short-trips',
    'transport',
    'Cycle or walk your short car trips',
    `You logged ${s.shortCarTripCount} car trips of ${SHORT_TRIP_KM} km or less (${roundKg(s.shortCarTripKm)} km). Cycling or walking them saves about ${roundKg(saving)} kg CO2e a week.`,
    saving,
  );
};

const swapRedMeat: Rule = (s) => {
  if (s.redMeatMeals < RED_MEAT_MEALS_THRESHOLD) return null;
  const saving = RED_MEAT_SWAPS * (F.meal_red_meat.kgCo2ePerUnit - F.meal_vegetarian.kgCo2ePerUnit);
  return make(
    'swap-red-meat',
    'food',
    'Swap two red-meat meals for vegetarian',
    `You had ${s.redMeatMeals} red-meat meals this week. Swapping ${RED_MEAT_SWAPS} for vegetarian meals saves about ${roundKg(saving)} kg CO2e a week.`,
    saving,
  );
};

const trimElectricity: Rule = (s) => {
  if (s.electricityKwh <= ELECTRICITY_KWH_THRESHOLD) return null;
  const saving = s.electricityKwh * ELECTRICITY_TRIM_SHARE * F.electricity.kgCo2ePerUnit;
  return make(
    'trim-electricity',
    'energy',
    'Trim electricity use by 10%',
    `You used ${roundKg(s.electricityKwh)} kWh this week. Raising the AC set-point by 1°C and switching off idle appliances typically cuts 10% — about ${roundKg(saving)} kg CO2e a week.`,
    saving,
  );
};

const trainNotPlane: Rule = (s) => {
  if (s.flightShortKm <= 0) return null;
  const saving = s.flightShortKm * (F.flight_short.kgCo2ePerUnit - F.train.kgCo2ePerUnit);
  return make(
    'train-not-plane',
    'transport',
    'Take the train instead of short flights',
    `You flew ${roundKg(s.flightShortKm)} km short-haul this week. The same distance by train would save about ${roundKg(saving)} kg CO2e.`,
    saving,
  );
};

const buyLessNew: Rule = (s) => {
  if (s.shoppingKg <= SHOPPING_KG_THRESHOLD) return null;
  const saving = s.shoppingKg * SHOPPING_SECONDHAND_SHARE;
  return make(
    'buy-less-new',
    'shopping',
    'Choose second-hand or repair first',
    `Shopping added ${roundKg(s.shoppingKg)} kg CO2e this week. Buying ~30% second-hand (or repairing) saves about ${roundKg(saving)} kg CO2e a week.`,
    saving,
  );
};

const efficientCooking: Rule = (s) => {
  if (s.lpgKg <= LPG_KG_THRESHOLD) return null;
  const saving = s.lpgKg * F.lpg.kgCo2ePerUnit * LPG_EFFICIENCY_SHARE;
  return make(
    'efficient-cooking',
    'energy',
    'Cook with lids and a pressure cooker',
    `You burned ${roundKg(s.lpgKg)} kg of LPG this week. Pressure cooking and lidded pans cut gas use ~15% — about ${roundKg(saving)} kg CO2e a week.`,
    saving,
  );
};

const startGreenTrips: Rule = (s) => {
  if (s.greenTripCount > 0 || s.carKm <= 0) return null;
  const km = Math.min(SHORT_TRIP_KM, s.carKm);
  const saving = km * F.car_petrol.kgCo2ePerUnit;
  return make(
    'start-green-trips',
    'transport',
    'Try one bike or walking trip this week',
    `No bike or walking trips logged yet. Replacing just ${km} car km saves about ${roundKg(saving)} kg CO2e — and it counts toward your streak.`,
    saving,
  );
};

const progressPraise: Rule = (s, input) => {
  if (input.lastWeekKg <= 0 || s.totalKg >= input.lastWeekKg) return null;
  const saved = input.lastWeekKg - s.totalKg;
  return make(
    'progress-praise',
    'general',
    'Nice work — your footprint is down',
    `You emitted ${roundKg(saved)} kg CO2e less than the previous week (${roundKg(s.totalKg)} vs ${roundKg(input.lastWeekKg)}). Keeping this pace saves ${roundKg(saved)} kg every week.`,
    saved,
  );
};

const risingFootprint: Rule = (s, input) => {
  if (input.lastWeekKg <= 0 || s.totalKg <= input.lastWeekKg * RISING_THRESHOLD) return null;
  const top = (Object.entries(s.categoryKg) as [Category, number][]).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  );
  const saving = top[1] * TOP_CATEGORY_TRIM_SHARE;
  return make(
    'rising-footprint',
    top[0],
    `Footprint rising — focus on ${CATEGORY_LABELS[top[0]].toLowerCase()}`,
    `This week is up vs last week (${roundKg(s.totalKg)} vs ${roundKg(input.lastWeekKg)} kg CO2e). ${CATEGORY_LABELS[top[0]]} is your biggest source; trimming it 10% saves about ${roundKg(saving)} kg a week.`,
    saving,
  );
};

const firstSteps: Rule = (s) => {
  if (s.entryCount > 0) return null;
  return make(
    'first-steps',
    'general',
    'Log your first activity',
    'Nothing logged in the last 7 days. Log a commute or a meal to get personalised, quantified suggestions.',
    0,
  );
};

const RULES: Rule[] = [
  swapCarForTransit,
  cycleShortTrips,
  swapRedMeat,
  trimElectricity,
  trainNotPlane,
  buyLessNew,
  efficientCooking,
  startGreenTrips,
  progressPraise,
  risingFootprint,
  firstSteps,
];

/**
 * The rule-based insights engine. Pure and deterministic: applies every
 * rule to the aggregated week stats and returns the matching insights
 * ranked by estimated weekly saving (largest first). Every insight
 * quantifies its saving — vague, unquantified advice is forbidden.
 * PERF: consumes pre-aggregated WeekStats (built by SQL GROUP BY), so a
 * full evaluation is O(rules), independent of activity volume.
 *
 * @param input - this week's aggregated stats and last week's total
 * @returns ranked insights (never empty: firstSteps covers the empty week)
 */
export function computeInsights(input: InsightInput): Insight[] {
  return RULES.map((rule) => rule(input.stats, input))
    .filter((insight): insight is Insight => insight !== null)
    .sort((a, b) => b.estimatedWeeklySavingKg - a.estimatedWeeklySavingKg);
}
