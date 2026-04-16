import { FoodItem } from '../types';

const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY ?? 'DEMO_KEY';

// Nutrient IDs in USDA FoodData Central
const NUTRIENT = {
  ENERGY: 1008,
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
  FIBER: 1079,
  SODIUM: 1093,
};

// ─── USDA FoodData Central ────────────────────────────────────────────────────
// Free, no sign-up required (DEMO_KEY). Covers Foundation, SR Legacy, FNDDS,
// and branded foods. Excellent coverage of generic & Indian foods.
async function searchUSDA(query: string, pageSize = 12): Promise<FoodItem[]> {
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search` +
    `?query=${encodeURIComponent(query)}` +
    `&api_key=${USDA_API_KEY}` +
    `&pageSize=${pageSize}` +
    `&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS),Branded`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  const foods: FoodItem[] = [];

  for (const f of (data.foods ?? []) as Record<string, unknown>[]) {
    const name = (f.description as string)?.trim();
    if (!name) continue;
    const nutrients = (f.foodNutrients ?? []) as { nutrientId: number; value: number }[];
    const get = (id: number) => nutrients.find((n) => n.nutrientId === id)?.value ?? 0;

    const cal = get(NUTRIENT.ENERGY);
    const protein = get(NUTRIENT.PROTEIN);
    const carbs = get(NUTRIENT.CARBS);
    const fat = get(NUTRIENT.FAT);
    if (!cal && !protein && !carbs) continue;

    foods.push({
      id: `usda_${f.fdcId as number}`,
      name: toTitleCase(name),
      brand: (f.brandOwner as string) || (f.brandName as string) || undefined,
      calories_per_100g: Math.round(cal),
      protein_per_100g: Math.round(protein * 10) / 10,
      carbs_per_100g: Math.round(carbs * 10) / 10,
      fat_per_100g: Math.round(fat * 10) / 10,
      fiber_per_100g: get(NUTRIENT.FIBER) || undefined,
      sodium_per_100g: get(NUTRIENT.SODIUM) ? get(NUTRIENT.SODIUM) / 1000 : undefined,
      source: 'USDA' as const,
    });
  }
  return foods;
}

// ─── Open Food Facts Search ───────────────────────────────────────────────────
// Free, no API key. Worldwide product database with images.
async function searchOpenFoodFacts(query: string, pageSize = 10): Promise<FoodItem[]> {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl` +
    `?action=process&search_terms=${encodeURIComponent(query)}` +
    `&json=1&page_size=${pageSize}&sort_by=unique_scans_n` +
    `&fields=code,product_name,brands,image_front_thumb_url,nutriments`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  const foods: FoodItem[] = [];

  for (const p of (data.products ?? []) as Record<string, unknown>[]) {
    const name = (p.product_name as string)?.trim();
    if (!name) continue;
    const n = (p.nutriments as Record<string, unknown>) ?? {};
    const cal = Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0);
    const protein = Number(n.proteins_100g ?? 0);
    const carbs = Number(n.carbohydrates_100g ?? 0);
    if (!cal && !protein && !carbs) continue;

    foods.push({
      id: `off_${p.code as string}`,
      name,
      brand: (p.brands as string)?.split(',')[0]?.trim() || undefined,
      calories_per_100g: Math.round(cal),
      protein_per_100g: Math.round(protein * 10) / 10,
      carbs_per_100g: Math.round(carbs * 10) / 10,
      fat_per_100g: Math.round(Number(n.fat_100g ?? 0) * 10) / 10,
      fiber_per_100g: Number(n.fiber_100g ?? 0) || undefined,
      sodium_per_100g: Number(n.sodium_100g ?? 0) || undefined,
      image_url: (p.image_front_thumb_url as string) || undefined,
      source: 'OpenFoodFacts' as const,
      barcode: p.code as string,
    });
  }
  return foods;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bOf\b/g, 'of')
    .replace(/\bWith\b/g, 'with');
}

// ─── Combined search ──────────────────────────────────────────────────────────
// Queries USDA + Open Food Facts in parallel and merges results.
// USDA results come first (better nutritional accuracy).
// OFF results add packaged products with images.
export async function searchFoods(query: string, pageSize = 20): Promise<FoodItem[]> {
  const [usdaResult, offResult] = await Promise.allSettled([
    searchUSDA(query, Math.ceil(pageSize * 0.6)),
    searchOpenFoodFacts(query, Math.ceil(pageSize * 0.5)),
  ]);

  const usda = usdaResult.status === 'fulfilled' ? usdaResult.value : [];
  const off = offResult.status === 'fulfilled' ? offResult.value : [];

  // Merge: attach OFF image to matching USDA item where possible, then append remainder
  const combined: FoodItem[] = [];
  const usedOffIdx = new Set<number>();

  for (const u of usda) {
    const uNorm = u.name.toLowerCase().slice(0, 16);
    const matchIdx = off.findIndex(
      (o, i) => !usedOffIdx.has(i) && o.name.toLowerCase().startsWith(uNorm.slice(0, 10)),
    );
    if (matchIdx >= 0) {
      usedOffIdx.add(matchIdx);
      combined.push({ ...u, image_url: u.image_url ?? off[matchIdx].image_url });
    } else {
      combined.push(u);
    }
  }

  // Append remaining OFF items that weren't matched
  off.forEach((o, i) => {
    if (!usedOffIdx.has(i)) combined.push(o);
  });

  // Deduplicate by normalised name (keep first occurrence)
  const seen = new Set<string>();
  return combined
    .filter((f) => {
      const key = f.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, pageSize);
}

// Keep legacy name for any other callers
export const searchUSDAFoods = searchFoods;

// ─── Open Food Facts (barcode) ────────────────────────────────────────────────

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json` +
      `?fields=product_name,brands,nutriments,image_front_thumb_url`
    );
    const data = await response.json();

    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const n = p.nutriments ?? {};

    return {
      id: `off_${barcode}`,
      name: p.product_name ?? 'Unknown Product',
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      calories_per_100g: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0,
      protein_per_100g: n.proteins_100g ?? 0,
      carbs_per_100g: n.carbohydrates_100g ?? 0,
      fat_per_100g: n.fat_100g ?? 0,
      fiber_per_100g: n.fiber_100g,
      sodium_per_100g: n.sodium_100g,
      image_url: p.image_front_thumb_url || undefined,
      source: 'OpenFoodFacts' as const,
      barcode,
    };
  } catch {
    return null;
  }
}

export function calculateNutrients(
  food: FoodItem,
  quantityG: number
): { calories: number; protein: number; carbs: number; fat: number } {
  const ratio = quantityG / 100;
  return {
    calories: Math.round(food.calories_per_100g * ratio),
    protein: Math.round(food.protein_per_100g * ratio * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * ratio * 10) / 10,
    fat: Math.round(food.fat_per_100g * ratio * 10) / 10,
  };
}
