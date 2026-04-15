import { FoodItem } from '../types';

// ─── Open Food Facts Search ───────────────────────────────────────────────────
// Free, no API key required — worldwide database with product images.
// Sorted by scan popularity so well-known products appear first.

export async function searchFoods(query: string, pageSize = 20): Promise<FoodItem[]> {
  try {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl` +
      `?action=process&search_terms=${encodeURIComponent(query)}` +
      `&json=1&page_size=${pageSize}&sort_by=unique_scans_n` +
      `&fields=code,product_name,brands,image_front_thumb_url,nutriments`;
    const response = await fetch(url);
    const data = await response.json();
    const products = (data.products ?? []) as Record<string, unknown>[];
    const results: FoodItem[] = [];

    for (const p of products) {
      const name = (p.product_name as string)?.trim();
      if (!name) continue;
      const n = (p.nutriments as Record<string, unknown>) ?? {};
      const cal = Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0);
      // Skip entries with no nutrition data at all
      if (!cal && !n.proteins_100g && !n.carbohydrates_100g) continue;

      results.push({
        id: `off_${p.code as string}`,
        name,
        brand: (p.brands as string)?.split(',')[0]?.trim() || undefined,
        calories_per_100g: cal,
        protein_per_100g: Number(n.proteins_100g ?? 0),
        carbs_per_100g: Number(n.carbohydrates_100g ?? 0),
        fat_per_100g: Number(n.fat_100g ?? 0),
        fiber_per_100g: Number(n.fiber_100g ?? 0) || undefined,
        sodium_per_100g: Number(n.sodium_100g ?? 0) || undefined,
        image_url: (p.image_front_thumb_url as string) || undefined,
        source: 'OpenFoodFacts' as const,
        barcode: p.code as string,
      });
    }
    return results;
  } catch {
    return [];
  }
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
