import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import VoiceInput from './VoiceInput';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

function InputBar({ onSend, isLoading }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    onSend(message.trim());
    setMessage('');
    inputRef.current?.focus();
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

  return (
    <form
      onSubmit={handleSubmit}
      className={`border-t backdrop-blur-sm px-4 py-3 safe-area-bottom ${
        isDark
          ? 'border-navy-700 bg-navy-800/80'
          : 'border-gray-200 bg-white/80'
      }`}
    >
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            rows={1}
            className={`w-full resize-none min-h-[44px] max-h-[120px] pr-4 rounded-lg px-4 py-2.5 transition-all duration-200 focus:outline-none focus:ring-1 ${
              isDark
                ? 'bg-navy-800 border border-navy-600 text-white placeholder-gray-500 focus:border-accent focus:ring-accent/50'
                : 'bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-accent focus:ring-accent/50'
            }`}
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            disabled={isLoading}
            aria-label={t.placeholder}
          />
        </div>
        <VoiceInput onResult={handleVoiceResult} disabled={isLoading} />
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="flex-shrink-0 w-11 h-11 rounded-lg bg-accent hover:bg-accent-dark disabled:bg-navy-600 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
          aria-label={t.send}
        >
          <Send size={18} className={`${isLoading ? 'text-gray-500' : 'text-white'}`} />
        </button>
      </div>
      <p className={`text-[10px] text-center mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {t.disclaimer}
      </p>
    </form>
  );
}

export default InputBar;
