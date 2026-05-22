const express = require('express');
const router = express.Router();
const CourseSlot = require('../models/CourseSlot');
const { findValidCombinations, getAvailableCourses } = require('../services/timetable');

// POST /api/timetable/plan - Find valid timetable combinations
router.post('/plan', async (req, res) => {
  try {
    const { courses, semester } = req.body;
    
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({
        error: 'Please provide an array of course codes',
        example: { courses: ['BCS2313', 'BCS3133'], semester: 'SEM2-2025/2026' }
      });
    }
    
    if (courses.length > 10) {
      return res.status(400).json({
        error: 'Maximum 10 courses allowed per request'
      });
    }
    
    const result = await findValidCombinations(courses, semester);
    res.json(result);
  } catch (error) {
    console.error('Timetable plan error:', error);
    res.status(500).json({ error: 'Failed to generate timetable combinations' });
  }
});

// GET /api/timetable/courses - List available courses
router.get('/courses', async (req, res) => {
  try {
    const { semester } = req.query;
    const courses = await getAvailableCourses(semester);
    res.json({ courses, semester: semester || 'SEM2-2025/2026' });
  } catch (error) {
    console.error('Timetable courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// POST /api/timetable/import - Bulk import course slots (admin)
router.post('/import', async (req, res) => {
  try {
    const { slots } = req.body;
    
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        error: 'Please provide an array of course slots',
        example: {
          slots: [{
            courseCode: 'BCS2313',
            courseName: 'ARTIFICIAL INTELLIGENCE TECHNIQUES',
            section: '01',
            type: 'lecture',
            day: 'MON',
            startTime: '08:00',
            endTime: '09:50',
            venue: 'BZ-01-112',
            semester: 'SEM2-2025/2026'
          }]
        }
      });
    }
    
    // Validate each slot
    const validTypes = ['lecture', 'tutorial', 'lab'];
    const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot.courseCode || !slot.courseName || !slot.section || !slot.type || !slot.day || !slot.startTime || !slot.endTime || !slot.semester) {
        return res.status(400).json({
          error: `Slot at index ${i} is missing required fields`,
          required: ['courseCode', 'courseName', 'section', 'type', 'day', 'startTime', 'endTime', 'semester']
        });
      }
      if (!validTypes.includes(slot.type.toLowerCase())) {
        return res.status(400).json({ error: `Invalid type "${slot.type}" at index ${i}. Must be: ${validTypes.join(', ')}` });
      }
      if (!validDays.includes(slot.day.toUpperCase())) {
        return res.status(400).json({ error: `Invalid day "${slot.day}" at index ${i}. Must be: ${validDays.join(', ')}` });
      }
    }
    
    // Insert all slots
    const result = await CourseSlot.insertMany(slots, { ordered: false });
    
    res.json({
      message: `Successfully imported ${result.length} course slots`,
      count: result.length
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Some slots already exist (duplicate)' });
    }
    console.error('Timetable import error:', error);
    res.status(500).json({ error: 'Failed to import course slots' });
  }
});

// DELETE /api/timetable/slots - Clear slots for a semester (admin)
router.delete('/slots', async (req, res) => {
  try {
    const { semester } = req.query;
    if (!semester) {
      return res.status(400).json({ error: 'Semester query parameter required' });
    }
    
    const result = await CourseSlot.deleteMany({ semester });
    res.json({ message: `Deleted ${result.deletedCount} slots for ${semester}` });
  } catch (error) {
    console.error('Timetable delete error:', error);
    res.status(500).json({ error: 'Failed to delete slots' });
  }
});

module.exports = router;
