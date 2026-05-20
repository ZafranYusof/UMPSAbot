const CourseSlot = require('../models/CourseSlot');

/**
 * Convert time string "HH:MM" to minutes since midnight for easy comparison
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two slots clash (same day + overlapping time range)
 */
function hasClash(slot1, slot2) {
  if (slot1.day !== slot2.day) return false;
  
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);
  
  // Overlap: one starts before the other ends
  return start1 < end2 && start2 < end1;
}

/**
 * Check if a combination of sections has any time clashes
 */
function combinationHasClash(combination) {
  const allSlots = [];
  for (const section of combination) {
    allSlots.push(...section.slots);
  }
  
  for (let i = 0; i < allSlots.length; i++) {
    for (let j = i + 1; j < allSlots.length; j++) {
      if (hasClash(allSlots[i], allSlots[j])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Score a schedule combination (lower is better)
 * Factors: gaps between classes, spread across days, early starts
 */
function scoreSchedule(combination) {
  const allSlots = [];
  for (const section of combination) {
    allSlots.push(...section.slots);
  }
  
  // Group slots by day
  const daySlots = {};
  for (const slot of allSlots) {
    if (!daySlots[slot.day]) daySlots[slot.day] = [];
    daySlots[slot.day].push(slot);
  }
  
  let gapScore = 0;
  let daysUsed = Object.keys(daySlots).length;
  let earlyScore = 0;
  
  // Calculate gaps within each day
  for (const day of Object.keys(daySlots)) {
    const sorted = daySlots[day].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    
    for (let i = 1; i < sorted.length; i++) {
      const gap = timeToMinutes(sorted[i].startTime) - timeToMinutes(sorted[i - 1].endTime);
      if (gap > 0) gapScore += gap;
    }
    
    // Penalize early starts (before 9am)
    const earliest = timeToMinutes(sorted[0].startTime);
    if (earliest < 540) { // 9:00
      earlyScore += (540 - earliest);
    }
  }
  
  // Prefer fewer days (less commuting)
  const dayScore = daysUsed * 30;
  
  return gapScore + dayScore + earlyScore * 0.5;
}

/**
 * Generate cartesian product of arrays
 */
function cartesianProduct(arrays) {
  if (arrays.length === 0) return [[]];
  
  return arrays.reduce((acc, curr) => {
    const result = [];
    for (const a of acc) {
      for (const c of curr) {
        result.push([...a, c]);
      }
    }
    return result;
  }, [[]]);
}

/**
 * Build a visual weekly grid for a combination
 */
function buildWeeklyGrid(combination) {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const grid = {};
  
  for (const day of days) {
    grid[day] = [];
  }
  
  for (const section of combination) {
    for (const slot of section.slots) {
      if (grid[slot.day]) {
        grid[slot.day].push({
          courseCode: section.courseCode,
          courseName: section.courseName,
          section: section.section,
          type: slot.type,
          startTime: slot.startTime,
          endTime: slot.endTime,
          venue: slot.venue
        });
      }
    }
  }
  
  // Sort each day by start time
  for (const day of days) {
    grid[day].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }
  
  return grid;
}

/**
 * Find all valid (non-clashing) timetable combinations
 */
async function findValidCombinations(courseCodes, semester) {
  // Default semester if not provided
  if (!semester) {
    semester = 'SEM2-2025/2026';
  }
  
  // Fetch all slots for requested courses
  const allSlots = await CourseSlot.find({
    courseCode: { $in: courseCodes.map(c => c.toUpperCase()) },
    semester: semester
  }).lean();
  
  if (allSlots.length === 0) {
    return {
      valid: [],
      totalCombinations: 0,
      validCount: 0,
      clashCount: 0,
      message: 'No course slots found for the given courses and semester'
    };
  }
  
  // Group slots by course code and section
  const courseGroups = {};
  for (const slot of allSlots) {
    const key = slot.courseCode;
    if (!courseGroups[key]) courseGroups[key] = {};
    
    // Group by base section (e.g., "01" from "01A")
    // Lectures use base section, labs/tutorials use subsection
    // We group all slots that belong to the same "registration group"
    const baseSection = slot.section.replace(/[A-Z]$/, '');
    const sectionKey = slot.section;
    
    if (!courseGroups[key][sectionKey]) {
      courseGroups[key][sectionKey] = {
        courseCode: slot.courseCode,
        courseName: slot.courseName,
        section: slot.section,
        slots: []
      };
    }
    courseGroups[key][sectionKey].slots.push(slot);
  }
  
  // For each course, build section options
  // A valid section choice includes the lecture + its corresponding lab/tutorial
  const courseSectionOptions = {};
  for (const courseCode of Object.keys(courseGroups)) {
    const sections = courseGroups[courseCode];
    
    // Separate lectures from labs/tutorials
    const lectures = {};
    const practicals = {};
    
    for (const [sectionKey, sectionData] of Object.entries(sections)) {
      const hasLecture = sectionData.slots.some(s => s.type === 'lecture');
      const hasPractical = sectionData.slots.some(s => s.type === 'lab' || s.type === 'tutorial');
      
      if (hasLecture && !hasPractical) {
        // Pure lecture section
        const baseSection = sectionKey.replace(/[A-Z]$/, '');
        if (!lectures[baseSection]) lectures[baseSection] = [];
        lectures[baseSection].push(...sectionData.slots);
      } else if (hasPractical && !hasLecture) {
        // Pure practical section
        const baseSection = sectionKey.replace(/[A-Z]$/, '');
        if (!practicals[baseSection]) practicals[baseSection] = [];
        practicals[baseSection].push(sectionData);
      } else {
        // Mixed section (has both) - treat as complete
        const baseSection = sectionKey.replace(/[A-Z]$/, '');
        if (!lectures[baseSection]) lectures[baseSection] = [];
        lectures[baseSection].push(...sectionData.slots.filter(s => s.type === 'lecture'));
        if (sectionData.slots.some(s => s.type !== 'lecture')) {
          if (!practicals[baseSection]) practicals[baseSection] = [];
          practicals[baseSection].push({
            ...sectionData,
            slots: sectionData.slots.filter(s => s.type !== 'lecture')
          });
        }
      }
    }
    
    // Build complete section options (lecture + practical combinations)
    const options = [];
    const baseSections = new Set([...Object.keys(lectures), ...Object.keys(practicals)]);
    
    for (const baseSection of baseSections) {
      const lectureSlots = lectures[baseSection] || [];
      const practicalGroups = practicals[baseSection] || [];
      
      if (practicalGroups.length === 0) {
        // Course with only lectures (no lab/tutorial)
        if (lectureSlots.length > 0) {
          options.push({
            courseCode,
            courseName: allSlots.find(s => s.courseCode === courseCode)?.courseName || courseCode,
            section: baseSection,
            slots: lectureSlots
          });
        }
      } else {
        // Each practical group paired with lectures
        for (const practical of practicalGroups) {
          options.push({
            courseCode,
            courseName: allSlots.find(s => s.courseCode === courseCode)?.courseName || courseCode,
            section: `${baseSection} (${practical.section})`,
            slots: [...lectureSlots, ...practical.slots]
          });
        }
      }
    }
    
    if (options.length > 0) {
      courseSectionOptions[courseCode] = options;
    }
  }
  
  // Check if we have options for all requested courses
  const missingCourses = courseCodes.filter(c => !courseSectionOptions[c.toUpperCase()]);
  
  // Generate all combinations (cartesian product)
  const courseArrays = Object.values(courseSectionOptions);
  
  if (courseArrays.length === 0) {
    return {
      valid: [],
      totalCombinations: 0,
      validCount: 0,
      clashCount: 0,
      missingCourses,
      message: 'No section options available'
    };
  }
  
  const allCombinations = cartesianProduct(courseArrays);
  const totalCombinations = allCombinations.length;
  
  // Filter out clashing combinations
  const validCombinations = [];
  let clashCount = 0;
  
  for (const combination of allCombinations) {
    if (!combinationHasClash(combination)) {
      const score = scoreSchedule(combination);
      validCombinations.push({
        sections: combination.map(s => ({
          courseCode: s.courseCode,
          courseName: s.courseName,
          section: s.section,
          slots: s.slots.map(slot => ({
            type: slot.type,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            venue: slot.venue
          }))
        })),
        score,
        weeklyGrid: buildWeeklyGrid(combination)
      });
    } else {
      clashCount++;
    }
  }
  
  // Sort by score (lower is better)
  validCombinations.sort((a, b) => a.score - b.score);
  
  return {
    valid: validCombinations,
    totalCombinations,
    validCount: validCombinations.length,
    clashCount,
    missingCourses: missingCourses.length > 0 ? missingCourses : undefined,
    semester
  };
}

/**
 * Get all available courses for a semester
 */
async function getAvailableCourses(semester) {
  if (!semester) semester = 'SEM2-2025/2026';
  
  const courses = await CourseSlot.aggregate([
    { $match: { semester } },
    {
      $group: {
        _id: '$courseCode',
        courseName: { $first: '$courseName' },
        sections: { $addToSet: '$section' },
        slotCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return courses.map(c => ({
    courseCode: c._id,
    courseName: c.courseName,
    sections: c.sections.sort(),
    slotCount: c.slotCount
  }));
}

module.exports = {
  findValidCombinations,
  getAvailableCourses,
  hasClash,
  scoreSchedule,
  timeToMinutes
};
