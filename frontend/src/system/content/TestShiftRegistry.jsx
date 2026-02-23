import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Loader2, Copy } from 'lucide-react';

const TestShiftRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    // Data State
    const [tests, setTests] = useState([]);
    const [sections, setSections] = useState([]);

    // Selection State
    const [selectedTestId, setSelectedTestId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');

    // Loading State
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Fetch Tests and Sections
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Parallel fetch
            const [testsRes, sectionsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/`, config),
                axios.get(`${apiUrl}/api/sections/`, config)
            ]);

            setTests(testsRes.data);
            setSections(sectionsRes.data);
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Failed to load tests/sections");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDuplicate = async () => {
        if (!selectedTestId || !selectedSectionId) {
            toast.error("Please select both a test and a study section");
            return;
        }

        // Confirm
        if (!window.confirm("Are you sure you want to duplicate this test?")) return;

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.post(
                `${apiUrl}/api/tests/${selectedTestId}/duplicate_test/`,
                { section_id: selectedSectionId },
                config
            );

            toast.success("Test duplicated successfully!");
            // Reset selection
            setSelectedTestId('');
            setSelectedSectionId('');
            // Refresh data to show new test in list if needed (though we don't show list here)
            fetchData();
        } catch (error) {
            console.error("Failed to duplicate test", error);
            const msg = error.response?.data?.error || "Failed to duplicate test";
            toast.error(msg);
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
            <div className={`w-full max-w-4xl p-12 rounded-[5px] shadow-2xl relative border transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>

                {/* Header */}
                <h1 className={`text-4xl font-extrabold text-center mb-16 underline decoration-4 decoration-blue-600 underline-offset-8 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Test Shifting
                </h1>

                {isLoading ? (
                    <div className="space-y-12 animate-pulse">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className={`h-3 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                <div className={`h-14 w-full rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                            </div>
                            <div className="space-y-4">
                                <div className={`h-3 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                <div className={`h-14 w-full rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                            </div>
                        </div>
                        <div className="flex justify-center pt-8">
                            <div className={`h-14 w-60 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Dropdowns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Test Selector */}
                            <div className="space-y-2 relative group">
                                <label className={`absolute -top-3 left-4 px-2 text-xs font-bold z-10 transition-colors ${isDarkMode ? 'bg-[#10141D] text-blue-400' : 'bg-white text-blue-600'}`}>
                                    Select Test
                                </label>
                                <select
                                    value={selectedTestId}
                                    onChange={(e) => setSelectedTestId(e.target.value)}
                                    className={`w-full p-4 rounded-[5px] border-2 text-base font-semibold outline-none appearance-none transition-all cursor-pointer
                                        ${isDarkMode
                                            ? 'bg-[#1a1f2e] border-blue-500/30 text-white focus:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                            : 'bg-white border-blue-500 text-slate-800 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.1)]'
                                        }`}
                                >
                                    <option value="" className="text-gray-400">Select Test...</option>
                                    {tests.map(test => (
                                        <option key={test.id} value={test.id}>
                                            {test.name} ({test.code})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>

                            {/* Section Selector */}
                            <div className="space-y-2 relative group">
                                <label className={`absolute -top-3 left-4 px-2 text-xs font-bold opacity-50 z-10 transition-colors ${isDarkMode ? 'bg-[#10141D] text-slate-400' : 'bg-white text-slate-500'}`}>
                                    Select study-section
                                </label>
                                <select
                                    value={selectedSectionId}
                                    onChange={(e) => setSelectedSectionId(e.target.value)}
                                    className={`w-full p-4 rounded-[5px] border text-base font-semibold outline-none appearance-none transition-all cursor-pointer
                                        ${isDarkMode
                                            ? 'bg-[#1a1f2e] border-white/10 text-white focus:border-slate-500'
                                            : 'bg-white border-slate-300 text-gray-500 focus:border-slate-400'
                                        }`}
                                >
                                    <option value="">Select study-section...</option>
                                    {sections.map(section => (
                                        <option key={section.id} value={section.id}>
                                            {section.name} {section.subject_code ? `(${section.subject_code})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-center pt-8">
                            <button
                                onClick={handleDuplicate}
                                disabled={isActionLoading || !selectedTestId || !selectedSectionId}
                                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] font-bold text-sm uppercase tracking-wide transition-all shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-3 min-w-[240px] justify-center"
                            >
                                {isActionLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Duplicating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Create a duplicate Test</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestShiftRegistry;
