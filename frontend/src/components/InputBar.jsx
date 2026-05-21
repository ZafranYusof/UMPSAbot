import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';
import VoiceInput from './VoiceInput';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

function InputBar({ onSend, isLoading }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef(null);
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const maxChars = 2000;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    setIsSending(true);
    onSend(message.trim());
    setMessage('');
    inputRef.current?.focus();
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setTimeout(() => setIsSending(false), 400);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleVoiceResult = useCallback((transcript) => {
    onSend(transcript);
  }, [onSend]);

  const charCount = message.length;
  const isNearLimit = charCount > maxChars * 0.8;

  return (
    <form
      onSubmit={handleSubmit}
      className={`border-t backdrop-blur-md px-3 sm:px-4 py-3 safe-area-bottom ${
        isDark
          ? 'border-navy-700/60 bg-navy-800/90'
          : 'border-gray-200 bg-white/90'
      }`}
    >
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => {
              if (e.target.value.length <= maxChars) {
                setMessage(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            rows={1}
            className={`w-full resize-none min-h-[44px] max-h-[120px] rounded-full px-5 py-3 pr-12 transition-all duration-200 focus:outline-none focus:ring-2 ${
              isDark
                ? 'bg-navy-700/60 border border-navy-600/60 text-white placeholder-gray-500 focus:border-accent/50 focus:ring-accent/20'
                : 'bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-accent/50 focus:ring-accent/20'
            }`}
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            disabled={isLoading}
            aria-label={t.placeholder}
          />
          {/* Character count */}
          {charCount > 0 && (
            <span className={`absolute bottom-1 right-14 text-[9px] transition-colors ${
              isNearLimit ? 'text-yellow-400' : isDark ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {charCount}/{maxChars}
            </span>
          )}
        </div>
        <VoiceInput onResult={handleVoiceResult} disabled={isLoading} />
        <motion.button
          type="submit"
          disabled={!message.trim() || isLoading}
          animate={isSending ? { scale: [1, 0.85, 1] } : {}}
          transition={{ duration: 0.4 }}
          className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
            message.trim() && !isLoading
              ? 'bg-accent hover:bg-accent-dark shadow-lg shadow-accent/25 hover:shadow-accent/40'
              : isDark
                ? 'bg-navy-700 cursor-not-allowed'
                : 'bg-gray-200 cursor-not-allowed'
          }`}
          aria-label={t.send}
        >
          <Send size={16} className={`transition-transform duration-200 ${
            message.trim() && !isLoading ? 'text-white -rotate-12' : isDark ? 'text-gray-500' : 'text-gray-400'
          }`} />
        </motion.button>
      </div>
      <p className={`text-[10px] text-center mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        {t.disclaimer}
      </p>
    </form>
  );
}

export default InputBar;
