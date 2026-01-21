import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, ArrowLeft, RefreshCcw, FileText, Settings, Calculator as CalcIcon, Clock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const TestManagement = ({ packageData, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchTests = useCallback(async () => {
        if (!packageData?._id) return;
        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/tests/?package=${packageData._id}`, config);
            setTests(response.data);
        } catch (err) {
            console.error("Failed to fetch tests", err);
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token, packageData]);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this test?")) return;
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.delete(`${apiUrl}/api/tests/${id}/`, config);
            fetchTests();
        } catch (err) {
            console.error("Failed to delete test", err);
            alert("Error: Could not delete the test.");
        }
    };

    const toggleCalculator = async (test) => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.patch(`${apiUrl}/api/tests/${test.id || test._id}/`, { has_calculator: !test.has_calculator }, config);
            fetchTests();
        } catch (err) {
            console.error("Failed to toggle calculator", err);
        }
    };

    const filteredTests = tests.filter(test =>
        test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className={`p-8 rounded-3xl border shadow-xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className={`p-3 rounded-2xl transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <span className="opacity-50">/{packageData.name}/</span>
                                <span>Test List</span>
                            </h2>
                            <p className="text-sm font-medium opacity-50">Manage assessment tests for this package.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                placeholder="Enter the test name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-4 pr-10 py-2.5 rounded-xl border-2 outline-none font-bold transition-all focus:border-blue-500 ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                        </div>
                        <button className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-green-600/20">
                            <Plus size={16} strokeWidth={3} />
                            <span>Add Test +</span>
                        </button>
                        <button onClick={fetchTests} className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'text-blue-400 hover:bg-blue-400/10' : 'text-blue-600 hover:bg-blue-600/10'}`}>
                            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="mt-8 overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-wider border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-4 px-4 w-12">#</th>
                                <th className="pb-4 px-4 text-center">Test Name</th>
                                <th className="pb-4 px-4 text-center">Test Code</th>
                                <th className="pb-4 px-4 text-center">Duration</th>
                                <th className="pb-4 px-4 text-center">Calculator</th>
                                <th className="pb-4 px-4 text-center">Option Type</th>
                                <th className="pb-4 px-4 text-center">Test Type</th>
                                <th className="pb-4 px-4 text-center whitespace-nowrap">showQuestionPaper</th>
                                <th className="pb-4 px-4 text-center">Sections</th>
                                <th className="pb-4 px-4 text-center">Action</th>
                                <th className="pb-4 px-4 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {filteredTests.length > 0 ? filteredTests.map((test, index) => (
                                <tr key={test.id || test._id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                    <td className="py-4 px-4 text-sm font-bold opacity-40">{index + 1}</td>
                                    <td className="py-4 px-4 text-sm font-black text-center">{test.name}</td>
                                    <td className="py-4 px-4 text-sm font-bold opacity-70 text-center">{test.code}</td>
                                    <td className="py-4 px-4 text-sm font-bold opacity-70 text-center">{test.duration}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex justify-center">
                                            <button onClick={() => toggleCalculator(test)} className="active:scale-90 transition-transform">
                                                <div className={`w-10 h-5.5 rounded-full p-1 transition-all ${test.has_calculator ? 'bg-blue-500 shadow-md shadow-blue-500/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${test.has_calculator ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-sm font-bold opacity-70 text-center">{test.option_type_numeric ? "1234" : "ABCD"}</td>
                                    <td className="py-4 px-4 text-sm font-bold opacity-70 text-center">{test.exam_type_details?.name || 'N/A'}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex justify-center">
                                            <button className="px-3 py-1.5 border-2 border-blue-500/30 text-blue-500 rounded-lg text-xs font-black hover:bg-blue-500 hover:text-white transition-all">
                                                QuestionPaper
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                                            Manage
                                        </button>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <button className="p-2 rounded-xl text-blue-500 hover:bg-blue-500/10 transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <button onClick={() => handleDelete(test.id || test._id)} className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="11" className="py-12 text-center opacity-40 font-bold italic">No tests found for this package.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TestManagement;
