import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../providers/chat_provider.dart';
import '../l10n/app_strings.dart';

class TimetableScreen extends StatefulWidget {
  const TimetableScreen({super.key});

  @override
  State<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends State<TimetableScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _courseController = TextEditingController();
  final List<String> _courses = [];
  String _semester = 'SEM2-2025/2026';
  List<Map<String, dynamic>> _results = [];
  bool _isLoading = false;
  String? _error;
  late TabController _viewTabController;

  // Autocomplete
  List<Map<String, dynamic>> _searchResults = [];
  bool _isSearching = false;
  Timer? _debounceTimer;

  final List<String> _semesters = [
    'SEM1-2025/2026',
    'SEM2-2025/2026',
    'SEM3-2025/2026',
  ];

  // Color palette for course blocks
  static const List<Color> _courseColors = [
    Color(0xFF6FB58A),
    Color(0xFFC9A961),
    Color(0xFF7BAFD4),
    Color(0xFFE08584),
    Color(0xFFB07DD1),
    Color(0xFFE0B470),
    Color(0xFF5DADE2),
    Color(0xFF48C9B0),
  ];

  @override
  void initState() {
    super.initState();
    _viewTabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _courseController.dispose();
    _viewTabController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    if (query.length < 2) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      _searchCourses(query);
    });
  }

  Future<void> _searchCourses(String query) async {
    setState(() => _isSearching = true);
    try {
      final api = context.read<ApiService>();
      final results = await api.searchCourses(query);
      if (mounted) {
        setState(() {
          _searchResults = results;
          _isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSearching = false);
      }
    }
  }

  void _selectCourse(String courseCode) {
    if (_courses.contains(courseCode)) {
      final lang = context.read<ChatProvider>().language;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppStrings.get('course_already_added', lang))),
      );
      return;
    }
    setState(() {
      _courses.add(courseCode);
      _courseController.clear();
      _searchResults = [];
    });
  }

  void _addCourse() {
    final code = _courseController.text.trim().toUpperCase();
    if (code.isEmpty) return;
    if (_courses.contains(code)) {
      final lang = context.read<ChatProvider>().language;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppStrings.get('course_already_added', lang))),
      );
      return;
    }
    setState(() {
      _courses.add(code);
      _courseController.clear();
    });
  }

  void _removeCourse(String code) {
    setState(() => _courses.remove(code));
  }

  Future<void> _planTimetable() async {
    final lang = context.read<ChatProvider>().language;
    if (_courses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppStrings.get('add_at_least_one', lang))),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _results = [];
    });

    try {
      final api = context.read<ApiService>();
      final response = await api.planTimetable(
        courses: _courses,
        semester: _semester,
      );

      final schedule = response['schedule'] as List<dynamic>? ??
          response['timetable'] as List<dynamic>? ??
          [];

      setState(() {
        _results = schedule.cast<Map<String, dynamic>>();
        _isLoading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = AppStrings.get('failed_plan_timetable', context.read<ChatProvider>().language);
        _isLoading = false;
      });
    }
  }

  Color _getColorForCourse(String courseCode) {
    final index = _courses.indexOf(courseCode);
    if (index >= 0) return _courseColors[index % _courseColors.length];
    return _courseColors[courseCode.hashCode.abs() % _courseColors.length];
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<ChatProvider>().language;

    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.get('timetable_planner', lang)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Semester selector
            Text(
              AppStrings.get('semester', lang),
              style: AppTheme.body(
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(10),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _semester,
                  isExpanded: true,
                  dropdownColor: AppColors.surface,
                  style: AppTheme.body(color: AppColors.textPrimary),
                  items: _semesters.map((s) {
                    return DropdownMenuItem(value: s, child: Text(s));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _semester = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Course input
            Text(
              AppStrings.get('course_codes', lang),
              style: AppTheme.body(
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _courseController,
                    textCapitalization: TextCapitalization.characters,
                    style: AppTheme.body(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: AppStrings.get('course_hint', lang),
                      hintStyle: AppTheme.body(color: AppColors.textMuted),
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
                      suffixIcon: _isSearching
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                              ),
                            )
                          : null,
                    ),
                    onChanged: _onSearchChanged,
                    onSubmitted: (_) => _addCourse(),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _addCourse,
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.add, color: AppColors.background),
                  ),
                ),
              ],
            ),

            // Autocomplete suggestions
            if (_searchResults.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 4),
                constraints: const BoxConstraints(maxHeight: 200),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  itemCount: _searchResults.length,
                  separatorBuilder: (_, __) => Divider(
                    height: 1,
                    color: AppColors.border.withOpacity(0.5),
                  ),
                  itemBuilder: (context, index) {
                    final course = _searchResults[index];
                    final code = course['courseCode'] as String;
                    final name = course['courseName'] as String;
                    final alreadyAdded = _courses.contains(code);
                    return ListTile(
                      dense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                      title: Text(
                        code,
                        style: AppTheme.body(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: alreadyAdded ? AppColors.textMuted : AppColors.primary,
                        ),
                      ),
                      subtitle: Text(
                        name,
                        style: AppTheme.body(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: alreadyAdded
                          ? const Icon(Icons.check_circle, color: AppColors.primary, size: 18)
                          : const Icon(Icons.add_circle_outline, color: AppColors.textMuted, size: 18),
                      onTap: alreadyAdded ? null : () => _selectCourse(code),
                    );
                  },
                ),
              ),

            const SizedBox(height: 12),

            // Course chips
            if (_courses.isNotEmpty)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _courses.map((code) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      border: Border.all(color: AppColors.primary.withOpacity(0.4)),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          code,
                          style: AppTheme.body(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppColors.primaryLight,
                          ),
                        ),
                        const SizedBox(width: 6),
                        GestureDetector(
                          onTap: () => _removeCourse(code),
                          child: const Icon(Icons.close, size: 16, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            const SizedBox(height: 20),

            // Plan button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _planTimetable,
                icon: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.background,
                        ),
                      )
                    : const Icon(Icons.schedule),
                label: Text(
                  _isLoading
                      ? AppStrings.get('planning', lang)
                      : AppStrings.get('plan_timetable', lang),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Error
            if (_error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.error.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: AppTheme.body(color: AppColors.error),
                      ),
                    ),
                  ],
                ),
              ),

            // Results with view toggle
            if (_results.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    AppStrings.get('your_schedule', lang),
                    style: AppTheme.heading(fontSize: 18),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: TabBar(
                      controller: _viewTabController,
                      isScrollable: true,
                      indicatorSize: TabBarIndicatorSize.tab,
                      indicator: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(7),
                      ),
                      labelColor: AppColors.background,
                      unselectedLabelColor: AppColors.textMuted,
                      labelStyle: AppTheme.body(fontSize: 12, fontWeight: FontWeight.w600),
                      unselectedLabelStyle: AppTheme.body(fontSize: 12),
                      dividerHeight: 0,
                      tabAlignment: TabAlignment.center,
                      tabs: [
                        Tab(
                          height: 32,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Icon(Icons.list_rounded, size: 18),
                          ),
                        ),
                        Tab(
                          height: 32,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Icon(Icons.grid_view_rounded, size: 18),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              AnimatedBuilder(
                animation: _viewTabController,
                builder: (context, child) {
                  if (_viewTabController.index == 0) {
                    return Column(
                      children: _results.map((item) => _buildScheduleCard(item, lang)).toList(),
                    );
                  } else {
                    return _buildWeeklyGrid(lang);
                  }
                },
              ),
            ],

            // Empty results
            if (!_isLoading && _results.isEmpty && _error == null && _courses.isNotEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.only(top: 40),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.calendar_today_outlined,
                        size: 48,
                        color: AppColors.textMuted,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        AppStrings.get('tap_plan_timetable', lang),
                        style: AppTheme.body(color: AppColors.textMuted),
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

  Widget _buildWeeklyGrid(String lang) {
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const startHour = 8;
    const endHour = 18;
    const hourHeight = 60.0;
    const dayWidth = 140.0;
    const timeColumnWidth = 50.0;

    // Parse schedule items into grid positions
    final gridItems = <_GridItem>[];
    for (final item in _results) {
      final course = item['course'] as String? ?? item['courseCode'] as String? ?? '';
      final day = item['day'] as String? ?? '';
      final time = item['time'] as String? ?? '';
      final venue = item['venue'] as String? ?? item['location'] as String? ?? '';
      final section = item['section'] as String? ?? '';

      final dayIndex = _parseDayIndex(day);
      if (dayIndex < 0) continue;

      final timeRange = _parseTimeRange(time);
      if (timeRange == null) continue;

      gridItems.add(_GridItem(
        course: course,
        section: section,
        venue: venue,
        dayIndex: dayIndex,
        startHour: timeRange.$1,
        endHour: timeRange.$2,
        color: _getColorForCourse(course),
      ));
    }

    final totalHeight = (endHour - startHour) * hourHeight;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SizedBox(
          width: timeColumnWidth + (dayWidth * days.length),
          child: Column(
            children: [
              // Day headers
              Row(
                children: [
                  SizedBox(width: timeColumnWidth),
                  ...days.map((day) => Container(
                    width: dayWidth,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: AppColors.border),
                        left: BorderSide(color: AppColors.border),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        day,
                        style: AppTheme.body(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  )),
                ],
              ),
              // Grid body
              SizedBox(
                height: totalHeight,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Time column
                    SizedBox(
                      width: timeColumnWidth,
                      height: totalHeight,
                      child: Stack(
                        children: List.generate(endHour - startHour, (i) {
                          return Positioned(
                            top: i * hourHeight,
                            left: 0,
                            right: 0,
                            child: SizedBox(
                              height: hourHeight,
                              child: Padding(
                                padding: const EdgeInsets.only(top: 2, right: 6),
                                child: Text(
                                  '${(startHour + i).toString().padLeft(2, '0')}:00',
                                  textAlign: TextAlign.right,
                                  style: AppTheme.body(
                                    fontSize: 10,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),
                      ),
                    ),
                    // Day columns
                    ...List.generate(days.length, (dayIdx) {
                      final dayItems = gridItems.where((g) => g.dayIndex == dayIdx).toList();
                      return Container(
                        width: dayWidth,
                        height: totalHeight,
                        decoration: BoxDecoration(
                          border: Border(
                            left: BorderSide(color: AppColors.border),
                          ),
                        ),
                        child: Stack(
                          children: [
                            // Hour lines
                            ...List.generate(endHour - startHour, (i) {
                              return Positioned(
                                top: i * hourHeight,
                                left: 0,
                                right: 0,
                                child: Container(
                                  height: 1,
                                  color: AppColors.border,
                                ),
                              );
                            }),
                            // Course blocks
                            ...dayItems.map((item) {
                              final top = (item.startHour - startHour) * hourHeight;
                              final height = (item.endHour - item.startHour) * hourHeight;
                              return Positioned(
                                top: top,
                                left: 2,
                                right: 2,
                                height: height,
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 1),
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: item.color.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: item.color.withOpacity(0.6),
                                      width: 1,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.course,
                                        style: AppTheme.body(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: item.color,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      if (item.section.isNotEmpty && height > 40)
                                        Text(
                                          'S${item.section}',
                                          style: AppTheme.body(
                                            fontSize: 9,
                                            color: item.color.withOpacity(0.8),
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      if (item.venue.isNotEmpty && height > 55)
                                        Text(
                                          item.venue,
                                          style: AppTheme.body(
                                            fontSize: 9,
                                            color: AppColors.textMuted,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            }),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  int _parseDayIndex(String day) {
    final d = day.toLowerCase().trim();
    if (d.startsWith('mon') || d == 'isnin') return 0;
    if (d.startsWith('tue') || d == 'selasa') return 1;
    if (d.startsWith('wed') || d == 'rabu') return 2;
    if (d.startsWith('thu') || d == 'khamis') return 3;
    if (d.startsWith('fri') || d == 'jumaat') return 4;
    return -1;
  }

  (double, double)? _parseTimeRange(String time) {
    // Try formats like "8:00-10:00", "08:00 - 10:00", "0800-1000"
    final cleaned = time.replaceAll(' ', '');
    final parts = cleaned.split(RegExp(r'[-–]'));
    if (parts.length != 2) return null;

    final start = _parseHour(parts[0]);
    final end = _parseHour(parts[1]);
    if (start == null || end == null) return null;
    return (start, end);
  }

  double? _parseHour(String s) {
    // Handle "8:00", "08:00", "0800", "8.00"
    s = s.replaceAll('.', ':');
    if (s.contains(':')) {
      final parts = s.split(':');
      final h = int.tryParse(parts[0]);
      final m = int.tryParse(parts[1]);
      if (h == null || m == null) return null;
      return h + m / 60.0;
    } else if (s.length == 4) {
      final h = int.tryParse(s.substring(0, 2));
      final m = int.tryParse(s.substring(2, 4));
      if (h == null || m == null) return null;
      return h + m / 60.0;
    } else if (s.length <= 2) {
      final h = int.tryParse(s);
      if (h == null) return null;
      return h.toDouble();
    }
    return null;
  }

  Widget _buildScheduleCard(Map<String, dynamic> item, String lang) {
    final course = item['course'] as String? ?? item['courseCode'] as String? ?? 'Unknown';
    final day = item['day'] as String? ?? '';
    final time = item['time'] as String? ?? '';
    final venue = item['venue'] as String? ?? item['location'] as String? ?? '';
    final section = item['section'] as String? ?? '';
    final lecturer = item['lecturer'] as String? ?? '';
    final color = _getColorForCourse(course);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
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
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  course,
                  style: AppTheme.body(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.background,
                  ),
                ),
              ),
              if (section.isNotEmpty) ...[
                const SizedBox(width: 8),
                Text(
                  '${AppStrings.get('section', lang)} $section',
                  style: AppTheme.body(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          if (day.isNotEmpty || time.isNotEmpty)
            Row(
              children: [
                Icon(Icons.access_time, size: 16, color: color),
                const SizedBox(width: 6),
                Text(
                  '$day ${time.isNotEmpty ? "• $time" : ""}'.trim(),
                  style: AppTheme.body(fontSize: 14, color: AppColors.textPrimary),
                ),
              ],
            ),
          if (venue.isNotEmpty) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.location_on_outlined, size: 16, color: color),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    venue,
                    style: AppTheme.body(fontSize: 14, color: AppColors.textPrimary),
                  ),
                ),
              ],
            ),
          ],
          if (lecturer.isNotEmpty) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.person_outline, size: 16, color: color),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    lecturer,
                    style: AppTheme.body(fontSize: 14, color: AppColors.textPrimary),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _GridItem {
  final String course;
  final String section;
  final String venue;
  final int dayIndex;
  final double startHour;
  final double endHour;
  final Color color;

  _GridItem({
    required this.course,
    required this.section,
    required this.venue,
    required this.dayIndex,
    required this.startHour,
    required this.endHour,
    required this.color,
  });
}
