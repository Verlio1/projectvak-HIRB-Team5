import React from 'react';
import { X, Building2, MapPin, Euro, BedDouble, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Property } from '../types';

interface PropertyDetailModalProps {
    property: Property;
    onClose: () => void;
    onEdit: (property: Property) => void;
    onDelete: (id: string) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
    property,
    onClose,
    onEdit,
    onDelete,
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm"
                >
                    <X size={18} />
                </button>

                {/* Header image placeholder */}
                <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 relative flex items-center justify-center">
                    <Building2 size={56} className="text-primary-400" />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-primary-700 uppercase tracking-wider shadow-sm">
                        {property.stijl}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Title & Price */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{property.pand_naam}</h2>
                        <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                            <MapPin size={14} />
                            <span>{property.straat}, {property.postcode} {property.plaats}</span>
                        </div>
                    </div>

                    {/* Geocode warning */}
                    {(property.latitude == null || property.longitude == null) && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                            <AlertTriangle size={16} className="flex-shrink-0" />
                            <span>Geen geldig adres – niet zichtbaar op de kaart</span>
                        </div>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-primary-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-primary-600 mb-1">
                                <Euro size={18} />
                                <span className="text-sm font-medium">Prijs</span>
                            </div>
                            <p className="text-xl font-bold text-gray-900">€{property.prijs.toLocaleString('nl-BE')}</p>
                        </div>
                        <div className="bg-primary-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-primary-600 mb-1">
                                <BedDouble size={18} />
                                <span className="text-sm font-medium">Slaapkamers</span>
                            </div>
                            <p className="text-xl font-bold text-gray-900">{property.aantal_kamers}</p>
                        </div>
                    </div>

                    {/* Notes */}
                    {property.laatste_notities && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notities</h3>
                            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 italic leading-relaxed">
                                "{property.laatste_notities}"
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button
                            onClick={() => onEdit(property)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                        >
                            <Edit2 size={16} />
                            Bewerken
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Weet je zeker dat je dit pand wilt verwijderen? Gekoppelde afspraken worden ook verwijderd.')) {
                                    onDelete(property.pand_id);
                                    onClose();
                                }
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors border border-red-200"
                        >
                            <Trash2 size={16} />
                            Verwijderen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
