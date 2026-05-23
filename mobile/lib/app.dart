import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'providers/settings_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/auth_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/history_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/timetable_screen.dart';
import 'screens/admin_screen_mobile.dart';
import 'screens/profile_screen.dart';
import 'l10n/app_strings.dart';

class UmpsaChatbotApp extends StatelessWidget {
  const UmpsaChatbotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsProvider>(
      builder: (context, settings, _) {
        return MaterialApp(
          title: 'UMPSA Chatbot',
          debugShowCheckedModeBanner: false,
          themeMode: ThemeMode.dark,
          theme: AppTheme.darkTheme,
          darkTheme: AppTheme.darkTheme,
          initialRoute: '/splash',
          routes: {
            '/splash': (context) => const SplashScreen(),
            '/onboarding': (context) => const OnboardingScreen(),
            '/login': (context) => const LoginScreen(),
            '/register': (context) => const RegisterScreen(),
            '/home': (context) => HomeScreen(key: HomeScreen.homeKey),
            '/profile': (context) => const ProfileScreen(),
          },
        );
      },
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  static final GlobalKey<_HomeScreenState> homeKey =
      GlobalKey<_HomeScreenState>();

  static void switchToChat(BuildContext context) {
    homeKey.currentState?.switchToTab(0);
  }

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  void switchToTab(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<ChatProvider, AuthProvider>(
      builder: (context, chatProvider, authProvider, _) {
        final lang = chatProvider.language;
        final isAdmin = authProvider.isAdmin;

        final List<Widget> screens = [
          const ChatScreen(),
          const TimetableScreen(),
          const HistoryScreen(),
          const SettingsScreen(),
          if (isAdmin) const AdminScreen(),
        ];

        // Clamp index if admin tab was removed
        final maxIndex = screens.length - 1;
        if (_currentIndex > maxIndex) {
          _currentIndex = 0;
        }

        final List<BottomNavigationBarItem> navItems = [
          BottomNavigationBarItem(
            icon: const Icon(Icons.chat_bubble_outline),
            activeIcon: const Icon(Icons.chat_bubble),
            label: AppStrings.get('nav_chat', lang),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.calendar_today_outlined),
            activeIcon: const Icon(Icons.calendar_today),
            label: AppStrings.get('nav_timetable', lang),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.history_outlined),
            activeIcon: const Icon(Icons.history),
            label: AppStrings.get('nav_history', lang),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.settings_outlined),
            activeIcon: const Icon(Icons.settings),
            label: AppStrings.get('nav_settings', lang),
          ),
          if (isAdmin)
            BottomNavigationBarItem(
              icon: const Icon(Icons.admin_panel_settings_outlined),
              activeIcon: const Icon(Icons.admin_panel_settings),
              label: AppStrings.get('nav_admin', lang),
            ),
        ];

        return Scaffold(
          body: IndexedStack(
            index: _currentIndex,
            children: screens,
          ),
          bottomNavigationBar: Container(
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(
                top: BorderSide(
                  color: AppColors.border,
                  width: 1,
                ),
              ),
            ),
            child: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) {
                setState(() => _currentIndex = index);
              },
              backgroundColor: AppColors.surface,
              selectedItemColor: AppColors.primary,
              unselectedItemColor: AppColors.textMuted,
              type: BottomNavigationBarType.fixed,
              elevation: 0,
              selectedFontSize: 12,
              unselectedFontSize: 12,
              items: navItems,
            ),
          ),
        );
      },
    );
  }
}
