import React from 'react';
import { X, Calendar, Clock, Users, Building2, Edit2, Trash2, CheckCircle2, FileText } from 'lucide-react';
import { Appointment } from '../types';

interface AppointmentDetailModalProps {
    appointment: Appointment;
    onClose: () => void;
    onEdit: (appointment: Appointment) => void;
    onDelete: (id: string) => void;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
    appointment,
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

                {/* Header with date */}
                <div className="h-36 bg-gradient-to-br from-primary-100 to-primary-200 relative flex items-center justify-center">
                    <div className="text-center">
                        <span className="text-sm font-bold uppercase tracking-wider text-primary-600">
                            {appointment.datum.toLocaleString('nl-BE', { month: 'long' })}
                        </span>
                        <div className="text-5xl font-bold text-primary-700">{appointment.datum.getDate()}</div>
                        <span className="text-sm text-primary-500 capitalize">
                            {appointment.datum.toLocaleString('nl-BE', { weekday: 'long' })}
                        </span>
                    </div>
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm">
                            <CheckCircle2 size={12} />
                            Bevestigd
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{appointment.titel}</h2>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                            <Clock size={14} />
                            <span>{appointment.datum.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>

                    {/* Linked info */}
                    <div className="space-y-3">
                        {appointment.client_name && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                    <Users size={18} className="text-primary-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Klant</p>
                                    <p className="text-sm font-semibold text-gray-900">{appointment.client_name}</p>
                                </div>
                            </div>
                        )}
                        {appointment.property_name && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                    <Building2 size={18} className="text-primary-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Pand</p>
                                    <p className="text-sm font-semibold text-gray-900">{appointment.property_name}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    {appointment.notities && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                <FileText size={14} />
                                Notities
                            </h3>
                            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 italic leading-relaxed">
                                "{appointment.notities}"
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button
                            onClick={() => onEdit(appointment)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                        >
                            <Edit2 size={16} />
                            Bewerken
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Weet je zeker dat je deze afspraak wilt verwijderen?')) {
                                    onDelete(appointment.afspraken_id);
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
