const mongoose = require('mongoose');

const courseSlotSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    index: true,
    uppercase: true,
    trim: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['lecture', 'tutorial', 'lab'],
    lowercase: true
  },
  day: {
    type: String,
    required: true,
    enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    uppercase: true
  },
  startTime: {
    type: String,
    required: true,
    match: /^\d{2}:\d{2}$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^\d{2}:\d{2}$/
  },
  venue: {
    type: String,
    default: ''
  },
  semester: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    default: null
  }
}, { timestamps: true });

// Compound index for efficient queries
courseSlotSchema.index({ courseCode: 1, semester: 1 });
courseSlotSchema.index({ semester: 1 });

module.exports = mongoose.model('CourseSlot', courseSlotSchema);
