import 'package:flutter/material.dart';

class TypingIndicator extends StatefulWidget {
  const TypingIndicator({super.key});

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with TickerProviderStateMixin {
  late final AnimationController _appearController;
  late final Animation<double> _appearAnimation;
  late final List<AnimationController> _dotControllers;
  late final List<Animation<double>> _dotAnimations;
  late final List<Animation<double>> _opacityAnimations;

  @override
  void initState() {
    super.initState();

    // Appear animation for the whole bubble
    _appearController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _appearAnimation = CurvedAnimation(
      parent: _appearController,
      curve: Curves.easeOutBack,
    );
    _appearController.forward();

    // Dot bounce animations with staggered start
    _dotControllers = List.generate(3, (index) {
      return AnimationController(
        duration: const Duration(milliseconds: 800),
        vsync: this,
      );
    });

    _dotAnimations = _dotControllers.map((controller) {
      return Tween<double>(begin: 0, end: -6).animate(
        CurvedAnimation(parent: controller, curve: Curves.easeInOutCubic),
      );
    }).toList();

    _opacityAnimations = _dotControllers.map((controller) {
      return Tween<double>(begin: 0.4, end: 1.0).animate(
        CurvedAnimation(parent: controller, curve: Curves.easeInOut),
      );
    }).toList();

    for (int i = 0; i < 3; i++) {
      Future.delayed(Duration(milliseconds: i * 180), () {
        if (mounted) {
          _dotControllers[i].repeat(reverse: true);
        }
      });
    }
  }

  @override
  void dispose() {
    _appearController.dispose();
    for (final controller in _dotControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ScaleTransition(
      scale: _appearAnimation,
      alignment: Alignment.bottomLeft,
      child: FadeTransition(
        opacity: _appearAnimation,
        child: Padding(
          padding: const EdgeInsets.only(left: 12, right: 48, top: 3, bottom: 3),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
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
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(20),
                    topRight: Radius.circular(20),
                    bottomLeft: Radius.circular(6),
                    bottomRight: Radius.circular(20),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(3, (index) {
                    return AnimatedBuilder(
                      animation: _dotControllers[index],
                      builder: (context, child) {
                        return Transform.translate(
                          offset: Offset(0, _dotAnimations[index].value),
                          child: Opacity(
                            opacity: _opacityAnimations[index].value,
                            child: child,
                          ),
                        );
                      },
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: const Color(0xFFD4AF37),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFD4AF37).withOpacity(0.3),
                              blurRadius: 3,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
