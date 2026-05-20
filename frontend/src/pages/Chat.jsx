import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import InputBar from '../components/InputBar';
import Sidebar from '../components/Sidebar';
import FAQPanel from '../components/FAQPanel';
import Onboarding from '../components/Onboarding';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import ExportPDF from '../components/ExportPDF';
import { useChat } from '../hooks/useChat';
import { chatAPI } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('umpsa-onboarded');
  });
  const { messages, isLoading, conversationId, suggestedQuestions, sendMessage, clearChat, loadConversation } = useChat();
  const { isDark } = useTheme();
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await chatAPI.listConversations();
      setConversations(res.data.conversations || []);
    } catch (err) {
      // Silently fail - conversations list is non-critical
    }
  };

  const handleNewChat = () => {
    clearChat();
    setSidebarOpen(false);
  };

  const handleSelectConversation = (convId) => {
    loadConversation(convId);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await chatAPI.deleteConversation(convId);
      setConversations(prev => prev.filter(c => c._id !== convId));
      if (convId === conversationId) clearChat();
    } catch (err) {
      console.error('Failed to delete conversation');
    }
  };

  const handleSend = async (content) => {
    await sendMessage(content, language);
    fetchConversations();
  };

  return (
    <div className={`h-screen flex overflow-hidden ${isDark ? 'bg-navy-900' : 'bg-light-bg'}`}>
      {/* Onboarding */}
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        activeId={conversationId}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`flex items-center justify-between px-4 py-3 border-b backdrop-blur-sm ${
          isDark
            ? 'border-navy-700 bg-navy-800/80'
            : 'border-gray-200 bg-white/80'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-navy-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
              aria-label={t.openSidebar}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-sm">🎓</span>
              </div>
              <div>
                <h1 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t.title}
                </h1>
                <p className="text-[10px] text-accent">{t.subtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ExportPDF messages={messages} />
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* Chat Messages */}
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          suggestedQuestions={suggestedQuestions}
          onSendMessage={handleSend}
          conversationId={conversationId}
        />

        {/* Input */}
        <InputBar onSend={handleSend} isLoading={isLoading} />
      </div>

      {/* FAQ Panel */}
      <FAQPanel onSelectQuestion={handleSend} />
    </div>
  );
}

export default Chat;
