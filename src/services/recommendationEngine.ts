import {
  ClothingItem,
  RecommendationCriteria,
  OutfitRecommendation,
  Season,
} from '../types/closet.js';

// Color coordination matching rules
const NEUTRALS = new Set(['Black', 'White', 'Cream / Off-White', 'Charcoal Grey', 'Navy Blue', 'Beige / Tan']);

const HARMONIOUS_PAIRS: Record<string, string[]> = {
  'Forest Green': ['Cream / Off-White', 'Beige / Tan', 'Camel / Brown', 'White', 'Charcoal Grey', 'Black'],
  'Navy Blue': ['White', 'Cream / Off-White', 'Beige / Tan', 'Camel / Brown', 'Charcoal Grey', 'Sky Blue'],
  'Camel / Brown': ['Forest Green', 'Navy Blue', 'Cream / Off-White', 'White', 'Black', 'Olive Green'],
  'Burgundy / Maroon': ['Charcoal Grey', 'Navy Blue', 'Black', 'White', 'Beige / Tan'],
  'Beige / Tan': ['Forest Green', 'Navy Blue', 'Black', 'White', 'Camel / Brown', 'Sky Blue'],
  'Olive Green': ['Cream / Off-White', 'Black', 'Camel / Brown', 'White', 'Charcoal Grey'],
  'White': ['Navy Blue', 'Black', 'Charcoal Grey', 'Forest Green', 'Beige / Tan', 'Camel / Brown'],
  'Black': ['White', 'Cream / Off-White', 'Charcoal Grey', 'Beige / Tan', 'Forest Green', 'Camel / Brown'],
};

function checkColorHarmony(color1: string, color2: string): { matches: boolean; reason: string } {
  if (color1 === color2) {
    return { matches: true, reason: 'Tone-on-tone monochrome elegance' };
  }
  if (NEUTRALS.has(color1) && NEUTRALS.has(color2)) {
    return { matches: true, reason: 'Sophisticated neutral base harmony' };
  }
  const pairs = HARMONIOUS_PAIRS[color1] || [];
  if (pairs.includes(color2)) {
    return { matches: true, reason: `Earthy contrast between ${color1} and ${color2}` };
  }
  return { matches: false, reason: 'Subtle complementary balance' };
}

function getItemSlot(item: ClothingItem): 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory' | 'other' {
  const cat = item.category.toLowerCase();
  if (cat.includes('t-shirt') || cat.includes('shirt') || cat.includes('sweater') || cat.includes('hoodie')) {
    return 'top';
  }
  if (cat.includes('trouser') || cat.includes('jean') || cat.includes('short') || cat.includes('pant')) {
    return 'bottom';
  }
  if (cat.includes('shoe') || cat.includes('sneaker') || cat.includes('boot')) {
    return 'shoes';
  }
  if (cat.includes('jacket') || cat.includes('coat') || cat.includes('blazer') || cat.includes('outerwear')) {
    return 'outerwear';
  }
  if (cat.includes('access') || cat.includes('belt') || cat.includes('bag') || cat.includes('hat')) {
    return 'accessory';
  }
  return 'other';
}

function isWeatherAppropriate(item: ClothingItem, weather: RecommendationCriteria['weather']): boolean {
  const cat = item.category.toLowerCase();
  const seasons = item.season;

  if (weather === 'Warm & Sunny') {
    // Avoid heavy jackets, coats, or heavy sweaters
    if (cat.includes('coat') || cat.includes('jacket') || cat.includes('heavy') || cat.includes('wool')) {
      return false;
    }
    return true;
  }

  if (weather === 'Cold & Rainy' || weather === 'Freezing & Snow') {
    // Avoid shorts
    if (cat.includes('short')) return false;
    return true;
  }

  return true;
}

export function generateRecommendations(
  wardrobe: ClothingItem[],
  criteria: RecommendationCriteria
): OutfitRecommendation[] {
  // 1. Filter usable items (only clean items)
  const cleanItems = wardrobe.filter((item) => item.status === 'clean');

  if (cleanItems.length === 0) {
    return [];
  }

  // Remove avoided item if specified
  const filtered = criteria.avoid_item_id
    ? cleanItems.filter((i) => i.id !== criteria.avoid_item_id)
    : cleanItems;

  const mustItem = criteria.must_include_item_id
    ? wardrobe.find((i) => i.id === criteria.must_include_item_id)
    : undefined;

  // Group into categories
  const tops = filtered.filter((i) => getItemSlot(i) === 'top' && isWeatherAppropriate(i, criteria.weather));
  const bottoms = filtered.filter((i) => getItemSlot(i) === 'bottom' && isWeatherAppropriate(i, criteria.weather));
  const shoes = filtered.filter((i) => getItemSlot(i) === 'shoes');
  const outers = filtered.filter((i) => getItemSlot(i) === 'outerwear' && isWeatherAppropriate(i, criteria.weather));
  const accessories = filtered.filter((i) => getItemSlot(i) === 'accessory');

  // If missing critical pieces, relax weather restriction slightly
  const availableTops = tops.length > 0 ? tops : filtered.filter((i) => getItemSlot(i) === 'top');
  const availableBottoms = bottoms.length > 0 ? bottoms : filtered.filter((i) => getItemSlot(i) === 'bottom');
  const availableShoes = shoes.length > 0 ? shoes : filtered.filter((i) => getItemSlot(i) === 'shoes');

  if (availableTops.length === 0 || availableBottoms.length === 0) {
    return [];
  }

  const recommendations: OutfitRecommendation[] = [];

  // Weather configuration insights
  const weatherLabels: Record<string, string> = {
    'Warm & Sunny': 'Light, breathable textures with sun-ready comfort',
    'Mild & Breezy': 'Adaptive layering with effortless transitions',
    'Cool & Crisp': 'Cozy knitwear and tailored outerwear pairing',
    'Cold & Rainy': 'Weather-resistant shielding and insulated warmth',
    'Freezing & Snow': 'Heavy thermal barrier and protective structured layers',
  };

  // Helper to score item match for occasion & style
  const scoreItem = (item: ClothingItem): number => {
    let score = 5;
    if (item.is_favorite) score += 2;
    if (item.occasion.some((occ) => occ.toLowerCase().includes(criteria.occasion.toLowerCase()))) {
      score += 4;
    }
    if (criteria.preferred_color && item.color.toLowerCase().includes(criteria.preferred_color.toLowerCase())) {
      score += 3;
    }
    return score;
  };

  // Sort candidates by relevance
  const sortedTops = [...availableTops].sort((a, b) => scoreItem(b) - scoreItem(a));
  const sortedBottoms = [...availableBottoms].sort((a, b) => scoreItem(b) - scoreItem(a));
  const sortedShoes = [...availableShoes].sort((a, b) => scoreItem(b) - scoreItem(a));
  const sortedOuters = [...outers].sort((a, b) => scoreItem(b) - scoreItem(a));
  const sortedAccs = [...accessories].sort((a, b) => scoreItem(b) - scoreItem(a));

  // --- Proposal 1: Core Signature Look ---
  const top1 = mustItem && getItemSlot(mustItem) === 'top' ? mustItem : sortedTops[0];
  const bottom1 = mustItem && getItemSlot(mustItem) === 'bottom' ? mustItem : sortedBottoms[0];
  const shoe1 = mustItem && getItemSlot(mustItem) === 'shoes' ? mustItem : sortedShoes[0] || sortedShoes[0];

  const items1: ClothingItem[] = [top1, bottom1];
  if (shoe1) items1.push(shoe1);

  const mustIsOuter = mustItem && getItemSlot(mustItem) === 'outerwear';
  const mustIsAcc = mustItem && getItemSlot(mustItem) === 'accessory';

  // Add outerwear if cold or formal, or if user explicitly pinned an outer garment
  const needsOuter =
    mustIsOuter ||
    criteria.weather === 'Cold & Rainy' ||
    criteria.weather === 'Freezing & Snow' ||
    criteria.weather === 'Cool & Crisp' ||
    criteria.formality === 'Business' ||
    criteria.formality === 'Formal';

  if (needsOuter && sortedOuters.length > 0) {
    const outer1 = mustIsOuter ? mustItem : sortedOuters[0];
    items1.push(outer1);
  }

  if (mustIsAcc) {
    items1.push(mustItem);
  } else if (sortedAccs.length > 0) {
    items1.push(sortedAccs[0]);
  }

  const harmony1 = checkColorHarmony(top1.color, bottom1.color);

  recommendations.push({
    id: 'rec-1',
    title: `The ${criteria.style} Signature Ensemble`,
    items: items1,
    explanation: `A harmonized combination pairing the ${top1.name} with the ${bottom1.name}. The colors ${top1.color} and ${bottom1.color} create an intentional, balanced silhouette perfectly suited for ${criteria.occasion}.`,
    style_notes: `Clean proportions with subtle contrast. ${harmony1.reason}.`,
    weather_suitability: weatherLabels[criteria.weather] || 'Ideal thermal comfort',
    color_harmony: `${top1.color} + ${bottom1.color} balance`,
    confidence_score: 96,
    tags: [criteria.style, criteria.occasion, criteria.weather],
  });

  // --- Proposal 2: Elevated & Tailored Alternative ---
  if (sortedTops.length > 1 || sortedBottoms.length > 1 || sortedOuters.length > 0) {
    const top2 = sortedTops.length > 1 ? sortedTops[1] : sortedTops[0];
    const bottom2 = sortedBottoms.length > 1 ? sortedBottoms[1] : sortedBottoms[0];
    const shoe2 = sortedShoes.length > 1 ? sortedShoes[1] : sortedShoes[0];

    const items2: ClothingItem[] = [top2, bottom2];
    if (shoe2) items2.push(shoe2);

    if (mustIsOuter) {
      items2.push(mustItem);
    } else if (sortedOuters.length > 0) {
      const outer2 = sortedOuters.length > 1 ? sortedOuters[1] : sortedOuters[0];
      items2.push(outer2);
    }

    if (mustIsAcc) {
      items2.push(mustItem);
    } else if (sortedAccs.length > 1) {
      items2.push(sortedAccs[1]);
    } else if (sortedAccs.length > 0) {
      items2.push(sortedAccs[0]);
    }

    if (mustItem && !items2.some((i) => i.id === mustItem.id)) {
      items2.push(mustItem);
    }

    const harmony2 = checkColorHarmony(top2.color, bottom2.color);

    recommendations.push({
      id: 'rec-2',
      title: `The Refined ${criteria.formality} Edit`,
      items: items2,
      explanation: `An elevated take blending ${top2.name} and ${bottom2.name}. Designed to transition effortlessly across your day while maintaining a crisp, polished demeanor.`,
      style_notes: `Rich textures and structural presence. ${harmony2.reason}.`,
      weather_suitability: weatherLabels[criteria.weather] || 'All-day weather flexibility',
      color_harmony: `${top2.color} anchored by ${bottom2.color}`,
      confidence_score: 92,
      tags: [criteria.formality, 'Elevated', criteria.occasion],
    });
  }

  // --- Proposal 3: Effortless Versatility / Contemporary Twist ---
  if (sortedTops.length > 2 || sortedBottoms.length > 2 || filtered.length >= 4) {
    const top3 = sortedTops[sortedTops.length - 1] || sortedTops[0];
    const bottom3 = sortedBottoms[0] || sortedBottoms[sortedBottoms.length - 1];
    const shoe3 = sortedShoes[sortedShoes.length - 1] || sortedShoes[0];

    const items3: ClothingItem[] = [top3, bottom3];
    if (shoe3) items3.push(shoe3);
    if (mustIsOuter) {
      items3.push(mustItem);
    } else if (sortedOuters.length > 0 && !items3.some((i) => getItemSlot(i) === 'outerwear')) {
      items3.push(sortedOuters[0]);
    }

    if (mustItem && !items3.some((i) => i.id === mustItem.id)) {
      items3.push(mustItem);
    }

    recommendations.push({
      id: 'rec-3',
      title: 'The Contemporary Minimalist Twist',
      items: items3,
      explanation: `A relaxed, modern pairing centered around everyday mobility and organic lines. Keeps you looking put together with zero styling fuss.`,
      style_notes: 'Understated elegance, breathable fit, and subtle tone play.',
      weather_suitability: weatherLabels[criteria.weather] || 'Comfort-first seasonal readiness',
      color_harmony: 'Natural neutral palette',
      confidence_score: 88,
      tags: ['Relaxed', criteria.occasion, 'Effortless'],
    });
  }

  return recommendations;
}

// --------------------------------------------------------------------------
// AUTOMATIC FULL WARDROBE OUTFIT COMBINATIONS GENERATOR
// --------------------------------------------------------------------------
export function generateWardrobeOutfitCombinations(
  wardrobe: ClothingItem[],
  maxCombinations = 8,
  preferredOccasion = 'Casual Outings'
): {
  title: string;
  occasion: string;
  style: string;
  season: string;
  compatibilityScore: number;
  items: ClothingItem[];
  explanation: string;
}[] {
  const cleanWardrobe = wardrobe.filter((i) => i.status === 'clean');
  if (cleanWardrobe.length < 2) return [];

  const tops = cleanWardrobe.filter((i) => getItemSlot(i) === 'top');
  const bottoms = cleanWardrobe.filter((i) => getItemSlot(i) === 'bottom');
  const shoes = cleanWardrobe.filter((i) => getItemSlot(i) === 'shoes');
  const outers = cleanWardrobe.filter((i) => getItemSlot(i) === 'outerwear');
  const accessories = cleanWardrobe.filter((i) => getItemSlot(i) === 'accessory');

  // If no separate top/bottom, check if we have any items at all
  if (tops.length === 0 && bottoms.length === 0) {
    return [];
  }

  const combinations: {
    title: string;
    occasion: string;
    style: string;
    season: string;
    compatibilityScore: number;
    items: ClothingItem[];
    explanation: string;
  }[] = [];

  const seenKeys = new Set<string>();

  // Helper titles
  const titleTemplates = [
    'The Modern Monolith',
    'Effortless Weekend Tailoring',
    'Architectural Minimalist Look',
    'High-Street Tonal Ensemble',
    'Crisp City Transit',
    'Relaxed Atelier Casual',
    'The Gallery Walk Look',
    'Smart Monochrome Profile',
  ];

  let titleIndex = 0;

  for (const top of tops) {
    for (const bottom of bottoms) {
      const key = `${top.id}-${bottom.id}`;
      if (seenKeys.has(key)) continue;

      const harmony = checkColorHarmony(top.color, bottom.color);
      let score = harmony.matches ? 85 : 70;

      // Occasion overlap
      const sharedOccasions = top.occasion.filter((o) => bottom.occasion.includes(o));
      if (sharedOccasions.length > 0) score += 8;

      // Pick best matching shoe
      let bestShoe = shoes.find((s) => s.occasion.includes(preferredOccasion)) || shoes[0];

      // Pick outer if formal or complementary
      let bestOuter = outers.find((o) => checkColorHarmony(o.color, top.color).matches);

      // Pick accessory
      let bestAcc = accessories.find((a) => checkColorHarmony(a.color, top.color).matches);

      const items: ClothingItem[] = [top, bottom];
      if (bestShoe) items.push(bestShoe);
      if (bestOuter && score > 75) items.push(bestOuter);
      if (bestAcc) items.push(bestAcc);

      seenKeys.add(key);

      const title = titleTemplates[titleIndex % titleTemplates.length] || `Curated Look #${titleIndex + 1}`;
      titleIndex++;

      combinations.push({
        title,
        occasion: sharedOccasions[0] || preferredOccasion,
        style: top.brand ? `${top.brand} Inspired` : 'Minimalist Contemporary',
        season: top.season[0] || 'All-Season',
        compatibilityScore: Math.min(score, 99),
        items,
        explanation: `${harmony.reason}. Structured around the ${top.name} and anchored by ${bottom.name}.`,
      });

      if (combinations.length >= maxCombinations * 2) break;
    }
    if (combinations.length >= maxCombinations * 2) break;
  }

  // Sort by compatibility score and return top unique looks
  return combinations
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, maxCombinations);
}

