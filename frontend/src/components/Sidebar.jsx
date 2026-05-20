import { motion } from 'framer-motion';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { truncate, formatDate } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

function Sidebar({ isOpen, onClose, conversations, onSelect, onNewChat, onDelete, activeId }) {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`
          fixed md:relative z-50 h-full w-72
          border-r flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isDark
            ? 'bg-navy-800 border-navy-700'
            : 'bg-white border-gray-200'
          }
        `}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-navy-700' : 'border-gray-200'
        }`}>
          <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t.conversations}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              className={`p-2 rounded-lg text-accent transition-colors ${
                isDark ? 'hover:bg-navy-700' : 'hover:bg-gray-100'
              }`}
              aria-label={t.newChat}
            >
              <Plus size={18} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg md:hidden transition-colors ${
                isDark ? 'hover:bg-navy-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
              aria-label={t.closeSidebar}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(!conversations || conversations.length === 0) ? (
            <div className={`text-center py-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {t.noConversations}
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv._id}
                className={`
                  group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                  ${activeId === conv._id
                    ? 'bg-accent/10 border border-accent/20'
                    : isDark ? 'hover:bg-navy-700' : 'hover:bg-gray-50'
                  }
                `}
                onClick={() => onSelect(conv._id)}
              >
                <MessageSquare size={14} className={`flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {truncate(conv.lastMessage, 40)}
                  </p>
                  <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {formatDate(conv.updatedAt)} · {conv.messageCount} msgs
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(conv._id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                  aria-label="Delete conversation"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
          <p className={`text-[10px] text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            UMPSABot v1.0 · FinTech Forward 2026
          </p>
        </div>
      </motion.aside>
    </>
  );
}

export default Sidebar;
