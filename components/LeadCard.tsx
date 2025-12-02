import React from 'react';
import { PropertyLead } from '../types';
import { MapPin, Home, Euro, User, StickyNote } from 'lucide-react';

interface LeadCardProps {
  lead: PropertyLead;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead }) => {
  const getStyleColor = (style: string) => {
    switch (style) {
      case 'Modern': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'Nieuwbouw': return 'bg-green-100 text-green-800 border-green-200';
      case 'Te Renoveren': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header with Address and Badges */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
            <div className="flex items-center text-slate-400 mb-1">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium uppercase tracking-wide">{lead.city || "Locatie Onbekend"}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">{lead.address}</h3>
        </div>
        <div className="flex flex-col gap-1 items-end">
             <span className={`px-2 py-1 rounded-md text-xs font-bold border ${getStyleColor(lead.houseStyle)}`}>
                {lead.houseStyle}
            </span>
             <span className="px-2 py-1 rounded-md text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                {lead.houseType}
            </span>
        </div>
      </div>

      <div className="h-px bg-slate-100 w-full my-3"></div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start">
            <Euro className="w-5 h-5 text-slate-400 mt-0.5 mr-2 shrink-0" />
            <div>
                <p className="text-xs text-slate-500 font-medium">Prijsindicatie</p>
                <p className="text-sm font-semibold text-slate-800">{lead.estimatedPriceRange}</p>
            </div>
        </div>
        
        {lead.ownerOrContact && (
            <div className="flex items-start">
                <User className="w-5 h-5 text-slate-400 mt-0.5 mr-2 shrink-0" />
                <div>
                    <p className="text-xs text-slate-500 font-medium">Contact</p>
                    <p className="text-sm font-semibold text-slate-800">{lead.ownerOrContact}</p>
                </div>
            </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div className="flex items-center mb-1">
            <StickyNote className="w-4 h-4 text-slate-400 mr-2" />
            <span className="text-xs font-medium text-slate-500">Notities</span>
        </div>
        <p className="text-sm text-slate-700 italic">"{lead.notes}"</p>
      </div>

      <div className="mt-3 flex justify-between items-center">
        <span className="text-xs text-slate-400">
            {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button className="text-sm font-semibold text-blue-600 hover:text-blue-800">
            Bewerken
        </button>
      </div>
    </div>
  );
};

export default LeadCard;
