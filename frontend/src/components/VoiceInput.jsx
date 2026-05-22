import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

function VoiceInput({ onResult, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const { isDark } = useTheme();
  const { t, language } = useLanguage();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'bm' ? 'ms-MY' : 'en-MY';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          onResult(transcript.trim());
        }
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language, onResult]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.lang = language === 'bm' ? 'ms-MY' : 'en-MY';
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  if (!isSupported) return null;

  return (
    <motion.button
      type="button"
      onClick={toggleRecording}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600 animate-recording-pulse'
          : isDark
            ? 'bg-navy-700 hover:bg-navy-600 text-gray-400 hover:text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-label={isRecording ? t.stopRecording : t.startRecording}
    >
      {isRecording ? (
        <MicOff size={18} className="text-white" />
      ) : (
        <Mic size={18} />
      )}
    </motion.button>
  );
}

export default VoiceInput;
