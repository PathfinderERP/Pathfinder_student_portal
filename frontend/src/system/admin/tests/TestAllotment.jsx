import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Search, MapPin, Trash2, X, Check, Loader2, Filter, LayoutGrid, ChevronDown } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

const TestAllotment = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters State
    const [sessions, setSessions] = useState([]);
    const [filterSession, setFilterSession] = useState('');
    const [filterStatus, setFilterStatus] = useState(''); // 'allotted', 'not_allotted'
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Allotment Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);
    const [availableCentres, setAvailableCentres] = useState([]);
    const [selectedCentreIds, setSelectedCentreIds] = useState([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Section Allotment Modal State
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [availableSections, setAvailableSections] = useState([]);
    const [selectedSectionIds, setSelectedSectionIds] = useState([]);

    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        return activeToken ? { headers: { 'Authorization': `Bearer ${activeToken}` } } : {};
    }, [token]);

    const availableSessionIds = useMemo(() => {
        return new Set(tests.map(t => t.session || t.session_details?.id));
    }, [tests]);

    const filteredSessionsForDropdown = useMemo(() => {
        return sessions.filter(s => availableSessionIds.has(s.id));
    }, [sessions, availableSessionIds]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const [testsRes, sessionsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/`, getAuthConfig()),
                axios.get(`${apiUrl}/api/master-data/sessions/`, getAuthConfig())
            ]);

            setTests(testsRes.data);
            setSessions(sessionsRes.data);

            // Compute available sessions from the freshly fetched tests
            const uniqueSessionIds = new Set(testsRes.data.map(t => t.session || t.session_details?.id));
            const availableSessions = sessionsRes.data.filter(s => uniqueSessionIds.has(s.id));

            // Set default session if available and not set
            if (availableSessions.length > 0 && !filterSession) {
                const activeSession = availableSessions.find(s => s.is_active);
                if (activeSession) {
                    setFilterSession(activeSession.id.toString());
                } else if (availableSessions.length > 0) {
                    // Fallback to the latest available session if no active one exists in the list
                    const sorted = [...availableSessions].sort((a, b) => b.name.localeCompare(a.name));
                    setFilterSession(sorted[0].id.toString());
                }
            }

        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, getAuthConfig, filterSession]); // Note: filterSession dep might suffice, but logic is inside.

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEditCentres = async (test) => {
        setSelectedTest(test);
        setSelectedCentreIds(test.centres || []);
        setIsActionLoading(true);

        try {
            const apiUrl = getApiUrl();
            const centresRes = await axios.get(`${apiUrl}/api/centres/`, getAuthConfig());
            setAvailableCentres(centresRes.data);
            setIsModalOpen(true);
        } catch (err) {
            alert('Failed to load centres');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSaveAllotment = async () => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/tests/${selectedTest.id}/`,
                { centres: selectedCentreIds },
                getAuthConfig()
            );
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert('Failed to update allotment');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRemoveAllotment = async (test) => {
        if (!window.confirm(`Are you sure you want to remove all centre allotments for "${test.name}"?`)) return;
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/tests/${test.id}/`,
                { centres: [] },
                getAuthConfig()
            );
            fetchData();
        } catch (err) {
            alert('Failed to remove allotment');
        }
    };

    const handleManageSections = async (test) => {
        setSelectedTest(test);
        setSelectedSectionIds(test.allotted_sections || []);
        setIsActionLoading(true);

        try {
            const apiUrl = getApiUrl();
            const sectionsRes = await axios.get(`${apiUrl}/api/sections/`, getAuthConfig());
            // Filter only 'Package' sections (those not assigned to a specific test, i.e., test is null)
            const packages = sectionsRes.data.filter(s => !s.test);
            setAvailableSections(packages);
            setIsSectionModalOpen(true);
        } catch (err) {
            console.error(err);
            alert('Failed to load sections');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSaveSectionAllotment = async () => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/tests/${selectedTest.id}/`,
                { allotted_sections: selectedSectionIds },
                getAuthConfig()
            );
            setIsSectionModalOpen(false);
            fetchData();
        } catch (err) {
            alert('Failed to update section allotment');
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredTests = useMemo(() => {
        return tests.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.code.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesSession = filterSession ? (t.session?.toString() === filterSession || t.session_details?.id?.toString() === filterSession) : true;

            const matchesStatus = filterStatus === 'allotted' ? (t.centres_count > 0)
                : filterStatus === 'not_allotted' ? (t.centres_count === 0)
                    : true;

            return matchesSearch && matchesSession && matchesStatus;
        });
    }, [tests, searchTerm, filterSession, filterStatus]);

    return (
        <div className={`p-8 animate-in fade-in duration-500`}>
            {/* Header */}
            <div className={`p-8 rounded-[2.5rem] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                            Test <span className="text-orange-500">Allotment</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Allot tests to specific centres and manage distributions.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        {/* Session Filter */}
                        <div className="relative w-full sm:w-40">
                            <select
                                value={filterSession}
                                onChange={(e) => setFilterSession(e.target.value)}
                                className={`w-full pl-4 pr-10 py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider outline-none cursor-pointer appearance-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:bg-black/40' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Sessions</option>
                                {filteredSessionsForDropdown
                                    .sort((a, b) => b.name.localeCompare(a.name))
                                    .map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        {/* Status Filter */}
                        <div className="relative w-full sm:w-40">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className={`w-full pl-4 pr-10 py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider outline-none cursor-pointer appearance-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:bg-black/40' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Status</option>
                                <option value="allotted">Allotted Only</option>
                                <option value="not_allotted">Not Allotted Only</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search tests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full sm:w-64 pl-10 pr-4 py-3 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className={`rounded-[2.5rem] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="py-6 px-6 text-center">#</th>
                                <th className="py-6 px-6">Name</th>
                                <th className="py-6 px-6">Test Code</th>
                                <th className="py-6 px-6 text-center">Section Allotted</th>
                                <th className="py-6 px-6 text-center">Centres Allotted</th>
                                <th className="py-6 px-6 text-center">Edit Centres</th>
                                <th className="py-6 px-6 text-center">Remove Allotment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
                                        <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Loading Tests...</span>
                                    </td>
                                </tr>
                            ) : filteredTests.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center opacity-40">No tests found matching your criteria.</td>
                                </tr>
                            ) : filteredTests.map((test, index) => (
                                <tr key={test.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-colors`}>
                                    <td className="py-5 px-6 text-center font-bold text-xs opacity-50">{index + 1}</td>
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-xs mb-1 uppercase">{test.name}</span>
                                            <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider">
                                                {test.session_details?.name || 'No Session'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 font-black text-xs opacity-70">{test.code}</td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleManageSections(test)}
                                            className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all cursor-pointer">
                                            Sections
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-md border text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' : 'border-blue-200 text-blue-600 bg-blue-50'}`}>
                                            {test.centres_count || 0} Centres
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleEditCentres(test)}
                                            className="px-4 py-1.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                                        >
                                            Edit Centres
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleRemoveAllotment(test)}
                                            className={`p-2 rounded-lg transition-all hover:scale-110 ${isDarkMode ? 'text-slate-500 hover:text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Centre Allotment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className="bg-[#0284C7] p-6 flex justify-between items-center text-white">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">Allot Centres</h3>
                                <p className="text-[10px] font-medium opacity-80 mt-1">{selectedTest?.name}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-all opacity-80 hover:opacity-100">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {availableCentres.map(centre => {
                                    const isSelected = selectedCentreIds.includes(centre.id);
                                    return (
                                        <div
                                            key={centre.id}
                                            onClick={() => {
                                                if (isSelected) setSelectedCentreIds(prev => prev.filter(id => id !== centre.id));
                                                else setSelectedCentreIds(prev => [...prev, centre.id]);
                                            }}
                                            className={`cursor-pointer p-4 rounded-xl border flex items-center justify-between transition-all group active:scale-95 ${isSelected
                                                ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                                                : isDarkMode ? 'bg-black/20 border-white/5 hover:border-white/20' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                    <MapPin size={14} />
                                                </div>
                                                <div className="text-xs font-bold uppercase truncate max-w-[150px]">
                                                    {centre.name}
                                                </div>
                                            </div>
                                            {isSelected && <Check size={16} strokeWidth={3} />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={`p-6 border-t flex justify-end gap-3 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAllotment}
                                disabled={isActionLoading}
                                className="px-8 py-3 bg-[#0284C7] hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                                Save Allotment
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Section Allotment Modal */}
            {isSectionModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSectionModalOpen(false)} />
                    <div className={`relative w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className="bg-orange-500 p-6 flex justify-between items-center text-white">
                            <h3 className="text-lg font-black uppercase tracking-tight">Add To Sections</h3>
                            <button onClick={() => setIsSectionModalOpen(false)} className="hover:rotate-90 transition-all text-white/90 hover:text-white">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="p-0 max-h-[50vh] overflow-y-auto custom-scrollbar bg-slate-50">
                            <div className="p-6 space-y-4">
                                {/* Selected Packages Summary */}
                                <div className="relative group">
                                    <label className="absolute -top-2 left-3 bg-slate-50 px-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest z-10 transition-all">
                                        Package List
                                    </label>
                                    <div className="w-full p-3 rounded-xl border border-blue-500 bg-white min-h-[50px] shadow-sm flex flex-wrap gap-2">
                                        {selectedSectionIds.length > 0 ? (
                                            availableSections
                                                .filter(s => selectedSectionIds.includes(s.id))
                                                .map(s => (
                                                    <div
                                                        key={`selected-${s.id}`}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider animate-in zoom-in-95 duration-200"
                                                    >
                                                        <span>{s.code || s.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedSectionIds(prev => prev.filter(id => id !== s.id));
                                                            }}
                                                            className="p-0.5 hover:bg-white/20 rounded-md transition-colors"
                                                        >
                                                            <X size={12} strokeWidth={4} />
                                                        </button>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="flex items-center h-full px-1">
                                                <span className="text-slate-400 font-normal italic text-xs">No packages selected...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 my-2" />

                                {availableSections.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs font-bold">No packages found</div>
                                ) : (
                                    [...availableSections]
                                        .sort((a, b) => {
                                            const aSelected = selectedSectionIds.includes(a.id);
                                            const bSelected = selectedSectionIds.includes(b.id);
                                            if (aSelected && !bSelected) return -1;
                                            if (!aSelected && bSelected) return 1;
                                            return 0;
                                        })
                                        .map(section => {
                                            const isSelected = selectedSectionIds.includes(section.id);
                                            return (
                                                <div
                                                    key={section.id}
                                                    onClick={() => {
                                                        if (isSelected) setSelectedSectionIds(prev => prev.filter(id => id !== section.id));
                                                        else setSelectedSectionIds(prev => [...prev, section.id]);
                                                    }}
                                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:border-slate-200'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}>
                                                        {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                                                    </div>
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                                                        {section.code || section.name}
                                                    </span>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>

                        <div className={`p-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-white/5 bg-[#1A1F2B]' : 'border-slate-100 bg-white'}`}>
                            <button
                                onClick={() => setIsSectionModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-xs font-black text-slate-500 hover:bg-slate-100 uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSectionAllotment}
                                disabled={isActionLoading}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 transition-all"
                            >
                                {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestAllotment;
