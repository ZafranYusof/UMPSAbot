import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/message.dart';
import '../providers/chat_provider.dart';
import '../l10n/app_strings.dart';

class ChatBubble extends StatelessWidget {
  final Message message;

  const ChatBubble({
    super.key,
    required this.message,
  });

  /// Strip markdown formatting from text
  String _stripMarkdown(String text) {
    return text
        .replaceAll(RegExp(r'\*\*(.+?)\*\*'), r'$1') // **bold**
        .replaceAll(RegExp(r'\*(.+?)\*'), r'$1')     // *italic*
        .replaceAll(RegExp(r'__(.+?)__'), r'$1')       // __bold__
        .replaceAll(RegExp(r'_(.+?)_'), r'$1')         // _italic_
        .replaceAll(RegExp(r'^#{1,6}\s+', multiLine: true), '') // headers
        .replaceAll(RegExp(r'`(.+?)`'), r'$1');        // `code`
  }

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    final theme = Theme.of(context);

    if (message.isError && !isUser) {
      return _buildErrorBubble(context, theme);
    }

    return GestureDetector(
      onLongPress: () => _showMessageOptions(context),
      child: Padding(
        padding: EdgeInsets.only(
          left: isUser ? 48 : 12,
          right: isUser ? 12 : 48,
          top: 3,
          bottom: 3,
        ),
        child: Row(
          mainAxisAlignment:
              isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (!isUser) _buildAvatar(context),
            if (!isUser) const SizedBox(width: 8),
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: isUser
                      ? const Color(0xFFD4AF37)
                      : theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(20),
                    topRight: const Radius.circular(20),
                    bottomLeft: Radius.circular(isUser ? 20 : 6),
                    bottomRight: Radius.circular(isUser ? 6 : 20),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: isUser
                          ? const Color(0xFFD4AF37).withOpacity(0.25)
                          : Colors.black.withOpacity(0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                      spreadRadius: 0,
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (message.isStreaming && message.content.isEmpty)
                      _buildStreamingCursor(theme)
                    else
                      Text(
                        _stripMarkdown(message.content),
                        style: TextStyle(
                          color: isUser
                              ? const Color(0xFF1A1A1A)
                              : theme.colorScheme.onSurface,
                          fontSize: 15,
                          height: 1.45,
                          letterSpacing: 0.1,
                        ),
                      ),
                    if (message.isStreaming && message.content.isNotEmpty)
                      _buildStreamingCursor(theme),
                    if (message.confidence != null &&
                        !isUser &&
                        !message.isStreaming) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.onSurface.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${AppStrings.get('confidence', context.read<ChatProvider>().language)}: ${(message.confidence! * 100).toStringAsFixed(0)}%',
                          style: TextStyle(
                            color:
                                theme.colorScheme.onSurface.withOpacity(0.45),
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStreamingCursor(ThemeData theme) {
    return SizedBox(
      width: 8,
      height: 16,
      child:
          _BlinkingCursor(color: theme.colorScheme.onSurface.withOpacity(0.6)),
    );
  }

  Widget _buildErrorBubble(BuildContext context, ThemeData theme) {
    final isDark = theme.brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(left: 12, right: 48, top: 3, bottom: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          _buildAvatar(context),
          const SizedBox(width: 8),
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.red.shade900.withOpacity(0.3)
                    : Colors.red.shade50,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                  bottomLeft: Radius.circular(6),
                  bottomRight: Radius.circular(20),
                ),
                border: Border.all(
                  color: isDark
                      ? Colors.red.shade700.withOpacity(0.5)
                      : Colors.red.shade200,
                  width: 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.error_outline,
                          size: 16,
                          color: isDark
                              ? Colors.red.shade300
                              : Colors.red.shade700),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          message.content,
                          style: TextStyle(
                            color: isDark
                                ? Colors.red.shade200
                                : Colors.red.shade700,
                            fontSize: 14,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      context.read<ChatProvider>().retryLastMessage();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.red.shade800.withOpacity(0.4)
                            : Colors.red.shade100,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.refresh_rounded,
                              size: 15,
                              color: isDark
                                  ? Colors.red.shade200
                                  : Colors.red.shade700),
                          const SizedBox(width: 6),
                          Text(
                            AppStrings.get('tap_to_retry', context.read<ChatProvider>().language),
                            style: TextStyle(
                              color: isDark
                                  ? Colors.red.shade200
                                  : Colors.red.shade700,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showMessageOptions(BuildContext context) {
    HapticFeedback.mediumImpact();
    final chatProvider = context.read<ChatProvider>();
    final lang = chatProvider.language;
    final isBookmarked = chatProvider.isMessageBookmarked(message.id);
    final theme = Theme.of(context);

    showModalBottomSheet(
      context: context,
      backgroundColor: theme.colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurface.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Preview of message
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest
                        .withOpacity(0.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    message.content.length > 100
                        ? '${message.content.substring(0, 100)}...'
                        : message.content,
                    style: TextStyle(
                      fontSize: 13,
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                      fontStyle: FontStyle.italic,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              ListTile(
                leading: const Icon(Icons.copy_rounded, color: Color(0xFF003366)),
                title: Text(AppStrings.get('copy_text', lang)),
                onTap: () {
                  HapticFeedback.lightImpact();
                  Clipboard.setData(ClipboardData(text: message.content));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(AppStrings.get('copied_to_clipboard', lang)),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
              ),
              if (!message.isUser)
                ListTile(
                  leading: Icon(
                    isBookmarked
                        ? Icons.bookmark_rounded
                        : Icons.bookmark_outline_rounded,
                    color: const Color(0xFFD4AF37),
                  ),
                  title: Text(isBookmarked
                      ? AppStrings.get('remove_from_saved', lang)
                      : AppStrings.get('save_answer', lang)),
                  onTap: () {
                    HapticFeedback.lightImpact();
                    chatProvider.toggleBookmark(message);
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          isBookmarked
                              ? AppStrings.get('removed_from_saved', lang)
                              : AppStrings.get('answer_saved', lang),
                        ),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                ),
              if (!message.isUser)
                ListTile(
                  leading:
                      const Icon(Icons.share_outlined, color: Color(0xFF003366)),
                  title: Text(AppStrings.get('share', lang)),
                  onTap: () {
                    HapticFeedback.lightImpact();
                    Clipboard.setData(ClipboardData(text: message.content));
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(AppStrings.get('copied_for_sharing', lang)),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(BuildContext context) {
    return Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF003366), Color(0xFF1A4D80)],
        ),
        borderRadius: BorderRadius.circular(15),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF003366).withOpacity(0.3),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: const Icon(
        Icons.school_rounded,
        color: Color(0xFFD4AF37),
        size: 16,
      ),
    );
  }
}

class _BlinkingCursor extends StatefulWidget {
  final Color color;

  const _BlinkingCursor({required this.color});

  @override
  State<_BlinkingCursor> createState() => _BlinkingCursorState();
}

class _BlinkingCursorState extends State<_BlinkingCursor>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _controller,
      child: Container(
        width: 2,
        height: 16,
        decoration: BoxDecoration(
          color: widget.color,
          borderRadius: BorderRadius.circular(1),
        ),
      ),
    );
  }
}
