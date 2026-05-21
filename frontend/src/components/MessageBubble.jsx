import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { formatTime } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import MessageReactions from './MessageReactions';

function MessageBubble({ message, conversationId }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.isError;
  const { isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%]`}>
        {/* Avatar + Name */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1 ml-1">
            <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center">
              <span className="text-xs">🎓</span>
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              UMPSABot
            </span>
          </div>
        )}

        {isUser && (
          <div className="flex items-center gap-2 mb-1 mr-1 justify-end">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              You
            </span>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              isDark ? 'bg-accent/20' : 'bg-accent/10'
            }`}>
              <span className="text-xs">👤</span>
            </div>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`
            rounded-2xl px-4 py-3 border
            ${isUser
              ? isDark
                ? 'bg-accent/20 border-accent/30 text-white rounded-br-md'
                : 'bg-accent/10 border-accent/20 text-gray-900 rounded-br-md'
              : isDark
                ? 'bg-navy-700/80 border-navy-600/50 text-gray-100 rounded-bl-md'
                : 'bg-white border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
            }
            ${isError ? 'border-red-500/30 bg-red-900/20' : ''}
          `}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>

          {/* Low confidence warning */}
          {message.isLowConfidence && !isUser && (
            <div className={`mt-2 pt-2 border-t ${isDark ? 'border-navy-600/50' : 'border-gray-200'}`}>
              <p className="text-xs text-yellow-400/80 flex items-center gap-1">
                ⚠️ {t.lowConfidence}
              </p>
            </div>
          )}

          {/* Sources - collapsible citation section */}
          {message.sources && message.sources.length > 0 && (
            <div className={`mt-2 pt-2 border-t ${isDark ? 'border-navy-600/50' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent-light transition-colors"
              >
                <ExternalLink size={12} />
                {message.sources.length} {t.sources || 'sources'}
                {showSources ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showSources && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-2 space-y-1.5"
                >
                  {message.sources.map((source, i) => (
                    <div
                      key={i}
                      className={`text-xs rounded-lg px-3 py-2 ${
                        isDark ? 'bg-navy-800/50 text-gray-400 border border-navy-700/50' : 'bg-gray-50 text-gray-600 border border-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-accent">
                          Sumber: {source.title || 'Unknown Document'}
                        </span>
                        {source.score && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            source.score > 0.7
                              ? 'bg-green-500/10 text-green-400'
                              : source.score > 0.4
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {Math.round(source.score * 100)}% relevance
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
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Reactions for bot messages */}
        {!isUser && !isError && (
          <MessageReactions messageId={message.id} conversationId={conversationId} />
        )}

        {/* Timestamp */}
        <p className={`text-[10px] mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'} ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default MessageBubble;
