// Dummy data for testing the Classes page UI
export const DUMMY_CLASSES = [
    {
        _id: 'cls_1',
        className: 'Section A - Biology',
        subject: 'Biology',
        classMode: 'Offline',
        status: 'Completed',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        teacherName: 'Dr. A Sharma',
        session: '2025-26'
    },
    {
        _id: 'cls_2',
        className: 'Section B - Mathematics',
        subject: 'Mathematics',
        classMode: 'Online',
        status: 'Scheduled',
        date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
        startTime: '02:00 PM',
        endTime: '03:00 PM',
        teacherName: 'Ms. N. Rao',
        session: '2025-26'
    }
];

export const DUMMY_ONGOING = [
    {
        _id: 'ongoing_1',
        className: 'Live - Physics Problem Solving',
        subject: 'Physics',
        classMode: 'Online',
        status: 'Ongoing',
        date: new Date().toISOString(),
        startTime: '11:30 AM',
        endTime: '12:30 PM',
        teacherName: 'Mr. R. Gupta',
        session: '2025-26'
    }
];

export const DUMMY_UPCOMING = [
    {
        _id: 'up_1',
        className: 'Upcoming - Chemistry Lab',
        subject: 'Chemistry',
        classMode: 'Offline',
        status: 'Scheduled',
        date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
        startTime: '09:00 AM',
        endTime: '10:30 AM',
        teacherName: 'Dr. S. Mehta',
        session: '2025-26'
    }
];

export const DUMMY_HISTORY = [
    {
        id: 'hist_1',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
        startTime: '09:00 AM',
        endTime: '10:00 AM',
        teacherName: 'Ms. R. Sen',
        chapterName: 'Introduction to Algebra',
        attendanceStatus: 'Present',
        className: 'Section A - Mathematics'
    },
    {
        id: 'hist_2',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        teacherName: 'Dr. A Sharma',
        chapterName: 'Cell Structure',
        attendanceStatus: 'Absent',
        className: 'Section A - Biology'
    }
];

export default {
    DUMMY_CLASSES,
    DUMMY_ONGOING,
    DUMMY_UPCOMING,
    DUMMY_HISTORY
};
