import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { X } from 'lucide-react';

interface PropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Property, 'pand_id' | 'created_at'>) => Promise<void>;
    initialData?: Property | null;
}

export function PropertyModal({ isOpen, onClose, onSubmit, initialData }: PropertyModalProps) {
    const [formData, setFormData] = useState({
        pand_naam: '',
        straat: '',
        plaats: '',
        postcode: '',
        prijs: '',
        stijl: '',
        aantal_kamers: '',
        laatste_notities: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                pand_naam: initialData.pand_naam,
                straat: initialData.straat,
                plaats: initialData.plaats,
                postcode: initialData.postcode,
                prijs: initialData.prijs.toString(),
                stijl: initialData.stijl,
                aantal_kamers: initialData.aantal_kamers.toString(),
                laatste_notities: initialData.laatste_notities
            });
        } else {
            setFormData({
                pand_naam: '',
                straat: '',
                plaats: '',
                postcode: '',
                prijs: '',
                stijl: '',
                aantal_kamers: '',
                laatste_notities: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSubmit({
                pand_naam: formData.pand_naam,
                straat: formData.straat,
                plaats: formData.plaats,
                postcode: formData.postcode,
                prijs: Number(formData.prijs) || 0,
                stijl: formData.stijl,
                aantal_kamers: Number(formData.aantal_kamers) || 0,
                laatste_notities: formData.laatste_notities
            });
            onClose();
        } catch (err: any) {
            alert(err.message || "Er is een fout opgetreden.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'Pand Bewerken' : 'Nieuw Pand Toevoegen'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Naam Pand</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={formData.pand_naam}
                                onChange={e => setFormData({ ...formData, pand_naam: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Straat</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.straat}
                                onChange={e => setFormData({ ...formData, straat: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    value={formData.postcode}
                                    onChange={e => setFormData({ ...formData, postcode: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plaats</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    value={formData.plaats}
                                    onChange={e => setFormData({ ...formData, plaats: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prijs (€)</label>
                            <input
                                required
                                type="number"
                                step="25000"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.prijs}
                                onChange={e => setFormData({ ...formData, prijs: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stijl</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.stijl}
                                onChange={e => setFormData({ ...formData, stijl: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Aantal Kamers</label>
                            <input
                                required
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.aantal_kamers}
                                onChange={e => setFormData({ ...formData, aantal_kamers: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Laatste Notities</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
                            value={formData.laatste_notities}
                            onChange={e => setFormData({ ...formData, laatste_notities: e.target.value })}
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
