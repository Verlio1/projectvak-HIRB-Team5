import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface TimePickerProps {
    value: string; // "HH:mm"
    onChange: (value: string) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const [h, m] = (value || "12:00").split(':').map(Number);
    const hour = isNaN(h) ? 12 : h;
    const minute = isNaN(m) ? 0 : m;

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    const handleSelect = (newHour: number, newMinute: number) => {
        const timeStr = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
        onChange(timeStr);
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* The Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50/30 hover:bg-white transition-all group"
            >
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400 group-hover:text-primary-500" />
                    <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
                        {value || "12:00"}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* The Dropdown Picker */}
            {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl z-50 p-4 w-64 max-h-[400px] overflow-y-auto no-scrollbar">
                    {/* Hours Section */}
                    <div className="mb-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-1">
                            Uur
                        </label>
                        <div className="grid grid-cols-6 gap-1.5">
                            {hours.map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => handleSelect(h, minute)}
                                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${hour === h
                                            ? 'bg-primary-600 text-white shadow-md'
                                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                                        }`}
                                >
                                    {h.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Minutes Section */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-1">
                            Minuten
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {minutes.map((min) => (
                                <button
                                    key={min}
                                    type="button"
                                    onClick={() => {
                                        handleSelect(hour, min);
                                        setIsOpen(false); // Close on minute selection for better UX
                                    }}
                                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${minute === min
                                            ? 'bg-primary-600 text-white shadow-md'
                                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                                        }`}
                                >
                                    {min.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Done Button */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="w-full mt-4 py-2 text-xs font-black text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl uppercase tracking-widest transition-colors"
                    >
                        Klaar
                    </button>
                </div>
            )}
        </div>
    );
};
