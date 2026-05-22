import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/chat_provider.dart';
import '../providers/settings_provider.dart';
import '../app.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: Consumer2<SettingsProvider, ChatProvider>(
        builder: (context, settings, chat, _) {
          return ListView(
            padding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              // Appearance section
              _buildSectionHeader(theme, 'Appearance'),
              SwitchListTile(
                title: const Text('Dark Mode'),
                subtitle: Text(
                  settings.isDarkMode ? 'Dark theme active' : 'Light theme active',
                ),
                value: settings.isDarkMode,
                onChanged: (_) => settings.toggleTheme(),
                secondary: Icon(
                  settings.isDarkMode ? Icons.dark_mode : Icons.light_mode,
                  color: const Color(0xFFD4AF37),
                ),
              ),
              const Divider(height: 1),

              // Language section
              _buildSectionHeader(theme, 'Language'),
              RadioListTile<String>(
                title: const Text('English'),
                value: 'en',
                groupValue: settings.language,
                onChanged: (val) {
                  if (val != null) {
                    settings.setLanguage(val);
                    chat.setLanguage(val);
                  }
                },
                secondary: const Icon(Icons.language),
              ),
              RadioListTile<String>(
                title: const Text('Bahasa Melayu'),
                value: 'ms',
                groupValue: settings.language,
                onChanged: (val) {
                  if (val != null) {
                    settings.setLanguage(val);
                    chat.setLanguage(val);
                  }
                },
                secondary: const Icon(Icons.language),
              ),
              const Divider(height: 1),

              // Data section
              _buildSectionHeader(theme, 'Data'),
              ListTile(
                leading: const Icon(Icons.bookmark_outline,
                    color: Color(0xFFD4AF37)),
                title: const Text('Saved Answers'),
                subtitle: Text('${chat.bookmarks.length} saved messages'),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () {
                  HomeScreen.homeKey.currentState?.switchToTab(3);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Colors.red),
                title: const Text('Clear Chat History'),
                subtitle: const Text('Delete all saved conversations'),
                onTap: () => _showClearHistoryDialog(context, chat),
              ),
              const Divider(height: 1),

              // About section
              _buildSectionHeader(theme, 'About'),
              ListTile(
                leading: const Icon(Icons.info_outline,
                    color: Color(0xFFD4AF37)),
                title: const Text('UMPSA Chatbot'),
                subtitle: const Text('Version 1.0.0'),
              ),
              ListTile(
                leading: const Icon(Icons.school_outlined,
                    color: Color(0xFF003366)),
                title: const Text('Universiti Malaysia Pahang Al-Sultan Abdullah'),
                subtitle: const Text('AI-powered campus assistant'),
              ),
              const SizedBox(height: 32),
              Center(
                child: Text(
                  'Made with ❤️ for UMPSA students',
                  style: TextStyle(
                    color: theme.colorScheme.onSurface.withOpacity(0.4),
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(ThemeData theme, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: theme.colorScheme.primary,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  void _showClearHistoryDialog(BuildContext context, ChatProvider chat) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear History'),
        content: const Text(
            'This will delete all your saved conversations. This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              chat.clearAllHistory();
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('History cleared')),
              );
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }
}
