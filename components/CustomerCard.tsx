import React from 'react';
import { Customer } from '../types';
import { Phone, Mail, Search, User } from 'lucide-react';

interface CustomerCardProps {
  customer: Customer;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ customer }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Zoekt woning': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Verkoopt': return 'bg-green-100 text-green-700 border-green-200';
      case 'Potentieel': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
           <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <User className="w-5 h-5" />
           </div>
           <div>
            <h3 className="font-bold text-lg text-slate-900 leading-tight">{customer.name}</h3>
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <Search className="w-3 h-3" />
                {customer.preference || "Geen voorkeuren"}
            </p>
           </div>
        </div>
        <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md border ${getStatusColor(customer.status)}`}>
          {customer.status}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-2">
        <a href={customer.phone ? `tel:${customer.phone}` : '#'} className={`flex items-center justify-center gap-2 font-semibold py-2 rounded-lg transition-colors text-sm ${customer.phone ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}>
          <Phone className="w-4 h-4" /> Bellen
        </a>
        <a href={customer.email ? `mailto:${customer.email}` : '#'} className={`flex items-center justify-center gap-2 font-semibold py-2 rounded-lg transition-colors text-sm ${customer.email ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}>
          <Mail className="w-4 h-4" /> Mailen
        </a>
      </div>
      <p className="text-xs text-slate-400 text-right">
        {customer.lastContact !== 'Vandaag' ? `Laatst: ${customer.lastContact}` : 'Vandaag aangemaakt'}
      </p>
    </div>
  );
};

export default CustomerCard;