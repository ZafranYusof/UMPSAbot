import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/settings_provider.dart';
import '../app.dart';
import '../l10n/app_strings.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
              _buildSectionHeader(AppStrings.get('appearance', lang)),
              _buildSettingsCard(
                children: [
                  SwitchListTile(
                    title: Text(
                      AppStrings.get('dark_mode', lang),
                      style: AppTheme.body(color: AppColors.textPrimary),
                    ),
                    subtitle: Text(
                      settings.isDarkMode
                          ? AppStrings.get('dark_theme_active', lang)
                          : AppStrings.get('light_theme_active', lang),
                      style: AppTheme.body(fontSize: 13, color: AppColors.textMuted),
                    ),
                    value: settings.isDarkMode,
                    onChanged: (_) => settings.toggleTheme(),
                    secondary: const Icon(
                      Icons.dark_mode,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),

              // Language section
              _buildSectionHeader(AppStrings.get('language', lang)),
              _buildSettingsCard(
                children: [
                  RadioListTile<String>(
                    title: Text(
                      AppStrings.get('english', lang),
                      style: AppTheme.body(color: AppColors.textPrimary),
                    ),
                    value: 'en',
                    groupValue: settings.language,
                    activeColor: AppColors.primary,
                    onChanged: (val) {
                      if (val != null) {
                        settings.setLanguage(val);
                        chat.setLanguage(val);
                      }
                    },
                    secondary: const Icon(Icons.language, color: AppColors.textSecondary),
                  ),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  RadioListTile<String>(
                    title: Text(
                      AppStrings.get('bahasa_melayu', lang),
                      style: AppTheme.body(color: AppColors.textPrimary),
                    ),
                    value: 'ms',
                    groupValue: settings.language,
                    activeColor: AppColors.primary,
                    onChanged: (val) {
                      if (val != null) {
                        settings.setLanguage(val);
                        chat.setLanguage(val);
                      }
                    },
                    secondary: const Icon(Icons.language, color: AppColors.textSecondary),
                  ),
                ],
              ),

              // Data section
              _buildSectionHeader(AppStrings.get('data', lang)),
              _buildSettingsCard(
                children: [
                  ListTile(
                    leading: const Icon(Icons.bookmark_outline, color: AppColors.primary),
                    title: Text(
                      AppStrings.get('saved_answers', lang),
                      style: AppTheme.body(color: AppColors.textPrimary),
                    ),
                    subtitle: Text(
                      '${chat.bookmarks.length} ${AppStrings.get('saved_messages_count', lang)}',
                      style: AppTheme.body(fontSize: 13, color: AppColors.textMuted),
                    ),
                    trailing: const Icon(Icons.chevron_right, size: 20, color: AppColors.textMuted),
                    onTap: () {
                      HomeScreen.homeKey.currentState?.switchToTab(3);
                    },
                  ),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  ListTile(
                    leading: const Icon(Icons.delete_outline, color: AppColors.error),
                    title: Text(
                      AppStrings.get('clear_chat_history', lang),
                      style: AppTheme.body(color: AppColors.textPrimary),
                    ),
                    subtitle: Text(
                      AppStrings.get('delete_all_conversations', lang),
                      style: AppTheme.body(fontSize: 13, color: AppColors.textMuted),
                    ),
                    onTap: () => _showClearHistoryDialog(context, chat),
                  ),
                ],
              ),

              // About section
              _buildSectionHeader(AppStrings.get('about', lang)),
              _buildSettingsCard(
                children: [
                  ListTile(
                    leading: const Icon(Icons.info_outline, color: AppColors.primary),
                    title: Text(
                      'UMPSA Chatbot',
                      style: AppTheme.body(color: AppColors.textPrimary),
                    ),
                    subtitle: Text(
                      AppStrings.get('version', lang),
                      style: AppTheme.body(fontSize: 13, color: AppColors.textMuted),
                    ),
                  ),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  ListTile(
                    leading: const Icon(Icons.school_outlined, color: AppColors.primary),
                    title: Text(
                      AppStrings.get('umpsa_full_name', lang),
                      style: AppTheme.body(color: AppColors.textPrimary),
                    ),
                    subtitle: Text(
                      AppStrings.get('ai_campus_assistant', lang),
                      style: AppTheme.body(fontSize: 13, color: AppColors.textMuted),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Center(
                child: Text(
                  AppStrings.get('made_with_love', lang),
                  style: AppTheme.body(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Account section
              _buildSectionHeader(AppStrings.get('profile_account', lang)),
              _buildSettingsCard(
                children: [
                  ListTile(
                    leading: const Icon(Icons.person_outline, color: AppColors.primary),
                    title: Text(
                      AppStrings.get('profile', lang),
                      style: AppTheme.body(color: AppColors.textPrimary),
                    ),
                    subtitle: Text(
                      AppStrings.get('profile_subtitle', lang),
                      style: AppTheme.body(fontSize: 13, color: AppColors.textMuted),
                    ),
                    trailing: const Icon(Icons.chevron_right, size: 20, color: AppColors.textMuted),
                    onTap: () => Navigator.pushNamed(context, '/profile'),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Logout section
              _buildSettingsCard(
                children: [
                  ListTile(
                    leading: const Icon(Icons.logout, color: AppColors.error),
                    title: Text(
                      AppStrings.get('logout', lang),
                      style: AppTheme.body(color: AppColors.error),
                    ),
                    onTap: () => _showLogoutDialog(context, lang),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: GoogleFonts.fraunces(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.primary,
        ),
      ),
    );
  }

  Widget _buildSettingsCard({required List<Widget> children}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(children: children),
    );
  }

  void _showClearHistoryDialog(BuildContext context, ChatProvider chat) {
    final lang = chat.language;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppStrings.get('clear_history_title', lang)),
        content: Text(
          AppStrings.get('clear_history_desc', lang),
          style: AppTheme.body(color: AppColors.textSecondary),
        ),
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
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: Text(AppStrings.get('clear', lang)),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, String lang) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppStrings.get('logout', lang)),
        content: Text(
          AppStrings.get('logout_desc', lang),
          style: AppTheme.body(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(AppStrings.get('cancel', lang)),
          ),
          TextButton(
            onPressed: () async {
              final navigator = Navigator.of(context);
              Navigator.pop(ctx);
              await context.read<AuthProvider>().logout();
              navigator.pushNamedAndRemoveUntil(
                '/login',
                (route) => false,
              );
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: Text(AppStrings.get('logout', lang)),
          ),
        ],
      ),
    );
  }
}
