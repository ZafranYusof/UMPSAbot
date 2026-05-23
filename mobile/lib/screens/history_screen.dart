import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../config/theme.dart';
import '../providers/chat_provider.dart';
import '../models/conversation.dart';
import '../models/message.dart';
import '../app.dart';
import '../l10n/app_strings.dart';
import 'package:intl/intl.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Consumer<ChatProvider>(
          builder: (context, provider, _) {
            return Text(AppStrings.get('chat_history', provider.language));
          },
        ),
        actions: [
          Consumer<ChatProvider>(
            builder: (context, provider, _) {
              if (provider.conversations.isEmpty && provider.bookmarks.isEmpty) {
                return const SizedBox.shrink();
              }
              return IconButton(
                icon: const Icon(Icons.delete_sweep_outlined, color: AppColors.textSecondary),
                tooltip: AppStrings.get('clear_all', provider.language),
                onPressed: () => _showClearDialog(context, provider),
              );
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: Consumer<ChatProvider>(
            builder: (context, provider, _) {
              final lang = provider.language;
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: TabBar(
                  controller: _tabController,
                  indicatorSize: TabBarIndicatorSize.tab,
                  indicator: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  labelColor: AppColors.background,
                  unselectedLabelColor: AppColors.textMuted,
                  labelStyle: AppTheme.body(fontSize: 13, fontWeight: FontWeight.w600),
                  unselectedLabelStyle: AppTheme.body(fontSize: 13),
                  dividerHeight: 0,
                  tabs: [
                    Tab(
                      height: 36,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.history, size: 16),
                          const SizedBox(width: 6),
                          Text(AppStrings.get('nav_history', lang)),
                        ],
                      ),
                    ),
                    Tab(
                      height: 36,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.bookmark, size: 16),
                          const SizedBox(width: 6),
                          Text(AppStrings.get('nav_saved', lang)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildHistoryTab(),
          _buildSavedTab(),
        ],
      ),
    );
  }

  // ─── History Tab ───────────────────────────────────────────────────────────

  Widget _buildHistoryTab() {
    return Consumer<ChatProvider>(
      builder: (context, chatProvider, child) {
        if (chatProvider.isLoadingHistory) {
          return _buildSkeletonList();
        }

        if (chatProvider.conversations.isEmpty) {
          return _buildEmptyHistoryState(context);
        }

        return RefreshIndicator(
          onRefresh: () async {
            HapticFeedback.mediumImpact();
            await chatProvider.refreshConversations();
          },
          color: AppColors.primary,
          backgroundColor: AppColors.surface,
          displacement: 60,
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            padding: const EdgeInsets.symmetric(vertical: 12),
            itemCount: chatProvider.conversations.length,
            itemBuilder: (context, index) {
              final conversation = chatProvider.conversations[index];
              return _buildConversationTile(
                  context, conversation, chatProvider, index);
            },
          ),
        );
      },
    );
  }

  Widget _buildEmptyHistoryState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(
                Icons.forum_outlined,
                size: 44,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 24),
            Consumer<ChatProvider>(
              builder: (context, provider, _) {
                final lang = provider.language;
                return Column(
                  children: [
                    Text(
                      AppStrings.get('no_conversations', lang),
                      style: AppTheme.heading(fontSize: 18),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      AppStrings.get('no_conversations_desc', lang),
                      textAlign: TextAlign.center,
                      style: AppTheme.body(
                        fontSize: 14,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 32),
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                HomeScreen.switchToChat(context);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.chat_bubble_outline_rounded,
                        size: 18, color: AppColors.background),
                    const SizedBox(width: 8),
                    Consumer<ChatProvider>(
                      builder: (context, provider, _) {
                        return Text(
                          AppStrings.get('start_chatting', provider.language),
                          style: AppTheme.body(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.background,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSkeletonList() {
    return Shimmer.fromColors(
      baseColor: AppColors.surfaceLight,
      highlightColor: AppColors.surface,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 12),
        itemCount: 6,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          height: 14,
                          width: double.infinity,
                          margin: const EdgeInsets.only(right: 40),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Container(
                          height: 10,
                          width: 150,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildConversationTile(BuildContext context, Conversation conversation,
      ChatProvider chatProvider, int index) {
    final dateFormat = DateFormat('MMM d, yyyy • h:mm a');

    return Dismissible(
      key: Key(conversation.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.delete_outline_rounded, color: AppColors.background, size: 24),
            const SizedBox(height: 4),
            Text(
              AppStrings.get('delete', chatProvider.language),
              style: AppTheme.body(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.background,
              ),
            ),
          ],
        ),
      ),
      confirmDismiss: (direction) async {
        HapticFeedback.mediumImpact();
        return true;
      },
      onDismissed: (_) {
        chatProvider.deleteConversation(conversation.id);
        final lang = chatProvider.language;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppStrings.get('conversation_deleted', lang)),
            action: SnackBarAction(
              label: AppStrings.get('undo', lang),
              textColor: AppColors.primary,
              onPressed: () {},
            ),
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Material(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () {
              HapticFeedback.selectionClick();
              chatProvider.loadConversation(conversation);
              HomeScreen.switchToChat(context);
            },
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.chat_bubble_outline_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          conversation.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTheme.body(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${conversation.messages.length} ${AppStrings.get('messages_count', chatProvider.language)} • ${dateFormat.format(conversation.updatedAt)}',
                          style: AppTheme.body(
                            fontSize: 12,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: AppColors.textMuted,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ─── Saved Tab ─────────────────────────────────────────────────────────────

  Widget _buildSavedTab() {
    return Consumer<ChatProvider>(
      builder: (context, chatProvider, child) {
        final bookmarks = chatProvider.bookmarks;
        final lang = chatProvider.language;

        if (bookmarks.isEmpty) {
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

  // ─── Dialogs ───────────────────────────────────────────────────────────────

  void _showClearDialog(BuildContext context, ChatProvider provider) {
    HapticFeedback.mediumImpact();
    final lang = provider.language;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppStrings.get('clear_all_history', lang)),
        content: Text(
          AppStrings.get('clear_all_history_desc', lang),
          style: AppTheme.body(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(AppStrings.get('cancel', lang)),
          ),
          TextButton(
            onPressed: () {
              HapticFeedback.mediumImpact();
              provider.clearAllHistory();
              Navigator.pop(ctx);
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: Text(AppStrings.get('delete_all', lang)),
          ),
        ],
      ),
    );
  }
}
