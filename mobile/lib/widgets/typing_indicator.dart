import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../config/theme.dart';

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

    // Sine-wave dot animations with staggered start (600ms cycle, 200ms stagger)
    _dotControllers = List.generate(3, (index) {
      return AnimationController(
        duration: const Duration(milliseconds: 600),
        vsync: this,
      );
    });

    for (int i = 0; i < 3; i++) {
      Future.delayed(Duration(milliseconds: i * 200), () {
        if (mounted) {
          _dotControllers[i].repeat();
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
              // Avatar - gradient style
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
              ),
              const SizedBox(width: 8),
              // Typing bubble
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(3, (index) {
                    return AnimatedBuilder(
                      animation: _dotControllers[index],
                      builder: (context, child) {
                        // Sine wave for smooth up/down motion
                        final sineValue = math.sin(
                          _dotControllers[index].value * 2 * math.pi,
                        );
                        // Translate Y: negative = up, range -8 to 0
                        final translateY = sineValue * -8.0;
                        // Scale: 1.0 at rest, up to 1.3 at peak
                        final scale = 1.0 + (sineValue.clamp(0.0, 1.0) * 0.3);
                        // Glow opacity: stronger at peak
                        final glowOpacity = (sineValue.clamp(0.0, 1.0) * 0.6) + 0.2;

                        return Transform.translate(
                          offset: Offset(0, translateY),
                          child: Transform.scale(
                            scale: scale,
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: 9,
                              height: 9,
                              decoration: BoxDecoration(
                                color: const Color(0xFFD4AF37),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFD4AF37)
                                        .withOpacity(glowOpacity),
                                    blurRadius: 8,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
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
