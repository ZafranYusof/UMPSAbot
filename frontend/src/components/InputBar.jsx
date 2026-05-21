import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

function InputBar({ onSend, isLoading }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  const { t } = useLanguage();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    onSend(message.trim());
    setMessage('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-4 py-4 border-t border-border">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto relative"
      >
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about UMPSA..."
          rows={1}
          className="w-full resize-none min-h-[48px] max-h-[120px] rounded-xl px-4 py-3 pr-12 bg-secondary border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent/40 transition-colors"
          style={{ height: 'auto', overflow: 'hidden' }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          disabled={isLoading}
          aria-label="Ask about UMPSA"
        />
        {/* Send button - only visible when text entered */}
        {message.trim() && (
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-3 bottom-3 p-2 rounded-lg text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        )}
      </form>
    </div>
  );
}

export default InputBar;
