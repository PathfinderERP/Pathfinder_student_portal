import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Settings, LogOut, Menu, Shield, FileText, Plus } from 'lucide-react';
import CreateUserModal from '../components/CreateUserModal';

const SystemPortal = () => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);

    // Permission checks
    // Superadmin has all access. Admin has most. Staff depends on permissions.
    const role = user?.user_type;
    const permissions = user?.permissions || {};

    const canEdit = role === 'superadmin' || role === 'admin' || permissions.can_edit;
    const canDelete = role === 'superadmin' || (role === 'admin' && permissions.can_delete_users); // Example logic
    const canCreate = role === 'superadmin' || role === 'admin';

    const sidebarItems = [
        { icon: LayoutDashboard, label: 'Dashboard', active: true },
        { icon: Users, label: 'Users' },
        { icon: FileText, label: 'Reports' },
        { icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={() => alert("User created successfully!")}
            />

            {/* Mobile Sidebar Overlay */}
            {!isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(true)} />
            )}

            {/* Sidebar */}
            <aside
                className={`w-64 bg-gray-900 flex-shrink-0 flex flex-col transition-all duration-300 absolute md:relative z-50 h-full
                ${!isSidebarOpen ? '-translate-x-full md:translate-x-0 md:w-20' : ''}`}
            >
                <div className="p-6 flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <Shield className="text-white" size={24} />
                    </div>
                    {isSidebarOpen && <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">SystemPortal</span>}
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {sidebarItems.map((item, index) => (
                        <button
                            key={index}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all
                            ${item.active ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white group'}`}
                        >
                            <item.icon size={22} className={item.active ? 'text-indigo-400' : 'text-gray-400 group-hover:text-white'} />
                            {isSidebarOpen && <span>{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={22} />
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-900">
                <header className="h-16 flex items-center justify-between px-6 bg-gray-900 border-b border-gray-800">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white">
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-sm text-white font-medium">{user?.username}</div>
                            <div className="text-xs text-indigo-400 capitalize">{role}</div>
                        </div>
                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                            {user?.username?.[0]?.toUpperCase()}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6 md:p-8 bg-gray-800 md:rounded-tl-3xl shadow-inner scrollbar-thin scrollbar-thumb-gray-600">
                    <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[
                            { label: 'Total Users', value: '1,245', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
                            { label: 'Active Sessions', value: '342', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                            { label: 'Pending Requests', value: '18', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                            { label: 'System Health', value: '98%', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
                        ].map((stat, i) => (
                            <div key={i} className={`p-6 rounded-2xl border ${stat.color} backdrop-blur-sm`}>
                                <div className="text-sm font-medium opacity-80 mb-1">{stat.label}</div>
                                <div className="text-3xl font-bold">{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-700/50 rounded-2xl p-6 border border-gray-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">User Management</h3>
                            {canCreate && (
                                <button
                                    onClick={() => setCreateModalOpen(true)}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition"
                                >
                                    <Plus size={20} />
                                    <span>Add User</span>
                                </button>
                            )}
                        </div>
                        <p className="text-gray-400 mb-4">
                            Your Role: <span className="text-white bg-indigo-600 px-2 py-0.5 rounded text-sm">{role}</span>
                        </p>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-gray-400 border-b border-gray-600 text-sm">
                                        <th className="p-3 font-medium">User</th>
                                        <th className="p-3 font-medium">Role</th>
                                        <th className="p-3 font-medium">Status</th>
                                        <th className="p-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    <tr className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                        <td className="p-3">Sarah Smith</td>
                                        <td className="p-3">Student</td>
                                        <td className="p-3"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full text-xs">Active</span></td>
                                        <td className="p-3 flex gap-2">
                                            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">View</button>

                                            {canEdit ? (
                                                <button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white">Edit</button>
                                            ) : (
                                                <button className="px-3 py-1 bg-gray-800 text-gray-500 rounded text-xs cursor-not-allowed" disabled>Edit (Locked)</button>
                                            )}

                                            {canDelete ? (
                                                <button className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white">Delete</button>
                                            ) : (
                                                <button className="px-3 py-1 bg-gray-800 text-gray-500 rounded text-xs cursor-not-allowed" disabled>Delete (Locked)</button>
                                            )}
                                        </td>
                                    </tr>
                                    <tr className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                        <td className="p-3">James Johnson</td>
                                        <td className="p-3">Staff</td>
                                        <td className="p-3"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full text-xs">Active</span></td>
                                        <td className="p-3 flex gap-2">
                                            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">View</button>
                                            {canEdit && <button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white">Edit</button>}
                                            {canDelete && <button className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white">Delete</button>}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SystemPortal;
