import React, { useState, useEffect } from 'react';
import MicrophoneButton from './components/MicrophoneButton';
import LeadCard from './components/LeadCard';
import CustomerCard from './components/CustomerCard';
import { processAudioToData } from './services/geminiService';
import { PropertyLead, Customer, HouseStyle, HouseType, AIAnalysisResult } from './types';
import { generateId } from './utils';
import { 
  Car, 
  AlertCircle, 
  List, 
  CheckCircle2, 
  Users, 
  Mic, 
  Building2, 
  UserPlus,
  Plus,
  X
} from 'lucide-react';

type Tab = 'customers' | 'record' | 'leads';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('record');
  
  // Data State
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Recording State
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

  // Manual Modal State
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const savedLeads = localStorage.getItem('real_estate_leads');
    const savedCustomers = localStorage.getItem('real_estate_customers');
    if (savedLeads) setLeads(JSON.parse(savedLeads));
    if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('real_estate_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('real_estate_customers', JSON.stringify(customers));
  }, [customers]);

  // Voice Handler
  const handleAudioCaptured = async (audioBase64: string) => {
    setIsProcessing(true);
    setError(null);
    setAiResult(null);
    try {
      const result = await processAudioToData(audioBase64);
      setAiResult(result);

      if (result.type === 'LEAD' && result.lead) {
        const newLead: PropertyLead = {
            ...result.lead,
            id: generateId(),
            createdAt: Date.now(),
            confidenceScore: result.lead.confidenceScore || 80
        } as PropertyLead;
        setLeads(prev => [newLead, ...prev]);
      } else if (result.type === 'CUSTOMER' && result.customer) {
        const newCustomer: Customer = {
            ...result.customer,
            id: generateId(),
            createdAt: Date.now(),
            lastContact: 'Vandaag',
            phone: result.customer.phone || '',
            email: result.customer.email || '',
        } as Customer;
        setCustomers(prev => [newCustomer, ...prev]);
      } else {
        setError("Kon niet bepalen of dit een klant of lead was. Probeer opnieuw.");
      }

    } catch (err) {
      console.error(err);
      setError("Kon de audio niet verwerken. Probeer het opnieuw.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Form Handlers
  const handleCreateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newLead: PropertyLead = {
        id: generateId(),
        createdAt: Date.now(),
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        houseStyle: formData.get('houseStyle') as HouseStyle,
        houseType: formData.get('houseType') as HouseType,
        estimatedPriceRange: formData.get('price') as string,
        notes: formData.get('notes') as string,
        confidenceScore: 100
    };
    setLeads(prev => [newLead, ...prev]);
    setShowLeadModal(false);
  };

  const handleCreateCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCustomer: Customer = {
        id: generateId(),
        createdAt: Date.now(),
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        status: formData.get('status') as any,
        preference: formData.get('preference') as string,
        lastContact: 'Vandaag'
    };
    setCustomers(prev => [newCustomer, ...prev]);
    setShowCustomerModal(false);
  };

  // --- TAB: CUSTOMERS ---
  const renderCustomers = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <header className="px-6 py-6 bg-white border-b border-slate-100 sticky top-0 z-10 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Mijn Klanten</h1>
            <p className="text-slate-500 text-sm">Beheer relaties</p>
        </div>
        <button 
            onClick={() => setShowCustomerModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-transform active:scale-95">
            <UserPlus className="w-5 h-5" />
        </button>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {customers.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-center opacity-60">
                <Users className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-lg font-medium text-slate-600">Nog geen klanten.</p>
                <p className="text-sm">Klik op + of gebruik spraak.</p>
            </div>
        ) : (
            customers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
            ))
        )}
      </main>
    </div>
  );

  // --- TAB: RECORD (HOME) ---
  const renderRecord = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <header className="px-6 py-8 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold mb-2">
            <Car className="w-4 h-4" /> Drive Mode
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Spreek in</h1>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto pb-24">
        {aiResult ? (
           <div className="w-full max-w-md animate-in zoom-in-95 duration-300 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4 text-green-600 font-bold bg-green-50 px-5 py-3 rounded-full shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
                <span>{aiResult.summary}</span>
              </div>
              
              <div className="w-full pointer-events-none">
                {/* Visual feedback of what was created */}
                {aiResult.type === 'LEAD' && aiResult.lead && (
                    <LeadCard lead={{...aiResult.lead, id: 'temp', createdAt: Date.now()} as PropertyLead} />
                )}
                {aiResult.type === 'CUSTOMER' && aiResult.customer && (
                    <CustomerCard customer={{...aiResult.customer, id: 'temp', createdAt: Date.now(), lastContact: 'Nu'} as Customer} />
                )}
              </div>

              <div className="flex gap-2 w-full mt-6">
                <button 
                    onClick={() => setAiResult(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
                >
                    Nog iets inspreken
                </button>
                <button 
                    onClick={() => setActiveTab(aiResult.type === 'LEAD' ? 'leads' : 'customers')}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-xl shadow-sm transition-transform active:scale-95"
                >
                    Bekijk lijst
                </button>
              </div>
           </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-8 w-full max-w-xs mt-4">
             <div className="relative">
                <MicrophoneButton 
                    onAudioCaptured={handleAudioCaptured} 
                    isProcessing={isProcessing}
                    size="large" 
                />
             </div>
             
             <div className="text-center space-y-2">
               {!isProcessing && (
                 <p className="text-slate-400 font-medium leading-relaxed">
                   "Nieuwe lead: Huis in de Kerkstraat..." <br/>
                   of <br/>
                   "Nieuwe klant: Jan zoekt een villa..."
                 </p>
               )}
             </div>

             {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 w-full border border-red-100 animate-in slide-in-from-bottom-2">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <p className="text-sm font-medium leading-tight">{error}</p>
                </div>
             )}
          </div>
        )}
      </main>
    </div>
  );

  // --- TAB: LEADS ---
  const renderLeads = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <header className="px-6 py-6 bg-white border-b border-slate-100 sticky top-0 z-10 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
            <p className="text-slate-500 text-sm">Recent gespot</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold">
                {leads.length}
            </span>
            <button 
                onClick={() => setShowLeadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-transform active:scale-95">
                <Plus className="w-5 h-5" />
            </button>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center opacity-60">
                <Building2 className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-lg font-medium text-slate-600">Nog geen leads.</p>
                <button onClick={() => setActiveTab('record')} className="text-blue-600 font-bold mt-2 hover:underline">
                    Start met inspreken
                </button>
            </div>
        ) : (
            <div className="space-y-4">
                {leads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} />
                ))}
            </div>
        )}
      </main>
    </div>
  );

  // --- MODALS ---
  const LeadModal = () => (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-bold">Nieuwe Lead</h2>
                <button onClick={() => setShowLeadModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateLead} className="p-4 overflow-y-auto flex-1 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
                    <input required name="address" placeholder="Straat en nummer" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Stad</label>
                    <input required name="city" placeholder="Gemeente" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                        <select name="houseType" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                            {Object.values(HouseType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Stijl</label>
                        <select name="houseStyle" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                            {Object.values(HouseStyle).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prijsindicatie</label>
                    <input name="price" placeholder="bv. 300k - 400k" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notities</label>
                    <textarea required name="notes" rows={3} placeholder="Extra info..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-4">Opslaan</button>
            </form>
        </div>
      </div>
  );

  const CustomerModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
          <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">Nieuwe Klant</h2>
              <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleCreateCustomer} className="p-4 overflow-y-auto flex-1 space-y-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Naam</label>
                  <input required name="name" placeholder="Volledige naam" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefoon</label>
                    <input name="phone" type="tel" placeholder="04..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input name="email" type="email" placeholder="@" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
                </div>
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select name="status" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                      <option value="Zoekt woning">Zoekt woning</option>
                      <option value="Verkoopt">Verkoopt</option>
                      <option value="Potentieel">Potentieel</option>
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Voorkeur / Info</label>
                  <textarea required name="preference" rows={3} placeholder="Wat zoekt deze klant?" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-4">Klant Opslaan</button>
          </form>
      </div>
    </div>
);

  return (
    <div className="h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans selection:bg-blue-100 flex flex-col">
        
        {/* Modals */}
        {showLeadModal && <LeadModal />}
        {showCustomerModal && <CustomerModal />}

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'customers' && renderCustomers()}
            {activeTab === 'record' && renderRecord()}
            {activeTab === 'leads' && renderLeads()}
        </div>

        {/* Bottom Navigation Bar */}
        <nav className="bg-white border-t border-slate-200 pb-safe pt-2 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <div className="flex justify-around items-end pb-2">
                
                {/* Customers Tab */}
                <button 
                    onClick={() => setActiveTab('customers')}
                    className={`flex flex-col items-center gap-1 p-2 w-20 transition-all ${activeTab === 'customers' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Users className={`w-6 h-6 ${activeTab === 'customers' ? 'fill-current' : ''}`} />
                    <span className="text-xs font-semibold">Klanten</span>
                </button>

                {/* Record Tab (Center, Prominent) */}
                <div className="-mt-8">
                    <button 
                        onClick={() => setActiveTab('record')}
                        className={`
                            flex items-center justify-center w-16 h-16 rounded-full shadow-xl border-4 border-slate-50 transition-transform active:scale-95
                            ${activeTab === 'record' 
                                ? 'bg-blue-600 text-white shadow-blue-200' 
                                : 'bg-white text-slate-400 hover:text-blue-500'}
                        `}
                    >
                        <Mic className="w-8 h-8" />
                    </button>
                </div>

                {/* Leads Tab */}
                <button 
                    onClick={() => setActiveTab('leads')}
                    className={`flex flex-col items-center gap-1 p-2 w-20 transition-all ${activeTab === 'leads' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <List className={`w-6 h-6 ${activeTab === 'leads' ? 'stroke-[2.5px]' : ''}`} />
                    <span className="text-xs font-semibold">Leads</span>
                </button>
            </div>
        </nav>
    </div>
  );
};

export default App;