import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, Volume2, X } from 'lucide-react';
import { createBlob, base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';
import { AssistantProps } from '../types';

// --- Tool Definitions ---

// Property Tools
const createPropertyTool: FunctionDeclaration = {
  name: 'createProperty',
  description: 'Creates a new property listing in the database.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed: { type: Type.BOOLEAN, description: 'Set to true only after explicit user confirmation in the previous turn.' },
      pand_naam: { type: Type.STRING, description: 'The name or title of the property.' },
      prijs: { type: Type.NUMBER, description: 'The asking price in Euros.' },
      stijl: { type: Type.STRING, description: 'The style of the property (e.g., Villa, Appartement).' },
      aantal_kamers: { type: Type.NUMBER, description: 'Number of bedrooms.' },
      straat: { type: Type.STRING, description: 'Street name and number.' },
      plaats: { type: Type.STRING, description: 'City name.' },
      postcode: { type: Type.STRING, description: 'Postal code. Optional when place is known; the app will try to infer it.' },
    },
    required: ['pand_naam', 'prijs', 'plaats', 'aantal_kamers'],
  },
};

const updatePropertyTool: FunctionDeclaration = {
  name: 'updateProperty',
  description: 'Updates an existing property. Use this to change price, notes, location, style or other details.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed: { type: Type.BOOLEAN, description: 'Set to true only after explicit user confirmation in the previous turn.' },
      current_pand_naam: { type: Type.STRING, description: 'The CURRENT name of the property to identify it.' },
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

const deletePropertyTool: FunctionDeclaration = {
  name: 'deleteProperty',
  description: 'Deletes a property from the database.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed: { type: Type.BOOLEAN, description: 'Set to true only after explicit user confirmation in the previous turn.' },
      pand_naam: { type: Type.STRING, description: 'The name of the property to delete.' },
    },
    required: ['pand_naam'],
  },
};

// Client Tools
const createClientTool: FunctionDeclaration = {
  name: 'createClient',
  description: 'Creates a new client record in the database.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed: { type: Type.BOOLEAN, description: 'Set to true only after explicit user confirmation in the previous turn.' },
      klant_naam: { type: Type.STRING, description: 'Full name of the client.' },
      telefoon: { type: Type.STRING, description: 'Phone number.' },
      email: { type: Type.STRING, description: 'Email address.' },
      status: { type: Type.STRING, enum: ['Zoekt', 'Verkoopt', 'Potentieel'], description: 'Client status.' },
      notities: { type: Type.STRING, description: 'Initial notes about the client.' },
    },
    required: ['klant_naam'],
  },
};

const updateClientTool: FunctionDeclaration = {
  name: 'updateClient',
  description: 'Updates an existing client record.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed: { type: Type.BOOLEAN, description: 'Set to true only after explicit user confirmation in the previous turn.' },
      current_klant_naam: { type: Type.STRING, description: 'The CURRENT name of the client to identify them.' },
      new_telefoon: { type: Type.STRING, description: 'New phone number.' },
      new_email: { type: Type.STRING, description: 'New email address.' },
      new_status: { type: Type.STRING, enum: ['Zoekt', 'Verkoopt', 'Potentieel'], description: 'New status.' },
      new_notities: { type: Type.STRING, description: 'New notes.' },
    },
    required: ['current_klant_naam'],
  },
};

const deleteClientTool: FunctionDeclaration = {
  name: 'deleteClient',
  description: 'Deletes a client from the database.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed: { type: Type.BOOLEAN, description: 'Set to true only after explicit user confirmation in the previous turn.' },
      klant_naam: { type: Type.STRING, description: 'The name of the client to delete.' },
    },
    required: ['klant_naam'],
  },
};

// Appointment Tools
const createAppointmentTool: FunctionDeclaration = {
  name: 'createAppointment',
  description: 'Schedules a new appointment.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed: { type: Type.BOOLEAN, description: 'Set to true only after explicit user confirmation in the previous turn.' },
      title: { type: Type.STRING, description: 'Title or reason for the appointment.' },
      date_time: { type: Type.STRING, description: 'The absolute date and time in ISO 8601 format with explicit offset (e.g. 2025-03-25T10:00:00+01:00). Calculate this based on the current date in Europe/Brussels.' },
      klant_naam: { type: Type.STRING, description: 'Name of the client involved (optional).' },
      pand_naam: { type: Type.STRING, description: 'Name of the property involved (optional).' },
      notes: { type: Type.STRING, description: 'Additional details.' },
    },
    required: ['title', 'date_time'],
  },
};

const fetchDetailsTool: FunctionDeclaration = {
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

const buildSystemInstruction = () => `You are Vesta, the Vastgoed Data Assistent for Belgian real estate agents.
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
  - Appointments: create, fetch.
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

type PendingMutation = {
  toolName: string;
  signature: string;
  turn: number;
  createdAt: number;
};

export const VoiceAssistant: React.FC<AssistantProps> = ({
  properties,
  clients,
  appointments,
  onCreateProperty,
  onUpdateProperty,
  onDeleteProperty,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  onCreateAppointment
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const silenceStartRef = useRef<number | null>(null);
  const pendingMutationRef = useRef<PendingMutation | null>(null);
  const toolTurnRef = useRef(0);

  // Data refs for access in callbacks
  const dataRef = useRef({ properties, clients, appointments });
  dataRef.current = { properties, clients, appointments };

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close?.();
      sessionRef.current = null;
    }
    sourcesRef.current.forEach(src => {
      try { src.stop(); } catch (e) { }
    });
    sourcesRef.current.clear();
    setIsActive(false);
    setIsConnecting(false);
    setVolume(0);
    silenceStartRef.current = null;
    pendingMutationRef.current = null;
  }, []);

  const toSearch = (value?: string) => (value || '').trim().toLowerCase();

  const findMatchesByName = (items: any[], query: string, selector: (item: any) => string) => {
    const search = toSearch(query);
    if (!search) return [];
    return items.filter(item => toSearch(selector(item)).includes(search));
  };

  const createMutationSignature = (toolName: string, args: any) => {
    const normalized: Record<string, unknown> = {};
    Object.keys(args || {})
      .filter(key => key !== 'confirmed')
      .sort()
      .forEach(key => {
        normalized[key] = args[key];
      });

    return `${toolName}:${JSON.stringify(normalized)}`;
  };

  const MUTATION_TOOLS = new Set([
    'createProperty',
    'updateProperty',
    'deleteProperty',
    'createClient',
    'updateClient',
    'deleteClient',
    'createAppointment'
  ]);

  const ISO_WITH_OFFSET_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2})$/;
  const BRUSSELS_OFFSET_RE = /([+-](01|02):00)$/;

  const startSession = async () => {
    try {
      setError(null);
      setIsConnecting(true);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });

      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: buildSystemInstruction(),
          tools: [{
            functionDeclarations: [
              createPropertyTool, updatePropertyTool, deletePropertyTool,
              createClientTool, updateClientTool, deleteClientTool,
              createAppointmentTool, fetchDetailsTool
            ]
          }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        }
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setIsConnecting(false);
            setIsActive(true);

            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 5, 1));

              // Silence detection
              const isAiSpeaking = sourcesRef.current.size > 0;
              if (rms < 0.02 && !isAiSpeaking) {
                if (!silenceStartRef.current) {
                  silenceStartRef.current = Date.now();
                } else if (Date.now() - silenceStartRef.current > 5000) {
                  console.log("Silence detected for 5 seconds, stopping session.");
                  cleanupAudio();
                  return; // Stop processing
                }
              } else {
                silenceStartRef.current = null;
              }

              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);

            sourceRef.current = source;
            processorRef.current = processor;
          },
          onmessage: async (msg: LiveServerMessage) => {
            const { serverContent, toolCall } = msg;

            if (serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const audioData = serverContent.modelTurn.parts[0].inlineData.data;
              const ctx = outputContextRef.current;
              if (ctx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const buffer = await decodeAudioData(base64ToUint8Array(audioData), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                sourcesRef.current.add(source);
                nextStartTimeRef.current += buffer.duration;
              }
            }

            if (serverContent?.interrupted) {
              sourcesRef.current.forEach(src => { try { src.stop(); } catch (e) { } });
              sourcesRef.current.clear();
              if (outputContextRef.current) nextStartTimeRef.current = outputContextRef.current.currentTime;
            }

            if (toolCall) {
              console.log("Tool Call:", toolCall);
              toolTurnRef.current += 1;
              const currentTurn = toolTurnRef.current;

              for (const fc of toolCall.functionCalls) {
                let result: any = { status: 'ok' };
                const args = fc.args as any;
                const currentData = dataRef.current;
                const isMutationTool = MUTATION_TOOLS.has(fc.name);

                if (isMutationTool) {
                  const signature = createMutationSignature(fc.name, args);
                  const pending = pendingMutationRef.current;
                  const isConfirmed = args.confirmed === true;

                  if (!isConfirmed) {
                    pendingMutationRef.current = {
                      toolName: fc.name,
                      signature,
                      turn: currentTurn,
                      createdAt: Date.now()
                    };

                    result = {
                      requires_confirmation: true,
                      message: 'Bevestiging vereist. Vraag expliciete bevestiging en roep daarna exact dezelfde actie opnieuw aan met confirmed=true.'
                    };

                    sessionPromise.then(session => {
                      session.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { result }
                        }
                      });
                    });
                    continue;
                  }

                  if (!pending || pending.toolName !== fc.name || pending.signature !== signature || pending.turn === currentTurn) {
                    result = {
                      error: 'Geen geldige openstaande actie om te bevestigen. Vat de actie samen en vraag eerst bevestiging, voer daarna uit met confirmed=true.'
                    };

                    sessionPromise.then(session => {
                      session.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { result }
                        }
                      });
                    });
                    continue;
                  }

                  pendingMutationRef.current = null;
                }

                try {
                  // --- PROPERTIES ---
                  if (fc.name === 'createProperty') {
                    if (args.aantal_kamers === undefined || args.aantal_kamers === null) {
                      throw new Error('Aantal kamers is verplicht voor een nieuw pand.');
                    }
                    const newProp = {
                      pand_naam: args.pand_naam,
                      prijs: args.prijs,
                      stijl: args.stijl || 'Onbekend',
                      aantal_kamers: args.aantal_kamers,
                      straat: args.straat || '',
                      plaats: args.plaats || '',
                      postcode: args.postcode || '',
                      laatste_notities: 'Aangemaakt via Voice Assistent',
                      klant_naam: '',
                    };
                    const createdProperty = await onCreateProperty(newProp);
                    result = {
                      success: true,
                      message: `Property ${createdProperty?.pand_naam || args.pand_naam} created.`
                    };
                  }
                  else if (fc.name === 'updateProperty') {
                    const propMatches = findMatchesByName(currentData.properties, args.current_pand_naam, p => p.pand_naam);
                    if (propMatches.length === 1) {
                      const prop = propMatches[0];
                      const updates: any = {};
                      if (args.new_prijs) updates.prijs = args.new_prijs;
                      if (args.new_kamers) updates.aantal_kamers = args.new_kamers;
                      if (args.new_notes) updates.laatste_notities = prop.laatste_notities + "\n" + args.new_notes;
                      if (args.new_stijl) updates.stijl = args.new_stijl;

                      if (args.new_straat) updates.straat = args.new_straat;
                      if (args.new_plaats) updates.plaats = args.new_plaats;
                      if (args.new_postcode) updates.postcode = args.new_postcode;

                      onUpdateProperty(prop.id, updates);
                      result = { success: true, message: `Updated ${prop.pand_naam}` };
                    } else if (propMatches.length > 1) {
                      result = {
                        requires_disambiguation: true,
                        message: 'Meerdere panden gevonden. Vraag om een specifiekere naam of exact adres.',
                        options: propMatches.slice(0, 5).map(p => p.pand_naam)
                      };
                    } else {
                      result = { error: "Property not found" };
                    }
                  }
                  else if (fc.name === 'deleteProperty') {
                    const propMatches = findMatchesByName(currentData.properties, args.pand_naam, p => p.pand_naam);
                    if (propMatches.length === 1) {
                      const prop = propMatches[0];
                      onDeleteProperty(prop.id);
                      result = { success: true, message: `Deleted ${prop.pand_naam}` };
                    } else if (propMatches.length > 1) {
                      result = {
                        requires_disambiguation: true,
                        message: 'Meerdere panden gevonden. Vraag om een specifiekere naam of exact adres.',
                        options: propMatches.slice(0, 5).map(p => p.pand_naam)
                      };
                    } else {
                      result = { error: "Property not found" };
                    }
                  }

                  // --- CLIENTS ---
                  else if (fc.name === 'createClient') {
                    const newClient = {
                      klant_naam: args.klant_naam,
                      telefoon: args.telefoon || '',
                      email: args.email || '',
                      status: args.status || 'Zoekt',
                      notities: args.notities || 'Aangemaakt via Voice Assistent'
                    };
                    onCreateClient(newClient);
                    result = { success: true, message: `Client ${args.klant_naam} created with status ${newClient.status}.` };
                  }
                  else if (fc.name === 'updateClient') {
                    const clientMatches = findMatchesByName(currentData.clients, args.current_klant_naam, c => c.klant_naam);
                    if (clientMatches.length === 1) {
                      const client = clientMatches[0];
                      const updates: any = {};
                      if (args.new_telefoon) updates.telefoon = args.new_telefoon;
                      if (args.new_email) updates.email = args.new_email;
                      if (args.new_status) updates.status = args.new_status;
                      if (args.new_notities) updates.notities = client.notities + "\n" + args.new_notities;
                      onUpdateClient(client.id, updates);
                      result = { success: true, message: `Updated client ${client.klant_naam}` };
                    } else if (clientMatches.length > 1) {
                      result = {
                        requires_disambiguation: true,
                        message: 'Meerdere klanten gevonden. Vraag om de volledige naam.',
                        options: clientMatches.slice(0, 5).map(c => c.klant_naam)
                      };
                    } else {
                      result = { error: "Client not found" };
                    }
                  }
                  else if (fc.name === 'deleteClient') {
                    const clientMatches = findMatchesByName(currentData.clients, args.klant_naam, c => c.klant_naam);
                    if (clientMatches.length === 1) {
                      const client = clientMatches[0];
                      onDeleteClient(client.id);
                      result = { success: true, message: `Deleted client ${client.klant_naam}` };
                    } else if (clientMatches.length > 1) {
                      result = {
                        requires_disambiguation: true,
                        message: 'Meerdere klanten gevonden. Vraag om de volledige naam.',
                        options: clientMatches.slice(0, 5).map(c => c.klant_naam)
                      };
                    } else {
                      result = { error: "Client not found" };
                    }
                  }

                  // --- APPOINTMENTS ---
                  else if (fc.name === 'createAppointment') {
                    const clientMatches = args.klant_naam
                      ? findMatchesByName(currentData.clients, args.klant_naam, c => c.klant_naam)
                      : [];
                    const propertyMatches = args.pand_naam
                      ? findMatchesByName(currentData.properties, args.pand_naam, p => p.pand_naam)
                      : [];

                    if (args.klant_naam && clientMatches.length !== 1) {
                      result = clientMatches.length > 1
                        ? {
                            requires_disambiguation: true,
                            message: 'Meerdere klanten gevonden voor deze afspraak. Vraag om de volledige naam.',
                            options: clientMatches.slice(0, 5).map(c => c.klant_naam)
                          }
                        : {
                            requires_clarification: true,
                            message: 'Klant niet gevonden. Vraag om de exacte klantnaam.'
                          };
                    }

                    if (result.success !== true && (result.requires_disambiguation || result.requires_clarification || result.error)) {
                      // Keep existing result.
                    } else if (args.pand_naam && propertyMatches.length !== 1) {
                      result = propertyMatches.length > 1
                        ? {
                            requires_disambiguation: true,
                            message: 'Meerdere panden gevonden voor deze afspraak. Vraag om een specifiek adres of pand-ID.',
                            options: propertyMatches.slice(0, 5).map(p => p.pand_naam)
                          }
                        : {
                            requires_clarification: true,
                            message: 'Pand niet gevonden. Vraag om een exact adres of pand-ID.'
                          };
                    } else if (!ISO_WITH_OFFSET_RE.test(args.date_time || '')) {
                      result = {
                        error: 'Ongeldig datumformaat. Gebruik ISO 8601 met expliciete offset, bijvoorbeeld 2025-03-25T10:00:00+01:00.'
                      };
                    } else if (!BRUSSELS_OFFSET_RE.test(args.date_time || '')) {
                      result = {
                        error: 'Gebruik een Brussels offset (+01:00 of +02:00) in date_time.'
                      };
                    } else {
                      const date = new Date(args.date_time);
                      if (isNaN(date.getTime())) {
                        result = { error: 'De opgegeven datum/tijd kon niet worden verwerkt.' };
                      } else {
                        const client = args.klant_naam ? clientMatches[0] : undefined;
                        const prop = args.pand_naam ? propertyMatches[0] : undefined;

                        const newAppt = {
                          titel: args.title,
                          datum: date,
                          notities: args.notes || '',
                          klant_id: client?.id,
                          client_name: client?.klant_naam || args.klant_naam,
                          pand_id: prop?.id,
                          property_name: prop?.pand_naam || args.pand_naam,
                        };
                        onCreateAppointment(newAppt);
                        result = { success: true, message: `Appointment scheduled for ${date.toLocaleDateString()}` };
                      }
                    }
                  }

                  // --- FETCH ---
                  else if (fc.name === 'fetchDetails') {
                    const searchStr = (args.search_term || '').toLowerCase();
                    const type = args.entity_type;

                    if (type === 'Pand') {
                      const found = currentData.properties.filter(p => p.pand_naam.toLowerCase().includes(searchStr));
                      result = { count: found.length, data: found };
                    } else if (type === 'Klant') {
                      const found = currentData.clients.filter(c => c.klant_naam.toLowerCase().includes(searchStr));
                      result = { count: found.length, data: found };
                    } else {
                      const found = currentData.appointments.filter(a => a.titel?.toLowerCase().includes(searchStr));
                      result = { count: found.length, data: found };
                    }
                  }

                } catch (err: any) {
                  console.error("Tool Error", err);
                  result = { error: err.message };
                }

                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result }
                    }
                  });
                });
              }
            }
          },
          onclose: () => {
            console.log("Connection closed");
            cleanupAudio();
          },
          onerror: (err) => {
            console.error("Connection error:", err);
            setError("Connection failed.");
            cleanupAudio();
          }
        }
      });

      sessionPromise.then(sess => { sessionRef.current = sess; });

    } catch (err: any) {
      setError(err.message || "Failed to start session");
      setIsConnecting(false);
    }
  };

  const toggleSession = () => {
    if (isActive || isConnecting) cleanupAudio();
    else startSession();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm shadow-lg mb-2 flex items-center gap-2 max-w-xs animate-in slide-in-from-bottom-5">
          <X size={16} className="cursor-pointer" onClick={() => setError(null)} />
          {error}
        </div>
      )}

      <button
        onClick={toggleSession}
        className={`
          flex items-center justify-center gap-3 px-6 py-4 rounded-full shadow-xl transition-all duration-300 font-medium
          ${isActive
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse-slow'
            : isConnecting
              ? 'bg-amber-400 text-amber-900 cursor-wait'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }
        `}
      >
        {isConnecting ? (
          <>
            <div className="w-5 h-5 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
            <span>Connecting...</span>
          </>
        ) : isActive ? (
          <>
            <div className="relative flex items-center justify-center w-6 h-6">
              <span
                className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"
                style={{ animationDuration: `${1.5 - volume}s` }}
              ></span>
              <Mic className="relative z-10 w-5 h-5" />
            </div>
            <span>Listening</span>
            {volume > 0.05 && (
              <div className="flex gap-0.5 items-end h-4 ml-2">
                <div className="w-1 bg-white/80 rounded-full animate-bounce" style={{ height: `${Math.min(100, volume * 200)}%`, animationDelay: '0ms' }}></div>
                <div className="w-1 bg-white/80 rounded-full animate-bounce" style={{ height: `${Math.min(100, volume * 150)}%`, animationDelay: '100ms' }}></div>
                <div className="w-1 bg-white/80 rounded-full animate-bounce" style={{ height: `${Math.min(100, volume * 200)}%`, animationDelay: '200ms' }}></div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="p-1 bg-white/20 rounded-full">
              <Volume2 className="w-5 h-5" />
            </div>
            <span>Start Assistant</span>
          </>
        )}
      </button>
    </div>
  );
};