import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, Copy, Check } from 'lucide-react';
import { formatTime } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import MessageReactions from './MessageReactions';

function MessageBubble({ message, conversationId }) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.isError;
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] md:max-w-[70%] group`}>
        {/* Avatar + Name for bot */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-accent">U</span>
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              UMPSABot
            </span>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`
            relative rounded-2xl px-4 py-3 border transition-shadow duration-200
            ${isUser
              ? isDark
                ? 'bg-accent/10 border-accent/20 text-white rounded-br-sm ml-auto'
                : 'bg-accent/10 border-accent/20 text-gray-900 rounded-br-sm ml-auto'
              : isDark
                ? 'bg-[#0a2040] border-navy-600/40 text-gray-100 rounded-bl-sm'
                : 'bg-white border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
            }
            ${isError ? 'border-red-500/30 bg-red-900/20' : ''}
          `}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>

          {/* Copy button - shows on hover for bot messages */}
          {!isUser && !isError && (
            <button
              onClick={handleCopy}
              className={`absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                isDark
                  ? 'hover:bg-navy-600/60 text-gray-500 hover:text-gray-300'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
              }`}
              aria-label="Copy message"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          )}

          {/* Low confidence warning */}
          {message.isLowConfidence && !isUser && (
            <div className={`mt-2 pt-2 border-t ${isDark ? 'border-navy-600/40' : 'border-gray-200'}`}>
              <p className="text-xs text-yellow-400/80 flex items-center gap-1">
                ⚠️ {t.lowConfidence}
              </p>
            </div>
          )}

          {/* Sources - collapsible citation section */}
          {message.sources && message.sources.length > 0 && (
            <div className={`mt-2.5 pt-2.5 border-t ${isDark ? 'border-navy-600/40' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowSources(!showSources)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  showSources ? 'text-accent' : 'text-accent/70 hover:text-accent'
                }`}
              >
                <ExternalLink size={12} />
                {message.sources.length} {t.sources || 'sources'}
                <motion.span
                  animate={{ rotate: showSources ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={12} />
                </motion.span>
              </button>

              <AnimatePresence>
                {showSources && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1.5">
                      {message.sources.map((source, i) => (
                        <div
                          key={i}
                          className={`text-xs rounded-lg px-3 py-2 ${
                            isDark ? 'bg-navy-800/60 text-gray-400 border border-navy-700/40' : 'bg-gray-50 text-gray-600 border border-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-accent truncate">
                              {source.title || 'Unknown Document'}
                            </span>
                            {source.score && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                source.score > 0.7
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : source.score > 0.4
                                    ? 'bg-yellow-500/10 text-yellow-400'
                                    : 'bg-gray-500/10 text-gray-400'
                              }`}>
                                {Math.round(source.score * 100)}%
                              </span>
                            )}
                          </div>
                          {source.chunk && (
                            <p className={`mt-1 text-[11px] line-clamp-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {source.chunk.substring(0, 150)}...
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Reactions for bot messages */}
        {!isUser && !isError && (
          <MessageReactions messageId={message.id} conversationId={conversationId} />
        )}

        {/* Timestamp */}
        <p className={`text-[10px] mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'} ${
          isDark ? 'text-gray-600' : 'text-gray-400'
        }`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

export default MessageBubble;
