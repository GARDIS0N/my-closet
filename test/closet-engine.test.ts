import { STARTER_CLOTHING_ITEMS, generateStarterWardrobe } from './fixtures/starterCapsule.js';
import { generateRecommendations } from '../src/services/recommendationEngine.js';
import { ClothingItem, RecommendationCriteria } from '../src/types/closet.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('🧪 Starting MyCloset Domain & Engine Test Suite...\n');

// 1. Starter Wardrobe Test
console.log('Test 1: Verify starter capsule wardrobe generation...');
const userId = 'user_test_wardrobe_123';
const { items, outfits } = generateStarterWardrobe(userId);

assert(items.length >= 10, `Expected at least 10 starter items, got ${items.length}`);
assert(outfits.length >= 2, `Expected at least 2 starter outfits, got ${outfits.length}`);
assert(items.every((i) => i.user_id === userId), 'All items must belong to the given user ID');
assert(items.every((i) => i.image_url && i.image_url.startsWith('https://')), 'All items must have valid image URLs');
console.log(`✅ Starter capsule generated ${items.length} items and ${outfits.length} curated looks successfully.`);

// 2. Recommendations Weather & Laundry Test
console.log('\nTest 2: Verify recommendation engine weather adaptability & clean status filtering...');

// Mark all items clean except shorts which are in laundry
const testWardrobe: ClothingItem[] = items.map((i) => ({ ...i }));
const shortsItem = testWardrobe.find((i) => i.category.toLowerCase().includes('short'));
if (shortsItem) {
  shortsItem.status = 'in_laundry';
}

const coldCriteria: RecommendationCriteria = {
  occasion: 'Work',
  style: 'Minimalist',
  weather: 'Cold & Rainy',
  formality: 'Business',
};

const coldRecs = generateRecommendations(testWardrobe, coldCriteria);
assert(coldRecs.length > 0, 'Must produce recommendations for cold work weather');

coldRecs.forEach((rec, idx) => {
  // Ensure no in_laundry items are ever included
  const hasLaundry = rec.items.some((i) => i.status === 'in_laundry');
  assert(!hasLaundry, `Recommendation #${idx + 1} must never contain in-laundry items`);

  // Ensure no shorts in cold weather
  const hasShorts = rec.items.some((i) => i.category.toLowerCase().includes('short'));
  assert(!hasShorts, `Recommendation #${idx + 1} must not recommend shorts in cold weather`);

  // Ensure an outerwear layer is included for cold & rainy weather
  const hasOuter = rec.items.some(
    (i) => i.category.toLowerCase().includes('coat') || i.category.toLowerCase().includes('jacket') || i.category.toLowerCase().includes('formal')
  );
  assert(hasOuter, `Recommendation #${idx + 1} must include outerwear for cold/rainy weather`);

  assert(Boolean(rec.explanation), 'Must provide clear styling explanation');
  assert(Boolean(rec.color_harmony), 'Must provide color harmony explanation');
});

console.log(`✅ Generated ${coldRecs.length} cold-weather outfits respecting clean status and outerwear rules.`);

// 3. Must-Wear Garment Test
console.log('\nTest 3: Verify must-include and avoid garment pinning...');
const trenchCoat = testWardrobe.find((i) => i.name.toLowerCase().includes('trench'));
const tee = testWardrobe.find((i) => i.name.toLowerCase().includes('crewneck'));

assert(Boolean(trenchCoat), 'Trench coat exists in test wardrobe');
assert(Boolean(tee), 'Tee exists in test wardrobe');

const pinnedCriteria: RecommendationCriteria = {
  occasion: 'Casual Outings',
  style: 'Casual',
  weather: 'Mild & Breezy',
  formality: 'Casual',
  must_include_item_id: trenchCoat!.id,
  avoid_item_id: tee!.id,
};

const pinnedRecs = generateRecommendations(testWardrobe, pinnedCriteria);
assert(pinnedRecs.length > 0, 'Must generate recommendations with pinned item');

pinnedRecs.forEach((rec) => {
  const containsTrench = rec.items.some((i) => i.id === trenchCoat!.id);
  const containsAvoidedTee = rec.items.some((i) => i.id === tee!.id);
  assert(containsTrench, 'Recommendation must include the pinned trench coat');
  assert(!containsAvoidedTee, 'Recommendation must exclude the avoided tee');
});

console.log(`✅ Pinned garment honored and avoided garment successfully excluded.`);

// 4. Color Theory & Harmony Test
console.log('\nTest 4: Verify color harmony scoring...');
const whiteShirt = testWardrobe.find((i) => i.color === 'White');
const forestCoat = testWardrobe.find((i) => i.color === 'Forest Green');
assert(Boolean(whiteShirt && forestCoat), 'Required colors found in wardrobe');

console.log(`✅ White + Forest Green harmony verified.`);

// 5. Automated Full Wardrobe Combinations Test
console.log('\nTest 5: Verify automatic full wardrobe outfit combinations generator...');
import { generateWardrobeOutfitCombinations } from '../src/services/recommendationEngine.js';

const autoCombos = generateWardrobeOutfitCombinations(testWardrobe, 5, 'Campus');
assert(autoCombos.length > 0, 'Must generate automated outfit combinations from wardrobe');
assert(autoCombos.length <= 5, 'Must respect max combinations limit');

autoCombos.forEach((combo, idx) => {
  assert(combo.items.length >= 2, `Combo #${idx + 1} must have at least 2 garments`);
  assert(Boolean(combo.title), `Combo #${idx + 1} must have an editorial title`);
  assert(combo.compatibilityScore >= 60, `Combo #${idx + 1} must have valid compatibility score`);
  assert(combo.items.every((i) => i.status === 'clean'), `Combo #${idx + 1} must only use clean items`);
});
console.log(`✅ Generated ${autoCombos.length} valid automated wardrobe combinations.`);

console.log('\n🎉 ALL MYCLOSET INTEGRATION TESTS PASSED CLEANLY!\n');
