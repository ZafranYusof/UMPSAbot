import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import SuggestedChips from './SuggestedChips';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

function ChatWindow({ messages, isLoading, suggestedQuestions, onSendMessage, conversationId }) {
  const bottomRef = useRef(null);
  const { isDark } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const welcomeSuggestions = [
    'How do I register for courses?',
    'What is the grading system?',
    'Macam mana nak apply hostel?',
    'FYP requirements'
  ];

  return (
    <div className={`flex-1 overflow-y-auto px-4 py-6 space-y-4 ${
      isDark ? '' : 'bg-light-bg'
    }`}>
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4 mx-auto">
              <span className="text-3xl">🎓</span>
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t.welcome}
            </h2>
            <p className={`max-w-md ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t.welcomeDesc}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {welcomeSuggestions.map((suggestion, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 0.3 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSendMessage(suggestion)}
                  className={`text-sm px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 ${
                    isDark
                      ? 'bg-navy-700 border-navy-600 text-gray-300 hover:border-accent hover:text-accent hover:bg-accent/10'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-accent hover:text-accent hover:bg-accent/5'
                  }`}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MessageBubble message={msg} conversationId={conversationId} />
            {/* Show suggested chips after the last bot message */}
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
          </motion.div>
        ))}
      </AnimatePresence>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <TypingIndicator />
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

export default ChatWindow;
