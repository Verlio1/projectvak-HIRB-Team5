import { supabase } from './supabaseClient';
import { Property, Client, Appointment } from './types';
import { MOCK_PROPERTIES, MOCK_CLIENTS, MOCK_APPOINTMENTS } from './constants';
import { geocodeAddress } from './utils/geocode';

// --- Helpers ---

// Convert DB Date string to JS Date object
const toDate = (dateStr: string | Date | null): Date => {
    if (!dateStr) return new Date();
    return new Date(dateStr);
};

const getAuthenticatedUserId = async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        return null;
    }
    return data.user.id;
};

// --- Properties ---

export async function getProperties(): Promise<Property[]> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('panden')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching properties:', error);
        return [];
    }

    return data.map((p: any) => ({
        ...p,
        created_at: toDate(p.created_at),
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
    })) as Property[];
}

export async function addProperty(property: Omit<Property, 'pand_id' | 'created_at' | 'user_id'>): Promise<Property | null> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return null;

    // Geocode the address before saving
    const coords = await geocodeAddress(property.straat, property.postcode, property.plaats);

    const dataToInsert = {
        ...property,
        user_id: userId,
        latitude: coords?.lat ?? null,
        longitude: coords?.lon ?? null,
    };

    const { data, error } = await supabase
        .from('panden')
        .insert([dataToInsert])
        .select()
        .single();

    if (error) {
        console.error('Error adding property to Supabase:', error);
        return null;
    }

    return {
        ...data,
        created_at: toDate(data.created_at),
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
    } as Property;
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return null;

    const { pand_id: _, created_at: __, user_id: ___, ...updatesToApply } = updates as any;

    // Re-geocode if address fields have changed
    if (updatesToApply.straat || updatesToApply.postcode || updatesToApply.plaats) {
        // Fetch current record to fill in missing address parts
        const { data: current } = await supabase.from('panden').select('straat,postcode,plaats').eq('pand_id', id).single();
        const straat = updatesToApply.straat ?? current?.straat ?? '';
        const postcode = updatesToApply.postcode ?? current?.postcode ?? '';
        const plaats = updatesToApply.plaats ?? current?.plaats ?? '';
        const coords = await geocodeAddress(straat, postcode, plaats);
        if (coords) {
            updatesToApply.latitude = coords.lat;
            updatesToApply.longitude = coords.lon;
        }
    }

    const { data, error } = await supabase
        .from('panden')
        .update(updatesToApply)
        .eq('pand_id', id)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating property:', error);
        return null;
    }

    return {
        ...data,
        created_at: toDate(data.created_at),
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
    } as Property;
}

export async function deleteProperty(id: string): Promise<boolean> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return false;

    const { error } = await supabase
        .from('panden')
        .delete()
        .eq('pand_id', id)
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting property:', error);
        return false;
    }
    return true;
}

// --- Clients ---

export async function getClients(): Promise<Client[]> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('klanten')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching clients:', error);
        return [];
    }

    return data.map((c: any) => ({
        ...c,
        created_at: toDate(c.created_at),
    })) as Client[];
}

export async function addClient(client: Omit<Client, 'klant_id' | 'created_at' | 'user_id'>): Promise<Client | null> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return null;

    const { data, error } = await supabase
        .from('klanten')
        .insert([{ ...client, user_id: userId }])
        .select()
        .single();

    if (error) {
        console.error('Error adding client:', error);
        return null;
    }

    return {
        ...data,
        created_at: toDate(data.created_at),
    } as Client;
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return null;

    const { klant_id: _, created_at: __, user_id: ___, ...updatesToApply } = updates as any;

    const { data, error } = await supabase
        .from('klanten')
        .update(updatesToApply)
        .eq('klant_id', id)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating client:', error);
        return null;
    }

    return {
        ...data,
        created_at: toDate(data.created_at),
    } as Client;
}

export async function deleteClient(id: string): Promise<boolean> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return false;

    const { error } = await supabase
        .from('klanten')
        .delete()
        .eq('klant_id', id)
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting client:', error);
        return false;
    }
    return true;
}

// --- Appointments ---

export async function getAppointments(): Promise<Appointment[]> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('afspraken')
        .select(`
            *,
            klanten (klant_naam),
            panden (pand_naam)
        `)
        .eq('user_id', userId)
        .order('datum', { ascending: true });

    if (error) {
        console.error('Error fetching appointments:', error);
        return [];
    }

    return data.map((a: any) => ({
        afspraken_id: a.afspraken_id,
        titel: a.titel || 'Afspraak',
        datum: toDate(a.datum),
        notities: a.notities,
        klant_id: a.klant_id,
        pand_id: a.pand_id,
        client_name: a.klanten?.klant_naam,
        property_name: a.panden?.pand_naam
    })) as Appointment[];
}

export async function addAppointment(appointment: Omit<Appointment, 'afspraken_id'>): Promise<Appointment | null> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return null;

    const dbAppt = {
        user_id: userId,
        klant_id: appointment.klant_id,
        pand_id: appointment.pand_id,
        datum: appointment.datum,
        notities: appointment.notities,
        titel: appointment.titel
    };

    const { data, error } = await supabase
        .from('afspraken')
        .insert([dbAppt])
        .select()
        .single();

    if (error) {
        console.error('Error adding appointment:', error);
        return null;
    }

    return {
        ...data,
        afspraken_id: data.afspraken_id,
        datum: toDate(data.datum),
    } as Appointment;
}

export async function updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return null;

    const { afspraken_id: _, client_name: __, property_name: ___, user_id: ____, ...updatesToApply } = updates as any;

    const { data, error } = await supabase
        .from('afspraken')
        .update(updatesToApply)
        .eq('afspraken_id', id)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating appointment:', error);
        return null;
    }

    return {
        ...data,
        afspraken_id: data.afspraken_id,
        datum: toDate(data.datum),
    } as Appointment;
}


export async function deleteAppointment(id: string): Promise<boolean> {
    const userId = await getAuthenticatedUserId();
    if (!userId) return false;

    const { error } = await supabase
        .from('afspraken')
        .delete()
        .eq('afspraken_id', id)
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting appointment:', error);
        return false;
    }
    return true;
}

// --- Seeding ---

export async function seedDatabase(force = false) {
    const userId = await getAuthenticatedUserId();
    if (!userId) return;

    if (force) {
        console.log('Force seeding: clearing existing data...');
        // Delete only records owned by the current user.
        await supabase.from('afspraken').delete().eq('user_id', userId);
        await supabase.from('panden').delete().eq('user_id', userId);
        await supabase.from('klanten').delete().eq('user_id', userId);
    }

    console.log('Checking database state...');

    // Check Properties
    const { count: propCount, error: propError } = await supabase
        .from('panden')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
    if (propError) console.error('Error checking panden count:', propError);
    else console.log('Current panden count:', propCount);

    if (propCount === 0) {
        console.log('Seeding Properties into panden...');
        // Strip fixed IDs from mock data so each user gets unique primary keys.
        const propsToInsert = MOCK_PROPERTIES.map(({ pand_id, created_at, user_id: _userId, ...rest }) => ({ ...rest, user_id: userId }));
        const { error } = await supabase.from('panden').insert(propsToInsert);
        if (error) console.error("Error seeding panden", error);
        else console.log('Seeded panden successfully');
    }

    // Check Clients
    const { count: clientCount, error: clientError } = await supabase
        .from('klanten')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
    if (clientError) console.error('Error checking klanten count:', clientError);
    else console.log('Current klanten count:', clientCount);

    if (clientCount === 0) {
        console.log('Seeding Clients into klanten...');
        // Strip fixed IDs from mock data so each user gets unique primary keys.
        const clientsToInsert = MOCK_CLIENTS.map(({ klant_id, created_at, user_id: _userId, ...rest }) => ({ ...rest, user_id: userId }));
        const { error } = await supabase.from('klanten').insert(clientsToInsert);
        if (error) console.error("Error seeding klanten", error);
        else console.log('Seeded klanten successfully');
    }

    // Check Appointments
    const { count: apptCount, error: apptError } = await supabase
        .from('afspraken')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
    if (apptError) console.error('Error checking afspraken count:', apptError);
    else console.log('Current afspraken count:', apptCount);

    if (apptCount === 0) {
        console.log('Seeding Appointments into afspraken...');
        const { data: currentProps, error: currentPropsError } = await supabase
            .from('panden')
            .select('pand_id,pand_naam')
            .eq('user_id', userId);
        const { data: currentClients, error: currentClientsError } = await supabase
            .from('klanten')
            .select('klant_id,klant_naam')
            .eq('user_id', userId);

        if (currentPropsError || currentClientsError) {
            console.error('Error loading current entities for appointment seeding:', currentPropsError || currentClientsError);
            return;
        }

        const propertyIdByName = new Map((currentProps || []).map((p: any) => [p.pand_naam, p.pand_id]));
        const clientIdByName = new Map((currentClients || []).map((c: any) => [c.klant_naam, c.klant_id]));

        // Strip fixed appointment IDs and remap foreign keys to this user's rows.
        const apptsToInsert = MOCK_APPOINTMENTS
            .map(({ afspraken_id, client_name, property_name, ...rest }) => {
                const mappedKlantId = client_name ? clientIdByName.get(client_name) : undefined;
                const mappedPandId = property_name ? propertyIdByName.get(property_name) : undefined;

                if (!mappedKlantId || !mappedPandId) {
                    console.warn('Skipping mock appointment because related user-scoped entities are missing:', rest.titel);
                    return null;
                }

                return {
                    ...rest,
                    klant_id: mappedKlantId,
                    pand_id: mappedPandId,
                    user_id: userId,
                };
            })
            .filter((appt): appt is NonNullable<typeof appt> => appt !== null);

        if (apptsToInsert.length === 0) {
            console.warn('No appointments were seeded because no valid user-scoped mappings were found.');
            return;
        }

        const { error } = await supabase.from('afspraken').insert(apptsToInsert);
        if (error) console.error("Error seeding afspraken", error);
        else console.log('Seeded afspraken successfully');
    }
}
