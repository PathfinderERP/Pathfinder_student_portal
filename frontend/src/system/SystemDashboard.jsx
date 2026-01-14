import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import {
    LayoutDashboard, MapPin, Layers, FileText, Database,
    ShieldCheck, User, ExternalLink, Plus, RefreshCw, Clock, CheckCircle
} from 'lucide-react';

// Common
import PortalLayout from '../components/common/PortalLayout';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Components
import DashboardOverview from './dashboard/DashboardOverview';
import StudentRegistry from './admin/StudentRegistry';
import SectionManagement from './sections/SectionManagement';
import CreateUserPage from './admin/CreateUserPage';
import ProfilePage from './profile/ProfilePage';
import SettingsPage from './settings/SettingsPage';
import UserManagementTable from './admin/UserManagementTable';
import LoginHistory from './admin/LoginHistory';
import MasterDataManagement from './admin/MasterDataManagement';

// Modals
import EditUserModal from './modals/EditUserModal';
import PasswordResetModal from './modals/PasswordResetModal';
import DeleteUserModal from './modals/DeleteUserModal';

const SystemDashboard = () => {
    const { user, updateProfile, getApiUrl, normalizeUser, lastUsername, lastPassword } = useAuth();
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [isUploading, setIsUploading] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [selectedUserForPass, setSelectedUserForPass] = useState(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);
    const [loginHistory, setLoginHistory] = useState([]);
    const [erpStudents, setErpStudents] = useState([]);
    const [isERPLoading, setIsERPLoading] = useState(false);
    const [masterSubTab, setMasterSubTab] = useState('Session');

    const isSuperAdmin = user?.user_type === 'superadmin';

    // 1. User Management Actions
    const handleToggleStatus = async (userObj) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/users/${userObj.id}/`, { is_active: !userObj.is_active });
            setUsersList(prev => prev.map(u => u.id === userObj.id ? { ...u, is_active: !u.is_active } : u));
            setSuccessMessage(`User "${userObj.username}" ${!userObj.is_active ? 'activated' : 'locked'} successfully`);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Failed to toggle status", error);
            if (error.response?.status === 404) {
                setUsersList(prev => prev.filter(u => u.id !== userObj.id));
                alert(`User "${userObj.username}" not found. Entry removed.`);
            } else {
                alert("Failed to toggle user status");
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteUser = (userObj) => {
        if (userObj.id === user.id) {
            alert("You cannot delete your own account!");
            return;
        }
        setSelectedUserForDelete(userObj);
        setDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!selectedUserForDelete) return;
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/users/${selectedUserForDelete.id}/`);
            setUsersList(prev => prev.filter(u => u.id !== selectedUserForDelete.id));
            setSuccessMessage("User deleted successfully");
            setTimeout(() => setSuccessMessage(''), 3000);
            setDeleteModalOpen(false);
            setSelectedUserForDelete(null);
        } catch (error) {
            console.error("Failed to delete user", error);
            if (error.response?.status === 404) {
                setUsersList(prev => prev.filter(u => u.id !== selectedUserForDelete.id));
                setDeleteModalOpen(false);
            } else {
                alert("Failed to delete user");
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleResetPassword = async (targetUser, newPass) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/api/users/${targetUser.id}/change_password/`, { password: newPass });
            setPasswordModalOpen(false);
            setSelectedUserForPass(null);
            setSuccessMessage("Password reset successfully!");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Failed to reset password", error);
            alert("Failed to reset password");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateProfile = async (profileData) => {
        const formData = new FormData();
        Object.keys(profileData).forEach(key => formData.append(key, profileData[key]));
        setIsUploading(true);
        try {
            await updateProfile(formData);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Update failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    // 2. Data Fetching
    useEffect(() => {
        if (activeTab.startsWith('Admin')) {
            const fetchUsers = async () => {
                try {
                    const apiUrl = getApiUrl();
                    const response = await axios.get(`${apiUrl}/api/users/`);
                    let data = response.data;

                    if (activeTab === 'Admin Student') data = data.filter(u => u.user_type === 'student');
                    else if (activeTab === 'Admin Parent') data = data.filter(u => u.user_type === 'parent');
                    else if (activeTab === 'Admin System') data = data.filter(u => !['student', 'parent'].includes(u.user_type));

                    setUsersList(data.map(u => normalizeUser(u)));
                } catch (error) {
                    console.error("Failed to fetch users", error);
                }
            };
            fetchUsers();
        }
    }, [activeTab, getApiUrl, normalizeUser]);

    useEffect(() => {
        if (activeTab === 'Dashboard') {
            const fetchLoginHistory = async () => {
                try {
                    const apiUrl = getApiUrl();
                    const response = await axios.get(`${apiUrl}/api/login-history/?_t=${Date.now()}`);
                    setLoginHistory(response.data);
                } catch (error) {
                    console.error("Failed to fetch login history", error);
                }
            };
            fetchLoginHistory();
        }
    }, [activeTab, getApiUrl]);

    const syncAttempted = useRef(false);
    const syncERP = useCallback(async (isManual = false) => {
        if (!isManual && syncAttempted.current) return;
        if (!lastPassword || !lastUsername) return;

        setIsERPLoading(true);
        syncAttempted.current = true;

        try {
            const erpUrl = import.meta.env.VITE_ERP_API_URL || 'https://pathfinder-5ri2.onrender.com';
            const erpIdentifier = (user?.email && user.email.includes('@')) ? user.email : "atanu@gmail.com";

            let loginRes;
            try {
                loginRes = await axios.post(`${erpUrl}/api/superAdmin/login`, {
                    email: erpIdentifier,
                    password: lastPassword
                });
            } catch (err) {
                loginRes = await axios.post(`${erpUrl}/api/superAdmin/login`, {
                    email: "atanu@gmail.com",
                    password: "000000"
                });
            }

            const admissionRes = await axios.get(`${erpUrl}/api/admission`, {
                headers: { 'Authorization': `Bearer ${loginRes.data.token}` }
            });

            const erpData = admissionRes.data?.student?.studentsDetails || admissionRes.data?.data || (Array.isArray(admissionRes.data) ? admissionRes.data : []);
            setErpStudents(erpData);
        } catch (err) {
            console.error("ERP Sync Failed:", err.message);
        } finally {
            setIsERPLoading(false);
        }
    }, [lastPassword, lastUsername, user?.email]);

    useEffect(() => {
        syncERP();
        const interval = setInterval(() => syncERP(false), 600000);
        return () => clearInterval(interval);
    }, [syncERP]);

    // 3. Permissions & Sidebar
    const hasPermission = (moduleId, subModuleId = null) => {
        if (isSuperAdmin) return true;
        let perms = user?.permissions;
        if (typeof perms === 'string') try { perms = JSON.parse(perms); } catch (e) { return false; }
        if (!perms || !perms[moduleId]) return false;
        if (subModuleId) return perms[moduleId][subModuleId]?.view === true;
        if (perms[moduleId].view === true) return true;
        if (typeof perms[moduleId] === 'object') return Object.values(perms[moduleId]).some(sub => sub && sub.view === true);
        return false;
    };

    const sidebarItems = useMemo(() => [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', active: activeTab === 'Dashboard', onClick: () => setActiveTab('Dashboard') },
        { id: 'centre_mgmt', icon: MapPin, label: 'Centre Management', active: activeTab === 'Centre Management', onClick: () => setActiveTab('Centre Management') },
        { id: 'section_mgmt', icon: Layers, label: 'Section Management', active: activeTab === 'Section Management', onClick: () => setActiveTab('Section Management') },
        {
            id: 'test_mgmt', icon: FileText, label: 'Test Management', active: activeTab.startsWith('Test'),
            subItems: [
                { id: 'test_create', label: 'Test Create', active: activeTab === 'Test Create', onClick: () => setActiveTab('Test Create') },
                { id: 'test_allotment', label: 'Test Allotment', active: activeTab === 'Test Allotment', onClick: () => setActiveTab('Test Allotment') },
                { id: 'test_responses', label: 'Test Responses', active: activeTab === 'Test Responses', onClick: () => setActiveTab('Test Responses') },
                { id: 'test_result', label: 'Test Result', active: activeTab === 'Test Result', onClick: () => setActiveTab('Test Result') }
            ].filter(sub => hasPermission('test_mgmt', sub.id))
        },
        { id: 'question_bank', icon: Database, label: 'Question Bank', active: activeTab === 'Question Bank', onClick: () => setActiveTab('Question Bank') },
        {
            id: 'admin_mgmt', icon: ShieldCheck, label: 'Admin Management', active: activeTab.startsWith('Admin'),
            subItems: [
                { id: 'admin_system', label: 'System', active: activeTab === 'Admin System', onClick: () => setActiveTab('Admin System') },
                { id: 'admin_student', label: 'Student', active: activeTab === 'Admin Student', onClick: () => setActiveTab('Admin Student') },
                { id: 'admin_parent', label: 'Parent', active: activeTab === 'Admin Parent', onClick: () => setActiveTab('Admin Parent') },
                {
                    id: 'admin_master_data',
                    label: 'Master Data',
                    active: activeTab === 'Admin Master Data',
                    onClick: () => setActiveTab('Admin Master Data'),
                    subItems: [
                        { label: 'Session', active: activeTab === 'Admin Master Data' && masterSubTab === 'Session', onClick: () => { setActiveTab('Admin Master Data'); setMasterSubTab('Session'); } },
                        { label: 'Exam Type', active: activeTab === 'Admin Master Data' && masterSubTab === 'Exam Type', onClick: () => { setActiveTab('Admin Master Data'); setMasterSubTab('Exam Type'); } },
                        { label: 'Class', active: activeTab === 'Admin Master Data' && masterSubTab === 'Class', onClick: () => { setActiveTab('Admin Master Data'); setMasterSubTab('Class'); } },
                    ]
                },
                { id: 'settings', label: 'Settings', active: activeTab === 'Settings', onClick: () => setActiveTab('Settings') },
            ].filter(sub => hasPermission('admin_mgmt', sub.id))
        },
        { id: 'profile', icon: User, label: 'Profile', active: activeTab === 'Profile', onClick: () => setActiveTab('Profile') },
    ].filter(item => ['dashboard', 'profile'].includes(item.id) || hasPermission(item.id)), [activeTab, masterSubTab, user?.permissions]);

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return <DashboardOverview isDarkMode={isDarkMode} syncERP={syncERP} isERPLoading={isERPLoading} erpStudentsCount={erpStudents.length} setActiveTab={setActiveTab} />;
            case 'Create User':
                return isSuperAdmin ? <CreateUserPage onBack={() => setActiveTab('Admin System')} /> : null;
            case 'Admin System':
            case 'Admin Parent':
                const tabTitle = activeTab.split(' ')[1];
                return (
                    <div className="space-y-8">
                        <div className={`p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-100 border-slate-200 shadow-slate-200/50'}`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight mb-2 uppercase"><span className="text-orange-500">{tabTitle}</span> Management</h2>
                                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage {tabTitle.toLowerCase()} level access and configurations.</p>
                                </div>
                                {activeTab === 'Admin System' && (
                                    <button onClick={() => setActiveTab('Create User')} className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20 active:scale-95">
                                        <Plus size={20} strokeWidth={3} />
                                        <span>Add New User</span>
                                    </button>
                                )}
                            </div>
                            <UserManagementTable
                                users={usersList}
                                isDarkMode={isDarkMode}
                                onToggleStatus={handleToggleStatus}
                                onResetPassword={(admin) => { setSelectedUserForPass(admin); setPasswordModalOpen(true); }}
                                onEditPermissions={(admin) => { setSelectedUserForEdit(admin); setEditModalOpen(true); }}
                                onDelete={handleDeleteUser}
                                currentUserId={user?.id}
                                isActionLoading={isActionLoading}
                            />
                        </div>
                        <LoginHistory loginHistory={loginHistory} isDarkMode={isDarkMode} />
                    </div>
                );
            case 'Admin Student':
                return <StudentRegistry studentsData={erpStudents} isERPLoading={isERPLoading} />;
            case 'Admin Master Data':
                return <MasterDataManagement activeSubTab={masterSubTab} setActiveSubTab={setMasterSubTab} />;
            case 'Section Management':
                return <SectionManagement />;
            case 'Profile':
                return (
                    <ProfilePage
                        user={user}
                        isDarkMode={isDarkMode}
                        isUploading={isUploading}
                        successMessage={successMessage}
                        onUpdateProfile={handleUpdateProfile}
                        onUpdateImage={async (file) => {
                            const fd = new FormData(); fd.append('profile_image', file);
                            setIsUploading(true); try { await updateProfile(fd); } finally { setIsUploading(false); }
                        }}
                        onClearImage={async () => {
                            const fd = new FormData(); fd.append('profile_image', '');
                            setIsUploading(true); try { await updateProfile(fd); } finally { setIsUploading(false); }
                        }}
                    />
                );
            case 'Settings':
                return <SettingsPage isDarkMode={isDarkMode} />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                        <div className={`p-6 rounded-[2rem] mb-6 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                            <div className="text-orange-500"><Plus size={48} /></div>
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">UNDER <span className="text-orange-500">DEVELOPMENT</span></h2>
                        <p className={`text-sm font-medium opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>We are working hard to bring the {activeTab} view to life very soon.</p>
                    </div>
                );
        }
    };

    return (
        <PortalLayout
            sidebarItems={sidebarItems}
            title={isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}
            subtitle={activeTab === 'Dashboard' ? "Manage your application content and users" : `System Administration > ${activeTab}`}
            headerActions={(
                <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer hover:border-orange-500/50 ${isDarkMode ? 'bg-slate-800/50 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    <ExternalLink size={14} /> <span>View Site</span>
                </div>
            )}
        >
            {successMessage && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3 px-6 py-3 bg-emerald-500 text-white rounded-2xl shadow-2xl shadow-emerald-500/20 font-black uppercase tracking-widest text-[10px]">
                        <CheckCircle size={14} strokeWidth={3} /> {successMessage}
                    </div>
                </div>
            )}

            {renderContent()}

            <PasswordResetModal
                user={selectedUserForPass}
                isDarkMode={isDarkMode}
                isOpen={passwordModalOpen}
                onClose={() => { setPasswordModalOpen(false); setSelectedUserForPass(null); }}
                onReset={handleResetPassword}
                isActionLoading={isActionLoading}
            />

            {editModalOpen && selectedUserForEdit && (
                <EditUserModal
                    user={selectedUserForEdit}
                    onClose={() => { setEditModalOpen(false); setSelectedUserForEdit(null); }}
                    onUpdate={(updated) => {
                        if (updated._shouldRemove) setUsersList(prev => prev.filter(u => u.id !== updated.id));
                        else setUsersList(prev => prev.map(u => u.id === updated.id ? updated : u));
                        setSuccessMessage("User updated successfully!");
                        setTimeout(() => setSuccessMessage(''), 3000);
                    }}
                />
            )}

            <DeleteUserModal
                user={selectedUserForDelete}
                isDarkMode={isDarkMode}
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDeleteUser}
                isActionLoading={isActionLoading}
            />
        </PortalLayout>
    );
};

export default SystemDashboard;
