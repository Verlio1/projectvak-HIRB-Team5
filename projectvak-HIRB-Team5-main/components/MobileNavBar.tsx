import React, { useState } from 'react';
import { LayoutDashboard, Building2, Users, Calendar, Mic, Map } from 'lucide-react';
import { ViewState } from '../types';
import { LiveTranscriptFeed } from './LiveTranscriptFeed';

interface MobileNavBarProps {
    activeView: ViewState;
    onViewChange: (view: ViewState) => void;
    voiceState: {
        isActive: boolean;
        isConnecting: boolean;
        volume: number;
        transcriptHistory: string[];
        liveTranscript: string;
        toggleSession: () => void;
    };
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
    activeView,
    onViewChange,
    voiceState
}) => {
    const { isActive, isConnecting, transcriptHistory, liveTranscript, toggleSession } = voiceState;
    const [isFeedHidden, setIsFeedHidden] = useState(false);

    const hasTranscriptContent = transcriptHistory.length > 0 || !!liveTranscript;

    const handleToggleSession = () => {
        if (!isActive && !isConnecting) {
            setIsFeedHidden(false);
        }

        toggleSession();
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pt-2">
            <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center justify-around px-3 py-2">
                <button
                    onClick={() => onViewChange('dashboard')}
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeView === 'dashboard' ? 'text-primary-400' : 'text-gray-400'}`}
                >
                    <LayoutDashboard size={20} />
                    <span className="text-[10px] font-medium">Overzicht</span>
                </button>

                <button
                    onClick={() => onViewChange('properties')}
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeView === 'properties' ? 'text-primary-400' : 'text-gray-400'}`}
                >
                    <Building2 size={20} />
                    <span className="text-[10px] font-medium">Panden</span>
                </button>

                <button
                    onClick={() => onViewChange('clients')}
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeView === 'clients' ? 'text-primary-400' : 'text-gray-400'}`}
                >
                    <Users size={20} />
                    <span className="text-[10px] font-medium">Klanten</span>
                </button>

                <button
                    onClick={() => onViewChange('appointments')}
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeView === 'appointments' ? 'text-primary-400' : 'text-gray-400'}`}
                >
                    <Calendar size={20} />
                    <span className="text-[10px] font-medium">Agenda</span>
                </button>

                <button
                    onClick={() => onViewChange('map')}
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeView === 'map' ? 'text-primary-400' : 'text-gray-400'}`}
                >
                    <Map size={20} />
                    <span className="text-[10px] font-medium">Kaart</span>
                </button>

                {/* Voice Assistant — standout accent button */}
                <div className="relative flex flex-col items-center">
                    {!isFeedHidden && (
                        <LiveTranscriptFeed
                            transcriptHistory={transcriptHistory}
                            liveTranscript={liveTranscript}
                            isActive={isActive}
                            isConnecting={isConnecting}
                            onClose={() => setIsFeedHidden(true)}
                            className="absolute bottom-full mb-3 right-[-1.5rem] w-64 max-w-[85vw]"
                        />
                    )}

                    {isFeedHidden && (isActive || isConnecting || hasTranscriptContent) && (
                        <button
                            type="button"
                            onClick={() => setIsFeedHidden(false)}
                            className="absolute bottom-full mb-3 right-[-1.5rem] rounded-full border border-white/20 bg-slate-900/85 px-3 py-1 text-xs font-medium text-slate-100 shadow-lg"
                        >
                            Show transcript
                        </button>
                    )}

                    <button
                        onClick={handleToggleSession}
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ${isActive
                                ? 'bg-red-500 text-white'
                                : isConnecting
                                    ? 'bg-amber-400 text-amber-900'
                                    : 'bg-primary-600 text-white'
                            }`}
                    >
                        {isConnecting ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Mic size={20} className={isActive ? 'animate-pulse' : ''} />
                        )}
                        <span className="text-[10px] font-bold">VDA</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};
