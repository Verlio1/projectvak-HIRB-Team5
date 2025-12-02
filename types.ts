export enum HouseStyle {
  MODERN = 'Modern',
  TRADITIONAL = 'Traditioneel',
  COTTAGE = 'Cottage',
  RENOVATION = 'Te Renoveren',
  NEW_BUILD = 'Nieuwbouw',
  UNKNOWN = 'Onbekend'
}

export enum HouseType {
  DETACHED = 'Vrijstaand',
  SEMI_DETACHED = 'Halfopen',
  TERRACED = 'Rijhuis',
  APARTMENT = 'Appartement',
  VILLA = 'Villa',
  UNKNOWN = 'Onbekend'
}

export interface PropertyLead {
  id: string;
  address: string;
  city: string;
  houseStyle: HouseStyle;
  houseType: HouseType;
  estimatedPriceRange: string;
  ownerOrContact?: string;
  notes: string;
  createdAt: number;
  confidenceScore: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'Zoekt woning' | 'Verkoopt' | 'Potentieel';
  preference: string; // e.g. "Regio Leuven, max 400k"
  lastContact: string;
  createdAt: number;
}

export interface ProcessingState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
}

// AI Response Wrapper
export type AIResultType = 'LEAD' | 'CUSTOMER' | 'UNKNOWN';

export interface AIAnalysisResult {
  type: AIResultType;
  lead?: Omit<PropertyLead, 'id' | 'createdAt'>;
  customer?: Omit<Customer, 'id' | 'createdAt' | 'lastContact'>;
  summary: string; // Short text of what was understood
}