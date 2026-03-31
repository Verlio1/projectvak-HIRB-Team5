import React, { useState } from 'react';
import { Mic, Volume2, X } from 'lucide-react';
import { LiveTranscriptFeed } from './LiveTranscriptFeed';

interface FloatingAssistantButtonProps {
    isActive: boolean;
    isConnecting: boolean;
    volume: number;
    error: string | null;
    transcriptHistory: string[];
    liveTranscript: string;
    toggleSession: () => void;
    onClearError: () => void;
}

export const FloatingAssistantButton: React.FC<FloatingAssistantButtonProps> = ({
    isActive,
    isConnecting,
    volume,
    error,
    transcriptHistory,
    liveTranscript,
    toggleSession,
    onClearError
}) => {
    const [isFeedClosed, setIsFeedClosed] = useState(false);

    const handleToggleSession = () => {
        if (!isActive && !isConnecting) {
            setIsFeedClosed(false);
        }

        toggleSession();
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex-col items-end gap-2 hidden md:flex">
            {error && (
                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm shadow-lg mb-2 flex items-center gap-2 max-w-xs animate-in slide-in-from-bottom-5">
                    <X size={16} className="cursor-pointer" onClick={onClearError} />
                    {error}
                </div>
            )}

            {!isFeedClosed && (
                <LiveTranscriptFeed
                    transcriptHistory={transcriptHistory}
                    liveTranscript={liveTranscript}
                    isActive={isActive}
                    isConnecting={isConnecting}
                    onClose={() => setIsFeedClosed(true)}
                />
            )}

            {isFeedClosed && (isActive || isConnecting || transcriptHistory.length > 0 || liveTranscript) && (
                <button
                    type="button"
                    onClick={() => setIsFeedClosed(false)}
                    className="rounded-full border border-white/20 bg-slate-900/85 px-3 py-1 text-xs font-medium text-slate-100 shadow-lg hover:bg-slate-800"
                >
                    Show transcript
                </button>
            )}

            <button
                onClick={handleToggleSession}
                className={`
          flex items-center justify-center gap-3 px-6 py-4 rounded-full shadow-xl transition-all duration-300 font-medium
          ${isActive
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse-slow'
                        : isConnecting
                            ? 'bg-amber-400 text-amber-900 cursor-wait'
                            : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }
        `}
            >
                {isConnecting ? (
                    <>
                        <div className="w-5 h-5 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                    </>
                ) : isActive ? (
                    <>
                        <div className="relative flex items-center justify-center w-6 h-6">
                            <span
                                className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"
                                style={{ animationDuration: `${1.5 - volume}s` }}
                            ></span>
                            <Mic className="relative z-10 w-5 h-5" />
                        </div>
                        <span>Listening</span>
                    </>
                ) : (
                    <>
                        <div className="p-1 bg-white/20 rounded-full">
                            <Volume2 className="w-5 h-5" />
                        </div>
                        <span>Start Assistant</span>
                    </>
                )}
            </button>
        </div>
    );
};
