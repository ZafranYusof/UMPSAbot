import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Detects if a message contains timetable data
bool isTimetableMessage(String content) {
  final hasOptions = content.contains('Option 1:');
  final hasTimetableKeyword = content.contains('kombinasi jadual') ||
      content.contains('timetable combination') ||
      content.contains('Kombinasi Jadual') ||
      content.contains('Timetable Combination');
  return hasOptions && hasTimetableKeyword;
}

/// Represents a single course block in the timetable
class TimetableEntry {
  final String courseCode;
  final String section;
  final String day;
  final String startTime;
  final String endTime;
  final String venue;

  const TimetableEntry({
    required this.courseCode,
    required this.section,
    required this.day,
    required this.startTime,
    required this.endTime,
    required this.venue,
  });
}

/// Parses timetable options from message content
class TimetableParser {
  static final _optionRegex = RegExp(r'Option (\d+):');
  static final _entryRegex = RegExp(
    r'-\s*(\w+)\s*\(Section\s+([^)]+)\):\s*(MON|TUE|WED|THU|FRI|SAT|SUN)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*@\s*(.+)',
    caseSensitive: false,
  );

  static Map<int, List<TimetableEntry>> parse(String content) {
    final options = <int, List<TimetableEntry>>{};
    final lines = content.split('\n');
    int currentOption = 0;

    for (final line in lines) {
      final optionMatch = _optionRegex.firstMatch(line);
      if (optionMatch != null) {
        currentOption = int.parse(optionMatch.group(1)!);
        options[currentOption] = [];
        continue;
      }

      if (currentOption > 0) {
        final entryMatch = _entryRegex.firstMatch(line.trim());
        if (entryMatch != null) {
          options[currentOption]!.add(TimetableEntry(
            courseCode: entryMatch.group(1)!,
            section: entryMatch.group(2)!,
            day: entryMatch.group(3)!.toUpperCase(),
            startTime: entryMatch.group(4)!,
            endTime: entryMatch.group(5)!,
            venue: entryMatch.group(6)!.trim(),
          ));
        }
      }
    }

    return options;
  }
}

/// Visual timetable card widget
class TimetableCard extends StatefulWidget {
  final String content;

  const TimetableCard({super.key, required this.content});

  @override
  State<TimetableCard> createState() => _TimetableCardState();
}

class _TimetableCardState extends State<TimetableCard> {
  late final Map<int, List<TimetableEntry>> _options;
  int _selectedOption = 1;

  // Color palette for courses
  static const _courseColors = [
    Color(0xFF4A90D9), // Blue
    Color(0xFF6FB58A), // Green
    Color(0xFFE0B470), // Amber
    Color(0xFFD47B8A), // Rose
    Color(0xFF9B7ED9), // Purple
    Color(0xFF5BBFBF), // Teal
  ];

  @override
  void initState() {
    super.initState();
    _options = TimetableParser.parse(widget.content);
    if (_options.isNotEmpty) {
      _selectedOption = _options.keys.first;
    }
  }

  Color _getColorForCourse(String courseCode, List<TimetableEntry> entries) {
    final uniqueCourses = entries.map((e) => e.courseCode).toSet().toList();
    final index = uniqueCourses.indexOf(courseCode);
    return _courseColors[index % _courseColors.length];
  }

  @override
  Widget build(BuildContext context) {
    if (_options.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
            child: Row(
              children: [
                const Text('📅', style: TextStyle(fontSize: 18)),
                const SizedBox(width: 8),
                Text(
                  'Timetable Options',
                  style: AppTheme.body(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          // Option selector chips
          SizedBox(
            height: 36,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _options.length,
              itemBuilder: (context, index) {
                final optionNum = _options.keys.elementAt(index);
                final isSelected = optionNum == _selectedOption;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedOption = optionNum),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary.withOpacity(0.2)
                            : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.border,
                          width: isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Text(
                        'Option $optionNum',
                        style: AppTheme.body(
                          fontSize: 12,
                          fontWeight:
                              isSelected ? FontWeight.w600 : FontWeight.w400,
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 10),
          // Weekly grid
          _buildWeeklyGrid(),
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  Widget _buildWeeklyGrid() {
    final entries = _options[_selectedOption] ?? [];
    final days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    final dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    // Group entries by day
    final byDay = <String, List<TimetableEntry>>{};
    for (final day in days) {
      byDay[day] = entries.where((e) => e.day == day).toList();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: List.generate(5, (dayIndex) {
          final day = days[dayIndex];
          final dayEntries = byDay[day] ?? [];

          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Column(
                children: [
                  // Day header
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      dayLabels[dayIndex],
                      textAlign: TextAlign.center,
                      style: AppTheme.body(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Course blocks
                  if (dayEntries.isEmpty)
                    Container(
                      height: 40,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    )
                  else
                    ...dayEntries.map((entry) {
                      final color =
                          _getColorForCourse(entry.courseCode, entries);
                      return Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 4),
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: color.withOpacity(0.5),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              entry.courseCode,
                              style: AppTheme.body(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: color,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 1),
                            Text(
                              entry.startTime,
                              style: AppTheme.body(
                                fontSize: 8,
                                color: AppColors.textMuted,
                              ),
                            ),
                            Text(
                              entry.venue.length > 8
                                  ? entry.venue.substring(0, 8)
                                  : entry.venue,
                              style: AppTheme.body(
                                fontSize: 8,
                                color: AppColors.textMuted,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}
