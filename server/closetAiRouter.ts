import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { ServerProductImageProcessor } from './productImageProcessor.js';

export const closetAiRouter = express.Router();

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const hasGemini = Boolean(geminiApiKey && geminiApiKey.length > 10 && !geminiApiKey.includes('your-'));
const vtoApiKey = process.env.VTO_API_KEY || '';
const vtoEndpoint = process.env.VTO_ENDPOINT || '';
const hasVtoService = Boolean(vtoApiKey && vtoApiKey.length > 5);

// 1. Status Check
closetAiRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiAvailable: hasGemini,
    model: hasGemini ? 'gemini-3.8-flash' : 'rule-engine-fallback',
    visionAvailable: hasGemini,
    tryonConfigured: hasVtoService,
    enhancer: ServerProductImageProcessor.getStatus(),
  });
});

// 2. Product Photo Enhancer Status
closetAiRouter.get('/enhancer-status', (_req: Request, res: Response) => {
  res.json(ServerProductImageProcessor.getStatus());
});

// 3. Product Photo Auto-Enhancement Pipeline
closetAiRouter.post('/enhance-product-image', async (req: Request, res: Response) => {
  const { image_base64, options } = req.body;

  if (!image_base64 || typeof image_base64 !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid image_base64 parameter.',
    });
  }

  try {
    const result = await ServerProductImageProcessor.process(image_base64, options || {});
    return res.json(result);
  } catch (err: any) {
    console.error('Enhance product image error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to process product image.',
    });
  }
});

// 4. Try-On Service Status
closetAiRouter.get('/tryon-status', (_req: Request, res: Response) => {
  res.json({
    configured: hasVtoService,
    providerName: hasVtoService ? 'Custom VTO Cloud Provider' : 'Unconfigured / Local Persona Studio',
    supportedGarmentRoles: ['upper_body', 'lower_body', 'one_piece', 'outerwear'],
    message: hasVtoService
      ? 'Virtual Try-On provider is connected and ready for synthesis.'
      : 'No third-party VTO synthesis API key (e.g., VTO_API_KEY) is configured. You can still preview your garments with your full-body persona in the Personal Dressing Room.',
    requiresBilling: !hasVtoService,
  });
});

// 5. Garment Auto-Analysis (Vision AI)
closetAiRouter.post('/analyze-garment', async (req: Request, res: Response) => {
  const { image_base64 } = req.body;

  if (!image_base64 || typeof image_base64 !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid image_base64 parameter.' });
  }

  if (!hasGemini) {
    return res.json({
      useFallback: true,
      reason: 'Gemini API key is not configured on the server.',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // Clean base64 data and extract mime type
    let mimeType = 'image/jpeg';
    let cleanBase64 = image_base64;

    const dataUriMatch = image_base64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1];
      cleanBase64 = dataUriMatch[2];
    }

    const prompt = `You are a high-fashion wardrobe cataloging expert, e-commerce merchandising specialist, and AI computer vision consultant.
Examine this wardrobe item photo carefully (clothing, footwear, bag, or accessory) and return a JSON object with:
- "name": An elegant, descriptive, luxury catalog title (e.g. "Oatmeal Ribbed Knit Sweater", "Classic Raw Indigo Selvedge Jeans", "White Minimalist Leather Low-Top Sneakers", "Vintage Silver Chronograph Watch").
- "category": EXACTLY one of these 10 standard categories:
  ["T-shirts and shirts", "Trousers and jeans", "Shorts", "Jackets and coats", "Sweaters and hoodies", "Shoes and sneakers", "Formal wear", "Sportswear", "Accessories", "Other"]
- "subcategory": Specific garment/item type (e.g. "Oxford Button-Down", "Chelsea Boots", "Trench Coat", "Leather Belt", "Beanie", "Crossbody Bag", "Tailored Trousers", "Aviator Sunglasses", "Polo Shirt").
- "color": Dominant color (e.g. "Black", "White", "Navy Blue", "Sky Blue", "Cream / Off-White", "Charcoal Grey", "Forest Green", "Olive Green", "Beige / Tan", "Camel / Brown", "Burgundy / Maroon", "Terracotta / Rust", "Pastel Pink", "Butter Yellow", "Silver / Grey", "Gold").
- "secondary_color": Accent color if visible, or null.
- "pattern": Visible pattern from ["Solid", "Striped", "Plaid / Tartan", "Floral", "Houndstooth", "Geometric", "Graphic Print", "Ribbed", "None"].
- "material": Visually identifiable fabric/material ONLY when recognizable with reasonable confidence (e.g. "Cotton Denim", "Merino Wool", "Linen", "Full-Grain Leather", "Silk", "Suede", "Technical Nylon"), or null if uncertain.
- "brand": Visible brand logo or text ONLY if clearly recognizable, otherwise null. Never fabricate a brand.
- "style": One of ["Casual", "Minimalist", "Streetwear", "Classic", "Bohemian", "Athleisure", "Vintage", "Business Casual", "Chic", "Old Money / Preppy"].
- "season": Array containing 1 or more of ["Spring", "Summer", "Fall", "Winter", "All-Season"].
- "occasion": Array of suitable occasions from ["Campus", "Work", "Casual Outings", "Formal Events", "Dates", "Gym & Sports", "Travel", "Party & Night Out"].
- "tags": Array of 3 to 6 concise tags (e.g. ["minimalist", "breathable", "smart casual", "office"]).
- "notes": 1 short sentence describing the fabric texture, cut, and distinctive details.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json({
      useFallback: false,
      analysis: parsed,
    });
  } catch (err: any) {
    console.warn('Vision analysis failed:', err?.message);
    return res.json({
      useFallback: true,
      error: err?.message,
    });
  }
});

// 4. AI Outfit Stylist Recommendations
closetAiRouter.post('/recommend', async (req: Request, res: Response) => {
  const { wardrobe, criteria } = req.body;

  if (!Array.isArray(wardrobe) || wardrobe.length < 2) {
    return res.status(400).json({
      error: 'Wardrobe must contain at least 2 garments to generate recommendations.',
    });
  }

  // Filter only clean items
  const cleanWardrobe = wardrobe.filter((item: any) => item.status === 'clean');
  if (cleanWardrobe.length < 2) {
    return res.status(400).json({
      error: 'At least 2 clean items are required for styling.',
    });
  }

  if (!hasGemini) {
    return res.json({
      useFallback: true,
      reason: 'Gemini AI API key not configured on server.',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const wardrobeList = cleanWardrobe.map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      color: item.color,
      brand: item.brand || 'Unbranded',
      notes: item.notes || '',
      season: item.season || [],
      occasion: item.occasion || [],
    }));

    const systemInstruction = `You are a world-class high-fashion stylist, luxury wardrobe curator, and personal image consultant for "MyCloset".
Your objective is to examine the user's actual wardrobe inventory and recommend a stylish, flattering, coordinated outfit according to their criteria.

RULES:
1. ONLY use items that exist in the provided wardrobe list. NEVER invent or hallucinate items.
2. Select 2 to 5 complementary pieces (e.g. top, bottom, shoes, and optional layer or accessory).
3. Return your response as a valid JSON object matching this schema:
{
  "title": "Editorial title for the outfit (e.g. The Relaxed Riviera Tailoring)",
  "selected_item_ids": ["id1", "id2", "id3"],
  "explanation": "Why this combination works together aesthetically and practically for the occasion.",
  "style_notes": "Specific styling instructions (e.g. roll sleeves once, half-tuck shirt, unbutton top collar).",
  "weather_suitability": "Why this outfit is suited to the specified weather condition.",
  "color_harmony": "Explanation of the color theory and tone coordination used.",
  "confidence_score": 95
}`;

    const prompt = `Styling Request:
Occasion: ${criteria?.occasion || 'Casual Outings'}
Target Aesthetic: ${criteria?.style || 'Minimalist'}
Weather: ${criteria?.weather || 'Mild & Breezy'}
Formality: ${criteria?.formality || 'Smart Casual'}
${criteria?.preferred_color ? `Preferred Color Focus: ${criteria.preferred_color}` : ''}
${criteria?.must_include_item_id ? `Must Include Garment ID: ${criteria.must_include_item_id}` : ''}
${criteria?.avoid_item_id ? `Exclude Garment ID: ${criteria.avoid_item_id}` : ''}

Available Clean Wardrobe Inventory:
${JSON.stringify(wardrobeList, null, 2)}

Provide your expert recommendation in the exact JSON format specified.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '';
    const parsed = JSON.parse(text);

    const validItems = parsed.selected_item_ids
      ?.map((id: string) => cleanWardrobe.find((w: any) => w.id === id))
      .filter(Boolean);

    if (!validItems || validItems.length < 2) {
      return res.json({ useFallback: true, reason: 'AI returned fewer than 2 valid items' });
    }

    return res.json({
      useFallback: false,
      recommendation: {
        id: `ai-rec-${Date.now()}`,
        title: parsed.title || 'Curated Editorial Look',
        items: validItems,
        explanation: parsed.explanation || 'Curated by Gemini AI based on your clothing palette.',
        style_notes: parsed.style_notes || 'Effortless proportion and tonal harmony.',
        weather_suitability: parsed.weather_suitability || 'Balanced for current conditions.',
        color_harmony: parsed.color_harmony || 'Complementary balance.',
        confidence_score: parsed.confidence_score || 95,
        tags: ['Gemini AI', criteria?.style || 'Editorial', criteria?.occasion || 'Smart Casual'],
      },
    });
  } catch (err: any) {
    console.warn('Gemini AI styling error, falling back to local engine:', err?.message);
    return res.json({
      useFallback: true,
      error: err?.message,
    });
  }
});

// 5. Virtual Try-On Simulation Endpoint
closetAiRouter.post('/virtual-tryon', async (req: Request, res: Response) => {
  const { person_image, garments, outfit_name } = req.body;

  if (!person_image) {
    return res.status(400).json({ error: 'Missing person_image.' });
  }

  if (!Array.isArray(garments) || garments.length === 0) {
    return res.status(400).json({ error: 'At least one garment is required for virtual try-on.' });
  }

  // Filter garments into on-body (upper, lower, one-piece, outerwear) vs separate accessories/footwear
  const onBodyGarments = garments.filter((g: any) =>
    ['upper_body', 'lower_body', 'one_piece', 'outerwear'].includes(g.role)
  );

  const separateGarments = garments.filter((g: any) =>
    ['footwear', 'accessory'].includes(g.role)
  );

  // If external VTO endpoint and key are configured, forward request
  if (hasVtoService && vtoEndpoint) {
    try {
      const vtoResponse = await fetch(vtoEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vtoApiKey}`,
        },
        body: JSON.stringify({
          model_image: person_image,
          garments: onBodyGarments.map((g: any) => ({
            category: g.role,
            image: g.image_url,
          })),
        }),
      });

      if (vtoResponse.ok) {
        const vtoData = await vtoResponse.json();
        return res.json({
          success: true,
          provider: 'vto-service',
          generated_image_url: vtoData.output_image_url || vtoData.image,
          on_body_garments: onBodyGarments,
          separate_garments: separateGarments,
          outfit_name: outfit_name || 'Try-On Look',
        });
      }
    } catch (err: any) {
      console.warn('External VTO call failed:', err?.message);
    }
  }

  // Clear, honest, compliant fallback reporting
  return res.json({
    success: false,
    providerConfigured: hasVtoService,
    provider: hasVtoService ? 'vto-provider-error' : 'unconfigured',
    message: hasVtoService
      ? 'External VTO service temporarily unreachable. Displaying haute persona layout.'
      : 'Virtual Try-On synthetic image generation requires an active VTO provider API key (e.g. VTO_API_KEY). In the meantime, MyCloset presents your full-body persona paired with your real garments on the Personal Outfit Stage.',
    on_body_garments: onBodyGarments,
    separate_garments: separateGarments,
    outfit_name: outfit_name || 'Try-On Look',
  });
});
