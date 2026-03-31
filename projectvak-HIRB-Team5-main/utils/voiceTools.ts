import { Type, FunctionDeclaration } from '@google/genai';

// Property Tools
export const createPropertyTool: FunctionDeclaration = {
    name: 'createProperty',
    description: 'Creates a new property listing in the database.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            pand_naam: { type: Type.STRING, description: 'The name or title of the property.' },
            prijs: { type: Type.NUMBER, description: 'The asking price in Euros.' },
            stijl: { type: Type.STRING, description: 'The style of the property (e.g., Villa, Appartement).' },
            aantal_kamers: { type: Type.NUMBER, description: 'Number of bedrooms.' },
            straat: { type: Type.STRING, description: 'Street name and number.' },
            plaats: { type: Type.STRING, description: 'City name.' },
            postcode: { type: Type.STRING, description: 'Postal code.' },
            notities: { type: Type.STRING, description: 'Additional notes about the property.' },
        },
        required: ['pand_naam', 'prijs', 'plaats', 'aantal_kamers'],
    },
};

export const updatePropertyTool: FunctionDeclaration = {
    name: 'updateProperty',
    description: 'Updates an existing property. Use this to change price, notes, location, style or other details.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            current_pand_naam: { type: Type.STRING, description: 'The CURRENT name of the property to identify it.' },
            new_pand_naam: { type: Type.STRING, description: 'New name if changed.' },
            new_prijs: { type: Type.NUMBER, description: 'New price if changed.' },
            new_notes: { type: Type.STRING, description: 'New notes to append or replace.' },
            new_kamers: { type: Type.NUMBER, description: 'Updated number of rooms.' },
            new_stijl: { type: Type.STRING, description: 'Updated style (e.g. Villa, Penthouse).' },
            new_straat: { type: Type.STRING, description: 'Updated street and number.' },
            new_plaats: { type: Type.STRING, description: 'Updated city.' },
            new_postcode: { type: Type.STRING, description: 'Updated postal code.' }
        },
        required: ['current_pand_naam'],
    },
};

export const deletePropertyTool: FunctionDeclaration = {
    name: 'deleteProperty',
    description: 'Deletes a property from the database.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            pand_naam: { type: Type.STRING, description: 'The name of the property to delete.' },
        },
        required: ['pand_naam'],
    },
};

// Client Tools
export const createClientTool: FunctionDeclaration = {
    name: 'createClient',
    description: 'Creates a new client record in the database.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            klant_naam: { type: Type.STRING, description: 'Full name of the client.' },
            telefoon: { type: Type.STRING, description: 'Phone number. Format as +32 XXX XX XX XX or 04XX XX XX XX.' },
            email: { type: Type.STRING, description: 'Email address.' },
            status: { type: Type.STRING, enum: ['Zoekt', 'Verkoopt', 'Potentieel'], description: 'Client status.' },
            notities: { type: Type.STRING, description: 'Initial notes about the client.' },
        },
        required: ['klant_naam', 'telefoon', 'email'],
    },
};

export const updateClientTool: FunctionDeclaration = {
    name: 'updateClient',
    description: 'Updates an existing client record.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            current_klant_naam: { type: Type.STRING, description: 'The CURRENT name of the client to identify them.' },
            new_klant_naam: { type: Type.STRING, description: 'New name if changed.' },
            new_telefoon: { type: Type.STRING, description: 'New phone number. Format as +32 XXX XX XX XX or 04XX XX XX XX.' },
            new_email: { type: Type.STRING, description: 'New email address.' },
            new_status: { type: Type.STRING, enum: ['Zoekt', 'Verkoopt', 'Potentieel'], description: 'New status.' },
            new_notities: { type: Type.STRING, description: 'New notes.' },
        },
        required: ['current_klant_naam'],
    },
};

export const deleteClientTool: FunctionDeclaration = {
    name: 'deleteClient',
    description: 'Deletes a client from the database.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            klant_naam: { type: Type.STRING, description: 'The name of the client to delete.' },
        },
        required: ['klant_naam'],
    },
};

// Appointment Tools
export const createAppointmentTool: FunctionDeclaration = {
    name: 'createAppointment',
    description: 'Schedules a new appointment.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: 'Title or reason for the appointment.' },
            date_time: { type: Type.STRING, description: 'The absolute date and time in ISO 8601 format (e.g. 2024-03-20T14:00:00). Calculate this based on the current date.' },
            klant_naam: { type: Type.STRING, description: 'Name of the client involved (optional).' },
            pand_naam: { type: Type.STRING, description: 'Name of the property involved (optional).' },
            notes: { type: Type.STRING, description: 'Additional details.' },
        },
        required: ['title', 'date_time', 'klant_naam'],
    },
};

export const updateAppointmentTool: FunctionDeclaration = {
    name: 'updateAppointment',
    description: 'Updates an existing appointment (title, date, or notes).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            current_title: { type: Type.STRING, description: 'The current title of the appointment to update.' },
            new_title: { type: Type.STRING, description: 'New title if changed.' },
            new_date_time: { type: Type.STRING, description: 'New ISO 8601 date and time if changed.' },
            new_klant_naam: { type: Type.STRING, description: 'Name of the client to link to this appointment.' },
            new_pand_naam: { type: Type.STRING, description: 'Name of the property to link to this appointment.' },
            new_notes: { type: Type.STRING, description: 'New notes.' },
        },
        required: ['current_title'],
    },
};

export const deleteAppointmentTool: FunctionDeclaration = {
    name: 'deleteAppointment',
    description: 'Deletes an existing appointment.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: 'The title of the appointment to delete.' },
        },
        required: ['title'],
    },
};

export const fetchDetailsTool: FunctionDeclaration = {
    name: 'fetchDetails',
    description: 'Retrieves details about properties, clients, or appointments.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            entity_type: { type: Type.STRING, enum: ['Pand', 'Klant', 'Afspraak'], description: 'The type of entity to fetch.' },
            search_term: { type: Type.STRING, description: 'The name or keyword to search for.' },
        },
        required: ['entity_type'],
    },
};

export const getSystemInstruction = () => {
        return `You are Vesta, the Vastgoed Data Assistent for Belgian real estate agents.
This is a voice-first assistant: optimize for listening.

Language
- Speak Dutch (Flemish) by default.
- If the user speaks English, reply in English.
- Match the user's latest language.

Time
- Current date/time: ${new Date().toLocaleString('nl-BE')}.
- Interpret relative times in Europe/Brussels timezone.
- Convert all appointment times to ISO 8601 with explicit Brussels offset,
    e.g. 2025-03-25T10:00:00+01:00. Never omit the UTC offset.

Scope
- In scope: CRM tasks for this app only.
- Supported actions:
    - Properties: create, update, delete, fetch.
    - Clients: create, update, delete, fetch (default status "Zoekt" when missing).
    - Appointments: create, update, delete, fetch.
- If out of scope, say briefly that you can only help with properties, clients, and appointments in this system.

Voice style
- Keep replies short: 1-3 sentences unless user asks for more.
- Natural spoken language only: no markdown, no lists, no filler intros.
- Keep sentence structure simple and easy to hear.
- Tone: professional and approachable - helpful colleague, not robotic assistant.
- End cleanly: if you need input, ask one clear question; if done, stop.

Action safety
- For CREATE: ask one lightweight confirmation without restating all fields,
  e.g. "Zal ik deze klant opslaan?" or "Alles correct, afspraak aanmaken?".
- For CREATE with a date/time field, do read back the date in the confirmation.
- For UPDATE/DELETE: restate the key fields before confirming —
  entity type, name/ID, and the values being changed or removed.
- For date/time fields in UPDATE/DELETE confirmations, always read back the full date
  (day name + day number + month + time), e.g. "dinsdag 15 april om 10 uur".
- Use one short confirmation question, then wait.
- Never execute if confirmation is missing or unclear.
- Never claim success before tool result confirms success.
- If a multi-step action partially fails, report what succeeded and what
  failed separately, then ask one focused next-step question.

Ambiguity and matching
- If unclear, ask exactly one targeted clarifying question.
- Name matching policy:
    - One clear match: proceed.
    - Multiple matches: ask one disambiguation question.
    - No match: say not found and ask one next-step question.
- For vague property references (e.g. "het appartement in de Brusselsestraat, dat ene bij de kerk"),
    ask for a property ID or more specific address rather than guessing.
- Prefer the most complete name from context.

Self-correction
- If the user corrects a field immediately after stating it (e.g. "nee wacht, woensdag niet dinsdag"),
    update only that field, then re-read the full confirmation before proceeding.

Error handling
- If transcription is unclear, say: "Sorry, ik heb dat niet goed verstaan, kan je het herhalen?"
    (or in English: "Sorry, I didn't catch that, could you say it again?")
- If uncertain, do not guess and do not execute actions.
- If a tool fails, state it briefly and ask one focused next-step question.

Context behavior
- Use earlier conversation context naturally.
- Treat follow-up requests as continuation unless the user changes topic.
- Keep responses calm, direct, and concise.`;
};
