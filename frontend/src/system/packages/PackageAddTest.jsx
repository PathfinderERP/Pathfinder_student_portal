import React, { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RefreshCw, Search, Plus, Edit2, Trash2, ArrowLeft, X, CheckCircle, Clock } from 'lucide-react';
import AssignExistingTest from './AssignExistingTest';

const TestManagement = ({ packageData, examTypes, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // View State
    const [view, setView] = useState('list'); // 'list' or 'assign'

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Test Picker State (no longer used, but kept for non-disruptive change if needed elsewhere)
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [availableTests, setAvailableTests] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');

    const fetchTests = useCallback(async () => {
        const pkgId = packageData?._id || packageData?.id;
        if (!pkgId) return;
        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            // Fetch tests assigned to this package
            console.log("DEBUG: Fetching tests for package:", pkgId);
            const response = await axios.get(`${apiUrl}/api/tests/?package=${pkgId}`, config);
            console.log("DEBUG: Tests for package response:", response.data);
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

    const handleRemove = async (id) => {
        if (!window.confirm("Remove this test from the package?")) return;
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            // Unassign test by setting package to null
            await axios.patch(`${apiUrl}/api/tests/${id}/`, { package: null }, config);
            fetchTests();
        } catch (err) {
            console.error("Remove failed", err);
        }
    };

    const filteredTests = tests.filter(test =>
        test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
    const paginatedTests = filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formValues, setFormValues] = useState({
        name: '',
        code: '',
        duration: 180,
        has_calculator: false,
        option_type_numeric: true,
        target_exam: packageData?.target_exam?.id || packageData?.target_exam || '',
        exam_type: '',
        session: packageData?.session?.id || packageData?.session || ''
    });

    const fetchAvailableTests = async () => {
        try {
            setPickerLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            // Fetch all tests
            const response = await axios.get(`${apiUrl}/api/tests/`, config);

            // Filter out tests already in this package
            const existingIds = tests.map(t => t.id || t._id);
            const unassigned = response.data.filter(t => !existingIds.includes(t.id || t._id));

            setAvailableTests(unassigned);
        } catch (err) {
            console.error("Failed to fetch available tests", err);
        } finally {
            setPickerLoading(false);
        }
    };

    const handleAssignTest = async (testId) => {
        const pkgId = packageData?._id || packageData?.id;
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.patch(`${apiUrl}/api/tests/${testId}/`, { package: pkgId }, config);
            setView('list');
            fetchTests();
        } catch (err) {
            console.error("Assign test failed", err);
            alert("Error assigning test.");
        }
    };

    const handleOpenModal = (test = null) => {
        if (test) {
            setIsEditing(true);
            setEditId(test.id || test._id);
            setFormValues({
                name: test.name,
                code: test.code,
                duration: test.duration,
                has_calculator: test.has_calculator,
                option_type_numeric: test.option_type_numeric,
                target_exam: test.target_exam || packageData.exam_type || '',
                exam_type: test.exam_type || '',
                session: test.session || packageData.session || ''
            });
        } else {
            setIsEditing(false);
            setEditId(null);
            setFormValues({
                name: '',
                code: '',
                duration: 180,
                has_calculator: false,
                option_type_numeric: true,
                target_exam: packageData.exam_type || '',
                exam_type: '',
                session: packageData.session || ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const payload = { ...formValues, package: packageData._id };

            if (isEditing) {
                await axios.patch(`${apiUrl}/api/tests/${editId}/`, payload, config);
            } else {
                // Create Unassigned Test (package: null)
                await axios.post(`${apiUrl}/api/tests/`, { ...formValues, package: null }, config);
            }
            setIsModalOpen(false);
            fetchTests();
        } catch (err) {
            console.error("Save test failed", err.response?.data || err.message);
            alert("Error saving test. Please check all fields.");
        }
    };

    if (view === 'assign') {
        return <AssignExistingTest
            packageData={packageData}
            onBack={() => setView('list')}
            onAssigned={() => {
                setView('list');
                fetchTests();
            }}
            onCreate={() => {
                setView('list');
                setTimeout(() => handleOpenModal(), 50);
            }}
        />;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className={`p-10 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className={`p-4 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="px-3 py-1 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-500/20">
                                    {packageData.name}
                                </div>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    Test <span className="text-blue-500">Registry</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage assessment tests for this package.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchTests}
                            disabled={loading}
                            className={`p-3 rounded-[5px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setView('assign')}
                            className="px-6 py-3 bg-green-600 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-green-600/20"
                        >
                            <Plus size={16} strokeWidth={3} />
                            <span>Add Test +</span>
                        </button>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by test name or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold transition-all focus:ring-4 ${isDarkMode
                                ? 'bg-white/5 border-white/5 text-white focus:border-blue-500/50 focus:ring-blue-500/5'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50 focus:ring-blue-500/5'
                                }`}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto custom-scrollbar cursor-grab active:cursor-grabbing">
                    <table className="w-full text-left border-separate border-spacing-y-3 min-w-[1000px]">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <th className="pb-4 px-4">#</th>
                                <th className="pb-4 px-4 text-center">Test Name</th>
                                <th className="pb-4 px-4 text-center">Test Code</th>
                                <th className="pb-4 px-4 text-center">Duration</th>
                                <th className="pb-4 px-4 text-center">Calculator</th>
                                <th className="pb-4 px-4 text-center">Option Type</th>
                                <th className="pb-4 px-4 text-center">Test Type</th>
                                <th className="pb-1 px-4 text-center whitespace-nowrap">showQuestionPaper</th>
                                <th className="pb-1 px-4 text-center">Sections</th>
                                <th className="pb-1 px-4 text-center">Remove</th>
                            </tr>
                        </thead>
                        <tbody className="">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="py-20 text-center">
                                        <RefreshCw size={40} className="animate-spin mx-auto text-blue-500 opacity-20" />
                                    </td>
                                </tr>
                            ) : paginatedTests.length > 0 ? paginatedTests.map((test, index) => (
                                <tr key={test.id || test._id} className={`group ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50 shadow-sm'} transition-all duration-300`}>
                                    <td className="py-4 px-4 text-xs font-bold opacity-60 first:rounded-l-[5px]">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="py-4 px-4 text-sm font-extrabold text-center tracking-tight">{test.name}</td>
                                    <td className="py-4 px-4 text-center">
                                        <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-black tracking-widest ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                                            {test.code}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-center text-xs font-bold opacity-70 uppercase tracking-widest">{test.duration} min</td>
                                    <td className="py-4 px-4 text-center">
                                        <div className="flex justify-center">
                                            <button onClick={() => toggleCalculator(test)} className="active:scale-95 transition-all">
                                                <div className={`w-10 h-5.5 rounded-full p-1 transition-colors duration-300 flex items-center ${test.has_calculator ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 ${test.has_calculator ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center text-xs font-bold opacity-70">{test.option_type_numeric ? "1234" : "ABCD"}</td>
                                    <td className="py-4 px-4 text-center text-xs font-bold opacity-70">{test.exam_type_details?.name || 'N/A'}</td>
                                    <td className="py-4 px-4 text-center">
                                        <div className="flex justify-center">
                                            <button className="px-3 py-1 border-2 border-blue-500/30 text-blue-500 rounded-[5px] text-[9px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all">
                                                QuestionPaper
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                                            Manage
                                        </button>
                                    </td>
                                    {/* Edit Removed as per request */}
                                    <td className="py-4 px-4 text-center last:rounded-r-[5px]">
                                        <button onClick={() => handleRemove(test.id || test._id)} className="p-2 rounded-[5px] text-red-500 hover:bg-red-500/10 transition-colors" title="Remove from Package">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="10" className="py-12 text-center opacity-50 font-medium italic bg-white/5 rounded-[5px]">No tests found for this package.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className={`w-full max-w-lg rounded-[5px] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#1A1F2B]' : 'bg-white'}`}>
                            <div className="bg-orange-500 p-8 flex justify-between items-center text-white">
                                <h3 className="text-xl font-black uppercase tracking-tight">{isEditing ? 'Edit Test' : 'Add New Test'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-all active:scale-90"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-10 space-y-6">
                                <div className="space-y-6">
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={formValues.name}
                                            onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                            placeholder=" "
                                            className={`peer w-full px-4 py-3.5 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-transparent border-white/10 text-white focus:border-blue-500' : 'bg-transparent border-slate-200 text-slate-800 focus:border-blue-500'}`}
                                            required
                                        />
                                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none top-0 -translate-y-full text-[10px] font-black uppercase tracking-widest peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:-translate-y-full ${isDarkMode ? 'text-slate-500 bg-[#1A1F2B] px-2' : 'text-slate-400 bg-white px-2'}`}>
                                            Test Name *
                                        </label>
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={formValues.code}
                                            onChange={e => setFormValues({ ...formValues, code: e.target.value })}
                                            placeholder=" "
                                            className={`peer w-full px-4 py-3.5 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-transparent border-white/10 text-white focus:border-blue-500' : 'bg-transparent border-slate-200 text-slate-800 focus:border-blue-500'}`}
                                            required
                                        />
                                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none top-0 -translate-y-full text-[10px] font-black uppercase tracking-widest peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:-translate-y-full ${isDarkMode ? 'text-slate-500 bg-[#1A1F2B] px-2' : 'text-slate-400 bg-white px-2'}`}>
                                            Test Code *
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formValues.duration}
                                                onChange={e => setFormValues({ ...formValues, duration: parseInt(e.target.value) })}
                                                placeholder=" "
                                                className={`peer w-full px-4 py-3.5 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-transparent border-white/10 text-white' : 'bg-transparent border-slate-200 text-slate-800'}`}
                                            />
                                            <label className={`absolute left-4 transition-all duration-200 pointer-events-none top-0 -translate-y-full text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500 bg-[#1A1F2B] px-2' : 'text-slate-400 bg-white px-2'}`}>
                                                Duration (min)
                                            </label>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={formValues.exam_type}
                                                onChange={e => setFormValues({ ...formValues, exam_type: e.target.value })}
                                                className={`w-full px-4 py-3.5 rounded-[5px] border-2 outline-none font-bold cursor-pointer transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white [&>option]:bg-[#1A1F2B]' : 'bg-transparent border-slate-200 text-slate-800'}`}
                                            >
                                                <option value="" className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>Select Type</option>
                                                {examTypes.map(et => (
                                                    <option key={et.id} value={et.id} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>{et.name}</option>
                                                ))}
                                            </select>
                                            <label className={`absolute left-4 transition-all duration-200 pointer-events-none top-0 -translate-y-full text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500 bg-[#1A1F2B] px-2' : 'text-slate-400 bg-white px-2'}`}>
                                                Test Type
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-6 rounded-[5px] bg-slate-50 dark:bg-white/5 border-2 border-transparent dark:border-white/5">
                                        <div>
                                            <span className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Calculator Status</span>
                                            <span className="font-bold">Enable Scientific Calculator</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormValues({ ...formValues, has_calculator: !formValues.has_calculator })}
                                            className={`w-12 h-7 rounded-full p-1.5 transition-all ${formValues.has_calculator ? 'bg-blue-500 shadow-lg shadow-blue-500/30' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formValues.has_calculator ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-[5px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/30 active:scale-95 transition-all mt-4"
                                >
                                    {isEditing ? 'Update Test Info' : 'Create New Test'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Test Picker Modal */}
                {isPickerOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className={`w-full max-w-2xl rounded-[5px] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#1A1F2B]' : 'bg-white'}`}>
                            <div className="bg-green-600 p-8 flex justify-between items-center text-white">
                                <h3 className="text-xl font-black uppercase tracking-tight">Assign Existing Test</h3>
                                <button onClick={() => setIsPickerOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-all active:scale-90"><X size={24} /></button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search available tests..."
                                        value={pickerSearch}
                                        onChange={(e) => setPickerSearch(e.target.value)}
                                        className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold transition-all focus:ring-4 ${isDarkMode
                                            ? 'bg-white/5 border-white/5 text-white focus:border-green-500/50'
                                            : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-green-500/50'
                                            }`}
                                    />
                                </div>

                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                    {pickerLoading ? (
                                        <div className="py-12 text-center">
                                            <RefreshCw className="animate-spin mx-auto text-green-500 mb-2" />
                                            <p className="text-xs font-bold opacity-50 uppercase tracking-widest">Loading tests...</p>
                                        </div>
                                    ) : availableTests.filter(t =>
                                        t.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                                        t.code.toLowerCase().includes(pickerSearch.toLowerCase())
                                    ).length > 0 ? (
                                        availableTests.filter(t =>
                                            t.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                                            t.code.toLowerCase().includes(pickerSearch.toLowerCase())
                                        ).map(test => (
                                            <div key={test.id || test._id} className={`p-4 rounded-[5px] border transition-all flex justify-between items-center group ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                                                <div>
                                                    <p className="text-sm font-black tracking-tight">{test.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[5px] ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/10 text-blue-600'}`}>{test.code}</span>
                                                        <span className="text-[9px] font-bold opacity-50 uppercase">{test.exam_type_details?.name || 'Unknown Type'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[10px] font-black uppercase opacity-40 tracking-wider">Duration</p>
                                                        <p className="text-xs font-bold">{test.duration} min</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAssignTest(test.id || test._id)}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-90"
                                                    >
                                                        Select
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[5px]">
                                            <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-4">No tests found</p>
                                            <button
                                                onClick={() => { setIsPickerOpen(false); handleOpenModal(); }}
                                                className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline"
                                            >
                                                Create a new test instead →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PackageAddTest = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [packages, setPackages] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);

    // Filter & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterExam, setFilterExam] = useState('');
    const [filterSession, setFilterSession] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpPageInput, setJumpPageInput] = useState('');

    const fetchMasterData = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const [etRes, txRes, sRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/master-data/sessions/`, config)
            ]);
            setExamTypes(etRes.data);
            setTargetExams(txRes.data);
            setSessions(sRes.data);
        } catch (err) {
            console.error("Fetch master data failed", err);
        }
    }, [getApiUrl, token]);

    const fetchPackages = useCallback(async () => {
        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/packages/`, config);
            setPackages(response.data);
        } catch (err) {
            console.error("Fetch packages failed", err);
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchPackages();
        fetchMasterData();
    }, [fetchPackages, fetchMasterData]);

    const filteredPackages = packages.filter(pkg => {
        const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pkg.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesExam = filterExam ? pkg.exam_type === filterExam : true;
        const matchesSession = filterSession ? pkg.session === filterSession : true;
        return matchesSearch && matchesExam && matchesSession;
    });

    const totalPages = Math.ceil(filteredPackages.length / itemsPerPage);
    const paginatedPackages = filteredPackages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpPageInput);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setJumpPageInput('');
        }
    };

    const toggleStatus = async (pkg) => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.patch(`${apiUrl}/api/packages/${pkg._id}/`, { is_completed: !pkg.is_completed }, config);
            fetchPackages();
        } catch (err) {
            console.error("Toggle status failed", err);
        }
    };

    if (selectedPackage) {
        return <TestManagement packageData={selectedPackage} examTypes={examTypes} onBack={() => setSelectedPackage(null)} />;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className={`p-10 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1 bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-purple-500/20">
                                Assessment Configuration
                            </div>
                            <h2 className="text-3xl font-black tracking-tight uppercase">
                                All <span className="text-purple-500">Packages</span>
                            </h2>
                        </div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Select a package to manage its associated tests.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchPackages}
                            className={`p-3 rounded-[5px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold transition-all focus:ring-4 ${isDarkMode
                                ? 'bg-white/5 border-white/5 text-white focus:border-blue-500/50 focus:ring-blue-500/5'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50 focus:ring-blue-500/5'
                                }`}
                        />
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        <select
                            value={filterExam}
                            onChange={(e) => { setFilterExam(e.target.value); setCurrentPage(1); }}
                            className={`px-4 py-3 rounded-[5px] border-2 outline-none font-bold cursor-pointer transition-all ${isDarkMode
                                ? 'bg-[#1A1F2B] border-white/5 text-white focus:border-blue-500/50 [&>option]:bg-[#1A1F2B]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50'
                                }`}
                        >
                            <option value="" className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>All Exams</option>
                            {targetExams.map(exam => (
                                <option key={exam.id} value={exam.id} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>{exam.name}</option>
                            ))}
                        </select>

                        <select
                            value={filterSession}
                            onChange={(e) => { setFilterSession(e.target.value); setCurrentPage(1); }}
                            className={`px-4 py-3 rounded-[5px] border-2 outline-none font-bold cursor-pointer transition-all ${isDarkMode
                                ? 'bg-[#1A1F2B] border-white/5 text-white focus:border-blue-500/50 [&>option]:bg-[#1A1F2B]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50'
                                }`}
                        >
                            <option value="" className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>All Sessions</option>
                            {sessions.map(session => (
                                <option key={session.id} value={session.id} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>{session.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto custom-scrollbar cursor-grab active:cursor-grabbing">
                    <table className="w-full text-left border-separate border-spacing-y-3 min-w-[1000px]">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <th className="pb-4 px-6">#</th>
                                <th className="pb-4 px-6">Name</th>
                                <th className="pb-4 px-6">Code</th>
                                <th className="pb-4 px-6 text-center">Exam Type</th>
                                <th className="pb-4 px-6 text-center">Session</th>
                                <th className="pb-4 px-6 text-center">Completed</th>
                                <th className="pb-4 px-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="">
                            {paginatedPackages.length > 0 ? paginatedPackages.map((pkg, index) => (
                                <tr key={pkg._id} className={`group ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50 shadow-sm'} transition-all duration-300`}>
                                    <td className="py-4 px-6 text-xs font-bold opacity-60 first:rounded-l-[5px]">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="py-4 px-6">
                                        <div className="font-extrabold text-sm tracking-tight">{pkg.name}</div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-black tracking-widest ${isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                            {pkg.code}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-xs font-bold opacity-70 text-center">{pkg.exam_type_details?.name || 'N/A'}</td>
                                    <td className="py-4 px-6 text-xs font-medium opacity-60 text-center">{pkg.session_details?.name || 'N/A'}</td>
                                    <td className="py-4 px-6 text-center">
                                        <button onClick={() => toggleStatus(pkg)} className="active:scale-95 transition-all">
                                            <div className={`w-10 h-5.5 mx-auto rounded-full p-1 transition-colors duration-300 flex items-center ${pkg.is_completed ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 ${pkg.is_completed ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                                            </div>
                                        </button>
                                    </td>
                                    <td className="py-4 px-6 text-center last:rounded-r-[5px]">
                                        <button
                                            onClick={() => setSelectedPackage(pkg)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                                        >
                                            Manage Test
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center opacity-50 font-medium italic bg-white/5 rounded-[5px]">No packages found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-100 dark:border-white/5 pt-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Show</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className={`px-3 py-2 rounded-[5px] border-2 outline-none font-black text-[10px] transition-all cursor-pointer ${isDarkMode
                                ? 'bg-[#1A1F2B] border-white/5 text-white focus:border-blue-500/50 [&>option]:bg-[#1A1F2B]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50'
                                }`}
                        >
                            {[5, 10, 20, 50].map(val => (
                                <option key={val} value={val} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>{val} Rows</option>
                            ))}
                        </select>
                        <span className="text-xs font-bold opacity-50 uppercase tracking-widest">per page</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={`px-4 py-2 rounded-[5px] font-bold text-xs transition-all active:scale-95 disabled:opacity-30 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
                        >
                            Prev
                        </button>
                        <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-[5px]">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 rounded-[5px] font-black text-[10px] transition-all ${currentPage === page
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40'
                                        : 'hover:bg-white/10 opacity-50 hover:opacity-100'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={`px-4 py-2 rounded-[5px] font-bold text-xs transition-all active:scale-95 disabled:opacity-30 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
                        >
                            Next
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Jump to</span>
                        <form onSubmit={handleJumpToPage} className="relative">
                            <input
                                type="number"
                                value={jumpPageInput}
                                onChange={(e) => setJumpPageInput(e.target.value)}
                                placeholder="Page #"
                                className={`w-20 px-3 py-2 rounded-[5px] border-2 outline-none font-black text-[10px] transition-all text-center ${isDarkMode
                                    ? 'bg-white/5 border-white/5 text-white focus:border-blue-500/50'
                                    : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50'
                                    }`}
                            />
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PackageAddTest;
