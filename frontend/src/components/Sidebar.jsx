import { Plus, Trash2, X } from 'lucide-react';
import { truncate, formatDate } from '../utils/helpers';
import { useLanguage } from '../context/LanguageContext';

function Sidebar({ isOpen, onClose, conversations, onSelect, onNewChat, onDelete, activeId }) {
  const { t } = useLanguage();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed md:relative z-50 h-full w-64
          bg-secondary border-r border-border flex flex-col
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header with New Chat */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-tertiary"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-tertiary transition-colors md:hidden"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {(!conversations || conversations.length === 0) ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm text-text-secondary">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv._id}
                className={`
                  group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                  ${activeId === conv._id
                    ? 'bg-tertiary border-l-2 border-l-accent'
                    : 'hover:bg-tertiary/50 border-l-2 border-l-transparent'
                  }
                `}
                onClick={() => onSelect(conv._id)}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${
                    activeId === conv._id ? 'text-text-primary' : 'text-text-secondary'
                  }`}>
                    {truncate(conv.lastMessage, 30)}
                  </p>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    {formatDate(conv.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(conv._id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-secondary hover:text-red-400 transition-all"
                  aria-label="Delete conversation"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <p className="text-[10px] text-text-secondary text-center">
            UMPSABot · FinTech Forward 2026
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
