import { useState, useCallback, useEffect } from 'react';
import { Appointment } from '../types';
import {
    requestGoogleToken,
    revokeGoogleToken,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} from '../utils/googleCalendar';

interface GoogleCalendarSettings {
    accessToken: string;
    tokenExpiry: number;
    calendarEmail: string;
}

// Maps afspraken_id -> google calendar event id, stored in localStorage
function getEventMapKey(userId: string) {
    return `gcal_eventmap_${userId}`;
}
function getSettingsKey(userId: string) {
    return `gcal_settings_${userId}`;
}

function loadSettings(userId: string): GoogleCalendarSettings | null {
    try {
        const raw = localStorage.getItem(getSettingsKey(userId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as GoogleCalendarSettings;
        if (Date.now() > parsed.tokenExpiry) return null; // expired
        return parsed;
    } catch {
        return null;
    }
}

function saveSettings(userId: string, settings: GoogleCalendarSettings) {
    localStorage.setItem(getSettingsKey(userId), JSON.stringify(settings));
}

function loadEventMap(userId: string): Record<string, string> {
    try {
        const raw = localStorage.getItem(getEventMapKey(userId));
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveEventMap(userId: string, map: Record<string, string>) {
    localStorage.setItem(getEventMapKey(userId), JSON.stringify(map));
}

export function useGoogleCalendar(userId: string | null) {
    const [settings, setSettings] = useState<GoogleCalendarSettings | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectError, setConnectError] = useState<string | null>(null);

    // Load persisted settings on mount / user change
    useEffect(() => {
        if (!userId) {
            setSettings(null);
            return;
        }
        setSettings(loadSettings(userId));
    }, [userId]);

    const isConnected = !!settings;
    const calendarEmail = settings?.calendarEmail ?? null;

    const connect = useCallback(async () => {
        if (!userId) return;
        setIsConnecting(true);
        setConnectError(null);
        try {
            const result = await requestGoogleToken();
            const newSettings: GoogleCalendarSettings = {
                accessToken: result.accessToken,
                tokenExpiry: result.expiry,
                calendarEmail: result.email,
            };
            saveSettings(userId, newSettings);
            setSettings(newSettings);
        } catch (e: any) {
            setConnectError(e.message || 'Verbinding mislukt.');
        } finally {
            setIsConnecting(false);
        }
    }, [userId]);

    const disconnect = useCallback(() => {
        if (!userId) return;
        if (settings?.accessToken) {
            revokeGoogleToken(settings.accessToken);
        }
        localStorage.removeItem(getSettingsKey(userId));
        setSettings(null);
    }, [userId, settings]);

    // --- Sync helpers ---

    const syncCreate = useCallback(
        async (appt: Appointment) => {
            if (!settings || !userId) return;
            // Re-check token expiry
            if (Date.now() > settings.tokenExpiry) {
                disconnect();
                return;
            }
            const googleEventId = await createCalendarEvent(settings.accessToken, appt);
            if (googleEventId) {
                const map = loadEventMap(userId);
                map[appt.afspraken_id] = googleEventId;
                saveEventMap(userId, map);
            }
        },
        [settings, userId, disconnect]
    );

    const syncUpdate = useCallback(
        async (afspraken_id: string, updatedAppt: Partial<Appointment> & { datum: Date }) => {
            if (!settings || !userId) return;
            if (Date.now() > settings.tokenExpiry) {
                disconnect();
                return;
            }
            const map = loadEventMap(userId);
            const googleEventId = map[afspraken_id];
            if (!googleEventId) return; // not synced originally
            await updateCalendarEvent(settings.accessToken, googleEventId, updatedAppt);
        },
        [settings, userId, disconnect]
    );

    const syncDelete = useCallback(
        async (afspraken_id: string) => {
            if (!settings || !userId) return;
            if (Date.now() > settings.tokenExpiry) {
                disconnect();
                return;
            }
            const map = loadEventMap(userId);
            const googleEventId = map[afspraken_id];
            if (!googleEventId) return;
            await deleteCalendarEvent(settings.accessToken, googleEventId);
            delete map[afspraken_id];
            saveEventMap(userId, map);
        },
        [settings, userId, disconnect]
    );

    const [isSyncingAll, setIsSyncingAll] = useState(false);

    const syncAll = useCallback(
        async (appointments: Appointment[]) => {
            if (!settings || !userId) return;
            if (Date.now() > settings.tokenExpiry) {
                disconnect();
                return;
            }

            setIsSyncingAll(true);
            try {
                const map = loadEventMap(userId);
                let mapChanged = false;

                for (const appt of appointments) {
                    if (!map[appt.afspraken_id]) {
                        const googleEventId = await createCalendarEvent(settings.accessToken, appt);
                        if (googleEventId) {
                            map[appt.afspraken_id] = googleEventId;
                            mapChanged = true;
                        }
                    }
                }

                if (mapChanged) {
                    saveEventMap(userId, map);
                }
            } finally {
                setIsSyncingAll(false);
            }
        },
        [settings, userId, disconnect]
    );

    return {
        isConnected,
        isConnecting,
        isSyncingAll,
        calendarEmail,
        connectError,
        connect,
        disconnect,
        syncCreate,
        syncUpdate,
        syncDelete,
        syncAll,
    };
}
