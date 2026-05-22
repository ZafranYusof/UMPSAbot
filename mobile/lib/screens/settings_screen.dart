import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/chat_provider.dart';
import '../providers/settings_provider.dart';
import '../app.dart';
import '../l10n/app_strings.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Consumer<ChatProvider>(
          builder: (context, chat, _) {
            return Text(AppStrings.get('settings', chat.language));
          },
        ),
      ),
      body: Consumer2<SettingsProvider, ChatProvider>(
        builder: (context, settings, chat, _) {
          final lang = chat.language;
          return ListView(
            padding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              // Appearance section
              _buildSectionHeader(theme, AppStrings.get('appearance', lang)),
              SwitchListTile(
                title: Text(AppStrings.get('dark_mode', lang)),
                subtitle: Text(
                  settings.isDarkMode
                      ? AppStrings.get('dark_theme_active', lang)
                      : AppStrings.get('light_theme_active', lang),
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
              _buildSectionHeader(theme, AppStrings.get('language', lang)),
              RadioListTile<String>(
                title: Text(AppStrings.get('english', lang)),
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
                title: Text(AppStrings.get('bahasa_melayu', lang)),
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
              _buildSectionHeader(theme, AppStrings.get('data', lang)),
              ListTile(
                leading: const Icon(Icons.bookmark_outline,
                    color: Color(0xFFD4AF37)),
                title: Text(AppStrings.get('saved_answers', lang)),
                subtitle: Text('${chat.bookmarks.length} ${AppStrings.get('saved_messages_count', lang)}'),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () {
                  HomeScreen.homeKey.currentState?.switchToTab(3);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Colors.red),
                title: Text(AppStrings.get('clear_chat_history', lang)),
                subtitle: Text(AppStrings.get('delete_all_conversations', lang)),
                onTap: () => _showClearHistoryDialog(context, chat),
              ),
              const Divider(height: 1),

              // About section
              _buildSectionHeader(theme, AppStrings.get('about', lang)),
              ListTile(
                leading: const Icon(Icons.info_outline,
                    color: Color(0xFFD4AF37)),
                title: const Text('UMPSA Chatbot'),
                subtitle: Text(AppStrings.get('version', lang)),
              ),
              ListTile(
                leading: const Icon(Icons.school_outlined,
                    color: Color(0xFF003366)),
                title: Text(AppStrings.get('umpsa_full_name', lang)),
                subtitle: Text(AppStrings.get('ai_campus_assistant', lang)),
              ),
              const SizedBox(height: 32),
              Center(
                child: Text(
                  AppStrings.get('made_with_love', lang),
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
    final lang = chat.language;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppStrings.get('clear_history_title', lang)),
        content: Text(AppStrings.get('clear_history_desc', lang)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(AppStrings.get('cancel', lang)),
          ),
          TextButton(
            onPressed: () {
              chat.clearAllHistory();
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(AppStrings.get('history_cleared', lang))),
              );
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(AppStrings.get('clear', lang)),
          ),
        ],
      ),
    );
  }
}
