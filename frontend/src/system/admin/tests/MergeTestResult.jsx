import React, { useState, useEffect, useRef } from 'react';
import { FileSearch, Search, RefreshCw, Users, Merge, Plus, X } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const MergeTestResult = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [tests, setTests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTests, setSelectedTests] = useState([]);

    const fetchTests = async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/tests/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTests(res.data);
        } catch (err) {
            console.error('Error fetching tests:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTests();
    }, []);

    const filteredTests = tests.filter(test =>
        test.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Drag to Scroll Logic
    const tableContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - tableContainerRef.current.offsetLeft);
        setScrollLeft(tableContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - tableContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        tableContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleSelectTest = (testId) => {
        setSelectedTests(prev => {
            if (prev.includes(testId)) {
                return prev.filter(id => id !== testId);
            }
            return [...prev, testId];
        });
    };

    const handleMergeResults = () => {
        if (selectedTests.length < 2) {
            alert('Please select at least 2 tests to merge');
            return;
        }
        // TODO: Implement merge logic
        console.log('Merging tests:', selectedTests);
    };

    const handleClearSelection = () => {
        setSelectedTests([]);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className={`p-8 rounded-[2.5rem] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                            Merge <span className="text-orange-500">Test Result</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Select multiple tests to merge their results into a combined report
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                            <input
                                type="text"
                                placeholder="Enter the test name"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`pl-10 pr-4 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all focus:ring-4 ${isDarkMode ? 'bg-white/5 border-white/10 focus:ring-blue-500/10' : 'bg-slate-50 border-slate-200 focus:ring-blue-500/5'}`}
                            />
                        </div>
                        <button
                            onClick={fetchTests}
                            className={`p-3 rounded-xl border transition-all active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-blue-400' : 'bg-white border-slate-200 text-blue-500 hover:bg-blue-50'}`}
                        >
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Selection Summary */}
                {selectedTests.length > 0 && (
                    <div className={`mt-6 p-4 rounded-xl border ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                                    <span className="text-orange-500 font-black text-sm">{selectedTests.length} Tests Selected</span>
                                </div>
                                <button
                                    onClick={handleClearSelection}
                                    className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <X size={14} /> Clear
                                </button>
                            </div>
                            <button
                                onClick={handleMergeResults}
                                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center gap-1.5"
                            >
                                <Merge size={13} /> Merge Results
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div
                    ref={tableContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={`overflow-x-auto ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-5 px-6 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedTests.length === filteredTests.length && filteredTests.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedTests(filteredTests.map(t => t.id));
                                            } else {
                                                setSelectedTests([]);
                                            }
                                        }}
                                        className="w-4 h-4 rounded accent-orange-500"
                                    />
                                </th>
                                <th className="py-5 px-6">#</th>
                                <th className="py-5 px-6">Test Name</th>
                                <th className="py-5 px-6">Test Code</th>
                                <th className="py-5 px-6 text-center">No Of Student Attempted</th>
                                <th className="py-5 px-6 text-center">Session</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="py-8 px-6">
                                            <div className={`h-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredTests.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <div className="opacity-20 flex flex-col items-center gap-3">
                                            <FileSearch size={48} />
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">No Tests Found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTests.map((test, index) => (
                                <tr
                                    key={test.id}
                                    className={`group transition-all cursor-pointer ${selectedTests.includes(test.id)
                                        ? (isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50')
                                        : (isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/30')
                                        }`}
                                    onClick={() => handleSelectTest(test.id)}
                                >
                                    <td className="py-5 px-6">
                                        <input
                                            type="checkbox"
                                            checked={selectedTests.includes(test.id)}
                                            onChange={() => handleSelectTest(test.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 rounded accent-orange-500"
                                        />
                                    </td>
                                    <td className="py-5 px-6 text-xs font-black opacity-30">{index + 1}</td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <span className="text-xs font-black uppercase tracking-tight">{test.name}</span>
                                            <span className="text-[9px] font-bold opacity-40 px-2 py-0.5 rounded-md bg-slate-500/5 whitespace-nowrap">{test.session_details?.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="px-3 py-1.5 bg-purple-500/10 text-purple-500 rounded-lg text-xs font-bold font-mono tracking-widest border border-purple-500/20">
                                            {test.code}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Users size={14} className="text-orange-500" />
                                            <span className="text-sm font-black">{test.total_students || 0}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                            {test.session_details?.name || 'N/A'}
                                        </span>
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

export default MergeTestResult;
