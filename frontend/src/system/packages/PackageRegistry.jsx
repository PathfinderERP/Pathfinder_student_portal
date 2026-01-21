import React, { useState } from 'react';
import { Package, Search, Plus, Filter, ArrowLeft, Edit2, Trash2, CheckCircle, Clock, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const PackageRegistry = ({ onBack }) => {
    const { isDarkMode } = useTheme();
    // Dummy Data to match the screenshot
    const [packages, setPackages] = useState([
        { id: 1, name: 'WB CLASS-XII', code: 'WB-XII', examType: 'WB', session: '2025-2026', image: 'Image', contentStatus: true, testStatus: true, completed: true },
        { id: 2, name: 'WB CLASS-XI', code: 'WB-XI', examType: 'WB', session: '2025-2026', image: 'Image', contentStatus: true, testStatus: true, completed: true },
        { id: 3, name: 'WB CLASS-X', code: 'WB-X', examType: 'WB', session: '2025-2026', image: 'Image', contentStatus: true, testStatus: true, completed: true },
        { id: 4, name: 'WB CLASS-IX', code: 'WB-IX', examType: 'WB', session: '2025-2026', image: 'Image', contentStatus: true, testStatus: true, completed: true },
        { id: 5, name: 'CISCE CLASS-XII', code: 'CISCE-XII', examType: 'CICSE', session: '2025-2026', image: 'Image', contentStatus: true, testStatus: true, completed: true },
        { id: 6, name: 'CISCE CLASS-XI', code: 'CISCE-XI', examType: 'CICSE', session: '2025-2026', image: 'Image', contentStatus: true, testStatus: true, completed: true },
        { id: 7, name: 'CISCE CLASS-X', code: 'CISCE-X', examType: 'CICSE', session: '2025-2026', image: 'Image', contentStatus: true, testStatus: true, completed: true },
    ]);

    const toggleStatus = (id) => {
        setPackages(packages.map(pkg => pkg.id === id ? { ...pkg, completed: !pkg.completed } : pkg));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className={`p-10 rounded-[2.5rem] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className={`p-4 rounded-2xl transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                            >
                                <ArrowLeft size={24} strokeWidth={3} />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="px-3 py-1 bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-purple-500/20">
                                    Package Management
                                </div>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    All <span className="text-purple-500">Packages</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage and configure your test packages.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="px-6 py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-green-600/20">
                            <Plus size={16} strokeWidth={3} />
                            <span>Add Package +</span>
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-6 px-4">#</th>
                                <th className="pb-6 px-4">Name</th>
                                <th className="pb-6 px-4">Code</th>
                                <th className="pb-6 px-4">Exam Type</th>
                                <th className="pb-6 px-4">Session</th>
                                <th className="pb-6 px-4">Image</th>
                                <th className="pb-6 px-4 text-center">Content Status</th>
                                <th className="pb-6 px-4 text-center">Test Status</th>
                                <th className="pb-6 px-4 text-center">Mark Completed</th>
                                <th className="pb-6 px-4 text-center">Edit</th>
                                <th className="pb-6 px-4 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {packages.map((pkg, index) => (
                                <tr key={pkg.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-all duration-300`}>
                                    <td className="py-6 px-4 text-sm font-bold opacity-60">{index + 1}</td>

                                    <td className="py-6 px-4">
                                        <div className="font-extrabold text-sm tracking-tight">{pkg.name}</div>
                                    </td>

                                    <td className="py-6 px-4">
                                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                            {pkg.code}
                                        </span>
                                    </td>

                                    <td className="py-6 px-4 text-xs font-bold opacity-70">{pkg.examType}</td>

                                    <td className="py-6 px-4 text-xs font-medium opacity-60">{pkg.session}</td>

                                    <td className="py-6 px-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                            Img
                                        </div>
                                    </td>

                                    <td className="py-6 px-4 text-center">
                                        <div className="flex justify-center">
                                            {pkg.contentStatus ?
                                                <CheckCircle className="text-green-500" size={20} strokeWidth={2.5} /> :
                                                <Clock className="text-orange-500" size={20} strokeWidth={2.5} />
                                            }
                                        </div>
                                    </td>

                                    <td className="py-6 px-4 text-center">
                                        <div className="flex justify-center">
                                            {pkg.testStatus ?
                                                <CheckCircle className="text-green-500" size={20} strokeWidth={2.5} /> :
                                                <Clock className="text-orange-500" size={20} strokeWidth={2.5} />
                                            }
                                        </div>
                                    </td>

                                    <td className="py-6 px-4 text-center">
                                        <button onClick={() => toggleStatus(pkg.id)} className="group active:scale-95 transition-all">
                                            <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex items-center ${pkg.completed ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${pkg.completed ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                                            </div>
                                        </button>
                                    </td>

                                    <td className="py-6 px-4 text-center">
                                        <button className="p-2 rounded-xl text-blue-500 hover:bg-blue-500/10 transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                    </td>

                                    <td className="py-6 px-4 text-center">
                                        <button className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PackageRegistry;
