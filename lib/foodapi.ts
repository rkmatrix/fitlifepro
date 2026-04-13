import { FoodItem } from '../types';
import { USDA_API_KEY } from '../constants/config';

// ─── USDA FoodData Central ────────────────────────────────────────────────────

export async function searchUSDAFoods(query: string, pageSize = 20): Promise<FoodItem[]> {
  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&api_key=${USDA_API_KEY}`
    );
    const data = await response.json();

    return (data.foods ?? []).slice(0, pageSize).map((food: Record<string, unknown>) => {
      const nutrients = (food.foodNutrients as Record<string, unknown>[]) ?? [];
      const getNutrient = (name: string): number => {
        const n = nutrients.find((x) => (x.nutrientName as string)?.toLowerCase().includes(name));
        return n ? Number(n.value ?? 0) : 0;
      };
      return {
        id: `usda_${food.fdcId}`,
        name: food.description as string,
        brand: food.brandOwner as string | undefined,
        calories_per_100g: getNutrient('energy'),
        protein_per_100g: getNutrient('protein'),
        carbs_per_100g: getNutrient('carbohydrate'),
        fat_per_100g: getNutrient('total lipid'),
        fiber_per_100g: getNutrient('fiber'),
        sodium_per_100g: getNutrient('sodium'),
        source: 'USDA' as const,
      };
    });
  } catch {
    return [];
  }
}

// ─── Open Food Facts (barcode) ────────────────────────────────────────────────

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    const data = await response.json();

    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const n = p.nutriments ?? {};

    return {
      id: `off_${barcode}`,
      name: p.product_name ?? 'Unknown Product',
      brand: p.brands,
      calories_per_100g: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0,
      protein_per_100g: n.proteins_100g ?? 0,
      carbs_per_100g: n.carbohydrates_100g ?? 0,
      fat_per_100g: n.fat_100g ?? 0,
      fiber_per_100g: n.fiber_100g,
      sodium_per_100g: n.sodium_100g,
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
