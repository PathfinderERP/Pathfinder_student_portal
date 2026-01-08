import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, DollarSign, Activity, LogOut, MessageCircle } from 'lucide-react';

const ParentPortal = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-green-50/50 font-sans">
            {/* Header */}
            <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-green-800 flex items-center gap-2">
                    <User className="text-green-600" /> Parent Portal
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{user?.username}</span>
                    <button onClick={logout} className="p-2 hover:bg-red-50 text-red-500 rounded-full transition">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6">
                {/* Child Selector (Mock) */}
                <div className="flex gap-4 mb-8">
                    <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-green-600/20 cursor-pointer hover:bg-green-700 transition">
                        <div className="text-xs opacity-80">Child</div>
                        <div className="font-bold">Alex Smith</div>
                    </div>
                    <div className="bg-white text-gray-500 px-6 py-3 rounded-xl border border-gray-200 hover:border-green-300 cursor-pointer transition">
                        <div className="text-xs opacity-60">Child</div>
                        <div className="font-medium">Emily Smith</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Academic Performance */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Activity size={20} className="text-green-600" /> Academic Performance
                            </h3>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Good</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Mathematics</span>
                                    <span className="font-bold">92%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[92%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Science</span>
                                    <span className="font-bold">88%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[88%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fees */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <DollarSign size={20} className="text-orange-600" /> Fee Status
                            </h3>
                            <button className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 transition">Pay Now</button>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="text-3xl font-bold font-mono">$1,200</div>
                            <div className="text-sm text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded">Due in 5 days</div>
                        </div>
                        <p className="text-sm text-gray-500">Term 2 Fees pending.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};
export default ParentPortal;
