import { useState } from 'react';
import { ChevronDown, ExternalLink, Copy, Check } from 'lucide-react';
import { formatTime } from '../utils/helpers';
import { useLanguage } from '../context/LanguageContext';

function MessageBubble({ message, conversationId }) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.isError;
  const { t } = useLanguage();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] group`}>
        {/* Message content */}
        <div
          className={`
            relative px-4 py-3 rounded-lg
            ${isUser
              ? 'bg-tertiary text-text-primary rounded-br-sm'
              : 'text-text-primary'
            }
            ${isError ? 'border border-red-500/30 bg-red-900/10' : ''}
            ${!isUser && !isError ? 'border-t border-border/50 pt-4' : ''}
          `}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>

          {/* Copy button - hover only, bot messages */}
          {!isUser && !isError && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-text-primary"
              aria-label="Copy message"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          )}

          {/* Low confidence */}
          {message.isLowConfidence && !isUser && (
            <p className="mt-2 text-xs text-yellow-500/80">
              ⚠️ {t.lowConfidence}
            </p>
          )}

          {/* Sources - collapsible */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-2">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-light transition-colors"
              >
                <ExternalLink size={11} />
                {message.sources.length} {t.sources || 'sources'}
                <ChevronDown size={11} className={`transition-transform ${showSources ? 'rotate-180' : ''}`} />
              </button>

              {showSources && (
                <div className="mt-2 space-y-1.5">
                  {message.sources.map((source, i) => (
                    <div
                      key={i}
                      className="text-xs px-3 py-2 rounded bg-secondary border border-border/50"
                    >
                      <span className="text-accent font-medium">
                        {source.title || 'Unknown Document'}
                      </span>
                      {source.score && (
                        <span className="ml-2 text-text-secondary text-[10px]">
                          {Math.round(source.score * 100)}%
                        </span>
                      )}
                      {source.chunk && (
                        <p className="mt-1 text-[11px] text-text-secondary line-clamp-2">
                          {source.chunk.substring(0, 150)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-[10px] mt-1 text-text-secondary ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default MessageBubble;
