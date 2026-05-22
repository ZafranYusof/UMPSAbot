import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/chat_provider.dart';
import '../models/message.dart';
import '../l10n/app_strings.dart';

class SavedScreen extends StatelessWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Consumer<ChatProvider>(
          builder: (context, provider, _) {
            return Text(AppStrings.get('saved_answers', provider.language));
          },
        ),
      ),
      body: Consumer<ChatProvider>(
        builder: (context, chatProvider, child) {
          final bookmarks = chatProvider.bookmarks;

          if (bookmarks.isEmpty) {
            final lang = chatProvider.language;
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Icon(
                      Icons.bookmark_outline,
                      size: 40,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    AppStrings.get('no_saved_answers', lang),
                    style: AppTheme.heading(fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppStrings.get('long_press_to_save', lang),
                    style: AppTheme.body(
                      fontSize: 14,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: bookmarks.length,
            itemBuilder: (context, index) {
              final message = bookmarks[index];
              return _buildBookmarkTile(context, message, chatProvider);
            },
          );
        },
      ),
    );
  }

  Widget _buildBookmarkTile(
    BuildContext context,
    Message message,
    ChatProvider chatProvider,
  ) {
    return Dismissible(
      key: Key('bookmark_${message.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(Icons.delete, color: AppColors.background),
      ),
      onDismissed: (_) {
        chatProvider.toggleBookmark(message);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppStrings.get('removed_from_saved', chatProvider.language))),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.bookmark,
                    size: 18,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _formatDate(message.timestamp, chatProvider.language),
                      style: AppTheme.body(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: message.content));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(AppStrings.get('copied_to_clipboard', chatProvider.language))),
                      );
                    },
                    child: const Icon(Icons.copy, size: 18, color: AppColors.textMuted),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                message.content,
                style: AppTheme.body(
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
                maxLines: 6,
                overflow: TextOverflow.ellipsis,
              ),
              if (message.sources != null && message.sources!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  '${message.sources!.length} ${AppStrings.get('sources', chatProvider.language)}',
                  style: AppTheme.body(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date, String lang) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) return AppStrings.get('today', lang);
    if (diff.inDays == 1) return AppStrings.get('yesterday', lang);
    if (diff.inDays < 7) return '${diff.inDays} ${AppStrings.get('days_ago', lang)}';
    return '${date.day}/${date.month}/${date.year}';
  }
}
