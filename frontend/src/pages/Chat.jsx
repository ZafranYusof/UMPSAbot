import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import InputBar from '../components/InputBar';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import { useChat } from '../hooks/useChat';
import { chatAPI } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const { messages, isLoading, conversationId, suggestedQuestions, sendMessage, clearChat, loadConversation } = useChat();
  const { language } = useLanguage();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await chatAPI.listConversations();
      setConversations(res.data.conversations || []);
    } catch (err) {
      // Silently fail
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
    <div className="h-screen h-dvh flex overflow-hidden bg-primary">
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
        {/* Header - minimal */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-medium text-text-primary">UMPSABot</h1>
          </div>
          <div className="flex items-center gap-1">
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
    </div>
  );
}

export default Chat;
