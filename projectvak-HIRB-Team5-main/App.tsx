import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Building2, Users, Calendar, Search, Menu, Plus, MapPin, Euro, Phone, Mail, Clock, CheckCircle2, Trash2, Edit2, Database, RefreshCw, Map, AlertTriangle, Settings, X } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { Property, Client, Appointment, ViewState } from './types';
import { MobileNavBar } from './components/MobileNavBar';
import { FloatingAssistantButton } from './components/FloatingAssistantButton';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { useGoogleCalendar } from './hooks/useGoogleCalendar';
import * as db from './db';
import { inferBelgianPostcode } from './utils/geocode';
import { supabase, signInWithEmail, signOutCurrentUser, signUpWithEmail, getCurrentSession, deleteCurrentUserAccount } from './supabaseClient';
import { PropertyModal } from './components/PropertyModal';
import { ClientModal } from './components/ClientModal';
import { AppointmentModal } from './components/AppointmentModal';
import { MapView } from './components/MapView';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { ClientDetailModal } from './components/ClientDetailModal';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';
import 'leaflet/dist/leaflet.css';

function App() {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [propertySearch, setPropertySearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [appointmentSearch, setAppointmentSearch] = useState('');



  // Modal State
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- Data Loading ---
  const clearLocalData = () => {
    setProperties([]);
    setClients([]);
    setAppointments([]);
    setSelectedProperty(null);
    setSelectedClient(null);
    setSelectedAppointment(null);
  };

  const loadData = async () => {
    const props = await db.getProperties();
    const clis = await db.getClients();
    const appts = await db.getAppointments();
    setProperties(props);
    setClients(clis);
    setAppointments(appts);
  };

  useEffect(() => {
    let isMounted = true;

    const applyUnauthenticatedState = () => {
      if (!isMounted) return;
      setSession(null);
      clearLocalData();
      setActiveView('dashboard');
    };

    const loadDataSafely = async () => {
      try {
        await loadData();
      } catch (error) {
        console.error('Data loading error:', error);
        if (isMounted) {
          setAuthError('Data laden is mislukt. Vernieuw de pagina of log opnieuw in.');
        }
      }
    };

    const bootstrapAuth = async () => {
      try {
        const { data, error } = await getCurrentSession();
        if (!isMounted) return;

        if (error) {
          setAuthError(error.message);
        }

        const nextSession = data?.session ?? null;
        if (!nextSession) {
          applyUnauthenticatedState();
          return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (userError || !userData?.user) {
          await signOutCurrentUser();
          applyUnauthenticatedState();
          setAuthError('Je sessie is verlopen. Log opnieuw in.');
          return;
        }

        setSession(nextSession);
        // Never block auth UI on data fetch to avoid infinite loading loops.
        void loadDataSafely();
      } catch (error: any) {
        if (!isMounted) return;
        console.error('Auth bootstrap error:', error);
        applyUnauthenticatedState();
        setAuthError('Er is een probleem opgetreden bij het herstellen van je sessie. Log opnieuw in.');
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;

      if (!nextSession) {
        applyUnauthenticatedState();
        setAuthLoading(false);
        return;
      }

      setSession(nextSession);
      setAuthLoading(false);
      void loadDataSafely();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- Filtering ---
  const filteredProperties = properties.filter(p =>
    p.pand_naam.toLowerCase().includes(propertySearch.toLowerCase()) ||
    p.plaats.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const filteredClients = clients.filter(c =>
    c.klant_naam.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredAppointments = appointments.filter(a =>
    a.titel?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
    a.client_name?.toLowerCase().includes(appointmentSearch.toLowerCase())
  );

  // --- Handlers ---

  const handleCreateProperty = async (newProp: Omit<Property, 'pand_id' | 'created_at' | 'user_id'>) => {
    if (!newProp.pand_naam) throw new Error("De naam van het pand is verplicht.");
    if (!newProp.prijs) throw new Error("De prijs is verplicht.");
    if (!newProp.plaats) throw new Error("De plaats is verplicht.");
    if (newProp.aantal_kamers === undefined || newProp.aantal_kamers === null) {
      throw new Error("Het aantal kamers is verplicht.");
    }

    const propertyToSave = {
      ...newProp,
      postcode: (newProp.postcode || '').trim()
    };

    if (!propertyToSave.postcode) {
      const inferred = await inferBelgianPostcode(propertyToSave.plaats, propertyToSave.straat);

      if (inferred.status === 'resolved') {
        propertyToSave.postcode = inferred.postcode;
      } else if (inferred.status === 'ambiguous') {
        throw new Error(
          `Ik vind meerdere postcodes voor ${propertyToSave.plaats}: ${inferred.options.join(', ')}. Geef ook de postcode op of een specifieker adres.`
        );
      } else {
        throw new Error(
          `Ik kon geen postcode afleiden voor ${propertyToSave.plaats}. Geef de postcode expliciet op.`
        );
      }
    }

    const saved = await db.addProperty(propertyToSave);
    if (saved) {
      loadData();
      return saved;
    } else {
      throw new Error("Er is een fout opgetreden bij het toevoegen van het pand.");
    }
  };
  const handleUpdateProperty = async (id: string, updates: Partial<Property>) => {
    const saved = await db.updateProperty(id, updates);
    if (saved) {
      loadData();
      return saved;
    } else {
      throw new Error("Er is een fout opgetreden bij het bijwerken van het pand.");
    }
  };
  const handleDeleteProperty = async (id: string) => {
    // Delete linked appointments first to avoid FK constraint errors
    const linkedAppts = appointments.filter(a => a.pand_id === id);
    for (const appt of linkedAppts) {
      await db.deleteAppointment(appt.afspraken_id);
    }
    const success = await db.deleteProperty(id);
    if (success) {
      loadData();
      return true;
    } else {
      throw new Error("Fout bij het verwijderen van het pand.");
    }
  };

  const handleCreateClient = async (newClient: Omit<Client, 'klant_id' | 'created_at' | 'user_id'>) => {
    if (!newClient.klant_naam) throw new Error("De naam van de klant is verplicht.");
    if (!newClient.email) throw new Error("Het e-mailadres is verplicht.");

    const saved = await db.addClient(newClient);
    if (saved) {
      loadData();
      return saved;
    } else {
      throw new Error("Er is een fout opgetreden bij het toevoegen van de klant.");
    }
  };
  const handleUpdateClient = async (id: string, updates: Partial<Client>) => {
    const saved = await db.updateClient(id, updates);
    if (saved) {
      loadData();
      return saved;
    } else {
      throw new Error("Er is een fout opgetreden bij het bijwerken van de klant.");
    }
  };
  const handleDeleteClient = async (id: string) => {
    // Delete linked appointments first to avoid FK constraint errors
    const linkedAppts = appointments.filter(a => a.klant_id === id);
    for (const appt of linkedAppts) {
      await db.deleteAppointment(appt.afspraken_id);
    }
    const success = await db.deleteClient(id);
    if (success) {
      loadData();
      return true;
    } else {
      throw new Error("Fout bij het verwijderen van de klant.");
    }
  };

  const handleCreateAppointment = async (appt: Omit<Appointment, 'afspraken_id'>) => {
    if (!appt.titel) throw new Error("De titel van de afspraak is verplicht.");
    if (!appt.datum) throw new Error("De datum en tijd zijn verplicht.");
    if (!appt.klant_id && !appt.client_name) throw new Error("Een klant is verplicht voor een afspraak.");

    const newAppt = await db.addAppointment(appt);
    if (newAppt) {
      await googleCalendar.syncCreate(newAppt);
      loadData();
      return newAppt;
    } else {
      throw new Error("Er is een fout opgetreden bij het plannen van de afspraak.");
    }
  };

  const handleSeedData = async () => {
    if (confirm('Weet je het zeker? Dit zal ALLE huidige data in de database verwijderen en vervangen door nieuwe voorbeelddata.')) {
      await db.seedDatabase(true);
      await loadData();
    }
  };

  const handleUpdateAppointment = async (afspraken_id: string, updates: Partial<Appointment>) => {
    const saved = await db.updateAppointment(afspraken_id, updates);
    if (saved) {
      if (saved.datum) {
        await googleCalendar.syncUpdate(afspraken_id, { ...updates, datum: saved.datum });
      }
      loadData();
      return saved;
    } else {
      throw new Error("Er is een fout opgetreden bij het bijwerken van de afspraak.");
    }
  }
  const handleDeleteAppointment = async (afspraken_id: string) => {
    await googleCalendar.syncDelete(afspraken_id);
    const success = await db.deleteAppointment(afspraken_id);
    if (success) {
      loadData();
      return true;
    } else {
      throw new Error("Fout bij het verwijderen van de afspraak.");
    }
  }

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      if (!authEmail || !authPassword) {
        throw new Error('E-mail en wachtwoord zijn verplicht.');
      }

      if (authMode === 'signup') {
        if (authPassword.length < 6) {
          throw new Error('Gebruik minimaal 6 tekens voor het wachtwoord.');
        }
        if (authPassword !== authConfirmPassword) {
          throw new Error('De wachtwoorden komen niet overeen.');
        }

        const { data, error } = await signUpWithEmail(authEmail.trim(), authPassword);
        if (error) throw error;

        if (!data.session) {
          setAuthMessage('Account aangemaakt. Controleer je e-mail om je account te bevestigen.');
        } else {
          setAuthMessage('Account aangemaakt en ingelogd.');
        }
      } else {
        const { error } = await signInWithEmail(authEmail.trim(), authPassword);
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setAuthError(error.message || 'Authenticatie mislukt.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { error } = await signOutCurrentUser();
      if (error) throw error;
    } catch (error: any) {
      setAuthError(error.message || 'Uitloggen is mislukt.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    const approved = confirm('Weet je het zeker? Je account en al je data worden definitief verwijderd.');
    if (!approved) return;

    setAuthBusy(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const { error } = await deleteCurrentUserAccount();
      if (error) throw error;

      await signOutCurrentUser();
      clearLocalData();
      setSession(null);
      setActiveView('dashboard');
      setAuthMode('login');
      setAuthEmail('');
      setAuthPassword('');
      setAuthConfirmPassword('');
      setAuthMessage('Account verwijderd.');
    } catch (error: any) {
      setAuthError(error.message || 'Account verwijderen is mislukt.');
    } finally {
      setAuthBusy(false);
    }
  }

  // --- Modal Helpers ---
  const openPropertyModal = (prop?: Property) => {
    setEditingProperty(prop || null);
    setIsPropertyModalOpen(true);
  };
  const openClientModal = (client?: Client) => {
    setEditingClient(client || null);
    setIsClientModalOpen(true);
  };
  const openAppointmentModal = (appt?: Appointment) => {
    setEditingAppointment(appt || null);
    setIsAppointmentModalOpen(true);
  };

  // --- Google Calendar Sync ---
  const googleCalendar = useGoogleCalendar(session?.user?.id ?? null);

  // --- Voice Assistant Hook ---
  const voiceAssistant = useVoiceAssistant({
    properties,
    clients,
    appointments,
    onCreateProperty: handleCreateProperty,
    onUpdateProperty: handleUpdateProperty,
    onDeleteProperty: handleDeleteProperty,
    onCreateClient: handleCreateClient,
    onUpdateClient: handleUpdateClient,
    onDeleteClient: handleDeleteClient,
    onCreateAppointment: handleCreateAppointment,
    onUpdateAppointment: handleUpdateAppointment,
    onDeleteAppointment: handleDeleteAppointment
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-md text-center">
          <p className="text-gray-700 font-medium">Authenticatie laden...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl text-white mb-3">
              <Building2 size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">VDA Authenticatie</h1>
            <p className="text-sm text-gray-500 mt-1">Log in of maak een account aan om je eigen database te beheren.</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
                setAuthMessage(null);
              }}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${authMode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            >
              Inloggen
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setAuthError(null);
                setAuthMessage(null);
              }}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${authMode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            >
              Account maken
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 font-medium">E-mail</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="naam@voorbeeld.nl"
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 font-medium">Wachtwoord</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Minimaal 6 tekens"
              />
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="text-sm text-gray-700 font-medium">Bevestig wachtwoord</label>
                <input
                  type="password"
                  required
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {authError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {authError}
              </div>
            )}

            {authMessage && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {authMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="w-full bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {authBusy ? 'Bezig...' : authMode === 'signup' ? 'Account aanmaken' : 'Inloggen'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Views ---

  const Dashboard = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const propsThisWeek = properties.filter(p => p.created_at >= oneWeekAgo).length;
    const clientsThisWeek = clients.filter(c => c.created_at >= oneWeekAgo).length;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <button
            onClick={handleSeedData}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={14} />
            Reset & Vul met Testdata
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Totaal Panden</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{properties.length}</h3>
              </div>
              <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                <Building2 size={20} />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-4 flex items-center font-medium">
              <span className="bg-green-100 px-1.5 py-0.5 rounded mr-2">+{propsThisWeek}</span> deze week
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Actieve Klanten</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{clients.length}</h3>
              </div>
              <div className="p-2 bg-secondary-50 rounded-lg text-secondary-600">
                <Users size={20} />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-4 flex items-center font-medium">
              <span className="bg-green-100 px-1.5 py-0.5 rounded mr-2">+{clientsThisWeek}</span> deze week
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Afspraken</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{appointments.length}</h3>
              </div>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Calendar size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">Binnenkort: {appointments[0]?.titel || 'Geen'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Recente Panden</h3>
              <button onClick={() => setActiveView('properties')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">Alles bekijken</button>
            </div>
            <div className="divide-y divide-gray-50">
              {properties.slice(0, 3).map(prop => (
                <div key={prop.pand_id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400">
                    <Building2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{prop.pand_naam}</p>
                    <p className="text-sm text-gray-500 truncate">{prop.plaats}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">€{prop.prijs.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Eerstvolgende Afspraken</h3>
              <button onClick={() => setActiveView('appointments')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">Kalender</button>
            </div>
            <div className="divide-y divide-gray-50">
              {appointments.slice(0, 3).map(appt => (
                <div key={appt.afspraken_id} className="p-4 flex gap-4">
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-indigo-50 rounded-lg text-indigo-700">
                    <span className="text-xs font-bold uppercase">{appt.datum.toLocaleString('nl-BE', { month: 'short' })}</span>
                    <span className="text-lg font-bold">{appt.datum.getDate()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{appt.titel}</p>
                    <p className="text-sm text-gray-500">{appt.datum.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              {appointments.length === 0 && <div className="p-6 text-center text-gray-400 text-sm">Geen afspraken gepland.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PropertiesView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Panden Overzicht</h2>
        <button
          onClick={() => openPropertyModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary-700"
        >
          <Plus size={16} /> Nieuw Pand
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProperties.map(prop => (
          <div
            key={prop.pand_id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
            onClick={() => setSelectedProperty(prop)}
          >
            <div className="h-48 bg-gray-200 relative">
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {prop.stijl}
              </div>
              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                <Building2 size={48} />
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg text-gray-900 mb-1">{prop.pand_naam}</h3>
              <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-2">
                <MapPin size={14} />
                {prop.straat}, {prop.plaats}
              </div>

              {(prop.latitude == null || prop.longitude == null) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-4">
                  <AlertTriangle size={13} className="flex-shrink-0" />
                  <span>Geen geldig adres – niet zichtbaar op de kaart</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-1.5 text-primary-700 font-bold">
                  <Euro size={16} />
                  {prop.prijs.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  {prop.aantal_kamers} Slaapkamers
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ClientsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Klantenbestand</h2>
        <button
          onClick={() => openClientModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary-700"
        >
          <Plus size={16} /> Nieuwe Klant
        </button>
      </div>

      {/* Desktop view */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 font-medium">
            <tr>
              <th className="px-6 py-4">Naam</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Notities</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredClients.map(client => (
              <tr
                key={client.klant_id}
                className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                onClick={() => setSelectedClient(client)}
              >
                <td className="px-6 py-4 font-medium text-gray-900">{client.klant_naam}</td>
                <td className="px-6 py-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" /> {client.telefoon}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" /> {client.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${client.status === 'Zoekt' ? 'bg-blue-100 text-blue-700' :
                    client.status === 'Verkoopt' ? 'bg-orange-100 text-orange-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                    {client.status}
                  </span>
                </td>
                <td className="px-6 py-4 max-w-xs truncate text-gray-400">
                  {client.notities}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {filteredClients.map(client => (
          <div
            key={client.klant_id}
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
            onClick={() => setSelectedClient(client)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{client.klant_naam}</h3>
                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mt-1 ${client.status === 'Zoekt' ? 'bg-blue-100 text-blue-700' :
                  client.status === 'Verkoopt' ? 'bg-orange-100 text-orange-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                  {client.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600 font-medium">
                <Phone size={14} className="text-gray-400" />
                {client.telefoon || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-gray-600 truncate font-medium">
                <Mail size={14} className="text-gray-400" />
                {client.email || 'N/A'}
              </div>
            </div>

            {client.notities && (
              <div className="bg-gray-50 p-2 rounded text-xs text-gray-500 italic">
                {client.notities}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const AppointmentsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Mijn Agenda</h2>
        <button
          onClick={() => openAppointmentModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary-700"
        >
          <Plus size={16} /> Nieuwe Afspraak
        </button>
      </div>

      <div className="space-y-4">
        {filteredAppointments.map(appt => (
          <div
            key={appt.afspraken_id}
            className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-start cursor-pointer active:scale-[0.99]"
            onClick={() => setSelectedAppointment(appt)}
          >
            {/* Date Card */}
            <div className="flex-shrink-0 flex flex-row md:flex-col items-center justify-center gap-2 md:gap-0 bg-primary-50 text-primary-700 rounded-lg p-3 w-full md:w-20">
              <span className="text-sm font-bold uppercase tracking-wider">{appt.datum.toLocaleString('nl-BE', { month: 'short' })}</span>
              <span className="text-2xl font-bold">{appt.datum.getDate()}</span>
              <span className="text-xs opacity-75">{appt.datum.toLocaleString('nl-BE', { weekday: 'short' })}</span>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{appt.titel}</h3>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                    <Clock size={14} />
                    <span>{appt.datum.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} /> Bevestigd
                </span>
              </div>

              <div className="flex flex-wrap gap-3 mt-2">
                {appt.client_name && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-md text-sm text-gray-700 border border-gray-100">
                    <Users size={14} className="text-gray-400" />
                    {appt.client_name}
                  </div>
                )}
                {appt.property_name && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-md text-sm text-gray-700 border border-gray-100">
                    <Building2 size={14} className="text-gray-400" />
                    {appt.property_name}
                  </div>
                )}
              </div>

              {appt.notities && (
                <p className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">
                  "{appt.notities}"
                </p>
              )}
            </div>
          </div>
        ))}
        {appointments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
            <Calendar className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Geen afspraken</h3>
            <p className="mt-1 text-sm text-gray-500">Gebruik de voice assistent om een afspraak te plannen.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-10 hidden md:block">
        <div className="p-6">
          <div className="flex items-center gap-3 text-primary-600 font-bold text-xl">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
              <Building2 size={20} />
            </div>
            VDA
          </div>
        </div>

        <nav className="px-3 py-4 space-y-1">
          <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'dashboard' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveView('properties')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'properties' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Building2 size={20} /> Panden
          </button>
          <button onClick={() => setActiveView('clients')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'clients' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Users size={20} /> Klanten
          </button>
          <button onClick={() => setActiveView('appointments')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'appointments' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Calendar size={20} /> Afspraken
          </button>
          <button onClick={() => setActiveView('map')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'map' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Map size={20} /> Kaart
          </button>
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{session.user.email}</p>
                <p className="text-xs text-gray-500">Ingelogd</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={authBusy}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Uitloggen
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={authBusy}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Account verwijderen
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen">
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20 flex justify-between items-center">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
              <Building2 size={18} />
            </div>
            <span className="font-bold text-lg text-gray-900">VDA</span>
          </div>
          {activeView !== 'dashboard' ? (
            <div className="flex flex-1 md:flex-none items-center bg-gray-100 rounded-lg px-3 py-1.5 md:py-2 mx-2 md:mx-0 md:w-96">
              <Search size={18} className="text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder={
                  activeView === 'properties' ? 'Zoek panden...' :
                    activeView === 'clients' ? 'Zoek klanten...' :
                      activeView === 'appointments' ? 'Zoek afspraken...' :
                        'Zoek...'
                }
                className="bg-transparent border-none focus:outline-none text-sm w-full"
                value={
                  activeView === 'properties' ? propertySearch :
                    activeView === 'clients' ? clientSearch :
                      activeView === 'appointments' ? appointmentSearch :
                        ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeView === 'properties') setPropertySearch(val);
                  else if (activeView === 'clients') setClientSearch(val);
                  else if (activeView === 'appointments') setAppointmentSearch(val);
                }}
              />
            </div>
          ) : (
            <div className="flex-1 md:block"></div>
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              disabled={authBusy}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 md:hidden"
            >
              Uitloggen
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={authBusy}
              className="text-sm font-medium text-red-700 hover:text-red-800 md:hidden"
            >
              Verwijder account
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`relative p-2 rounded-lg transition-colors ${
                googleCalendar.isConnected
                  ? 'text-green-600 bg-green-50 hover:bg-green-100'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              title="Google Agenda Instellingen"
            >
              <Settings size={20} />
              {googleCalendar.isConnected && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
              )}
            </button>
          </div>
        </header>

        <div className="p-6 pb-32 max-w-7xl mx-auto">
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'properties' && <PropertiesView />}
          {activeView === 'clients' && <ClientsView />}
          {activeView === 'appointments' && <AppointmentsView />}
          {activeView === 'map' && <MapView properties={properties} />}
        </div>
      </main>

      {/* New UI Components */}
      <MobileNavBar
        activeView={activeView}
        onViewChange={setActiveView}
        voiceState={voiceAssistant}
      />

      <FloatingAssistantButton
        {...voiceAssistant}
        onClearError={() => voiceAssistant.setError(null)}
      />

      {/* Modals */}
      {isPropertyModalOpen && (
        <PropertyModal
          isOpen={isPropertyModalOpen}
          onClose={() => setIsPropertyModalOpen(false)}
          onSubmit={async (data) => {
            if (editingProperty) {
              await handleUpdateProperty(editingProperty.pand_id, data);
            } else {
              await handleCreateProperty(data);
            }
          }}
          initialData={editingProperty}
        />
      )}

      {isClientModalOpen && (
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onSubmit={async (data) => {
            if (editingClient) {
              await handleUpdateClient(editingClient.klant_id, data);
            } else {
              await handleCreateClient(data);
            }
          }}
          initialData={editingClient}
        />
      )}

      {isAppointmentModalOpen && (
        <AppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => setIsAppointmentModalOpen(false)}
          onSubmit={async (data) => {
            if (editingAppointment) {
              await handleUpdateAppointment(editingAppointment.afspraken_id, data);
            } else {
              await handleCreateAppointment(data);
            }
          }}
          initialData={editingAppointment}
          properties={properties}
          clients={clients}
        />
      )}

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onEdit={(prop) => {
            setSelectedProperty(null);
            openPropertyModal(prop);
          }}
          onDelete={async (id) => {
            await handleDeleteProperty(id);
            setSelectedProperty(null);
          }}
        />
      )}

      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={(client) => {
            setSelectedClient(null);
            openClientModal(client);
          }}
          onDelete={async (id) => {
            await handleDeleteClient(id);
            setSelectedClient(null);
          }}
        />
      )}

      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onEdit={(appt) => {
            setSelectedAppointment(null);
            openAppointmentModal(appt);
          }}
          onDelete={async (id) => {
            await handleDeleteAppointment(id);
            setSelectedAppointment(null);
          }}
        />
      )}
      {/* Google Calendar Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.75 12.27c0-.69-.06-1.35-.17-1.98H12v3.74h5.49a4.69 4.69 0 01-2.03 3.08v2.56h3.27c1.91-1.76 3.02-4.35 3.02-7.4z" fill="#4285F4"/>
                    <path d="M12 22c2.73 0 5.02-.9 6.69-2.44l-3.27-2.56c-.91.61-2.07.97-3.42.97-2.63 0-4.86-1.78-5.66-4.17H3.02v2.63A10 10 0 0012 22z" fill="#34A853"/>
                    <path d="M6.34 13.8a5.99 5.99 0 010-3.6V7.57H3.02a10 10 0 000 8.86l3.32-2.63z" fill="#FBBC05"/>
                    <path d="M12 6.58c1.48 0 2.81.51 3.86 1.5l2.89-2.89A10 10 0 003.02 7.57l3.32 2.63C7.14 8.36 9.37 6.58 12 6.58z" fill="#EA4335"/>
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Google Agenda Sync</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {googleCalendar.isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={18} className="text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-green-800">Verbonden</p>
                    <p className="text-xs text-green-600 truncate">{googleCalendar.calendarEmail}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Afspraken worden automatisch gesynchroniseerd naar de Google Agenda van dit account.
                </p>
                <button
                  onClick={() => { googleCalendar.disconnect(); }}
                  className="w-full py-2.5 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  Verbinding verbreken
                </button>
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={() => googleCalendar.syncAll(appointments)}
                    disabled={googleCalendar.isSyncingAll}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {googleCalendar.isSyncingAll ? (
                      <><div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> Bezig met synchroniseren...</>
                    ) : (
                      <><RefreshCw size={16} /> Bestaande afspraken synchroniseren</>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center text-balance">
                    Dit zal alle huidige afspraken (die nog niet gesynchroniseerd zijn) toevoegen aan je Google Agenda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Verbind een Google-account om je afspraken automatisch te synchroniseren naar Google Agenda. Dit account mag afwijken van je inlogaccount.
                </p>
                {googleCalendar.connectError && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    {googleCalendar.connectError}
                  </div>
                )}
                <button
                  onClick={() => googleCalendar.connect()}
                  disabled={googleCalendar.isConnecting}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {googleCalendar.isConnecting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verbinden...</>
                  ) : (
                    <>Verbinden met Google Agenda</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;