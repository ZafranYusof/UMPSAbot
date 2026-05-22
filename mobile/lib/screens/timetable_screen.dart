import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class TimetableScreen extends StatefulWidget {
  const TimetableScreen({super.key});

  @override
  State<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends State<TimetableScreen> {
  final TextEditingController _courseController = TextEditingController();
  final List<String> _courses = [];
  String _semester = 'SEM2-2025/2026';
  List<Map<String, dynamic>> _results = [];
  bool _isLoading = false;
  String? _error;

  final List<String> _semesters = [
    'SEM1-2025/2026',
    'SEM2-2025/2026',
    'SEM3-2025/2026',
  ];

  void _addCourse() {
    final code = _courseController.text.trim().toUpperCase();
    if (code.isEmpty) return;
    if (_courses.contains(code)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Course already added')),
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
    if (_courses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one course code')),
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
        _error = 'Failed to plan timetable. Please try again.';
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _courseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Timetable Planner'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Semester selector
            Text(
              'Semester',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                border: Border.all(
                  color: theme.colorScheme.outline.withOpacity(0.3),
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _semester,
                  isExpanded: true,
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
              'Course Codes',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _courseController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: InputDecoration(
                      hintText: 'e.g. BCS1023',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    onSubmitted: (_) => _addCourse(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _addCourse,
                  icon: const Icon(Icons.add),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFFD4AF37),
                    foregroundColor: const Color(0xFF003366),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Course chips
            if (_courses.isNotEmpty)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _courses.map((code) {
                  return Chip(
                    label: Text(code),
                    deleteIcon: const Icon(Icons.close, size: 18),
                    onDeleted: () => _removeCourse(code),
                    backgroundColor:
                        const Color(0xFF003366).withOpacity(0.1),
                    labelStyle: const TextStyle(
                      fontWeight: FontWeight.w500,
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
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.schedule),
                label: Text(_isLoading ? 'Planning...' : 'Plan Timetable'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF003366),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
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
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: TextStyle(color: Colors.red.shade700),
                      ),
                    ),
                  ],
                ),
              ),

            // Results
            if (_results.isNotEmpty) ...[
              Text(
                'Your Schedule',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              ..._results.map((item) => _buildScheduleCard(item, theme)),
            ],

            // Empty results
            if (!_isLoading && _results.isEmpty && _error == null && _courses.isNotEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.only(top: 40),
                  child: Column(
                    children: [
                      Icon(
                        Icons.calendar_today_outlined,
                        size: 48,
                        color: theme.colorScheme.onSurface.withOpacity(0.3),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Tap "Plan Timetable" to generate your schedule',
                        style: TextStyle(
                          color: theme.colorScheme.onSurface.withOpacity(0.5),
                        ),
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

  Widget _buildScheduleCard(Map<String, dynamic> item, ThemeData theme) {
    final course = item['course'] as String? ?? item['courseCode'] as String? ?? 'Unknown';
    final day = item['day'] as String? ?? '';
    final time = item['time'] as String? ?? '';
    final venue = item['venue'] as String? ?? item['location'] as String? ?? '';
    final section = item['section'] as String? ?? '';
    final lecturer = item['lecturer'] as String? ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
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
                    color: const Color(0xFF003366),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    course,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
                if (section.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Text(
                    'Section $section',
                    style: TextStyle(
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                      fontSize: 13,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            if (day.isNotEmpty || time.isNotEmpty)
              Row(
                children: [
                  const Icon(Icons.access_time, size: 16, color: Color(0xFFD4AF37)),
                  const SizedBox(width: 6),
                  Text(
                    '$day ${time.isNotEmpty ? "• $time" : ""}'.trim(),
                    style: const TextStyle(fontSize: 14),
                  ),
                ],
              ),
            if (venue.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 16, color: Color(0xFFD4AF37)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(venue, style: const TextStyle(fontSize: 14)),
                  ),
                ],
              ),
            ],
            if (lecturer.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.person_outline, size: 16, color: Color(0xFFD4AF37)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(lecturer, style: const TextStyle(fontSize: 14)),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
