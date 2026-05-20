const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CourseSlot = require('../models/CourseSlot');

const SEMESTER = 'SEM2-2025/2026';

const seedData = [
  // BCS2313 - ARTIFICIAL INTELLIGENCE TECHNIQUES - Section 01
  {
    courseCode: 'BCS2313',
    courseName: 'ARTIFICIAL INTELLIGENCE TECHNIQUES',
    section: '01',
    type: 'lecture',
    day: 'MON',
    startTime: '08:00',
    endTime: '09:50',
    venue: 'BZ-01-112',
    semester: SEMESTER
  },
  {
    courseCode: 'BCS2313',
    courseName: 'ARTIFICIAL INTELLIGENCE TECHNIQUES',
    section: '01',
    type: 'lecture',
    day: 'THU',
    startTime: '10:00',
    endTime: '11:50',
    venue: 'BZ-01-112',
    semester: SEMESTER
  },
  {
    courseCode: 'BCS2313',
    courseName: 'ARTIFICIAL INTELLIGENCE TECHNIQUES',
    section: '01A',
    type: 'lab',
    day: 'THU',
    startTime: '14:00',
    endTime: '15:50',
    venue: 'BZ-04-068',
    semester: SEMESTER
  },
  // BCS2313 - Section 02 (alternative)
  {
    courseCode: 'BCS2313',
    courseName: 'ARTIFICIAL INTELLIGENCE TECHNIQUES',
    section: '02',
    type: 'lecture',
    day: 'WED',
    startTime: '14:00',
    endTime: '15:50',
    venue: 'BZ-01-115',
    semester: SEMESTER
  },
  {
    courseCode: 'BCS2313',
    courseName: 'ARTIFICIAL INTELLIGENCE TECHNIQUES',
    section: '02',
    type: 'lecture',
    day: 'FRI',
    startTime: '08:00',
    endTime: '09:50',
    venue: 'BZ-01-115',
    semester: SEMESTER
  },
  {
    courseCode: 'BCS2313',
    courseName: 'ARTIFICIAL INTELLIGENCE TECHNIQUES',
    section: '02A',
    type: 'lab',
    day: 'FRI',
    startTime: '14:00',
    endTime: '15:50',
    venue: 'BZ-04-068',
    semester: SEMESTER
  },

  // BCS3133 - SOFTWARE ENGINEERING PRACTICES - Section 01
  {
    courseCode: 'BCS3133',
    courseName: 'SOFTWARE ENGINEERING PRACTICES',
    section: '01',
    type: 'lecture',
    day: 'TUE',
    startTime: '10:00',
    endTime: '11:50',
    venue: 'BZ-01-121',
    semester: SEMESTER
  },
  {
    courseCode: 'BCS3133',
    courseName: 'SOFTWARE ENGINEERING PRACTICES',
    section: '01A',
    type: 'lab',
    day: 'MON',
    startTime: '16:00',
    endTime: '17:50',
    venue: 'BZ-01-092',
    semester: SEMESTER
  },
  // BCS3133 - Section 02 (alternative)
  {
    courseCode: 'BCS3133',
    courseName: 'SOFTWARE ENGINEERING PRACTICES',
    section: '02',
    type: 'lecture',
    day: 'THU',
    startTime: '14:00',
    endTime: '15:50',
    venue: 'BZ-01-121',
    semester: SEMESTER
  },
  {
    courseCode: 'BCS3133',
    courseName: 'SOFTWARE ENGINEERING PRACTICES',
    section: '02A',
    type: 'lab',
    day: 'WED',
    startTime: '16:00',
    endTime: '17:50',
    venue: 'BZ-01-092',
    semester: SEMESTER
  },

  // BCS3153 - SOFTWARE EVOLUTION & MAINTENANCE - Section 01
  {
    courseCode: 'BCS3153',
    courseName: 'SOFTWARE EVOLUTION & MAINTENANCE',
    section: '01',
    type: 'lecture',
    day: 'MON',
    startTime: '10:00',
    endTime: '11:50',
    venue: 'BZ-01-112',
    semester: SEMESTER
  },
  {
    courseCode: 'BCS3153',
    courseName: 'SOFTWARE EVOLUTION & MAINTENANCE',
    section: '01B',
    type: 'lab',
    day: 'FRI',
    startTime: '10:00',
    endTime: '11:50',
    venue: 'BZ-02-090',
    semester: SEMESTER
  },
  // BCS3153 - Section 02 (alternative)
  {
    courseCode: 'BCS3153',
    courseName: 'SOFTWARE EVOLUTION & MAINTENANCE',
    section: '02',
    type: 'lecture',
    day: 'TUE',
    startTime: '14:00',
    endTime: '15:50',
    venue: 'BZ-01-112',
    semester: SEMESTER
  },
  {
    courseCode: 'BCS3153',
    courseName: 'SOFTWARE EVOLUTION & MAINTENANCE',
    section: '02A',
    type: 'lab',
    day: 'WED',
    startTime: '08:00',
    endTime: '09:50',
    venue: 'BZ-02-090',
    semester: SEMESTER
  },

  // BCS3423 - INTEGRATED BUSINESS PROCESSING USING SAP - Section 01
  {
    courseCode: 'BCS3423',
    courseName: 'INTEGRATED BUSINESS PROCESSING USING SAP',
    section: '01',
    type: 'lecture',
    day: 'WED',
    startTime: '10:00',
    endTime: '11:50',
    venue: 'BZ-01-112',
    semester: SEMESTER
  },
  {
    courseCode: 'BCS3423',
    courseName: 'INTEGRATED BUSINESS PROCESSING USING SAP',
    section: '01A',
    type: 'lab',
    day: 'TUE',
    startTime: '16:00',
    endTime: '17:50',
    venue: 'BZ-03-076',
    semester: SEMESTER
  },

  // BUM1433 - DISCRETE STRUCTURE & APPLICATIONS - Section 02P
  {
    courseCode: 'BUM1433',
    courseName: 'DISCRETE STRUCTURE & APPLICATIONS',
    section: '02P',
    type: 'lecture',
    day: 'TUE',
    startTime: '08:00',
    endTime: '09:50',
    venue: 'BZ-01-120',
    semester: SEMESTER
  },
  {
    courseCode: 'BUM1433',
    courseName: 'DISCRETE STRUCTURE & APPLICATIONS',
    section: '02P',
    type: 'lecture',
    day: 'THU',
    startTime: '08:00',
    endTime: '09:50',
    venue: 'BZ-01-120',
    semester: SEMESTER
  },
  // BUM1433 - Section 01P (alternative)
  {
    courseCode: 'BUM1433',
    courseName: 'DISCRETE STRUCTURE & APPLICATIONS',
    section: '01P',
    type: 'lecture',
    day: 'MON',
    startTime: '14:00',
    endTime: '15:50',
    venue: 'BZ-01-120',
    semester: SEMESTER
  },
  {
    courseCode: 'BUM1433',
    courseName: 'DISCRETE STRUCTURE & APPLICATIONS',
    section: '01P',
    type: 'lecture',
    day: 'WED',
    startTime: '14:00',
    endTime: '15:50',
    venue: 'BZ-01-120',
    semester: SEMESTER
  },

  // UHE3402 - PSYCHOLOGY IN THE QURAN AND SUNNAH - Section 01P
  {
    courseCode: 'UHE3402',
    courseName: 'PSYCHOLOGY IN THE QURAN AND SUNNAH',
    section: '01P',
    type: 'lecture',
    day: 'TUE',
    startTime: '12:00',
    endTime: '13:50',
    venue: 'BB03R91',
    semester: SEMESTER
  },
  {
    courseCode: 'UHE3402',
    courseName: 'PSYCHOLOGY IN THE QURAN AND SUNNAH',
    section: '01P',
    type: 'lecture',
    day: 'WED',
    startTime: '12:00',
    endTime: '13:50',
    venue: 'BB03R93',
    semester: SEMESTER
  },

  // BCC3012 - UNDERGRADUATE PROJECT I - Section 01
  {
    courseCode: 'BCC3012',
    courseName: 'UNDERGRADUATE PROJECT I',
    section: '01',
    type: 'lecture',
    day: 'FRI',
    startTime: '15:00',
    endTime: '16:50',
    venue: 'BZ-01-082',
    semester: SEMESTER
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data for this semester
    const deleted = await CourseSlot.deleteMany({ semester: SEMESTER });
    console.log(`Cleared ${deleted.deletedCount} existing slots for ${SEMESTER}`);

    // Insert seed data
    const result = await CourseSlot.insertMany(seedData);
    console.log(`Seeded ${result.length} course slots for ${SEMESTER}`);

    // Summary
    const courses = [...new Set(seedData.map(s => s.courseCode))];
    console.log(`\nCourses seeded (${courses.length}):`);
    for (const code of courses) {
      const slots = seedData.filter(s => s.courseCode === code);
      const name = slots[0].courseName;
      const sections = [...new Set(slots.map(s => s.section))];
      console.log(`  ${code} - ${name} [Sections: ${sections.join(', ')}]`);
    }

    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
