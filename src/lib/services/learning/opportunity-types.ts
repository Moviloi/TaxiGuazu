import type { OpportunityType } from "@/lib/db/types";
export type { OpportunityType };

export type OpportunityContext = {
  tripId: string;
  clientPhone: string;
  origin: string;
  destination: string;
  passengers: number;
  tariffId: number | null;
  price: number;
  piso: number;
  urgency: string;
  conversationId: number;
  tripLegType: "airport_to_hotel" | "hotel_to_airport" | "airport_to_airport" | "hotel_to_hotel" | "other";
  hotelZone: boolean;
  intentKeywords: string[];
  entityMatches: string[];
  hasPendingOpportunity: boolean;
  memoryBoost?: number;
}

export interface Opportunity {
  type: OpportunityType;
  ruleId: number | null;
  label: string;
  description: string;
  originalPrice: number;
  offeredPrice: number;
  savings: number;
  priority: number;
  logId: number;
}

export interface OpportunityOffer {
  type: OpportunityType;
  label: string;
  description: string | null;
  savings: number;
  already_applied: boolean;
  valid_until: number | null;
}

export interface OpportunityResult {
  available: boolean;
  opportunities: OpportunityOffer[];
}
