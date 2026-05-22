import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/chat_provider.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/typing_indicator.dart';
import '../widgets/suggestion_chips.dart';
import '../widgets/source_citation.dart';

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
    // Lazy load: when scrolling to top, load more messages
    if (_scrollController.position.pixels <=
        _scrollController.position.minScrollExtent + 50) {
      _loadMoreMessages();
    }

    // Show/hide scroll to bottom button
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
    // Reset display count to show all messages including new ones
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
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF003366), Color(0xFF1A4D80)],
                ),
                borderRadius: BorderRadius.circular(17),
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
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'UMPSA Chatbot',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                Consumer<ChatProvider>(
                  builder: (context, provider, _) {
                    if (provider.isTyping) {
                      return const Text(
                        'typing...',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w400,
                          color: Color(0xFFD4AF37),
                        ),
                      );
                    }
                    return Text(
                      provider.isOnline ? 'Online' : 'Offline',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w400,
                        color: provider.isOnline
                            ? Colors.white70
                            : Colors.orange.shade300,
                      ),
                    );
                  },
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            tooltip: 'New Chat',
            onPressed: () {
              HapticFeedback.lightImpact();
              context.read<ChatProvider>().startNewChat();
              setState(() => _displayCount = _initialLoadCount);
            },
          ),
        ],
      ),
      body: Consumer<ChatProvider>(
        builder: (context, chatProvider, child) {
          // Auto-scroll when new messages arrive
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
                  // Offline banner
                  if (!chatProvider.isOnline)
                    _buildOfflineBanner(),
                  // Messages
                  Expanded(
                    child: chatProvider.messages.isEmpty
                        ? _buildEmptyState(context, chatProvider)
                        : _buildMessageList(chatProvider),
                  ),
                  // Input area
                  _buildInputArea(theme),
                ],
              ),
              // Scroll to bottom FAB
              if (_showScrollToBottom && chatProvider.messages.isNotEmpty)
                Positioned(
                  bottom: 90,
                  right: 16,
                  child: _buildScrollToBottomButton(),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildOfflineBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.orange.shade800,
        boxShadow: [
          BoxShadow(
            color: Colors.orange.shade900.withOpacity(0.3),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.wifi_off_rounded, color: Colors.white, size: 16),
          const SizedBox(width: 8),
          const Text(
            'No internet connection',
            style: TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const Spacer(),
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              context.read<ChatProvider>().retryLastMessage();
            },
            child: const Text(
              'Retry',
              style: TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
                decoration: TextDecoration.underline,
                decorationColor: Colors.white,
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
          color: const Color(0xFF003366),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF003366).withOpacity(0.4),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: const Icon(
          Icons.keyboard_arrow_down_rounded,
          color: Colors.white,
          size: 24,
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, ChatProvider chatProvider) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final starterQuestions = [
      'Macam mana nak daftar kursus?',
      'Berapa yuran semester?',
      'Apa syarat kemasukan UMPSA?',
      'Senarai fakulti di UMPSA',
      'How to check exam results?',
      'Where is the library?',
    ];

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Animated logo
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: isDark
                      ? [
                          const Color(0xFF003366).withOpacity(0.4),
                          const Color(0xFF1A4D80).withOpacity(0.3),
                        ]
                      : [
                          const Color(0xFF003366).withOpacity(0.1),
                          const Color(0xFF003366).withOpacity(0.05),
                        ],
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF003366).withOpacity(0.1),
                    blurRadius: 20,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Icon(
                Icons.school_rounded,
                size: 48,
                color: isDark ? const Color(0xFF4A90D9) : const Color(0xFF003366),
              ),
            ),
            const SizedBox(height: 28),
            Text(
              'Assalamualaikum! 👋',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Saya UMPSABot, pembantu AI anda.\nTanya apa-apa tentang UMPSA!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: theme.colorScheme.onSurface.withOpacity(0.55),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 36),
            // Section label
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                'SOALAN POPULAR',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onSurface.withOpacity(0.35),
                  letterSpacing: 1.2,
                ),
              ),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 10,
              alignment: WrapAlignment.center,
              children: starterQuestions.map((q) {
                return GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    _sendMessage(q);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: const Color(0xFFD4AF37).withOpacity(isDark ? 0.4 : 0.5),
                      ),
                      borderRadius: BorderRadius.circular(20),
                      color: const Color(0xFFD4AF37).withOpacity(isDark ? 0.1 : 0.05),
                    ),
                    child: Text(
                      q,
                      style: TextStyle(
                        color: isDark
                            ? const Color(0xFFE8C84A)
                            : const Color(0xFFB8941F),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageList(ChatProvider chatProvider) {
    final allMessages = chatProvider.messages;
    final totalCount = allMessages.length;
    final startIndex = (totalCount - _displayCount).clamp(0, totalCount);
    final visibleMessages = allMessages.sublist(startIndex);

    final itemCount = visibleMessages.length + (chatProvider.isTyping ? 1 : 0);

    return Column(
      children: [
        // Loading more indicator
        if (_loadingMore || startIndex > 0)
          if (_loadingMore)
            const Padding(
              padding: EdgeInsets.all(8),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Color(0xFFD4AF37),
                ),
              ),
            ),
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.only(top: 16, bottom: 8),
            itemCount: itemCount,
            itemBuilder: (context, index) {
              if (index < visibleMessages.length) {
                final message = visibleMessages[index];
                final widgets = <Widget>[ChatBubble(message: message)];

                // Show sources after bot messages
                if (!message.isUser &&
                    message.sources != null &&
                    message.sources!.isNotEmpty &&
                    !message.isStreaming) {
                  widgets.add(SourceCitation(sources: message.sources!));
                }

                // Show suggestions after the last bot message
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

              // Typing indicator
              if (chatProvider.isTyping) {
                return const TypingIndicator();
              }

              return const SizedBox.shrink();
            },
          ),
        ),
      ],
    );
  }

  Widget _buildInputArea(ThemeData theme) {
    return Container(
      padding: EdgeInsets.only(
        left: 12,
        right: 12,
        top: 12,
        bottom: 12,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: theme.colorScheme.onSurface.withOpacity(0.06),
                ),
              ),
              child: TextField(
                controller: _textController,
                focusNode: _focusNode,
                textCapitalization: TextCapitalization.sentences,
                maxLines: 4,
                minLines: 1,
                style: TextStyle(
                  fontSize: 15,
                  color: theme.colorScheme.onSurface,
                  height: 1.4,
                ),
                decoration: InputDecoration(
                  hintText: 'Type your question...',
                  hintStyle: TextStyle(
                    color: theme.colorScheme.onSurface.withOpacity(0.35),
                    fontSize: 15,
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                ),
                onSubmitted: _sendMessage,
              ),
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
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFD4AF37), Color(0xFFC49B2C)],
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFD4AF37).withOpacity(0.4),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: const Icon(
            Icons.send_rounded,
            color: Color(0xFF1A1A1A),
            size: 20,
          ),
        ),
      ),
    );
  }
}
