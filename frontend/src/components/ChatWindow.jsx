import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import SuggestedChips from './SuggestedChips';
import { useLanguage } from '../context/LanguageContext';

function ChatWindow({ messages, isLoading, suggestedQuestions, onSendMessage, conversationId }) {
  const bottomRef = useRef(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const welcomeSuggestions = language === 'bm'
    ? [
        'Macam mana nak daftar kursus?',
        'Apa sistem gred UMPSA?',
        'Macam mana nak apply hostel?',
        'Keperluan FYP'
      ]
    : [
        'How do I register for courses?',
        'What is the grading system?',
        'How do I apply for hostel?',
        'FYP requirements'
      ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pt-20">
            {/* UMPSA Logo */}
            <div className="relative mb-6">
              <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-accent/10 blur-2xl animate-subtle-glow" />
              <img
                src="/umpsa-logo.png"
                alt="UMPSA Logo"
                className="relative w-20 h-20 object-contain mx-auto"
              />
            </div>
            <h2 className="text-xl font-medium text-text-primary mb-2">
              {t.welcome || 'How can I help?'}
            </h2>
            <p className="text-sm text-text-secondary max-w-md mb-8">
              {t.welcomeDesc || 'Ask me anything about UMPSA — academics, registration, facilities, student life.'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {welcomeSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(suggestion)}
                  className="animate-chip-fade-in text-sm px-4 py-2 rounded-full border border-border text-accent hover:bg-accent/10 hover:border-accent/40 hover:shadow-[0_0_8px_rgba(212,175,55,0.15)] transition-all duration-200"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id}>
            <MessageBubble message={msg} conversationId={conversationId} />
            {msg.role === 'assistant' &&
              index === messages.length - 1 &&
              !isLoading &&
              suggestedQuestions &&
              suggestedQuestions.length > 0 && (
                <SuggestedChips
                  suggestions={suggestedQuestions}
                  onSelect={onSendMessage}
                />
              )}
          </div>
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default ChatWindow;
