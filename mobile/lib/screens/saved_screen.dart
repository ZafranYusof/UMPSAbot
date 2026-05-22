import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/chat_provider.dart';
import '../models/message.dart';
import '../l10n/app_strings.dart';

class SavedScreen extends StatelessWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
                  Icon(
                    Icons.bookmark_outline,
                    size: 64,
                    color: theme.colorScheme.onSurface.withOpacity(0.3),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    AppStrings.get('no_saved_answers', lang),
                    style: TextStyle(
                      fontSize: 16,
                      color: theme.colorScheme.onSurface.withOpacity(0.5),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppStrings.get('long_press_to_save', lang),
                    style: TextStyle(
                      fontSize: 14,
                      color: theme.colorScheme.onSurface.withOpacity(0.4),
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
              return _buildBookmarkTile(context, message, chatProvider, theme);
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
    ThemeData theme,
  ) {
    return Dismissible(
      key: Key('bookmark_${message.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: Colors.red.shade700,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) {
        chatProvider.toggleBookmark(message);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppStrings.get('removed_from_saved', chatProvider.language))),
        );
      },
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
                    color: Color(0xFFD4AF37),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _formatDate(message.timestamp, chatProvider.language),
                      style: TextStyle(
                        fontSize: 12,
                        color: theme.colorScheme.onSurface.withOpacity(0.5),
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 18),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: message.content));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(AppStrings.get('copied_to_clipboard', chatProvider.language))),
                      );
                    },
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                message.content,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.4,
                  color: theme.colorScheme.onSurface,
                ),
                maxLines: 6,
                overflow: TextOverflow.ellipsis,
              ),
              if (message.sources != null && message.sources!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  '${message.sources!.length} ${AppStrings.get('sources', chatProvider.language)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: theme.colorScheme.onSurface.withOpacity(0.4),
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
