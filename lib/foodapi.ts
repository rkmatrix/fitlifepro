import { FoodItem } from '../types';

const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY ?? 'DEMO_KEY';

// â”€â”€â”€ Safe timeout fetch (AbortSignal.timeout not reliable in Expo web) â”€â”€â”€â”€â”€â”€â”€â”€
function fetchWithTimeout(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// â”€â”€â”€ Built-in food database â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Instant results â€” no network needed. Covers common Indian & global foods.
// Nutrition values per 100g (USDA / IFCT verified averages).
const BUILTIN_FOODS: FoodItem[] = [
  // Eggs & Dairy
  { id: 'b_egg_whole', name: 'Egg (Whole)', calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fat_per_100g: 11, source: 'USDA' },
  { id: 'b_egg_white', name: 'Egg White', calories_per_100g: 52, protein_per_100g: 11, carbs_per_100g: 0.7, fat_per_100g: 0.2, source: 'USDA' },
  { id: 'b_egg_yolk', name: 'Egg Yolk', calories_per_100g: 322, protein_per_100g: 16, carbs_per_100g: 3.6, fat_per_100g: 27, source: 'USDA' },
  { id: 'b_boiled_egg', name: 'Boiled Egg', calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fat_per_100g: 11, source: 'USDA' },
  { id: 'b_scrambled_egg', name: 'Scrambled Eggs', calories_per_100g: 149, protein_per_100g: 10, carbs_per_100g: 1.6, fat_per_100g: 11, source: 'USDA' },
  { id: 'b_omelette', name: 'Omelette (Plain)', calories_per_100g: 154, protein_per_100g: 11, carbs_per_100g: 0.8, fat_per_100g: 12, source: 'USDA' },
  { id: 'b_fried_egg', name: 'Fried Egg', calories_per_100g: 196, protein_per_100g: 14, carbs_per_100g: 0.8, fat_per_100g: 15, source: 'USDA' },
  { id: 'b_milk_whole', name: 'Whole Milk', calories_per_100g: 61, protein_per_100g: 3.2, carbs_per_100g: 4.8, fat_per_100g: 3.3, source: 'USDA' },
  { id: 'b_milk_skim', name: 'Skim Milk / Toned Milk', calories_per_100g: 34, protein_per_100g: 3.4, carbs_per_100g: 5, fat_per_100g: 0.1, source: 'USDA' },
  { id: 'b_curd', name: 'Curd / Dahi (Plain)', calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3.4, fat_per_100g: 4.3, source: 'USDA' },
  { id: 'b_paneer', name: 'Paneer (Cottage Cheese)', calories_per_100g: 265, protein_per_100g: 18, carbs_per_100g: 1.2, fat_per_100g: 20, source: 'USDA' },
  { id: 'b_butter', name: 'Butter', calories_per_100g: 717, protein_per_100g: 0.9, carbs_per_100g: 0.1, fat_per_100g: 81, source: 'USDA' },
  { id: 'b_ghee', name: 'Ghee (Clarified Butter)', calories_per_100g: 900, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, source: 'USDA' },
  { id: 'b_cheese_cheddar', name: 'Cheese (Cheddar)', calories_per_100g: 403, protein_per_100g: 25, carbs_per_100g: 1.3, fat_per_100g: 33, source: 'USDA' },
  { id: 'b_whey_protein', name: 'Whey Protein Powder', calories_per_100g: 370, protein_per_100g: 78, carbs_per_100g: 8, fat_per_100g: 4, source: 'USDA' },
  // Chicken & Meat
  { id: 'b_chicken_breast', name: 'Chicken Breast (Cooked)', calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, source: 'USDA' },
  { id: 'b_chicken_thigh', name: 'Chicken Thigh (Cooked)', calories_per_100g: 209, protein_per_100g: 26, carbs_per_100g: 0, fat_per_100g: 11, source: 'USDA' },
  { id: 'b_chicken_curry', name: 'Chicken Curry', calories_per_100g: 152, protein_per_100g: 15, carbs_per_100g: 5, fat_per_100g: 8, source: 'USDA' },
  { id: 'b_grilled_chicken', name: 'Grilled Chicken', calories_per_100g: 167, protein_per_100g: 32, carbs_per_100g: 0, fat_per_100g: 3.8, source: 'USDA' },
  { id: 'b_mutton', name: 'Mutton / Lamb (Cooked)', calories_per_100g: 258, protein_per_100g: 26, carbs_per_100g: 0, fat_per_100g: 17, source: 'USDA' },
  { id: 'b_fish_rohu', name: 'Fish â€” Rohu / Catla', calories_per_100g: 97, protein_per_100g: 17, carbs_per_100g: 0, fat_per_100g: 2.7, source: 'USDA' },
  { id: 'b_fish_salmon', name: 'Salmon (Cooked)', calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, source: 'USDA' },
  { id: 'b_tuna', name: 'Tuna (Canned in Water)', calories_per_100g: 116, protein_per_100g: 26, carbs_per_100g: 0, fat_per_100g: 1, source: 'USDA' },
  { id: 'b_prawns', name: 'Prawns / Shrimp (Cooked)', calories_per_100g: 99, protein_per_100g: 21, carbs_per_100g: 0.9, fat_per_100g: 1.1, source: 'USDA' },
  // Grains & Bread
  { id: 'b_white_rice', name: 'White Rice (Cooked)', calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3, source: 'USDA' },
  { id: 'b_brown_rice', name: 'Brown Rice (Cooked)', calories_per_100g: 112, protein_per_100g: 2.6, carbs_per_100g: 24, fat_per_100g: 0.9, source: 'USDA' },
  { id: 'b_chapati', name: 'Chapati / Roti (Wheat)', calories_per_100g: 297, protein_per_100g: 9, carbs_per_100g: 57, fat_per_100g: 4, source: 'USDA' },
  { id: 'b_idli', name: 'Idli (Steamed)', calories_per_100g: 132, protein_per_100g: 3.9, carbs_per_100g: 26, fat_per_100g: 0.4, source: 'USDA' },
  { id: 'b_dosa', name: 'Dosa (Plain)', calories_per_100g: 168, protein_per_100g: 4, carbs_per_100g: 27, fat_per_100g: 5, source: 'USDA' },
  { id: 'b_upma', name: 'Upma (Semolina)', calories_per_100g: 130, protein_per_100g: 3.2, carbs_per_100g: 22, fat_per_100g: 3.5, source: 'USDA' },
  { id: 'b_poha', name: 'Poha (Flattened Rice)', calories_per_100g: 130, protein_per_100g: 2.4, carbs_per_100g: 27, fat_per_100g: 1.5, source: 'USDA' },
  { id: 'b_oats', name: 'Oats (Raw / Dry)', calories_per_100g: 389, protein_per_100g: 17, carbs_per_100g: 66, fat_per_100g: 7, fiber_per_100g: 11, source: 'USDA' },
  { id: 'b_oatmeal', name: 'Oatmeal (Cooked)', calories_per_100g: 68, protein_per_100g: 2.4, carbs_per_100g: 12, fat_per_100g: 1.4, source: 'USDA' },
  { id: 'b_wheat_flour', name: 'Wheat Flour (Atta)', calories_per_100g: 342, protein_per_100g: 13, carbs_per_100g: 70, fat_per_100g: 1.7, fiber_per_100g: 10, source: 'USDA' },
  { id: 'b_bread_white', name: 'White Bread (Slice)', calories_per_100g: 265, protein_per_100g: 9, carbs_per_100g: 49, fat_per_100g: 3.2, source: 'USDA' },
  { id: 'b_bread_whole', name: 'Whole Wheat Bread', calories_per_100g: 247, protein_per_100g: 13, carbs_per_100g: 41, fat_per_100g: 4.2, fiber_per_100g: 6, source: 'USDA' },
  // Pulses & Legumes
  { id: 'b_dal_toor', name: 'Toor Dal (Cooked)', calories_per_100g: 116, protein_per_100g: 7, carbs_per_100g: 20, fat_per_100g: 0.4, source: 'USDA' },
  { id: 'b_dal_moong', name: 'Moong Dal (Cooked)', calories_per_100g: 105, protein_per_100g: 7.4, carbs_per_100g: 18, fat_per_100g: 0.4, source: 'USDA' },
  { id: 'b_dal_masoor', name: 'Masoor Dal (Red Lentil)', calories_per_100g: 116, protein_per_100g: 9, carbs_per_100g: 20, fat_per_100g: 0.4, source: 'USDA' },
  { id: 'b_chickpeas', name: 'Chana / Chickpeas (Cooked)', calories_per_100g: 164, protein_per_100g: 9, carbs_per_100g: 27, fat_per_100g: 2.6, fiber_per_100g: 8, source: 'USDA' },
  { id: 'b_rajma', name: 'Rajma / Kidney Beans', calories_per_100g: 127, protein_per_100g: 9, carbs_per_100g: 23, fat_per_100g: 0.5, fiber_per_100g: 7, source: 'USDA' },
  // Vegetables
  { id: 'b_spinach', name: 'Spinach (Raw)', calories_per_100g: 23, protein_per_100g: 2.9, carbs_per_100g: 3.6, fat_per_100g: 0.4, source: 'USDA' },
  { id: 'b_broccoli', name: 'Broccoli', calories_per_100g: 34, protein_per_100g: 2.8, carbs_per_100g: 7, fat_per_100g: 0.4, source: 'USDA' },
  { id: 'b_tomato', name: 'Tomato (Raw)', calories_per_100g: 18, protein_per_100g: 0.9, carbs_per_100g: 3.9, fat_per_100g: 0.2, source: 'USDA' },
  { id: 'b_onion', name: 'Onion (Raw)', calories_per_100g: 40, protein_per_100g: 1.1, carbs_per_100g: 9.3, fat_per_100g: 0.1, source: 'USDA' },
  { id: 'b_potato', name: 'Potato (Boiled)', calories_per_100g: 87, protein_per_100g: 1.9, carbs_per_100g: 20, fat_per_100g: 0.1, source: 'USDA' },
  { id: 'b_carrot', name: 'Carrot (Raw)', calories_per_100g: 41, protein_per_100g: 0.9, carbs_per_100g: 10, fat_per_100g: 0.2, source: 'USDA' },
  { id: 'b_cucumber', name: 'Cucumber', calories_per_100g: 15, protein_per_100g: 0.7, carbs_per_100g: 3.6, fat_per_100g: 0.1, source: 'USDA' },
  { id: 'b_palak_paneer', name: 'Palak Paneer', calories_per_100g: 168, protein_per_100g: 8, carbs_per_100g: 6, fat_per_100g: 12, source: 'USDA' },
  // Fruits
  { id: 'b_banana', name: 'Banana', calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fat_per_100g: 0.3, fiber_per_100g: 2.6, source: 'USDA' },
  { id: 'b_apple', name: 'Apple', calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 14, fat_per_100g: 0.2, fiber_per_100g: 2.4, source: 'USDA' },
  { id: 'b_mango', name: 'Mango', calories_per_100g: 60, protein_per_100g: 0.8, carbs_per_100g: 15, fat_per_100g: 0.4, source: 'USDA' },
  { id: 'b_orange', name: 'Orange', calories_per_100g: 47, protein_per_100g: 0.9, carbs_per_100g: 12, fat_per_100g: 0.1, source: 'USDA' },
  { id: 'b_papaya', name: 'Papaya', calories_per_100g: 43, protein_per_100g: 0.5, carbs_per_100g: 11, fat_per_100g: 0.3, source: 'USDA' },
  { id: 'b_guava', name: 'Guava', calories_per_100g: 68, protein_per_100g: 2.6, carbs_per_100g: 14, fat_per_100g: 1, source: 'USDA' },
  { id: 'b_grapes', name: 'Grapes', calories_per_100g: 69, protein_per_100g: 0.7, carbs_per_100g: 18, fat_per_100g: 0.2, source: 'USDA' },
  { id: 'b_watermelon', name: 'Watermelon', calories_per_100g: 30, protein_per_100g: 0.6, carbs_per_100g: 7.6, fat_per_100g: 0.2, source: 'USDA' },
  // Nuts & Seeds
  { id: 'b_almonds', name: 'Almonds', calories_per_100g: 579, protein_per_100g: 21, carbs_per_100g: 22, fat_per_100g: 50, fiber_per_100g: 12.5, source: 'USDA' },
  { id: 'b_peanuts', name: 'Peanuts (Roasted)', calories_per_100g: 585, protein_per_100g: 25, carbs_per_100g: 21, fat_per_100g: 50, source: 'USDA' },
  { id: 'b_peanut_butter', name: 'Peanut Butter', calories_per_100g: 588, protein_per_100g: 25, carbs_per_100g: 20, fat_per_100g: 50, source: 'USDA' },
  { id: 'b_walnuts', name: 'Walnuts', calories_per_100g: 654, protein_per_100g: 15, carbs_per_100g: 14, fat_per_100g: 65, source: 'USDA' },
  { id: 'b_chia_seeds', name: 'Chia Seeds', calories_per_100g: 486, protein_per_100g: 17, carbs_per_100g: 42, fat_per_100g: 31, fiber_per_100g: 34, source: 'USDA' },
  // Oils & Condiments
  { id: 'b_olive_oil', name: 'Olive Oil', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, source: 'USDA' },
  { id: 'b_coconut_oil', name: 'Coconut Oil', calories_per_100g: 862, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, source: 'USDA' },
  { id: 'b_honey', name: 'Honey', calories_per_100g: 304, protein_per_100g: 0.3, carbs_per_100g: 82, fat_per_100g: 0, source: 'USDA' },
  { id: 'b_sugar', name: 'Sugar (White)', calories_per_100g: 387, protein_per_100g: 0, carbs_per_100g: 100, fat_per_100g: 0, source: 'USDA' },
  // Beverages
  { id: 'b_tea_milk', name: 'Chai / Milk Tea (1 cup)', calories_per_100g: 42, protein_per_100g: 1.5, carbs_per_100g: 6, fat_per_100g: 1.5, source: 'USDA' },
  { id: 'b_coffee_black', name: 'Black Coffee', calories_per_100g: 2, protein_per_100g: 0.3, carbs_per_100g: 0, fat_per_100g: 0, source: 'USDA' },
  { id: 'b_coconut_water', name: 'Coconut Water', calories_per_100g: 19, protein_per_100g: 0.7, carbs_per_100g: 3.7, fat_per_100g: 0.2, source: 'USDA' },
  { id: 'b_lassi', name: 'Lassi (Sweet)', calories_per_100g: 78, protein_per_100g: 3.5, carbs_per_100g: 12, fat_per_100g: 2, source: 'USDA' },
  // Common Dishes
  { id: 'b_sambar', name: 'Sambar', calories_per_100g: 50, protein_per_100g: 3, carbs_per_100g: 7, fat_per_100g: 1.5, source: 'USDA' },
  { id: 'b_rasam', name: 'Rasam', calories_per_100g: 22, protein_per_100g: 1, carbs_per_100g: 4, fat_per_100g: 0.3, source: 'USDA' },
  { id: 'b_biryani_chicken', name: 'Chicken Biryani', calories_per_100g: 190, protein_per_100g: 12, carbs_per_100g: 22, fat_per_100g: 6, source: 'USDA' },
  { id: 'b_fried_rice', name: 'Fried Rice', calories_per_100g: 163, protein_per_100g: 4.5, carbs_per_100g: 26, fat_per_100g: 5, source: 'USDA' },
  { id: 'b_chole', name: 'Chole / Chana Masala', calories_per_100g: 147, protein_per_100g: 7, carbs_per_100g: 22, fat_per_100g: 4, source: 'USDA' },
  { id: 'b_pav_bhaji', name: 'Pav Bhaji', calories_per_100g: 215, protein_per_100g: 5, carbs_per_100g: 32, fat_per_100g: 8, source: 'USDA' },
  { id: 'b_dal_rice', name: 'Dal Rice', calories_per_100g: 125, protein_per_100g: 5, carbs_per_100g: 24, fat_per_100g: 1.2, source: 'USDA' },
  { id: 'b_curd_rice', name: 'Curd Rice', calories_per_100g: 122, protein_per_100g: 4, carbs_per_100g: 21, fat_per_100g: 2.5, source: 'USDA' },
  { id: 'b_egg_fried_rice', name: 'Egg Fried Rice', calories_per_100g: 170, protein_per_100g: 5.5, carbs_per_100g: 27, fat_per_100g: 5, source: 'USDA' },
  { id: 'b_masala_dosa', name: 'Masala Dosa', calories_per_100g: 197, protein_per_100g: 4.5, carbs_per_100g: 31, fat_per_100g: 7, source: 'USDA' },
  { id: 'b_vada', name: 'Medu Vada', calories_per_100g: 290, protein_per_100g: 9, carbs_per_100g: 32, fat_per_100g: 15, source: 'USDA' },
];

// â”€â”€â”€ Search built-in database â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function searchBuiltin(query: string): FoodItem[] {
  const q = query.toLowerCase().trim();
  // Score: name starts-with > name contains > id contains
  return BUILTIN_FOODS
    .map((f) => {
      const nameLow = f.name.toLowerCase();
      if (nameLow.startsWith(q)) return { f, score: 3 };
      if (nameLow.includes(q)) return { f, score: 2 };
      if (f.id.toLowerCase().includes(q)) return { f, score: 1 };
      return null;
    })
    .filter((r): r is { f: FoodItem; score: number } => r !== null)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.f);
}

// â”€â”€â”€ USDA FoodData Central â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function searchUSDA(query: string, pageSize = 20): Promise<FoodItem[]> {
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search` +
    `?query=${encodeURIComponent(query)}` +
    `&api_key=${USDA_API_KEY}` +
    `&pageSize=${pageSize}` +
    `&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS),Branded`;

  const res = await fetchWithTimeout(url, 10000);
  if (!res.ok) return [];
  const data = await res.json();
  const foods: FoodItem[] = [];

  for (const f of (data.foods ?? []) as Record<string, unknown>[]) {
    const name = (f.description as string)?.trim();
    if (!name) continue;
    // nutrientId may be number or string â€” use Number() to coerce
    const nutrients = (f.foodNutrients ?? []) as { nutrientId: unknown; value: unknown }[];
    const get = (id: number) => {
      const n = nutrients.find((n) => Number(n.nutrientId) === id);
      return n ? Number(n.value) || 0 : 0;
    };
    const cal = get(1008);
    const protein = get(1003);
    const carbs = get(1005);
    const fat = get(1004);
    if (!cal && !protein) continue;

    foods.push({
      id: `usda_${f.fdcId as number}`,
      name: toTitleCase(name),
      brand: (f.brandOwner as string) || (f.brandName as string) || undefined,
      calories_per_100g: Math.round(cal),
      protein_per_100g: Math.round(protein * 10) / 10,
      carbs_per_100g: Math.round(carbs * 10) / 10,
      fat_per_100g: Math.round(fat * 10) / 10,
      fiber_per_100g: get(1079) || undefined,
      sodium_per_100g: get(1093) ? get(1093) / 1000 : undefined,
      source: 'USDA' as const,
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

// â”€â”€â”€ Combined search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Built-in results appear instantly (no network). USDA adds more depth.
export async function searchFoods(query: string, pageSize = 25): Promise<FoodItem[]> {
  const builtin = searchBuiltin(query);

  let usda: FoodItem[] = [];
  try {
    usda = await searchUSDA(query, pageSize);
  } catch { /* USDA unavailable â€” built-in only */ }

  // Merge, built-in first, deduplicate by normalised name
  const seen = new Set<string>();
  const combined: FoodItem[] = [];
  for (const f of [...builtin, ...usda]) {
    const key = f.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 22);
    if (!seen.has(key)) { seen.add(key); combined.push(f); }
  }
  return combined.slice(0, pageSize);
}

// Keep legacy alias
export const searchUSDAFoods = searchFoods;

// â”€â”€â”€ Barcode lookup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  try {
    const res = await fetchWithTimeout(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json` +
      `?fields=product_name,brands,nutriments,image_front_thumb_url`,
      8000,
    );
    if (!res.ok) return null;
    const data = await res.json();
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
  } catch { return null; }
}

export function calculateNutrients(
  food: FoodItem,
  quantityG: number,
): { calories: number; protein: number; carbs: number; fat: number } {
  const ratio = quantityG / 100;
  return {
    calories: Math.round(food.calories_per_100g * ratio),
    protein: Math.round(food.protein_per_100g * ratio * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * ratio * 10) / 10,
    fat: Math.round(food.fat_per_100g * ratio * 10) / 10,
  };
}
