import { Appointment } from '../types';

// VITE_ vars are automatically exposed by Vite through import.meta.env
const GOOGLE_CLIENT_ID: string = (import.meta as any).env['VITE_GOOGLE_CLIENT_ID'] ?? '';
if (!GOOGLE_CLIENT_ID) console.warn('[GoogleCalendar] VITE_GOOGLE_CLIENT_ID is not set in .env.local');
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

declare global {
    interface Window {
        google: any;
    }
}

// --- Token Client ---

let tokenClient: any = null;

export function initGoogleAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
            resolve();
            return;
        }
        const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
        if (!existing) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
            document.head.appendChild(script);
        } else {
            existing.addEventListener('load', () => resolve());
        }
    });
}

export function requestGoogleToken(): Promise<{ accessToken: string; expiry: number; email: string }> {
    return new Promise(async (resolve, reject) => {
        await initGoogleAuth();

        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: async (response: any) => {
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }
                // Fetch the user's email from the tokeninfo endpoint
                try {
                    const infoRes = await fetch(
                        `https://oauth2.googleapis.com/tokeninfo?access_token=${response.access_token}`
                    );
                    const info = await infoRes.json();
                    resolve({
                        accessToken: response.access_token,
                        expiry: Date.now() + response.expires_in * 1000,
                        email: info.email || '',
                    });
                } catch {
                    resolve({
                        accessToken: response.access_token,
                        expiry: Date.now() + response.expires_in * 1000,
                        email: '',
                    });
                }
            },
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
}

export function revokeGoogleToken(token: string): void {
    if (window.google?.accounts?.oauth2) {
        window.google.accounts.oauth2.revoke(token, () => {});
    }
}

// --- Calendar Event Helpers ---

function appointmentToGoogleEvent(appt: Partial<Appointment> & { datum: Date; titel?: string }) {
    const start = appt.datum;
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1-hour default duration
    return {
        summary: appt.titel || 'Afspraak',
        description: appt.notities || '',
        start: { dateTime: start.toISOString(), timeZone: 'Europe/Brussels' },
        end: { dateTime: end.toISOString(), timeZone: 'Europe/Brussels' },
    };
}

// --- CRUD ---

export async function createCalendarEvent(
    accessToken: string,
    appt: Appointment
): Promise<string | null> {
    try {
        const res = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appointmentToGoogleEvent(appt)),
            }
        );
        if (!res.ok) {
            console.error('Google Calendar createEvent error:', await res.text());
            return null;
        }
        const data = await res.json();
        return data.id as string;
    } catch (e) {
        console.error('Google Calendar createEvent exception:', e);
        return null;
    }
}

export async function updateCalendarEvent(
    accessToken: string,
    googleEventId: string,
    appt: Partial<Appointment> & { datum: Date }
): Promise<boolean> {
    try {
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appointmentToGoogleEvent(appt as any)),
            }
        );
        if (!res.ok) {
            console.error('Google Calendar updateEvent error:', await res.text());
            return false;
        }
        return true;
    } catch (e) {
        console.error('Google Calendar updateEvent exception:', e);
        return false;
    }
}

export async function deleteCalendarEvent(
    accessToken: string,
    googleEventId: string
): Promise<boolean> {
    try {
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        if (!res.ok && res.status !== 410) {
            // 410 Gone = already deleted, that's fine
            console.error('Google Calendar deleteEvent error:', await res.text());
            return false;
        }
        return true;
    } catch (e) {
        console.error('Google Calendar deleteEvent exception:', e);
        return false;
    }
}
