// lib/db/item.ts

export interface WardrobeItem {
  id: string;
  name: string; // e.g., "White Oversized Tee"
  category: "top" | "bottom" | "shoes" | "accessory" | "outfit";
  imageUrl: string; // The URL of the AI-processed flat-lay image
  originalImageUrl?: string; // The raw photo you took in your room
  tags: {
    weather: string[]; // e.g., ['summer', 'spring']
    occasion: string[]; // e.g., ['casual', 'college', 'party']
  };
  createdAt: Date;
}
