import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const labels = {
  en: {
    title: 'UMPSABot',
    subtitle: 'AI University Assistant',
    placeholder: 'Ask me anything about UMPSA...',
    newChat: 'New Chat',
    conversations: 'Conversations',
    noConversations: 'No conversations yet',
    disclaimer: 'UMPSABot may make mistakes. Verify important information with official sources.',
    welcome: "Hi! I'm UMPSABot",
    welcomeDesc: 'Your AI assistant for all things UMPSA. Ask me about academics, facilities, registration, or anything else about university life.',
    faq: 'FAQ',
    exportPdf: 'Export as PDF',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    language: 'Language',
    recording: 'Recording...',
    stopRecording: 'Stop recording',
    startRecording: 'Start voice input',
    send: 'Send message',
    openSidebar: 'Open sidebar',
    closeSidebar: 'Close sidebar',
    admin: 'Admin panel',
    sources: 'sources',
    lowConfidence: 'Low confidence — please verify this information',
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    onboarding: {
      step1Title: 'Welcome to UMPSABot! 🎓',
      step1Desc: 'Your AI-powered assistant for everything about UMPSA — academics, facilities, student life, and more.',
      step2Title: 'How to Use 💬',
      step2Desc: 'Just type your question in the chat box. You can ask in English or Bahasa Melayu. Use voice input for hands-free!',
      step3Title: 'Try These Questions 🚀',
      step3Desc: 'Get started with popular questions or type your own. The bot learns from official UMPSA documents.',
      next: 'Next',
      back: 'Back',
      getStarted: 'Get Started'
    }
  },
  bm: {
    title: 'UMPSABot',
    subtitle: 'Pembantu AI Universiti',
    placeholder: 'Tanya apa sahaja tentang UMPSA...',
    newChat: 'Chat Baru',
    conversations: 'Perbualan',
    noConversations: 'Tiada perbualan lagi',
    disclaimer: 'UMPSABot mungkin membuat kesilapan. Sahkan maklumat penting dengan sumber rasmi.',
    welcome: 'Hai! Saya UMPSABot',
    welcomeDesc: 'Pembantu AI anda untuk semua perkara UMPSA. Tanya saya tentang akademik, kemudahan, pendaftaran, atau apa sahaja tentang kehidupan universiti.',
    faq: 'Soalan Lazim',
    exportPdf: 'Eksport sebagai PDF',
    darkMode: 'Mod Gelap',
    lightMode: 'Mod Cerah',
    language: 'Bahasa',
    recording: 'Merakam...',
    stopRecording: 'Berhenti merakam',
    startRecording: 'Mula input suara',
    send: 'Hantar mesej',
    openSidebar: 'Buka sidebar',
    closeSidebar: 'Tutup sidebar',
    admin: 'Panel admin',
    sources: 'sumber',
    lowConfidence: 'Keyakinan rendah — sila sahkan maklumat ini',
    helpful: 'Membantu',
    notHelpful: 'Tidak membantu',
    onboarding: {
      step1Title: 'Selamat Datang ke UMPSABot! 🎓',
      step1Desc: 'Pembantu AI anda untuk semua tentang UMPSA — akademik, kemudahan, kehidupan pelajar, dan banyak lagi.',
      step2Title: 'Cara Guna 💬',
      step2Desc: 'Taip soalan anda di kotak chat. Boleh tanya dalam English atau Bahasa Melayu. Guna input suara untuk hands-free!',
      step3Title: 'Cuba Soalan Ini 🚀',
      step3Desc: 'Mula dengan soalan popular atau taip sendiri. Bot belajar dari dokumen rasmi UMPSA.',
      next: 'Seterusnya',
      back: 'Kembali',
      getStarted: 'Mula'
    }
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('umpsa-language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('umpsa-language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'bm' : 'en');
  };

  const t = labels[language];

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
