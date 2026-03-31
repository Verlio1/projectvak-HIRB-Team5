import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { X } from 'lucide-react';
import { formatPhoneNumber } from '../utils/phoneUtils';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Client, 'id' | 'created_at'>) => Promise<void>;
    initialData?: Client | null;
}

export function ClientModal({ isOpen, onClose, onSubmit, initialData }: ClientModalProps) {
    const [formData, setFormData] = useState({
        klant_naam: '',
        telefoon: '',
        email: '',
        status: 'Zoekt' as 'Zoekt' | 'Verkoopt' | 'Potentieel',
        notities: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                klant_naam: initialData.klant_naam,
                telefoon: initialData.telefoon,
                email: initialData.email,
                status: initialData.status,
                notities: initialData.notities
            });
        } else {
            setFormData({
                klant_naam: '',
                telefoon: '',
                email: '',
                status: 'Zoekt',
                notities: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;



    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setFormData({ ...formData, telefoon: formatted });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSubmit(formData);
            onClose();
        } catch (err: any) {
            alert(err.message || "Er is een fout opgetreden.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'Klant Bewerken' : 'Nieuwe Klant Toevoegen'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                        <input
                            required
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={formData.klant_naam}
                            onChange={e => setFormData({ ...formData, klant_naam: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                            <input
                                required
                                type="tel"
                                placeholder="+32 470 00 00 00"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.telefoon}
                                onChange={handlePhoneChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                required
                                type="email"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                        >
                            <option value="Zoekt">Zoekt</option>
                            <option value="Verkoopt">Verkoopt</option>
                            <option value="Potentieel">Potentieel</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
                            value={formData.notities}
                            onChange={e => setFormData({ ...formData, notities: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Annuleren
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                        >
                            {initialData ? 'Opslaan' : 'Toevoegen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
