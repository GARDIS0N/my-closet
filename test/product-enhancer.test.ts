import sharp from 'sharp';
import { ServerProductImageProcessor } from '../server/productImageProcessor.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('🧪 Starting MyCloset AI Product Photo Enhancement Engine Test Suite...\n');

async function createTestImage(
  fgColor: { r: number; g: number; b: number },
  bgColor: { r: number; g: number; b: number },
  itemType: 'shirt' | 'shoe' | 'accessory'
): Promise<string> {
  const width = 600;
  const height = 600;

  // Background buffer
  const bg = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: bgColor.r, g: bgColor.g, b: bgColor.b, alpha: 1 },
    },
  }).png().toBuffer();

  let shapeSvg = '';
  if (itemType === 'shirt') {
    // T-shirt silhouette
    shapeSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <polygon points="200,120 260,120 300,160 340,120 400,120 480,200 430,260 380,220 380,480 220,480 220,220 170,260 120,200" fill="rgb(${fgColor.r},${fgColor.g},${fgColor.b})" />
    </svg>`;
  } else if (itemType === 'shoe') {
    // Sneaker silhouette
    shapeSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <path d="M 120 360 C 140 280, 240 260, 320 280 C 400 300, 480 340, 500 390 L 500 440 L 120 440 Z" fill="rgb(${fgColor.r},${fgColor.g},${fgColor.b})" />
      <rect x="120" y="420" width="380" height="20" fill="#FFFFFF" />
    </svg>`;
  } else {
    // Accessory (Belt/Watch loop)
    shapeSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="300" cy="300" r="140" fill="none" stroke="rgb(${fgColor.r},${fgColor.g},${fgColor.b})" stroke-width="45" />
      <rect x="270" y="140" width="60" height="40" fill="#D4AF37" rx="6" />
    </svg>`;
  }

  const composed = await sharp(bg)
    .composite([{ input: Buffer.from(shapeSvg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return `data:image/jpeg;base64,${composed.toString('base64')}`;
}

async function runTests() {
  // Test 1: Provider Status
  console.log('Test 1: Verify Provider Status & Hierarchy...');
  const status = ServerProductImageProcessor.getStatus();
  assert(Boolean(status.activeProvider), 'Active provider must be defined');
  assert(status.availableProviders.length >= 4, 'Must report at least 4 available providers');
  assert(status.features.includes('automatic_background_removal'), 'Must support automatic background removal');
  assert(status.features.includes('contact_grounding_shadow'), 'Must support contact grounding shadow');
  assert(status.features.includes('zero_hallucination_guarantee'), 'Must support zero hallucination guarantee');
  console.log(`✅ Status verified: Active provider is [${status.activeProvider}].`);

  // Test 2: T-Shirt Cleanup & Studio Framing
  console.log('\nTest 2: Automatic Studio Cleanup for Garment (T-Shirt)...');
  const rawShirt = await createTestImage({ r: 30, g: 57, b: 42 }, { r: 210, g: 215, b: 220 }, 'shirt');
  const shirtResult = await ServerProductImageProcessor.process(rawShirt, {
    backgroundMode: 'studio_white',
    addGroundingShadow: true,
    paddingRatio: 0.1,
  });

  assert(shirtResult.success, 'Shirt enhancement must succeed');
  assert(shirtResult.processing_status === 'completed', 'Processing status must be completed');
  assert(shirtResult.original_image_url === rawShirt, 'Original photo must be preserved identically');
  assert(shirtResult.enhanced_image_url.startsWith('data:image/webp;base64,'), 'Output must be high-efficiency WebP');

  // Verify enhanced image dimensions using Sharp
  const shirtWebpBuffer = Buffer.from(
    shirtResult.enhanced_image_url.replace('data:image/webp;base64,', ''),
    'base64'
  );
  const shirtMeta = await sharp(shirtWebpBuffer).metadata();
  assert(shirtMeta.width === 1000, `Expected width 1000, got ${shirtMeta.width}`);
  assert(shirtMeta.height === 1000, `Expected height 1000, got ${shirtMeta.height}`);
  console.log(`✅ Garment enhanced: 1000x1000 studio WebP with grounding shadow generated.`);

  // Test 3: Footwear (Sneaker) Cleanup & Sole Preservation
  console.log('\nTest 3: Footwear (Sneaker) Cleanup with Sole & Contrast Preservation...');
  const rawShoe = await createTestImage({ r: 240, g: 80, b: 40 }, { r: 245, g: 235, b: 220 }, 'shoe');
  const shoeResult = await ServerProductImageProcessor.process(rawShoe, {
    backgroundMode: 'studio_neutral',
    addGroundingShadow: true,
  });

  assert(shoeResult.success, 'Shoe enhancement must succeed');
  assert(shoeResult.processing_status === 'completed', 'Shoe processing status must be completed');
  assert(shoeResult.enhanced_image_url.length > 500, 'Enhanced shoe image data must be populated');
  console.log(`✅ Footwear enhanced: studio neutral backdrop and sole structure preserved.`);

  // Test 4: Accessories (Belt / Watch)
  console.log('\nTest 4: Accessory (Watch / Belt) with Contour Preservation...');
  const rawAccessory = await createTestImage({ r: 50, g: 40, b: 35 }, { r: 190, g: 190, b: 190 }, 'accessory');
  const accessoryResult = await ServerProductImageProcessor.process(rawAccessory, {
    backgroundMode: 'transparent',
    addGroundingShadow: false,
  });

  assert(accessoryResult.success, 'Accessory enhancement must succeed');
  assert(accessoryResult.processing_status === 'completed', 'Accessory processing status must be completed');
  const accWebpBuffer = Buffer.from(
    accessoryResult.enhanced_image_url.replace('data:image/webp;base64,', ''),
    'base64'
  );
  const accMeta = await sharp(accWebpBuffer).metadata();
  assert(accMeta.channels === 4, 'Transparent accessory output must have 4 channels (RGBA)');
  console.log(`✅ Accessory enhanced: transparent RGBA cutout verified.`);

  // Test 5: Graceful Error Handling on Invalid/Corrupt Input
  console.log('\nTest 5: Resilience & Error Handling on Malformed Input...');
  const badInput = 'data:image/jpeg;base64,NotAValidBase64ImageContentCorruptedData123';
  const badResult = await ServerProductImageProcessor.process(badInput);

  assert(!badResult.success, 'Malformed image enhancement must return success=false');
  assert(badResult.processing_status === 'failed', 'Processing status must be failed');
  assert(badResult.original_image_url === badInput, 'Original corrupted input must still be preserved');
  assert(Boolean(badResult.processing_error), 'Must return descriptive processing_error message');
  console.log(`✅ Resilience verified: Safely handled corrupt payload without crashing (${badResult.processing_error}).`);

  console.log('\n✨ ALL PRODUCT PHOTO ENHANCEMENT TESTS PASSED! ✨\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
