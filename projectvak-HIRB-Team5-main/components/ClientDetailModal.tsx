import React from 'react';
import { X, Users, Phone, Mail, Edit2, Trash2, FileText } from 'lucide-react';
import { Client } from '../types';

interface ClientDetailModalProps {
    client: Client;
    onClose: () => void;
    onEdit: (client: Client) => void;
    onDelete: (id: string) => void;
}

const getStatusStyle = (status: string) => {
    switch (status) {
        case 'Zoekt':
            return 'bg-blue-100 text-blue-700';
        case 'Verkoopt':
            return 'bg-orange-100 text-orange-700';
        default:
            return 'bg-purple-100 text-purple-700';
    }
};

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
    client,
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
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="h-36 bg-gradient-to-br from-primary-100 to-primary-200 relative flex items-center justify-center">
                    <Users size={48} className="text-primary-400" />
                    <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm ${getStatusStyle(client.status)}`}>
                        {client.status}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Name */}
                    <h2 className="text-2xl font-bold text-gray-900">{client.klant_naam}</h2>

                    {/* Contact info */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                <Phone size={18} className="text-primary-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Telefoon</p>
                                <p className="text-sm font-semibold text-gray-900">{client.telefoon || 'Niet ingevuld'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                <Mail size={18} className="text-primary-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">E-mail</p>
                                <p className="text-sm font-semibold text-gray-900">{client.email || 'Niet ingevuld'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {client.notities && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                <FileText size={14} />
                                Notities
                            </h3>
                            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 italic leading-relaxed">
                                "{client.notities}"
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button
                            onClick={() => onEdit(client)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                        >
                            <Edit2 size={16} />
                            Bewerken
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Weet je zeker dat je deze klant wilt verwijderen? Gekoppelde afspraken worden ook verwijderd.')) {
                                    onDelete(client.klant_id);
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
