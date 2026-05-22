import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/chat_provider.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/typing_indicator.dart';
import '../widgets/suggestion_chips.dart';
import '../widgets/source_citation.dart';
import '../l10n/app_strings.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  static const int _initialLoadCount = 20;
  int _displayCount = _initialLoadCount;
  bool _loadingMore = false;
  bool _showScrollToBottom = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels <=
        _scrollController.position.minScrollExtent + 50) {
      _loadMoreMessages();
    }

    final shouldShow = _scrollController.hasClients &&
        _scrollController.position.pixels <
            _scrollController.position.maxScrollExtent - 200;
    if (shouldShow != _showScrollToBottom) {
      setState(() => _showScrollToBottom = shouldShow);
    }
  }

  void _loadMoreMessages() {
    if (_loadingMore) return;
    final provider = context.read<ChatProvider>();
    if (_displayCount >= provider.messages.length) return;

    setState(() {
      _loadingMore = true;
    });

    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) {
        setState(() {
          _displayCount += 20;
          _loadingMore = false;
        });
      }
    });
  }

  void _sendMessage(String text) {
    if (text.trim().isEmpty) return;
    HapticFeedback.mediumImpact();
    final provider = context.read<ChatProvider>();
    provider.sendMessage(text);
    _textController.clear();
    setState(() {
      _displayCount = provider.messages.length + 2;
    });
    _scrollToBottom();
  }

  void _scrollToBottom({bool immediate = false}) {
    Future.delayed(Duration(milliseconds: immediate ? 50 : 150), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'UMPSA Chatbot',
              style: GoogleFonts.fraunces(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            Consumer<ChatProvider>(
              builder: (context, provider, _) {
                if (provider.isTyping) {
                  return Text(
                    AppStrings.get('typing', provider.language),
                    style: AppTheme.body(
                      fontSize: 12,
                      color: AppColors.primary,
                    ),
                  );
                }
                return Text(
                  provider.isOnline
                      ? AppStrings.get('online', provider.language)
                      : AppStrings.get('offline', provider.language),
                  style: AppTheme.body(
                    fontSize: 12,
                    color: provider.isOnline
                        ? AppColors.textMuted
                        : AppColors.warning,
                  ),
                );
              },
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined, color: AppColors.textSecondary),
            tooltip: AppStrings.get('new_chat', context.watch<ChatProvider>().language),
            onPressed: () {
              HapticFeedback.lightImpact();
              context.read<ChatProvider>().startNewChat();
              setState(() => _displayCount = _initialLoadCount);
            },
          ),
        ],
      ),
      body: SafeArea(
        bottom: false,
        child: Consumer<ChatProvider>(
          builder: (context, chatProvider, child) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (chatProvider.isTyping || chatProvider.messages.isNotEmpty) {
                if (!_showScrollToBottom) {
                  _scrollToBottom(immediate: true);
                }
              }
            });

            return Stack(
              children: [
                Column(
                  children: [
                    if (!chatProvider.isOnline) _buildOfflineBanner(),
                    Expanded(
                      child: chatProvider.messages.isEmpty
                          ? _buildEmptyState(context, chatProvider)
                          : _buildMessageList(chatProvider),
                    ),
                    _buildInputArea(),
                  ],
                ),
                if (_showScrollToBottom && chatProvider.messages.isNotEmpty)
                  Positioned(
                    bottom: 80,
                    right: 16,
                    child: _buildScrollToBottomButton(),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildOfflineBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      color: AppColors.warning.withOpacity(0.15),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.wifi_off_rounded, color: AppColors.warning, size: 16),
          const SizedBox(width: 8),
          Text(
            AppStrings.get('no_internet', context.read<ChatProvider>().language),
            style: AppTheme.body(fontSize: 13, color: AppColors.warning),
          ),
          const Spacer(),
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              context.read<ChatProvider>().retryLastMessage();
            },
            child: Text(
              AppStrings.get('retry', context.read<ChatProvider>().language),
              style: AppTheme.body(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScrollToBottomButton() {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        _scrollToBottom();
      },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.surface,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: const Icon(
          Icons.keyboard_arrow_down_rounded,
          color: AppColors.primary,
          size: 24,
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, ChatProvider chatProvider) {
    final lang = chatProvider.language;
    final isBm = lang == 'bm' || lang == 'ms';

    final categories = [
      {
        'icon': Icons.school_rounded,
        'title': isBm ? 'Akademik' : 'Academic',
        'questions': isBm
            ? ['Macam mana nak daftar kursus?', 'Apa syarat kemasukan UMPSA?']
            : ['How to register courses?', 'What are UMPSA entry requirements?'],
      },
      {
        'icon': Icons.payments_rounded,
        'title': isBm ? 'Kewangan' : 'Finance',
        'questions': isBm
            ? ['Berapa yuran semester?', 'Ada biasiswa tak?']
            : ['How much is semester fees?', 'Any scholarships available?'],
      },
      {
        'icon': Icons.location_on_rounded,
        'title': isBm ? 'Kampus' : 'Campus',
        'questions': isBm
            ? ['Senarai fakulti di UMPSA', 'Perpustakaan kat mana?']
            : ['List of faculties in UMPSA', 'Where is the library?'],
      },
    ];

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primary.withOpacity(0.3)),
              ),
              child: const Icon(
                Icons.school_rounded,
                size: 36,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              AppStrings.get('greeting', lang),
              style: AppTheme.heading(fontSize: 24),
            ),
            const SizedBox(height: 8),
            Text(
              AppStrings.get('greeting_subtitle', lang),
              textAlign: TextAlign.center,
              style: AppTheme.body(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 28),
            // Category cards
            ...categories.map((cat) => _buildQuestionCategory(
              icon: cat['icon'] as IconData,
              title: cat['title'] as String,
              questions: cat['questions'] as List<String>,
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionCategory({
    required IconData icon,
    required String title,
    required List<String> questions,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: AppTheme.body(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...questions.map((q) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                _sendMessage(q);
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        q,
                        style: AppTheme.body(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 12,
                      color: AppColors.primary.withOpacity(0.6),
                    ),
                  ],
                ),
              ),
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildMessageList(ChatProvider chatProvider) {
    final allMessages = chatProvider.messages;
    final totalCount = allMessages.length;
    final startIndex = (totalCount - _displayCount).clamp(0, totalCount);
    final visibleMessages = allMessages.sublist(startIndex);

    final itemCount = visibleMessages.length + (chatProvider.isTyping ? 1 : 0);

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.only(top: 16, bottom: 8),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        if (index < visibleMessages.length) {
          final message = visibleMessages[index];
          final widgets = <Widget>[ChatBubble(message: message)];

          if (!message.isUser &&
              message.sources != null &&
              message.sources!.isNotEmpty &&
              !message.isStreaming) {
            widgets.add(SourceCitation(sources: message.sources!));
          }

          if (!message.isUser &&
              index == visibleMessages.length - 1 &&
              message.suggestions != null &&
              message.suggestions!.isNotEmpty &&
              !message.isStreaming) {
            widgets.add(SuggestionChips(
              suggestions: message.suggestions!,
              onTap: _sendMessage,
            ));
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: widgets,
          );
        }

        if (chatProvider.isTyping) {
          return const TypingIndicator();
        }

        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              focusNode: _focusNode,
              textCapitalization: TextCapitalization.sentences,
              maxLines: 4,
              minLines: 1,
              style: AppTheme.body(fontSize: 15, color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: AppStrings.get('type_your_question', context.watch<ChatProvider>().language),
                hintStyle: AppTheme.body(fontSize: 15, color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              onSubmitted: _sendMessage,
            ),
          ),
          const SizedBox(width: 8),
          _SendButton(onPressed: () => _sendMessage(_textController.text)),
        ],
      ),
    );
  }
}

class _SendButton extends StatefulWidget {
  final VoidCallback onPressed;

  const _SendButton({required this.onPressed});

  @override
  State<_SendButton> createState() => _SendButtonState();
}

class _SendButtonState extends State<_SendButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        widget.onPressed();
      },
      onTapCancel: () => _controller.reverse(),
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(
            Icons.send_rounded,
            color: AppColors.background,
            size: 20,
          ),
        ),
      ),
    );
  }
}
