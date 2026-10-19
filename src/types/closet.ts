export type ItemStatus = 'clean' | 'in_laundry' | 'unavailable';

export type StandardCategory =
  | 'T-shirts and shirts'
  | 'Trousers and jeans'
  | 'Shorts'
  | 'Jackets and coats'
  | 'Sweaters and hoodies'
  | 'Shoes and sneakers'
  | 'Formal wear'
  | 'Sportswear'
  | 'Accessories'
  | 'Other';

export const STANDARD_CATEGORIES: StandardCategory[] = [
  'T-shirts and shirts',
  'Trousers and jeans',
  'Shorts',
  'Jackets and coats',
  'Sweaters and hoodies',
  'Shoes and sneakers',
  'Formal wear',
  'Sportswear',
  'Accessories',
  'Other',
];

export type Season = 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'All-Season';
export const ALL_SEASONS: Season[] = ['Spring', 'Summer', 'Fall', 'Winter', 'All-Season'];

export const POPULAR_OCCASIONS = [
  'Campus',
  'Work',
  'Casual Outings',
  'Formal Events',
  'Dates',
  'Gym & Sports',
  'Travel',
  'Party & Night Out',
] as const;

export const STYLE_OPTIONS = [
  'Casual',
  'Minimalist',
  'Streetwear',
  'Classic',
  'Bohemian',
  'Athleisure',
  'Vintage',
  'Business Casual',
  'Chic',
  'Old Money / Preppy',
] as const;

export const COLOR_PALETTE = [
  { name: 'Black', hex: '#1C1917' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Cream / Off-White', hex: '#F5F2EB' },
  { name: 'Navy Blue', hex: '#1E293B' },
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Charcoal Grey', hex: '#4B5563' },
  { name: 'Forest Green', hex: '#1E392A' },
  { name: 'Olive Green', hex: '#556B2F' },
  { name: 'Beige / Tan', hex: '#D2B48C' },
  { name: 'Camel / Brown', hex: '#8B5A2B' },
  { name: 'Burgundy / Maroon', hex: '#800020' },
  { name: 'Terracotta / Rust', hex: '#C86D51' },
  { name: 'Pastel Pink', hex: '#FBCFE8' },
  { name: 'Butter Yellow', hex: '#FEF08A' },
  { name: 'Silver / Grey', hex: '#94A3B8' },
  { name: 'Gold', hex: '#D4AF37' },
];

export interface DetectedGarmentAttributes {
  category?: string;
  subcategory?: string;
  primary_color?: string;
  secondary_color?: string;
  pattern?: string;
  material?: string;
  brand?: string;
  style?: string;
  season?: Season[];
  occasion?: string[];
  tags?: string[];
  notes?: string;
  confidence?: number;
}

export type ImageProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'original';

export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  subcategory?: string;
  color: string;
  secondary_color?: string;
  brand?: string;
  size?: string;
  season: Season[];
  occasion: string[];
  status: ItemStatus;
  image_url: string; // Active display image (enhanced when available, or original)
  original_image_url?: string; // Original uploaded photo
  processed_image_url?: string; // Cleaned studio product photograph
  processing_status?: ImageProcessingStatus;
  processing_error?: string | null;
  detected_attributes?: DetectedGarmentAttributes;
  notes?: string;
  is_favorite: boolean;
  times_worn: number;
  last_worn?: string | null;
  created_at: string;
  updated_at: string;
}

export type OutfitSlot = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory' | 'other';

export interface OutfitItemRef {
  slot: OutfitSlot;
  clothing_item_id: string;
  item?: ClothingItem;
}

export interface SavedOutfit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  occasion: string;
  style: string;
  season: string;
  is_favorite: boolean;
  items: OutfitItemRef[];
  created_at: string;
  updated_at: string;
}

export interface CalendarEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  outfit_id: string;
  outfit?: SavedOutfit;
  notes?: string;
  is_worn: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  preferred_style: string[];
  occasions: string[];
  preferred_colors: string[];
  budget_preference?: string;
  onboarding_completed: boolean;
  auto_enhance_photos?: boolean; // When true, automatically cleans and centers uploaded clothes
  created_at: string;
  updated_at: string;
}

export type WeatherCondition =
  | 'Warm & Sunny'
  | 'Mild & Breezy'
  | 'Cool & Crisp'
  | 'Cold & Rainy'
  | 'Freezing & Snow';

export type FormalityLevel =
  | 'Casual'
  | 'Smart Casual'
  | 'Business'
  | 'Cocktail'
  | 'Formal';

export interface RecommendationCriteria {
  occasion: string;
  style: string;
  weather: WeatherCondition;
  formality: FormalityLevel;
  preferred_color?: string;
  must_include_item_id?: string;
  avoid_item_id?: string;
}

export interface OutfitRecommendation {
  id: string;
  title: string;
  items: ClothingItem[];
  explanation: string;
  style_notes: string;
  weather_suitability: string;
  color_harmony: string;
  confidence_score: number;
  tags: string[];
}

export interface UserProfilePhoto {
  id: string;
  user_id: string;
  image_url: string;
  is_primary: boolean;
  confirmed_consent: boolean;
  label?: string;
  created_at: string;
}

export type TryonGarmentRole =
  | 'upper_body'
  | 'lower_body'
  | 'one_piece'
  | 'outerwear'
  | 'footwear'
  | 'accessory';

export interface VirtualTryonGarmentRef {
  id: string;
  name: string;
  category: string;
  image_url: string;
  role: TryonGarmentRole;
  is_supported_on_body: boolean; // false for shoes/watches shown in outfit sidebar
}

export interface VirtualTryonRecord {
  id: string;
  user_id: string;
  outfit_id?: string;
  outfit_name: string;
  person_image_url: string;
  generated_image_url?: string;
  garments: VirtualTryonGarmentRef[];
  status: 'completed' | 'simulated_board' | 'failed';
  provider: string;
  is_favorite: boolean;
  notes?: string;
  created_at: string;
}

export interface BulkUploadDraft {
  tempId: string;
  file?: File;
  image_url: string; // Active display image (enhanced or original)
  original_image_url: string;
  processed_image_url?: string;
  enhancing: boolean;
  enhanced: boolean;
  enhancement_error?: string | null;
  name: string;
  category: string;
  subcategory?: string;
  color: string;
  secondary_color?: string;
  brand?: string;
  size?: string;
  style?: string;
  season: Season[];
  occasion: string[];
  status: ItemStatus;
  pattern?: string;
  material?: string;
  tags?: string[];
  notes?: string;
  analyzing: boolean;
  analyzed: boolean;
  isDuplicateCandidate?: boolean;
  duplicateReason?: string;
}

export interface TryonProviderStatus {
  configured: boolean;
  providerName: string;
  supportedGarmentRoles: TryonGarmentRole[];
  message: string;
  requiresBilling?: boolean;
}

export type BackgroundMode = 'studio_white' | 'studio_neutral' | 'neutral_light_grey' | 'transparent';

export interface ProductEnhancementOptions {
  backgroundMode?: BackgroundMode;
  paddingRatio?: number; // default 0.10 (10%)
  addGroundingShadow?: boolean; // default true
  targetDimension?: number; // default 1000
  enhanceQuality?: boolean; // default true
  provider?: 'auto' | 'removebg' | 'photoroom' | 'clipdrop' | 'builtin-cv';
}

export interface ProductEnhancementResult {
  success: boolean;
  enhanced_image_url: string;
  original_image_url: string;
  provider_used: string;
  processing_status: ImageProcessingStatus;
  processing_error?: string | null;
  processing_details?: {
    width?: number;
    height?: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
    shadowApplied?: boolean;
    backgroundHex?: string;
  };
}

export interface EnhancerProviderStatus {
  activeProvider: string;
  availableProviders: {
    id: string;
    name: string;
    type: 'cloud_api' | 'local_cv';
    isConfigured: boolean;
    freeTierAvailable: boolean;
    description: string;
  }[];
  features: string[];
}

