export const permissionTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'centre_mgmt', label: 'Centre Management' },
    { id: 'section_mgmt', label: 'Section Management' },
    {
        id: 'test_mgmt',
        label: 'Test Management',
        subs: [
            { id: 'test_create', label: 'Test Create' },
            { id: 'test_allotment', label: 'Test Allotment' },
            { id: 'test_responses', label: 'Test Responses' },
            { id: 'merge_test_result', label: 'Merge Test Result' },
            { id: 'test_result', label: 'Test Result' },
            { id: 'psychometric_responses', label: 'Psychometric Test' },
            { id: 'student_reviews', label: 'Student Reviews' }
        ]
    },
    { id: 'question_bank', label: 'Question Bank' },
    {
        id: 'omr_mgmt',
        label: 'OMR Management',
        subs: [
            { id: 'omr_result_generate', label: 'OMR Result Generate' },
            { id: 'omr_result', label: 'OMR Result' }
        ]
    },
    {
        id: 'package_mgmt',
        label: 'Package Management',
        subs: [
            { id: 'create_package', label: 'Create Package' },
            { id: 'add_test', label: 'Add Test' },
            { id: 'add_course', label: 'Add Course' },
            { id: 'package_allotment', label: 'Package Allotment' },
            { id: 'test_analysis', label: 'Test Analysis' }
        ]
    },
    {
        id: 'doubt_mgmt',
        label: 'Doubt Management',
        subs: [
            { id: 'assign_doubt', label: 'Assign Doubt' },
            { id: 'solve_doubt', label: 'Solve Doubt' }
        ]
    },
    { id: 'grievance_mgmt', label: 'Grievance Management' },
    { id: 'student_activity', label: 'Student Activity' },
    { id: 'class_feedback', label: 'Class Feedback' },
    { id: 'student_attendance', label: 'Student Attendance' },
    {
        id: 'content_mgmt',
        label: 'Content Management',
        subs: [
            { id: 'library', label: 'Library' },
            { id: 'solution_dpp_rpp', label: 'Solution To Dpp Rpp' },
            { id: 'notice', label: 'Notice' },
            { id: 'live_class', label: 'Live Class' },
            { id: 'video_mgmt', label: 'Video Management' },
            { id: 'pen_paper_test', label: 'Pen Paper Test' },
            { id: 'homework', label: 'Homework' },
            { id: 'nexus_hub', label: 'Nexus Hub' },
            { id: 'banner', label: 'Banner' },
            { id: 'seminar', label: 'Seminar' },
            { id: 'test_shift', label: 'Test Shift' },
            { id: 'guide', label: 'Guide' }
        ]
    },
    {
        id: 'admin_mgmt',
        label: 'Admin Management',
        subs: [
            { id: 'admin_system', label: 'System' },
            { id: 'admin_student', label: 'Student' },
            { id: 'admin_teacher', label: 'Teacher' },
            { id: 'admin_parent', label: 'Parent' },
            { id: 'center_admin_mgmt', label: 'Center Admin Management' },
            { id: 'head_office_admin', label: 'Head Office Admin' },
            { id: 'admin_master_data', label: 'Master Data' },
            { id: 'settings', label: 'Settings' }
        ]
    },
];

export const getSafePermissions = (perms) => {
    const base = {};

    permissionTabs.forEach(tab => {
        if (tab.subs) {
            base[tab.id] = {
                view: false, create: false, edit: false, delete: false
            };
            tab.subs.forEach(sub => {
                base[tab.id][sub.id] = { view: false, create: false, edit: false, delete: false };
            });
        } else {
            base[tab.id] = {
                view: tab.id === 'dashboard',
                create: false,
                edit: false,
                delete: false
            };
        }
    });

    if (perms) {
        try {
            const parsed = typeof perms === 'string' ? JSON.parse(perms) : perms;
            
            Object.keys(parsed).forEach(key => {
                if (typeof parsed[key] === 'object' && parsed[key] !== null) {
                    if (!base[key]) base[key] = {};
                    Object.keys(parsed[key]).forEach(subKey => {
                        if (typeof parsed[key][subKey] === 'object' && parsed[key][subKey] !== null) {
                            base[key][subKey] = {
                                ...(base[key][subKey] || { view: false, create: false, edit: false, delete: false }),
                                ...parsed[key][subKey]
                            };
                        } else {
                            base[key][subKey] = parsed[key][subKey];
                        }
                    });
                } else {
                    base[key] = parsed[key];
                }
            });
        } catch (e) {
            console.error("Failed to parse user permissions", e);
        }
    }

    return base;
};
