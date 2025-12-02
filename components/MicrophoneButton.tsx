import React, { useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { blobToBase64 } from '../utils';

interface MicrophoneButtonProps {
  onAudioCaptured: (base64Audio: string) => void;
  isProcessing: boolean;
  size?: 'normal' | 'large';
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ 
    onAudioCaptured, 
    isProcessing,
    size = 'normal'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const base64 = await blobToBase64(audioBlob);
        onAudioCaptured(base64);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Kan microfoon niet openen. Controleer je instellingen.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Pulse animation class when recording
  const pulseClass = isRecording ? "animate-pulse ring-8 ring-red-200" : "hover:ring-8 hover:ring-blue-100";
  const bgClass = isRecording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700";
  
  // Size classes
  const sizeClasses = size === 'large' 
    ? 'w-40 h-40 shadow-2xl' 
    : 'w-24 h-24 shadow-xl';
  
  const iconSize = size === 'large' ? 'w-16 h-16' : 'w-10 h-10';

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <button
        onClick={toggleRecording}
        disabled={isProcessing}
        className={`
          rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95
          ${sizeClasses} ${bgClass} ${pulseClass} ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isProcessing ? (
          <Loader2 className={`${iconSize} text-white animate-spin`} />
        ) : isRecording ? (
          <Square className={`${iconSize} text-white fill-current`} />
        ) : (
          <Mic className={`${iconSize} text-white`} />
        )}
      </button>
      
      {/* Label is usually handled by parent for large sizes, but we keep a small status text here if needed */}
      <span className={`font-bold uppercase tracking-widest transition-colors duration-300 ${isRecording ? 'text-red-500' : 'text-slate-400'}`}>
        {isProcessing ? "Analyseren..." : isRecording ? "Stop Opname" : "Tik om te spreken"}
      </span>
    </div>
  );
};

export default MicrophoneButton;