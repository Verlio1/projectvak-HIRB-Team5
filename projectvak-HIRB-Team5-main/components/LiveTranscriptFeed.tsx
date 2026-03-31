import React, { useEffect, useRef } from 'react';

interface LiveTranscriptFeedProps {
    transcriptHistory: string[];
    liveTranscript: string;
    isActive: boolean;
    isConnecting: boolean;
    className?: string;
    onClose?: () => void;
}

export const LiveTranscriptFeed: React.FC<LiveTranscriptFeedProps> = ({
    transcriptHistory,
    liveTranscript,
    isActive,
    isConnecting,
    className = '',
    onClose
}) => {
    const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

    const allLines = liveTranscript
        ? [...transcriptHistory, liveTranscript]
        : transcriptHistory;

    useEffect(() => {
        const container = transcriptContainerRef.current;
        if (!container) return;

        container.scrollTop = container.scrollHeight;
    }, [allLines.length, liveTranscript]);

    if (!isActive && !isConnecting && allLines.length === 0) {
        return null;
    }

    return (
        <div className={`w-72 max-w-[80vw] rounded-2xl border border-white/20 bg-slate-900/85 px-3 py-2 shadow-2xl backdrop-blur-md ${className}`}>
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-300">
                <span>Voice transcript</span>
                <div className="flex items-center gap-2">
                    {isConnecting && <span>Connecting...</span>}
                    {!isConnecting && isActive && <span>Live</span>}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded px-1 text-slate-200 hover:bg-white/10"
                            aria-label="Hide transcript feed"
                        >
                            -
                        </button>
                    )}
                </div>
            </div>

            <div
                ref={transcriptContainerRef}
                className="max-h-32 space-y-1 overflow-y-auto pr-1 text-sm leading-snug text-white"
            >
                {allLines.length === 0 ? (
                    <p className="text-slate-300">Listening for assistant response...</p>
                ) : (
                    allLines.map((line, index) => {
                        const isLiveLine = liveTranscript && index === allLines.length - 1;

                        return (
                            <p
                                key={`${index}-${line.slice(0, 24)}`}
                                className={isLiveLine ? 'text-amber-200' : 'text-white/90'}
                            >
                                {line}
                            </p>
                        );
                    })
                )}
            </div>
        </div>
    );
};
