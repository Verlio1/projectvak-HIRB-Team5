import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';
import { AssistantProps, Appointment, Property, Client } from '../types';
import { formatPhoneNumber } from '../utils/phoneUtils';
import {
    createPropertyTool, updatePropertyTool, deletePropertyTool,
    createClientTool, updateClientTool, deleteClientTool,
    createAppointmentTool, updateAppointmentTool, deleteAppointmentTool,
    fetchDetailsTool, getSystemInstruction
} from '../utils/voiceTools';

const MAX_TRANSCRIPT_LINES = 8;

function mergeTranscriptChunks(current: string, incoming: string): string {
    const base = current.trim();
    const chunk = incoming.trim();

    if (!chunk) return base;
    if (!base) return chunk;

    // Some streams resend a cumulative sentence each update.
    if (chunk.startsWith(base)) return chunk;
    if (base.endsWith(chunk)) return base;

    // Merge incremental chunks with maximal suffix/prefix overlap.
    const maxOverlap = Math.min(base.length, chunk.length);
    for (let overlap = maxOverlap; overlap > 0; overlap--) {
        if (base.slice(-overlap) === chunk.slice(0, overlap)) {
            return `${base}${chunk.slice(overlap)}`.trim();
        }
    }

    return `${base} ${chunk}`.trim();
}

type MatchMode = 'single' | 'multiple' | 'none' | 'all';

type MatchResolution<T> = {
    mode: MatchMode;
    matches: T[];
};

function normalizeEntityName(value: string): string {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const dp: number[] = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) dp[j] = j;

    for (let i = 1; i <= a.length; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const temp = dp[j];
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[j] = Math.min(
                dp[j] + 1,
                dp[j - 1] + 1,
                prev + cost
            );
            prev = temp;
        }
    }

    return dp[b.length];
}

function similarityScore(a: string, b: string): number {
    if (!a || !b) return 0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;

    const distance = levenshteinDistance(a, b);
    const distanceScore = 1 - distance / maxLen;
    const includesBoost = a.includes(b) || b.includes(a) ? 0.12 : 0;
    const prefixBoost = a.startsWith(b) || b.startsWith(a) ? 0.08 : 0;

    return Math.min(1, distanceScore + includesBoost + prefixBoost);
}

function resolveEntityMatches<T>(
    items: T[],
    query: string | undefined,
    selector: (item: T) => string
): MatchResolution<T> {
    if (!query || !query.trim()) {
        return { mode: 'all', matches: items };
    }

    const normalizedQuery = normalizeEntityName(query);
    if (!normalizedQuery) {
        return { mode: 'none', matches: [] };
    }

    const scored = items
        .map(item => {
            const rawName = selector(item) || '';
            const normalizedName = normalizeEntityName(rawName);
            const score = similarityScore(normalizedName, normalizedQuery);
            const isExact = normalizedName === normalizedQuery;
            const isDirect = normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName);

            return { item, score, isExact, isDirect };
        })
        .filter(entry => !!selector(entry.item));

    const exactMatches = scored.filter(entry => entry.isExact);
    if (exactMatches.length === 1) {
        return { mode: 'single', matches: [exactMatches[0].item] };
    }
    if (exactMatches.length > 1) {
        return { mode: 'multiple', matches: exactMatches.map(entry => entry.item) };
    }

    const directMatches = scored.filter(entry => entry.isDirect);
    if (directMatches.length === 1) {
        return { mode: 'single', matches: [directMatches[0].item] };
    }
    if (directMatches.length > 1) {
        return { mode: 'multiple', matches: directMatches.map(entry => entry.item) };
    }

    const fuzzy = scored
        .filter(entry => entry.score >= 0.72)
        .sort((a, b) => b.score - a.score);

    if (fuzzy.length === 0) {
        return { mode: 'none', matches: [] };
    }

    if (fuzzy.length === 1) {
        return { mode: 'single', matches: [fuzzy[0].item] };
    }

    const top = fuzzy[0];
    const second = fuzzy[1];
    if (top.score >= 0.86 && top.score - second.score >= 0.08) {
        return { mode: 'single', matches: [top.item] };
    }

    return { mode: 'multiple', matches: fuzzy.slice(0, 5).map(entry => entry.item) };
}

export function useVoiceAssistant({
    properties,
    clients,
    appointments,
    onCreateProperty,
    onUpdateProperty,
    onDeleteProperty,
    onCreateClient,
    onUpdateClient,
    onDeleteClient,
    onCreateAppointment,
    onUpdateAppointment,
    onDeleteAppointment
}: AssistantProps) {
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [volume, setVolume] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
    const [liveTranscript, setLiveTranscript] = useState('');

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
    const transcriptBufferRef = useRef('');
    const lastTranscriptChunkRef = useRef('');

    // Data refs for access in callbacks
    const dataRef = useRef<{ properties: Property[]; clients: Client[]; appointments: Appointment[] }>({ properties, clients, appointments });
    dataRef.current = { properties, clients, appointments };

    const resetTranscript = useCallback(() => {
        transcriptBufferRef.current = '';
        lastTranscriptChunkRef.current = '';
        setLiveTranscript('');
        setTranscriptHistory([]);
    }, []);

    const pushTranscriptLine = useCallback((line: string) => {
        const normalizedLine = line.trim();
        if (!normalizedLine) return;

        setTranscriptHistory(prev => {
            if (prev[prev.length - 1] === normalizedLine) {
                return prev;
            }

            const next = [...prev, normalizedLine];
            return next.slice(-MAX_TRANSCRIPT_LINES);
        });
    }, []);

    const finalizeTranscriptLine = useCallback(() => {
        if (!transcriptBufferRef.current.trim()) return;

        pushTranscriptLine(transcriptBufferRef.current);
        transcriptBufferRef.current = '';
        lastTranscriptChunkRef.current = '';
        setLiveTranscript('');
    }, [pushTranscriptLine]);

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
    }, []);

    const startSession = async () => {
        try {
            setError(null);
            setIsConnecting(true);
            resetTranscript();

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            const outputCtx = new AudioContextClass({ sampleRate: 24000 });

            inputContextRef.current = inputCtx;
            outputContextRef.current = outputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Use VITE_ prefix for env vars in Vite, falling back to process.env if needed
            const apiKey = (import.meta as any).env?.VITE_API_KEY || (process as any).env?.API_KEY;

            if (!apiKey) {
                throw new Error("API Key not found. Please set VITE_API_KEY.");
            }

            const ai = new GoogleGenAI({ apiKey });

            const config = {
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    // Keep audio-only modality for this native-audio model to avoid unstable sessions.
                    responseModalities: [Modality.AUDIO],
                    // Explicitly request transcription for assistant-spoken audio output.
                    outputAudioTranscription: {},
                    systemInstruction: getSystemInstruction(),
                    tools: [
                        { functionDeclarations: [createPropertyTool, updatePropertyTool, deletePropertyTool] },
                        { functionDeclarations: [createClientTool, updateClientTool, deleteClientTool] },
                        { functionDeclarations: [createAppointmentTool, updateAppointmentTool, deleteAppointmentTool, fetchDetailsTool] },
                    ],
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
                                    return;
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
                        const outputTranscription = (serverContent as any)?.outputTranscription;
                        const textChunk = (outputTranscription?.text || '').trim();

                        if (textChunk && textChunk !== lastTranscriptChunkRef.current) {
                            const mergedTranscript = mergeTranscriptChunks(transcriptBufferRef.current, textChunk);
                            transcriptBufferRef.current = mergedTranscript;
                            lastTranscriptChunkRef.current = textChunk;
                            setLiveTranscript(mergedTranscript);
                        }

                        if (outputTranscription?.finished) {
                            finalizeTranscriptLine();
                        }

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
                            finalizeTranscriptLine();
                        }

                        const turnComplete = Boolean((serverContent as any)?.turnComplete || (serverContent as any)?.modelTurn?.turnComplete);
                        if (turnComplete) {
                            finalizeTranscriptLine();
                        }

                        if (toolCall) {
                            for (const fc of toolCall.functionCalls) {
                                let result: any = { status: 'ok' };
                                const args = fc.args as any;
                                const currentData = dataRef.current;

                                try {
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
                                            laatste_notities: args.notities || 'Aangemaakt via Voice Assistent',
                                        };
                                        await onCreateProperty(newProp);
                                        result = { success: true, message: `Property ${args.pand_naam} created.` };
                                    }
                                    else if (fc.name === 'updateProperty') {
                                        const propResolution = resolveEntityMatches<Property>(currentData.properties, args.current_pand_naam, p => p.pand_naam);
                                        if (propResolution.mode === 'single') {
                                            const prop = propResolution.matches[0];
                                            const updates: any = {};
                                            if (args.new_pand_naam) updates.pand_naam = args.new_pand_naam;
                                            if (args.new_prijs) updates.prijs = args.new_prijs;
                                            if (args.new_kamers) updates.aantal_kamers = args.new_kamers;
                                            if (args.new_notes) updates.laatste_notities = args.new_notes;
                                            if (args.new_stijl) updates.stijl = args.new_stijl;
                                            if (args.new_straat) updates.straat = args.new_straat;
                                            if (args.new_plaats) updates.plaats = args.new_plaats;
                                            if (args.new_postcode) updates.postcode = args.new_postcode;

                                            if (Object.keys(updates).length === 0) {
                                                result = { error: "Geen wijzigingen opgegeven om bij te werken." };
                                            } else {
                                                await onUpdateProperty(prop.pand_id, updates);
                                                result = { success: true, message: `Updated ${prop.pand_naam}` };
                                            }
                                        } else if (propResolution.mode === 'multiple') {
                                            result = {
                                                requires_disambiguation: true,
                                                message: 'Meerdere panden lijken op deze naam. Geef een specifieker pand op.',
                                                options: propResolution.matches.map(p => p.pand_naam)
                                            };
                                        } else {
                                            result = { error: "Property not found" };
                                        }
                                    }
                                    else if (fc.name === 'deleteProperty') {
                                        const propResolution = resolveEntityMatches<Property>(currentData.properties, args.pand_naam, p => p.pand_naam);
                                        if (propResolution.mode === 'single') {
                                            const prop = propResolution.matches[0];
                                            await onDeleteProperty(prop.pand_id);
                                            result = { success: true, message: `Deleted ${prop.pand_naam}` };
                                        } else if (propResolution.mode === 'multiple') {
                                            result = {
                                                requires_disambiguation: true,
                                                message: 'Meerdere panden lijken op deze naam. Geef een specifieker pand op.',
                                                options: propResolution.matches.map(p => p.pand_naam)
                                            };
                                        } else {
                                            result = { error: "Property not found" };
                                        }
                                    }
                                    else if (fc.name === 'createClient') {
                                        const newClient = {
                                            klant_naam: args.klant_naam,
                                            telefoon: formatPhoneNumber(args.telefoon || ''),
                                            email: args.email || '',
                                            status: args.status || 'Zoekt',
                                            notities: args.notities || 'Aangemaakt via Voice Assistent'
                                        };
                                        await onCreateClient(newClient);
                                        result = { success: true, message: `Client ${args.klant_naam} created.` };
                                    }
                                    else if (fc.name === 'updateClient') {
                                        const clientResolution = resolveEntityMatches<Client>(currentData.clients, args.current_klant_naam, c => c.klant_naam);
                                        if (clientResolution.mode === 'single') {
                                            const client = clientResolution.matches[0];
                                            const updates: any = {};
                                            if (args.new_klant_naam) updates.klant_naam = args.new_klant_naam;
                                            if (args.new_telefoon) updates.telefoon = formatPhoneNumber(args.new_telefoon);
                                            if (args.new_email) updates.email = args.new_email;
                                            if (args.new_status) updates.status = args.new_status;
                                            if (args.new_notities) updates.notities = args.new_notities;

                                            if (Object.keys(updates).length === 0) {
                                                result = { error: "Geen wijzigingen opgegeven om bij te werken." };
                                            } else {
                                                await onUpdateClient(client.klant_id, updates);
                                                result = { success: true, message: `Updated client ${client.klant_naam}` };
                                            }
                                        } else if (clientResolution.mode === 'multiple') {
                                            result = {
                                                requires_disambiguation: true,
                                                message: 'Meerdere klanten lijken op deze naam. Geef de volledige klantnaam.',
                                                options: clientResolution.matches.map(c => c.klant_naam)
                                            };
                                        } else {
                                            result = { error: "Client not found" };
                                        }
                                    }
                                    else if (fc.name === 'deleteClient') {
                                        const clientResolution = resolveEntityMatches<Client>(currentData.clients, args.klant_naam, c => c.klant_naam);
                                        if (clientResolution.mode === 'single') {
                                            const client = clientResolution.matches[0];
                                            await onDeleteClient(client.klant_id);
                                            result = { success: true, message: `Deleted client ${client.klant_naam}` };
                                        } else if (clientResolution.mode === 'multiple') {
                                            result = {
                                                requires_disambiguation: true,
                                                message: 'Meerdere klanten lijken op deze naam. Geef de volledige klantnaam.',
                                                options: clientResolution.matches.map(c => c.klant_naam)
                                            };
                                        } else {
                                            result = { error: "Client not found" };
                                        }
                                    }
                                    else if (fc.name === 'createAppointment') {
                                        let cliente: Client | undefined;
                                        if (args.klant_naam) {
                                            const clientResolution = resolveEntityMatches<Client>(currentData.clients, args.klant_naam, c => c.klant_naam);
                                            if (clientResolution.mode === 'single') {
                                                cliente = clientResolution.matches[0];
                                            } else if (clientResolution.mode === 'multiple') {
                                                throw new Error(`Ik vond meerdere klanten die lijken op "${args.klant_naam}". Geef de volledige naam.`);
                                            } else {
                                                throw new Error(`Ik kon geen klant vinden met de naam "${args.klant_naam}". Maak de klant eerst aan of controleer de naam.`);
                                            }
                                        }

                                        let property: Property | undefined;
                                        if (args.pand_naam) {
                                            const propertyResolution = resolveEntityMatches<Property>(currentData.properties, args.pand_naam, p => p.pand_naam);
                                            if (propertyResolution.mode === 'single') {
                                                property = propertyResolution.matches[0];
                                            } else if (propertyResolution.mode === 'multiple') {
                                                throw new Error(`Ik vond meerdere panden die lijken op "${args.pand_naam}". Geef een specifieker pand of adres.`);
                                            } else {
                                                throw new Error(`Ik kon geen pand vinden met de naam "${args.pand_naam}".`);
                                            }
                                        }

                                        let date = new Date(args.date_time);
                                        if (isNaN(date.getTime())) {
                                            date = new Date();
                                        }

                                        const newAppt: Omit<Appointment, 'afspraken_id'> = {
                                            titel: args.title,
                                            datum: date,
                                            notities: args.notes || '',
                                            klant_id: cliente?.klant_id,
                                            client_name: cliente?.klant_naam || '',
                                            pand_id: property?.pand_id,
                                            property_name: property?.pand_naam || '',
                                        };
                                        await onCreateAppointment(newAppt);
                                        result = { success: true, message: `Appointment scheduled for ${date.toLocaleDateString()}` };
                                    }
                                    else if (fc.name === 'updateAppointment') {
                                        const appointmentResolution = resolveEntityMatches<Appointment>(currentData.appointments, args.current_title, a => a.titel || '');
                                        if (appointmentResolution.mode === 'single') {
                                            const appt = appointmentResolution.matches[0];
                                            const updates: any = {};
                                            if (args.new_title) updates.titel = args.new_title;
                                            if (args.new_date_time) updates.datum = new Date(args.new_date_time);
                                            if (args.new_notes) updates.notities = args.new_notes;

                                            if (args.new_klant_naam) {
                                                const clientResolution = resolveEntityMatches<Client>(currentData.clients, args.new_klant_naam, c => c.klant_naam);
                                                if (clientResolution.mode === 'single') {
                                                    updates.klant_id = clientResolution.matches[0].klant_id;
                                                }
                                            }

                                            if (args.new_pand_naam) {
                                                const propertyResolution = resolveEntityMatches<Property>(currentData.properties, args.new_pand_naam, p => p.pand_naam);
                                                if (propertyResolution.mode === 'single') {
                                                    updates.pand_id = propertyResolution.matches[0].pand_id;
                                                }
                                            }

                                            if (Object.keys(updates).length === 0) {
                                                result = { error: "Geen wijzigingen opgegeven." };
                                            } else {
                                                await onUpdateAppointment(appt.afspraken_id, updates);
                                                result = { success: true, message: `Appointment "${appt.titel}" updated.` };
                                            }
                                        } else if (appointmentResolution.mode === 'multiple') {
                                            result = {
                                                requires_disambiguation: true,
                                                message: 'Meerdere afspraken lijken op deze titel. Geef een specifiekere titel.',
                                                options: appointmentResolution.matches.map(a => a.titel).filter(Boolean)
                                            };
                                        } else {
                                            result = { error: "Appointment not found." };
                                        }
                                    }
                                    else if (fc.name === 'deleteAppointment') {
                                        const appointmentResolution = resolveEntityMatches<Appointment>(currentData.appointments, args.title, a => a.titel || '');
                                        if (appointmentResolution.mode === 'single') {
                                            const appt = appointmentResolution.matches[0];
                                            await onDeleteAppointment(appt.afspraken_id);
                                            result = { success: true, message: `Appointment "${appt.titel}" deleted.` };
                                        } else if (appointmentResolution.mode === 'multiple') {
                                            result = {
                                                requires_disambiguation: true,
                                                message: 'Meerdere afspraken lijken op deze titel. Geef een specifiekere titel.',
                                                options: appointmentResolution.matches.map(a => a.titel).filter(Boolean)
                                            };
                                        } else {
                                            result = { error: "Appointment not found." };
                                        }
                                    }
                                    else if (fc.name === 'fetchDetails') {
                                        const type = args.entity_type;

                                        if (type === 'Pand') {
                                            const resolution = resolveEntityMatches<Property>(currentData.properties, args.search_term, p => p.pand_naam);
                                            const found = resolution.mode === 'all' ? currentData.properties : resolution.matches;
                                            result = { count: found.length, data: found };
                                        } else if (type === 'Klant') {
                                            const resolution = resolveEntityMatches<Client>(currentData.clients, args.search_term, c => c.klant_naam);
                                            const found = resolution.mode === 'all' ? currentData.clients : resolution.matches;
                                            result = { count: found.length, data: found };
                                        } else {
                                            const resolution = resolveEntityMatches<Appointment>(currentData.appointments, args.search_term, a => a.titel || '');
                                            const found = resolution.mode === 'all' ? currentData.appointments : resolution.matches;
                                            result = { count: found.length, data: found };
                                        }
                                    }
                                } catch (err: any) {
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
                        cleanupAudio();
                    },
                    onerror: (err) => {
                        const errMessage = (err as any)?.message || "Connection failed.";
                        setError(errMessage);
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

    useEffect(() => {
        return () => cleanupAudio();
    }, [cleanupAudio]);

    return {
        isActive,
        isConnecting,
        volume,
        error,
        transcriptHistory,
        liveTranscript,
        toggleSession,
        setError
    };
}
