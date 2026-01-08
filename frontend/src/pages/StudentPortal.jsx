import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Calendar, Award, User, LogOut } from 'lucide-react';

const StudentPortal = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Navbar */}
            <nav className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <BookOpen className="text-indigo-600 mr-2" />
                            <span className="font-bold text-xl text-gray-800">StudentPortal</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-600 text-sm">Hello, {user?.username}</span>
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                {user?.username?.[0]}
                            </div>
                            <button onClick={logout} className="text-gray-400 hover:text-red-500">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">My Dashboard</h1>
                    <p className="text-gray-500">Track your progress and updates</p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                            <BookOpen size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Enrolled Courses</h3>
                        <p className="text-3xl font-bold text-indigo-600">4</p>
                        <p className="text-sm text-gray-400 mt-2">View details &toea;</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4">
                            <Award size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Average Grade</h3>
                        <p className="text-3xl font-bold text-indigo-600">A-</p>
                        <p className="text-sm text-gray-400 mt-2">Top 15% of class</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-4">
                            <Calendar size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Attendance</h3>
                        <p className="text-3xl font-bold text-indigo-600">92%</p>
                        <p className="text-sm text-gray-400 mt-2">Keep it up!</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                        <h3 className="font-bold text-gray-800">Recent Activity</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="px-6 py-4 hover:bg-gray-50 transition flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-800">Assignment "Physics Lab 101" Graded</p>
                                    <p className="text-xs text-gray-400">2 hours ago</p>
                                </div>
                                <span className="text-indigo-600 font-bold text-sm">85/100</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentPortal;
