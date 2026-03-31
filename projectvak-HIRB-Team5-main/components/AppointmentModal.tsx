import React, { useState, useEffect } from 'react';
import { Appointment, Property, Client } from '../types';
import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Appointment, 'afspraken_id'>) => void;
    initialData?: Appointment | null;
    properties: Property[];
    clients: Client[];
}

import { TimePicker } from './TimePicker';

export const AppointmentModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, initialData, properties, clients }) => {
    const [formData, setFormData] = useState(() => {
        if (initialData) {
            const date = initialData.datum;
            const datePart = date.toISOString().split('T')[0];
            const timePart = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            return {
                title: initialData.titel || '',
                datePart,
                timePart,
                notes: initialData.notities,
                klant_id: initialData.klant_id || '',
                pand_id: initialData.pand_id || ''
            };
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const datePart = `${year}-${month}-${day}`;

            return {
                title: '',
                datePart,
                timePart: '12:00',
                notes: '',
                klant_id: '',
                pand_id: ''
            };
        }
    });

    useEffect(() => {
        if (initialData) {
            const date = initialData.datum;
            const datePart = date.toISOString().split('T')[0];
            const timePart = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            setFormData({
                title: initialData.titel || '',
                datePart,
                timePart,
                notes: initialData.notities,
                klant_id: initialData.klant_id || '',
                pand_id: initialData.pand_id || ''
            });
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const datePart = `${year}-${month}-${day}`;

            setFormData({
                title: '',
                datePart,
                timePart: '12:00',
                notes: '',
                klant_id: '',
                pand_id: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const selectedClient = clients.find(c => c.klant_id === formData.klant_id);
        const selectedProperty = properties.find(p => p.pand_id === formData.pand_id);

        const fullDate = new Date(`${formData.datePart}T${formData.timePart}`);

        try {
            await onSubmit({
                titel: formData.title,
                datum: fullDate,
                notities: formData.notes,
                klant_id: formData.klant_id || undefined,
                client_name: selectedClient?.klant_naam || '',
                pand_id: formData.pand_id || undefined,
                property_name: selectedProperty?.pand_naam || ''
            } as Omit<Appointment, 'afspraken_id'>);
            onClose();
        } catch (err: any) {
            alert(err.message || "Er is een fout opgetreden.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'Afspraak Bewerken' : 'Nieuwe Afspraak Inplannen'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Titel / Omschrijving</label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-gray-50/30 focus:bg-white"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Bijv. Bezichtiging"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Datum</label>
                            <input
                                required
                                type="date"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-gray-50/30 focus:bg-white"
                                value={formData.datePart}
                                onChange={e => setFormData({ ...formData, datePart: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tijd (Klok)</label>
                            <TimePicker
                                value={formData.timePart}
                                onChange={(val) => setFormData(prev => ({ ...prev, timePart: val }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Klant Selecteren</label>
                        <select
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                            value={formData.klant_id}
                            onChange={e => setFormData({ ...formData, klant_id: e.target.value })}
                        >
                            <option value="">-- Kies een klant --</option>
                            {clients.map(client => (
                                <option key={client.klant_id} value={client.klant_id}>
                                    {client.klant_naam}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pand Selecteren</label>
                        <select
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                            value={formData.pand_id}
                            onChange={e => setFormData({ ...formData, pand_id: e.target.value })}
                        >
                            <option value="">-- Kies een pand --</option>
                            {properties.map(prop => (
                                <option key={prop.pand_id} value={prop.pand_id}>
                                    {prop.pand_naam} ({prop.plaats})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Extra Notities</label>
                        <textarea
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl h-24 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-gray-50/30 focus:bg-white resize-none"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Bijv. Geen honden meebrengen"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                        >
                            Annuleren
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 font-medium transition-colors"
                        >
                            {initialData ? 'Wijzigingen Opslaan' : 'Afspraak Inplannen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
