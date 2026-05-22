class AppStrings {
  static String get(String key, String language) {
    final lang = (language == 'bm' || language == 'ms') ? 'ms' : 'en';
    return _strings[lang]?[key] ?? _strings['en']?[key] ?? key;
  }

  static final Map<String, Map<String, String>> _strings = {
    'en': {
      // Bottom nav
      'nav_chat': 'Chat',
      'nav_timetable': 'Timetable',
      'nav_history': 'History',
      'nav_saved': 'Saved',
      'nav_settings': 'Settings',

      // Chat screen
      'type_your_question': 'Type your question...',
      'new_chat': 'New Chat',
      'online': 'Online',
      'offline': 'Offline',
      'typing': 'typing...',
      'no_internet': 'No internet connection',
      'retry': 'Retry',
      'greeting': 'Assalamualaikum! 👋',
      'greeting_subtitle':
          'I\'m UMPSABot, your AI assistant.\nAsk me anything about UMPSA!',
      'popular_questions': 'POPULAR QUESTIONS',

      // History screen
      'chat_history': 'Chat History',
      'clear_all': 'Clear All',
      'conversation_deleted': 'Conversation deleted',
      'undo': 'Undo',
      'clear_all_history': 'Clear All History',
      'clear_all_history_desc':
          'Are you sure you want to delete all conversations? This cannot be undone.',
      'cancel': 'Cancel',
      'delete_all': 'Delete All',
      'no_conversations': 'No conversations yet',
      'no_conversations_desc':
          'Your chat history will appear here.\nStart a conversation to get going!',
      'start_chatting': 'Start chatting',
      'messages_count': 'messages',
      'delete': 'Delete',

      // Onboarding screen
      'welcome_title': 'Welcome to UMPSA Chatbot',
      'welcome_desc':
          'Your AI-powered assistant for everything about Universiti Malaysia Pahang Al-Sultan Abdullah.',
      'ask_anything_title': 'Ask Anything',
      'ask_anything_desc':
          'Get instant answers about courses, facilities, events, admissions, and more. Available in Bahasa Melayu and English.',
      'get_started_title': 'Get Started',
      'get_started_desc':
          'No login required. Start chatting right away and explore what UMPSA has to offer!',
      'skip': 'Skip',
      'next': 'Next',
      'get_started': 'Get Started',

      // Saved screen
      'saved_answers': 'Saved Answers',
      'removed_from_saved': 'Removed from saved',
      'copied_to_clipboard': 'Copied to clipboard',
      'no_saved_answers': 'No saved answers yet',
      'long_press_to_save': 'Long press on any bot message to save it',
      'today': 'Today',
      'yesterday': 'Yesterday',
      'days_ago': 'days ago',
      'sources': 'source(s)',

      // Settings screen
      'settings': 'Settings',
      'appearance': 'Appearance',
      'dark_mode': 'Dark Mode',
      'dark_theme_active': 'Dark theme active',
      'light_theme_active': 'Light theme active',
      'language': 'Language',
      'english': 'English',
      'bahasa_melayu': 'Bahasa Melayu',
      'data': 'Data',
      'saved_messages_count': 'saved messages',
      'clear_chat_history': 'Clear Chat History',
      'delete_all_conversations': 'Delete all saved conversations',
      'clear_history_title': 'Clear History',
      'clear_history_desc':
          'This will delete all your saved conversations. This action cannot be undone.',
      'clear': 'Clear',
      'history_cleared': 'History cleared',
      'about': 'About',
      'version': 'Version 1.0.0',
      'umpsa_full_name': 'Universiti Malaysia Pahang Al-Sultan Abdullah',
      'ai_campus_assistant': 'AI-powered campus assistant',
      'made_with_love': 'Made with ❤️ for UMPSA students',

      // Timetable screen
      'timetable_planner': 'Timetable Planner',
      'semester': 'Semester',
      'course_codes': 'Course Codes',
      'course_hint': 'e.g. BCS1023',
      'course_already_added': 'Course already added',
      'add_at_least_one': 'Add at least one course code',
      'planning': 'Planning...',
      'plan_timetable': 'Plan Timetable',
      'your_schedule': 'Your Schedule',
      'tap_plan_timetable': 'Tap "Plan Timetable" to generate your schedule',
      'failed_plan_timetable': 'Failed to plan timetable. Please try again.',
      'section': 'Section',

      // Chat bubble
      'copy_text': 'Copy text',
      'save_answer': 'Save answer',
      'remove_from_saved': 'Remove from Saved',
      'share': 'Share',
      'copied_for_sharing': 'Copied to clipboard for sharing',
      'answer_saved': 'Answer saved!',
      'tap_to_retry': 'Tap to retry',
      'confidence': 'Confidence',
    },
    'ms': {
      // Bottom nav
      'nav_chat': 'Sembang',
      'nav_timetable': 'Jadual',
      'nav_history': 'Sejarah',
      'nav_saved': 'Disimpan',
      'nav_settings': 'Tetapan',

      // Chat screen
      'type_your_question': 'Taip soalan anda...',
      'new_chat': 'Sembang Baru',
      'online': 'Dalam Talian',
      'offline': 'Luar Talian',
      'typing': 'menaip...',
      'no_internet': 'Tiada sambungan internet',
      'retry': 'Cuba Semula',
      'greeting': 'Assalamualaikum! 👋',
      'greeting_subtitle':
          'Saya UMPSABot, pembantu AI anda.\nTanya apa-apa tentang UMPSA!',
      'popular_questions': 'SOALAN POPULAR',

      // History screen
      'chat_history': 'Sejarah Sembang',
      'clear_all': 'Padam Semua',
      'conversation_deleted': 'Perbualan dipadam',
      'undo': 'Buat Asal',
      'clear_all_history': 'Padam Semua Sejarah',
      'clear_all_history_desc':
          'Adakah anda pasti mahu memadam semua perbualan? Tindakan ini tidak boleh dibatalkan.',
      'cancel': 'Batal',
      'delete_all': 'Padam Semua',
      'no_conversations': 'Tiada perbualan lagi',
      'no_conversations_desc':
          'Sejarah sembang anda akan muncul di sini.\nMulakan perbualan untuk bermula!',
      'start_chatting': 'Mula sembang',
      'messages_count': 'mesej',
      'delete': 'Padam',

      // Onboarding screen
      'welcome_title': 'Selamat Datang ke UMPSA Chatbot',
      'welcome_desc':
          'Pembantu AI anda untuk semua perkara tentang Universiti Malaysia Pahang Al-Sultan Abdullah.',
      'ask_anything_title': 'Tanya Apa Sahaja',
      'ask_anything_desc':
          'Dapatkan jawapan segera tentang kursus, kemudahan, acara, kemasukan, dan banyak lagi. Tersedia dalam Bahasa Melayu dan English.',
      'get_started_title': 'Mula Sekarang',
      'get_started_desc':
          'Tidak perlu log masuk. Mula sembang terus dan terokai apa yang UMPSA tawarkan!',
      'skip': 'Langkau',
      'next': 'Seterusnya',
      'get_started': 'Mula Sekarang',

      // Saved screen
      'saved_answers': 'Jawapan Disimpan',
      'removed_from_saved': 'Dibuang dari simpanan',
      'copied_to_clipboard': 'Disalin ke papan klip',
      'no_saved_answers': 'Tiada jawapan disimpan lagi',
      'long_press_to_save': 'Tekan lama pada mesej bot untuk menyimpannya',
      'today': 'Hari Ini',
      'yesterday': 'Semalam',
      'days_ago': 'hari lepas',
      'sources': 'sumber',

      // Settings screen
      'settings': 'Tetapan',
      'appearance': 'Penampilan',
      'dark_mode': 'Mod Gelap',
      'dark_theme_active': 'Tema gelap aktif',
      'light_theme_active': 'Tema cerah aktif',
      'language': 'Bahasa',
      'english': 'English',
      'bahasa_melayu': 'Bahasa Melayu',
      'data': 'Data',
      'saved_messages_count': 'mesej disimpan',
      'clear_chat_history': 'Padam Sejarah Sembang',
      'delete_all_conversations': 'Padam semua perbualan yang disimpan',
      'clear_history_title': 'Padam Sejarah',
      'clear_history_desc':
          'Ini akan memadam semua perbualan anda. Tindakan ini tidak boleh dibatalkan.',
      'clear': 'Padam',
      'history_cleared': 'Sejarah dipadam',
      'about': 'Tentang',
      'version': 'Versi 1.0.0',
      'umpsa_full_name': 'Universiti Malaysia Pahang Al-Sultan Abdullah',
      'ai_campus_assistant': 'Pembantu kampus berkuasa AI',
      'made_with_love': 'Dibuat dengan ❤️ untuk pelajar UMPSA',

      // Timetable screen
      'timetable_planner': 'Perancang Jadual',
      'semester': 'Semester',
      'course_codes': 'Kod Kursus',
      'course_hint': 'cth. BCS1023',
      'course_already_added': 'Kursus sudah ditambah',
      'add_at_least_one': 'Tambah sekurang-kurangnya satu kod kursus',
      'planning': 'Merancang...',
      'plan_timetable': 'Rancang Jadual',
      'your_schedule': 'Jadual Anda',
      'tap_plan_timetable': 'Tekan "Rancang Jadual" untuk menjana jadual anda',
      'failed_plan_timetable':
          'Gagal merancang jadual. Sila cuba semula.',
      'section': 'Seksyen',

      // Chat bubble
      'copy_text': 'Salin teks',
      'save_answer': 'Simpan jawapan',
      'remove_from_saved': 'Buang dari Simpanan',
      'share': 'Kongsi',
      'copied_for_sharing': 'Disalin ke papan klip untuk perkongsian',
      'answer_saved': 'Jawapan disimpan!',
      'tap_to_retry': 'Tekan untuk cuba semula',
      'confidence': 'Keyakinan',
    },
  };
}
