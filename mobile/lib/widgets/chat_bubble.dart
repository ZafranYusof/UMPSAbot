import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/theme.dart';
import '../models/message.dart';
import '../providers/chat_provider.dart';
import '../l10n/app_strings.dart';
import 'timetable_card.dart';

class ChatBubble extends StatelessWidget {
  final Message message;

  const ChatBubble({
    super.key,
    required this.message,
  });

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
                  color: isUser ? AppColors.primary : AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: isUser
                      ? null
                      : Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (message.isStreaming && message.content.isEmpty)
                      _buildStreamingCursor()
                    else if (isUser)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (message.isPending)
                            Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: Icon(
                                Icons.access_time_rounded,
                                size: 14,
                                color: AppColors.background.withOpacity(0.6),
                              ),
                            ),
                          Flexible(
                            child: Text(
                              message.content,
                              textAlign: TextAlign.start,
                              style: AppTheme.body(
                                fontSize: 15,
                                color: message.isPending
                                    ? AppColors.background.withOpacity(0.6)
                                    : AppColors.background,
                              ),
                            ),
                          ),
                        ],
                      )
                    else if (!message.isUser && isTimetableMessage(message.content))
                      TimetableCard(content: message.content)
                    else
                      MarkdownBody(
                        data: message.content,
                        selectable: false,
                        shrinkWrap: true,
                        onTapLink: (text, href, title) {
                          if (href != null && href.isNotEmpty) {
                            launchUrl(
                              Uri.parse(href),
                              mode: LaunchMode.externalApplication,
                            );
                          }
                        },
                        styleSheet: MarkdownStyleSheet(
                          p: AppTheme.body(
                            fontSize: 15,
                            color: AppColors.textPrimary,
                          ),
                          h1: AppTheme.heading(
                            fontSize: 20,
                            color: AppColors.textPrimary,
                          ),
                          h2: AppTheme.heading(
                            fontSize: 18,
                            color: AppColors.textPrimary,
                          ),
                          h3: AppTheme.heading(
                            fontSize: 16,
                            color: AppColors.textPrimary,
                          ),
                          h4: AppTheme.body(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                          h5: AppTheme.body(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                          h6: AppTheme.body(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                          strong: AppTheme.body(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                          em: AppTheme.body(
                            fontSize: 15,
                            color: AppColors.textSecondary,
                          ),
                          code: AppTheme.body(
                            fontSize: 13,
                            color: AppColors.primaryLight,
                          ),
                          codeblockDecoration: BoxDecoration(
                            color: AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          codeblockPadding: const EdgeInsets.all(12),
                          blockquoteDecoration: BoxDecoration(
                            border: Border(
                              left: BorderSide(
                                color: AppColors.primary,
                                width: 3,
                              ),
                            ),
                          ),
                          blockquotePadding: const EdgeInsets.only(left: 12),
                          listBullet: AppTheme.body(
                            fontSize: 15,
                            color: AppColors.primary,
                          ),
                          a: AppTheme.body(
                            fontSize: 15,
                            color: AppColors.primary,
                          ),
                          tableHead: AppTheme.body(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                          tableBody: AppTheme.body(
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                          tableBorder: TableBorder.all(
                            color: AppColors.border,
                            width: 1,
                          ),
                          horizontalRuleDecoration: BoxDecoration(
                            border: Border(
                              top: BorderSide(
                                color: AppColors.border,
                                width: 1,
                              ),
                            ),
                          ),
                        ),
                      ),
                    if (message.isStreaming && message.content.isNotEmpty)
                      _buildStreamingCursor(),
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
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${AppStrings.get('confidence', context.read<ChatProvider>().language)}: ${(message.confidence! * 100).toStringAsFixed(0)}%',
                          style: AppTheme.body(
                            fontSize: 11,
                            color: AppColors.textMuted,
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

  Widget _buildStreamingCursor() {
    return SizedBox(
      width: 8,
      height: 16,
      child: _BlinkingCursor(color: AppColors.textMuted),
    );
  }

  Widget _buildErrorBubble(BuildContext context, ThemeData theme) {
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
                color: AppColors.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.error.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.error_outline,
                          size: 16, color: AppColors.error),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          message.content,
                          style: AppTheme.body(
                            fontSize: 14,
                            color: AppColors.error,
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
                        color: AppColors.error.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.refresh_rounded,
                              size: 15, color: AppColors.error),
                          const SizedBox(width: 6),
                          Text(
                            AppStrings.get('tap_to_retry', context.read<ChatProvider>().language),
                            style: AppTheme.body(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.error,
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

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(14)),
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
                  color: AppColors.textMuted,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    message.content.length > 100
                        ? '${message.content.substring(0, 100)}...'
                        : message.content,
                    style: AppTheme.body(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              ListTile(
                leading: const Icon(Icons.copy_rounded, color: AppColors.primary),
                title: Text(AppStrings.get('copy_text', lang),
                    style: AppTheme.body(color: AppColors.textPrimary)),
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
                    color: AppColors.primary,
                  ),
                  title: Text(
                    isBookmarked
                        ? AppStrings.get('remove_from_saved', lang)
                        : AppStrings.get('save_answer', lang),
                    style: AppTheme.body(color: AppColors.textPrimary),
                  ),
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
                  leading: const Icon(Icons.share_outlined, color: AppColors.textSecondary),
                  title: Text(AppStrings.get('share', lang),
                      style: AppTheme.body(color: AppColors.textPrimary)),
                  onTap: () {
                    HapticFeedback.lightImpact();
                    Navigator.pop(ctx);
                    Share.share(message.content);
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
            color: const Color(0xFF003366).withOpacity(0.4),
            blurRadius: 6,
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
