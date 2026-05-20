import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Search, ChevronDown, ChevronUp, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8am to 6pm

const COURSE_COLORS = [
  { bg: 'bg-teal-500/20', border: 'border-teal-500/40', text: 'text-teal-300' },
  { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-300' },
  { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-300' },
  { bg: 'bg-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-300' },
  { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-300' },
  { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-300' },
  { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-300' },
  { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-300' },
];

function timeToRow(time) {
  const [h, m] = time.split(':').map(Number);
  return (h - 8) * 2 + (m >= 30 ? 1 : 0);
}

function TimetablePlanner() {
  const { isDark } = useTheme();
  const [courseCodes, setCourseCodes] = useState('');
  const [semester, setSemester] = useState('SEM2-2025/2026');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [expandedCombo, setExpandedCombo] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [showCourseList, setShowCourseList] = useState(false);

  // Fetch available courses on mount
  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await api.get('/timetable/courses', { params: { semester } });
        setAvailableCourses(res.data.courses || []);
      } catch (err) {
        // Silent fail - user can still type manually
      }
    }
    fetchCourses();
  }, [semester]);

  const handleAddCourse = (course) => {
    if (!selectedCourses.find(c => c.courseCode === course.courseCode)) {
      setSelectedCourses([...selectedCourses, course]);
    }
    setShowCourseList(false);
  };

  const handleRemoveCourse = (courseCode) => {
    setSelectedCourses(selectedCourses.filter(c => c.courseCode !== courseCode));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResults(null);
    setExpandedCombo(null);

    // Get course codes from selected courses or text input
    let codes = selectedCourses.map(c => c.courseCode);
    if (codes.length === 0 && courseCodes.trim()) {
      codes = courseCodes.split(/[,\s]+/).filter(Boolean).map(c => c.trim().toUpperCase());
    }

    if (codes.length === 0) {
      setError('Please select or enter at least one course code');
      return;
    }

    if (codes.length > 10) {
      setError('Maximum 10 courses allowed');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/timetable/plan', { courses: codes, semester });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate timetable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getColorForCourse = (courseCode, allCourses) => {
    const idx = allCourses.indexOf(courseCode);
    return COURSE_COLORS[idx % COURSE_COLORS.length];
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a1628]' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b backdrop-blur-md ${
        isDark ? 'bg-[#0a1628]/90 border-gray-800' : 'bg-white/90 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/chat" className={`p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          }`}>
            <ArrowLeft size={20} />
          </a>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00BCD4]/10">
              <Calendar size={22} className="text-[#00BCD4]" />
            </div>
            <div>
              <h1 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Timetable Planner
              </h1>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Find clash-free schedules
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-6 ${
            isDark ? 'bg-[#0f1f3a] border-gray-800' : 'bg-white border-gray-200'
          }`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selected Courses Tags */}
            {selectedCourses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCourses.map((course) => (
                  <span
                    key={course.courseCode}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-[#00BCD4]/10 text-[#00BCD4] border border-[#00BCD4]/20"
                  >
                    {course.courseCode}
                    <button
                      type="button"
                      onClick={() => handleRemoveCourse(course.courseCode)}
                      className="ml-1 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Course Input */}
            <div className="relative">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={courseCodes}
                    onChange={(e) => setCourseCodes(e.target.value)}
                    onFocus={() => setShowCourseList(true)}
                    placeholder="Type course codes (e.g. BCS2313, BCS3133) or select below..."
                    className={`w-full px-4 py-3 rounded-lg border text-sm transition-colors ${
                      isDark
                        ? 'bg-[#0a1628] border-gray-700 text-white placeholder-gray-500 focus:border-[#00BCD4]'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[#00BCD4]'
                    } focus:outline-none focus:ring-1 focus:ring-[#00BCD4]/50`}
                  />
                  <Search size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-lg bg-[#00BCD4] text-white font-medium text-sm hover:bg-[#00ACC1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Finding...
                    </>
                  ) : (
                    'Find Schedules'
                  )}
                </button>
              </div>

              {/* Available Courses Dropdown */}
              <AnimatePresence>
                {showCourseList && availableCourses.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute z-20 mt-2 w-full max-h-60 overflow-y-auto rounded-lg border shadow-xl ${
                      isDark ? 'bg-[#0f1f3a] border-gray-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    {availableCourses
                      .filter(c => {
                        const search = courseCodes.toUpperCase();
                        return !search || c.courseCode.includes(search) || c.courseName.toUpperCase().includes(search);
                      })
                      .map((course) => (
                        <button
                          key={course.courseCode}
                          type="button"
                          onClick={() => handleAddCourse(course)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                          } ${selectedCourses.find(c => c.courseCode === course.courseCode) ? 'opacity-50' : ''}`}
                          disabled={!!selectedCourses.find(c => c.courseCode === course.courseCode)}
                        >
                          <span className="font-mono font-medium text-[#00BCD4]">{course.courseCode}</span>
                          <span className={`ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {course.courseName}
                          </span>
                          <span className={`ml-2 text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            ({course.sections.length} sections)
                          </span>
                        </button>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Semester Select */}
            <div className="flex items-center gap-3">
              <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Semester:</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={`px-3 py-1.5 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-[#0a1628] border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              >
                <option value="SEM2-2025/2026">SEM2 2025/2026</option>
                <option value="SEM1-2025/2026">SEM1 2025/2026</option>
              </select>
            </div>
          </form>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
          >
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {/* Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Stats */}
            <div className={`flex flex-wrap gap-4 p-4 rounded-lg border ${
              isDark ? 'bg-[#0f1f3a] border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong className="text-green-400">{results.validCount}</strong> valid schedules
                </span>
              </div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {results.clashCount} clashing · {results.totalCombinations} total combinations
              </div>
              {results.missingCourses && results.missingCourses.length > 0 && (
                <div className="text-sm text-yellow-400">
                  ⚠️ Not found: {results.missingCourses.join(', ')}
                </div>
              )}
            </div>

            {/* No results */}
            {results.validCount === 0 && (
              <div className={`text-center py-12 rounded-lg border ${
                isDark ? 'bg-[#0f1f3a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <AlertCircle size={48} className="mx-auto text-yellow-400 mb-4" />
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  No Valid Combinations
                </h3>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  All possible section combinations have time clashes. Try removing a course.
                </p>
              </div>
            )}

            {/* Combination Cards */}
            {results.valid.map((combo, idx) => {
              const allCourses = [...new Set(combo.sections.map(s => s.courseCode))];
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border overflow-hidden ${
                    isDark ? 'bg-[#0f1f3a] border-gray-800' : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Combo Header */}
                  <button
                    onClick={() => setExpandedCombo(expandedCombo === idx ? null : idx)}
                    className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                      isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium px-2.5 py-1 rounded-md ${
                        isDark ? 'bg-[#00BCD4]/10 text-[#00BCD4]' : 'bg-[#00BCD4]/10 text-[#00897B]'
                      }`}>
                        Option {idx + 1}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {combo.sections.map(s => `${s.courseCode} (${s.section})`).join(' · ')}
                      </span>
                    </div>
                    {expandedCombo === idx ? (
                      <ChevronUp size={18} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                    ) : (
                      <ChevronDown size={18} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                    )}
                  </button>

                  {/* Expanded: Weekly Grid */}
                  <AnimatePresence>
                    {expandedCombo === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className={`p-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                          {/* Weekly Grid */}
                          <div className="overflow-x-auto">
                            <div className="min-w-[700px]">
                              {/* Day Headers */}
                              <div className="grid grid-cols-[60px_repeat(5,1fr)] gap-1 mb-1">
                                <div></div>
                                {DAYS.map(day => (
                                  <div key={day} className={`text-center text-xs font-medium py-2 rounded ${
                                    isDark ? 'text-gray-400 bg-gray-800/50' : 'text-gray-500 bg-gray-100'
                                  }`}>
                                    {day}
                                  </div>
                                ))}
                              </div>

                              {/* Time Grid */}
                              <div className="grid grid-cols-[60px_repeat(5,1fr)] gap-1">
                                {HOURS.map(hour => (
                                  <div key={hour} className="contents">
                                    {/* Time label */}
                                    <div className={`text-xs py-3 text-right pr-2 ${
                                      isDark ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                      {hour.toString().padStart(2, '0')}:00
                                    </div>
                                    {/* Day cells */}
                                    {DAYS.map(day => {
                                      const slotsInCell = [];
                                      combo.weeklyGrid[day]?.forEach(slot => {
                                        const slotStartHour = parseInt(slot.startTime.split(':')[0]);
                                        if (slotStartHour === hour) {
                                          slotsInCell.push(slot);
                                        }
                                      });

                                      return (
                                        <div key={`${day}-${hour}`} className={`min-h-[48px] rounded border ${
                                          isDark ? 'border-gray-800/50 bg-gray-900/20' : 'border-gray-100 bg-gray-50/50'
                                        }`}>
                                          {slotsInCell.map((slot, si) => {
                                            const color = getColorForCourse(slot.courseCode, allCourses);
                                            return (
                                              <div
                                                key={si}
                                                className={`p-1.5 rounded border text-xs ${color.bg} ${color.border}`}
                                              >
                                                <div className={`font-medium ${color.text}`}>
                                                  {slot.courseCode}
                                                </div>
                                                <div className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-[10px]`}>
                                                  {slot.startTime}-{slot.endTime} · {slot.venue}
                                                </div>
                                                <div className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-[10px] capitalize`}>
                                                  {slot.type} · S{slot.section}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Section Details */}
                          <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                            <h4 className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              SECTION DETAILS
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {combo.sections.map((section, si) => {
                                const color = getColorForCourse(section.courseCode, allCourses);
                                return (
                                  <div key={si} className={`p-3 rounded-lg border ${color.bg} ${color.border}`}>
                                    <div className={`font-medium text-sm ${color.text}`}>
                                      {section.courseCode} — Section {section.section}
                                    </div>
                                    <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {section.courseName}
                                    </div>
                                    <div className="mt-2 space-y-0.5">
                                      {section.slots.map((slot, sli) => (
                                        <div key={sli} className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                          <span className="capitalize">{slot.type}</span> · {slot.day} {slot.startTime}-{slot.endTime} · {slot.venue}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      {/* Click outside to close dropdown */}
      {showCourseList && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowCourseList(false)}
        />
      )}
    </div>
  );
}

export default TimetablePlanner;
