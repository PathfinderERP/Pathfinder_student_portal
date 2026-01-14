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
            { id: 'test_result', label: 'Test Result' }
        ]
    },
    { id: 'question_bank', label: 'Question Bank' },
    {
        id: 'admin_mgmt',
        label: 'Admin Management',
        subs: [
            { id: 'admin_system', label: 'System' },
            { id: 'admin_student', label: 'Student' },
            { id: 'admin_parent', label: 'Parent' },
            { id: 'admin_master_data', label: 'Master Data' },
            { id: 'settings', label: 'Settings' }
        ]
    },
];
