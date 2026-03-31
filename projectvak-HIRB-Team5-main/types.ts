export interface Property {
  pand_id: string;
  user_id?: string;
  pand_naam: string;
  straat: string;
  plaats: string;
  postcode: string;
  prijs: number;
  stijl: string;
  aantal_kamers: number;
  laatste_notities: string;
  created_at: Date;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Client {
  klant_id: string;
  user_id?: string;
  klant_naam: string;
  telefoon: string;
  email: string;
  status: 'Zoekt' | 'Verkoopt' | 'Potentieel';
  notities: string;
  created_at: Date;
}

export interface Appointment {
  afspraken_id: string; // was id
  user_id?: string;
  titel?: string; // was title
  datum: Date; // was date
  klant_id?: string; // was client_id
  client_name?: string; // Derived/Joined
  pand_id?: string; // was property_id
  property_name?: string; // Derived/Joined
  notities: string; // was notes
}

export type ViewState = 'dashboard' | 'properties' | 'clients' | 'appointments' | 'map';

export interface AssistantProps {
  properties: Property[];
  clients: Client[];
  appointments: Appointment[];
  onCreateProperty: (prop: Omit<Property, 'pand_id' | 'created_at' | 'user_id'>) => Promise<any>;
  onUpdateProperty: (id: string, updates: Partial<Property>) => Promise<any>;
  onDeleteProperty: (id: string) => Promise<any>;
  onCreateClient: (client: Omit<Client, 'klant_id' | 'created_at' | 'user_id'>) => Promise<any>;
  onUpdateClient: (id: string, updates: Partial<Client>) => Promise<any>;
  onDeleteClient: (id: string) => Promise<any>;
  onCreateAppointment: (appt: Omit<Appointment, 'afspraken_id'>) => Promise<any>;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<any>;
  onDeleteAppointment: (id: string) => Promise<any>;
}