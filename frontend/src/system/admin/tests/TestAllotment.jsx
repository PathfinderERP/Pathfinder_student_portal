import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Search, MapPin, Trash2, X, Check, Loader2, Filter, LayoutGrid, ChevronDown, Mail, Phone, BellRing, ShieldCheck, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import CentreAllotmentDetails from './CentreAllotmentDetails';

const TestAllotment = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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
    const [centreSearchTerm, setCentreSearchTerm] = useState('');
    const [isTableView, setIsTableView] = useState(false);
    const [modalAllotments, setModalAllotments] = useState([]);
    const [bulkSchedule, setBulkSchedule] = useState({ start_time: '', end_time: '' });

    // Section Allotment Modal State
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [availableSections, setAvailableSections] = useState([]);
    const [selectedSectionIds, setSelectedSectionIds] = useState([]);
    const [sectionSearchTerm, setSectionSearchTerm] = useState('');

    // Custom Alert State
    const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

    // View State for Centre Details Page
    const [view, setView] = useState('list'); // 'list' or 'details'
    const [selectedTestForDetails, setSelectedTestForDetails] = useState(null);
    const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);

    const triggerAlert = (message, type = 'success') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    };

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

    const fetchData = useCallback(async (force = false) => {
        if (!force && tests.length > 0) return;
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const [testsRes, sessionsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/`, getAuthConfig()),
                axios.get(`${apiUrl}/api/master-data/sessions/`, getAuthConfig())
            ]);

            const testsData = Array.isArray(testsRes.data) ? testsRes.data : (testsRes.data.results || []);
            const sessionsData = Array.isArray(sessionsRes.data) ? sessionsRes.data : (sessionsRes.data.results || []);

            setTests(testsData);
            setSessions(sessionsData);

            // Compute available sessions from the freshly fetched tests
            const uniqueSessionIds = new Set(testsData.map(t => t.session || t.session_details?.id));
            const availableSessions = sessionsData.filter(s => uniqueSessionIds.has(s.id));

            // Default to 'All Sessions' (empty string)
            if (!filterSession) {
                setFilterSession('');
            }

        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, getAuthConfig, tests.length]); // Removed filterSession from here

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEditCentres = async (test, isViewOnly = false) => {
        setSelectedTest(test);
        setIsViewOnlyMode(isViewOnly);
        setIsActionLoading(true);
        setIsTableView(false); // Default to search/select view

        try {
            const apiUrl = getApiUrl();

            // Fetch ERP Centres (via Backend Proxy) and Local Centres concurrently
            const [erpCentresRes, localCentresRes] = await Promise.all([
                axios.get(`${apiUrl}/api/admin/erp-centres/`, getAuthConfig()),
                axios.get(`${apiUrl}/api/centres/`, getAuthConfig())
            ]);

            const erpDataRaw = erpCentresRes.data || [];
            const erpData = Array.isArray(erpDataRaw) ? erpDataRaw : (erpDataRaw.data || []);

            // Highly robust deduplication by normalized code
            const uniqueErpData = [];
            const seenCodes = new Set();
            erpData.forEach(c => {
                const rawCode = c.enterCode || c.code || c.id || "";
                const normalizedCode = rawCode.toString().trim().toUpperCase();
                if (normalizedCode && !seenCodes.has(normalizedCode)) {
                    uniqueErpData.push(c);
                    seenCodes.add(normalizedCode);
                }
            });

            const localData = localCentresRes.data || [];

            // Map ERP centres to available list
            setAvailableCentres(uniqueErpData);
            setLocalCentres(localData);

            // Map the test's existing allotted local IDs back to ERP codes
            const alreadyAllottedCodes = localData
                .filter(lc => test.centres?.includes(lc.id))
                .map(lc => lc.code);

            setSelectedCentreIds(alreadyAllottedCodes);
            setIsModalOpen(true);
        } catch (err) {
            console.error("❌ Allotment Sync Error:", err);
            triggerAlert('Failed to load ERP centre registry: ' + (err.response?.data?.error || err.message), 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchModalAllotments = useCallback(async () => {
        if (!selectedTest) return;
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/tests/${selectedTest.id}/centres/`, getAuthConfig());
            setModalAllotments(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsActionLoading(false);
        }
    }, [selectedTest, getApiUrl, getAuthConfig]);

    useEffect(() => {
        if (isModalOpen && isTableView) {
            fetchModalAllotments();
        }
    }, [isModalOpen, isTableView, fetchModalAllotments]);

    // State for local centres to avoid extra fetches during save
    const [localCentres, setLocalCentres] = useState([]);

    const handleSaveAllotment = async () => {
        console.log("👉 handleSaveAllotment START");

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const finalLocalIds = [];
            const centreCodeToLocalId = {};

            // 1. Sync Centres
            for (const erpCode of selectedCentreIds) {
                const allottedCentreIds = selectedTest?.centres || [];
                let local = localCentres.find(lc =>
                    lc.code?.toString().toLowerCase() === erpCode?.toString().toLowerCase() &&
                    allottedCentreIds.includes(lc.id)
                ) || localCentres.find(lc => lc.code?.toString().toLowerCase() === erpCode?.toString().toLowerCase());

                const erpDetail = availableCentres.find(c => c.enterCode?.toString().toLowerCase() === erpCode?.toString().toLowerCase());
                if (!erpDetail) continue;

                if (!local) {
                    const createPayload = {
                        code: erpDetail.enterCode,
                        name: (erpDetail.centreName || "").substring(0, 254),
                        email: (erpDetail.email || erpDetail.contactEmail || "").substring(0, 254),
                        phone_number: (erpDetail.phoneNumber || erpDetail.phone || erpDetail.mobile || "").substring(0, 20)
                    };
                    const createRes = await axios.post(`${apiUrl}/api/centres/`, createPayload, getAuthConfig());
                    local = createRes.data;
                }
                if (local) {
                    finalLocalIds.push(local.id);
                    centreCodeToLocalId[erpCode] = local.id;
                }
            }

            // 2. Patch Test Centres
            await axios.patch(`${apiUrl}/api/tests/${selectedTest.id}/`, { centres: finalLocalIds }, getAuthConfig());

            // 3. If in Table View, Save individual Allotment Details (Schedules)
            if (isTableView && modalAllotments.length > 0) {
                // We need to wait for backend to process allotments first, or just call patch on allotments we have
                const updatePromises = modalAllotments
                    .filter(a => selectedCentreIds.includes(a.centre_details?.code))
                    .map(a => axios.patch(`${apiUrl}/api/tests/allotments/${a.id}/`, {
                        start_time: a.start_time,
                        end_time: a.end_time
                    }, getAuthConfig()));

                await Promise.all(updatePromises);
            }

            setIsModalOpen(false);
            fetchData(true);
            triggerAlert(`Allotment updated successfully!`, 'success');
        } catch (err) {
            console.error("❌ SAVE ERROR:", err);
            triggerAlert(err.response?.data?.message || 'Failed to update allotment', 'error');
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
            fetchData(true);
            triggerAlert('All allotments removed successfully.', 'success');
        } catch (err) {
            triggerAlert('Failed to remove allotment', 'error');
        }
    };

    const handleManageSections = async (test) => {
        setSelectedTest(test);
        const sections = (test.allotted_sections || []).map(id => typeof id === 'object' ? (id.id || id._id || id) : id);
        setSelectedSectionIds(sections.map(Number));
        setIsActionLoading(true);

        try {
            const apiUrl = getApiUrl();
            const sectionsRes = await axios.get(`${apiUrl}/api/master-data/master-sections/`, getAuthConfig());
            // Support both direct array and {count, sections} object format
            const masterSections = Array.isArray(sectionsRes.data) ? sectionsRes.data : (sectionsRes.data.results || []);
            setAvailableSections(masterSections || []);
            setIsSectionModalOpen(true);
        } catch (err) {
            console.error(err);
            triggerAlert('Failed to load sections', 'error');
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
            fetchData(true);
            triggerAlert('Section allotment updated!', 'success');
        } catch (err) {
            triggerAlert('Failed to update section allotment', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredRecords = useMemo(() => {
        return tests.filter(t => {
            const matchesSearch = t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.code?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesSession = filterSession ? (t.session?.toString() === filterSession || t.session_details?.id?.toString() === filterSession) : true;

            const matchesStatus = filterStatus === 'allotted' ? (t.centres_count > 0)
                : filterStatus === 'not_allotted' ? (t.centres_count === 0)
                    : true;

            return matchesSearch && matchesSession && matchesStatus;
        });
    }, [tests, searchTerm, filterSession, filterStatus]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterSession, filterStatus]);

    const pageCount = Math.ceil(filteredRecords.length / itemsPerPage);
    const currentTests = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Show Centre Details Page if view is 'details'
    if (view === 'details' && selectedTestForDetails) {
        return <CentreAllotmentDetails test={selectedTestForDetails} onBack={() => { setView('list'); fetchData(); }} />;
    }

    return (
        <div className={`p-8 animate-in fade-in duration-500`}>
            {/* Header */}
            <div className={`p-8 rounded-[5px] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                            Test <span className="text-orange-500">Allotment</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Allot tests to specific centres and manage distributions.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or code"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`pl-10 pr-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 w-64 ${isDarkMode ? 'bg-white/5 border-white/10 focus:ring-blue-500/10' : 'bg-slate-50 border-slate-200 focus:ring-blue-500/5'}`}
                            />
                        </div>

                        {/* Session Filter */}
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                <Layers size={16} />
                            </div>
                            <select
                                value={filterSession}
                                onChange={(e) => setFilterSession(e.target.value)}
                                className={`px-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 ${isDarkMode ? 'bg-[#10141D] border-white/10 focus:ring-purple-500/10' : 'bg-white border-slate-200 focus:ring-purple-500/5'}`}
                            >
                                <option value="" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>All Sessions</option>
                                {filteredSessionsForDropdown
                                    .sort((a, b) => b.name.localeCompare(a.name))
                                    .map(s => (
                                        <option key={s.id} value={s.id} className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>{s.name}</option>
                                    ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                <Filter size={16} />
                            </div>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className={`px-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 ${isDarkMode ? 'bg-[#10141D] border-white/10 focus:ring-orange-500/10' : 'bg-white border-slate-200 focus:ring-orange-500/5'}`}
                            >
                                <option value="" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>All Status</option>
                                <option value="allotted" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>Allotted Only</option>
                                <option value="not_allotted" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>Not Allotted Only</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className={`rounded-[5px] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="py-6 px-6 text-center">#</th>
                                <th className="py-6 px-6">Name</th>
                                <th className="py-6 px-6">Test Code</th>
                                <th className="py-6 px-6 text-center">Sections</th>
                                <th className="py-6 px-6 text-center">Centres Allotted</th>
                                <th className="py-6 px-6 text-center">Codes Sent</th>
                                <th className="py-6 px-6 text-center">Manage Centres</th>
                                <th className="py-6 px-6 text-center">Remove Allotment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-5 px-6 text-center"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6">
                                            <div className="space-y-2">
                                                <div className={`h-4 w-40 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-3 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    </tr>
                                ))
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-20 text-center opacity-40">No tests found matching your criteria.</td>
                                </tr>
                            ) : currentTests.map((test, index) => (
                                <tr key={test.id} className={`group ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-slate-50'} transition-colors`}>
                                    <td className="py-5 px-6 text-center font-bold text-xs opacity-50">{(currentPage - 1) * itemsPerPage + index + 1}</td>
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
                                            className="px-4 py-1.5 rounded-[5px] bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all cursor-pointer">
                                            {test.allotted_master_count || 0} Sections
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleEditCentres(test, true)}
                                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-[5px] border text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer ${isDarkMode ? 'border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10' : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'}`}>
                                            {test.centres_count || 0} Centres
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => {
                                                setSelectedTestForDetails(test);
                                                setView('details');
                                            }}
                                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-[5px] border text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer ${isDarkMode ? 'border-amber-500/30 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10' : 'border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100'}`}>
                                            Manage Schedules ({test.codes_sent_count || 0} Sent)
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleEditCentres(test, false)}
                                            className={`px-4 py-1.5 rounded-[5px] text-white text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${test.centres_count > 0
                                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'}`}
                                        >
                                            {test.centres_count > 0 ? 'Edit Centres' : 'Add Centres'}
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleRemoveAllotment(test)}
                                            className={`p-2 rounded-[5px] transition-all hover:scale-110 ${isDarkMode ? 'text-slate-500 hover:text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {filteredRecords.length > 0 && (
                    <div className={`px-8 py-5 border-t flex flex-col sm:flex-row justify-between items-center gap-6 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Rows per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className={`bg-transparent text-xs font-black outline-none cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                                >
                                    {[5, 10, 20, 50].map(val => <option key={val} value={val} className={isDarkMode ? 'bg-[#0F131A]' : 'bg-white'}>{val}</option>)}
                                </select>
                            </div>
                            <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Showing <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{(currentPage - 1) * itemsPerPage + 1}</span> to <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> of <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{filteredRecords.length}</span> results
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className={`px-3 py-2 rounded-[5px] text-[10px] font-black uppercase transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                            >
                                First
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                                    let pageNum;
                                    if (pageCount <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= pageCount - 2) pageNum = pageCount - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded-[5px] text-xs font-black transition-all ${currentPage === pageNum ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : `hover:bg-orange-500/10 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                                disabled={currentPage === pageCount}
                                className={`p-2 rounded-[5px] transition-all ${currentPage === pageCount ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(pageCount)}
                                disabled={currentPage === pageCount}
                                className={`px-3 py-2 rounded-[5px] text-[10px] font-black uppercase transition-all ${currentPage === pageCount ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                            >
                                Last
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className={`relative w-full max-w-lg rounded-[5px] shadow-xl overflow-hidden border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className="bg-emerald-600 p-6 flex justify-between items-center text-white font-black">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg uppercase tracking-tight truncate">Centres Allotment</h3>
                                <p className="text-[10px] font-medium opacity-80 mt-1 uppercase tracking-widest truncate">{selectedTest?.name}</p>
                            </div>

                            <div className="flex items-center gap-3 bg-white/10 p-1 rounded-[5px] ml-4">
                                <button
                                    onClick={() => setIsTableView(false)}
                                    className={`px-3 py-1.5 rounded-[5px] text-[9px] uppercase tracking-widest transition-all ${!isTableView ? 'bg-white text-emerald-600 shadow-lg' : 'text-white hover:bg-white/5'}`}
                                >
                                    Select
                                </button>
                                <button
                                    onClick={() => setIsTableView(true)}
                                    className={`px-3 py-1.5 rounded-[5px] text-[9px] uppercase tracking-widest transition-all ${isTableView ? 'bg-white text-emerald-600 shadow-lg' : 'text-white hover:bg-white/5'}`}
                                >
                                    Table
                                </button>
                            </div>

                            <button onClick={() => setIsModalOpen(false)} className="ml-6 hover:rotate-90 transition-all text-white/90 hover:text-white">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        {!isTableView ? (
                            <>
                                <div className={`p-6 pb-0 space-y-5 ${isDarkMode ? 'bg-[#10141D]' : 'bg-slate-50'}`}>
                                    {/* Selected Centres Summary */}
                                    <div className="relative group">
                                        <label className={`absolute -top-2.5 left-3 px-1 text-[10px] font-black uppercase tracking-[0.2em] z-10 transition-all ${isDarkMode ? 'bg-[#10141D] text-blue-400' : 'bg-slate-50 text-blue-600'}`}>
                                            ERP Centre List
                                        </label>
                                        <div className={`w-full p-4 rounded-[5px] border max-h-[160px] overflow-y-auto custom-scrollbar shadow-sm flex flex-wrap gap-2 transition-all ${isDarkMode ? 'bg-black/20 border-blue-500/50' : 'bg-white border-blue-400 shadow-blue-500/5'}`}>
                                            {selectedCentreIds.length > 0 ? (
                                                availableCentres
                                                    .filter(c => selectedCentreIds.includes(c.enterCode))
                                                    .map(c => (
                                                        <div
                                                            key={`sel-centre-${c.enterCode}`}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-wider animate-in zoom-in-95 duration-200 shadow-lg shadow-blue-600/20"
                                                        >
                                                            <span>{c.centreName}</span>
                                                            {!isViewOnlyMode && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedCentreIds(prev => prev.filter(code => code !== c.enterCode));
                                                                    }}
                                                                    className="p-0.5 hover:bg-white/20 rounded-[5px] transition-colors"
                                                                >
                                                                    <X size={12} strokeWidth={4} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))
                                            ) : (
                                                <div className="flex items-center h-full px-1">
                                                    <span className="text-slate-400 font-bold italic text-xs opacity-50">No Centres Selected...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Modal Search Option */}
                                    <div className="relative group pb-2 flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search centres by name or code..."
                                                value={centreSearchTerm}
                                                onChange={(e) => setCentreSearchTerm(e.target.value)}
                                                className={`w-full pl-11 pr-4 py-3 rounded-[5px] border text-xs font-bold transition-all outline-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-blue-500/50 text-white' : 'bg-white border-slate-200 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/5 text-slate-700'}`}
                                            />
                                        </div>
                                        {!isViewOnlyMode && (
                                            <div className="flex items-center gap-2 pr-1">
                                                <button
                                                    onClick={() => {
                                                        const all = availableCentres.map(c => c.enterCode);
                                                        setSelectedCentreIds(all);
                                                        triggerAlert(`All ${all.length} centres selected`, 'info');
                                                    }}
                                                    className="px-4 py-3 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all border border-blue-600/20 whitespace-nowrap active:scale-95 shadow-sm"
                                                >
                                                    Select All
                                                </button>
                                                {selectedCentreIds.length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCentreIds([]);
                                                            triggerAlert("Selection cleared", "warning");
                                                        }}
                                                        className="px-4 py-3 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all border border-amber-500/20 whitespace-nowrap active:scale-95 shadow-sm"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`p-0 max-h-[40vh] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#10141D]' : 'bg-slate-50 shadow-inner'}`}>
                                    <div className="px-6 pb-6 space-y-2">
                                        {[...availableCentres]
                                            .filter(c => {
                                                const matchesSearch = c.centreName?.toLowerCase().includes(centreSearchTerm.toLowerCase()) ||
                                                    c.enterCode?.toLowerCase().includes(centreSearchTerm.toLowerCase());
                                                if (isViewOnlyMode) return matchesSearch && selectedCentreIds.includes(c.enterCode);
                                                return matchesSearch;
                                            })
                                            .sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""))
                                            .map(centre => {
                                                const isSelected = selectedCentreIds.includes(centre.enterCode);
                                                return (
                                                    <div
                                                        key={centre.enterCode}
                                                        onClick={() => {
                                                            if (isViewOnlyMode) return;
                                                            if (isSelected) setSelectedCentreIds(prev => prev.filter(code => code !== centre.enterCode));
                                                            else setSelectedCentreIds(prev => [...prev, centre.enterCode]);
                                                        }}
                                                        className={`flex items-center gap-4 p-4 rounded-[5px] cursor-pointer border transition-all ${isSelected
                                                            ? (isDarkMode ? 'bg-blue-500/10 border-blue-500/50' : 'bg-blue-50 border-blue-200 shadow-sm shadow-blue-500/5')
                                                            : (isDarkMode ? 'bg-white/2 border-white/5 hover:border-white/10' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md')}`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-[5px] border-2 flex items-center justify-center transition-all ${isSelected
                                                            ? 'bg-blue-600 border-blue-600 scale-110'
                                                            : (isDarkMode ? 'border-white/20 bg-black/20' : 'border-slate-300 bg-white shadow-inner')}`}>
                                                            {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                                                        </div>
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span className={`text-sm font-black uppercase tracking-tight truncate ${isSelected ? 'text-blue-600' : (isDarkMode ? 'text-slate-300' : 'text-slate-600')}`}>
                                                                {centre.centreName}
                                                            </span>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 opacity-40 text-[9px] font-bold uppercase">
                                                                <span>{centre.enterCode}</span>
                                                                <span>{centre.email || 'N/A'}</span>
                                                                <span>{centre.phoneNumber || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className={`p-6 max-h-[60vh] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#10141D]' : 'bg-slate-50'}`}>
                                {/* Bulk Schedule Option */}
                                <div className={`mb-6 p-4 rounded-[5px] border border-dashed flex flex-wrap items-center gap-4 ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-blue-200'}`}>
                                    <div className="flex-1 min-w-[200px]">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Apply to all selected centres</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="datetime-local"
                                                className={`flex-1 p-2 rounded-[5px] border text-[10px] font-bold outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                                value={bulkSchedule.start_time}
                                                onChange={e => setBulkSchedule({ ...bulkSchedule, start_time: e.target.value })}
                                            />
                                            <input
                                                type="datetime-local"
                                                className={`flex-1 p-2 rounded-[5px] border text-[10px] font-bold outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                                value={bulkSchedule.end_time}
                                                onChange={e => setBulkSchedule({ ...bulkSchedule, end_time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setModalAllotments(modalAllotments.map(a => ({
                                                ...a,
                                                start_time: bulkSchedule.start_time || a.start_time,
                                                end_time: bulkSchedule.end_time || a.end_time
                                            })));
                                            triggerAlert("Applied schedule to listed centres", "info");
                                        }}
                                        className="h-[40px] px-6 bg-blue-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all mt-auto"
                                    >
                                        Bulk apply
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {availableCentres
                                        .filter(c => selectedCentreIds.includes(c.enterCode))
                                        .map(centre => {
                                            const allotment = modalAllotments.find(a => a.centre_details?.code === centre.enterCode) || {};
                                            return (
                                                <div key={`manage-${centre.enterCode}`} className={`p-4 rounded-[5px] border shadow-sm ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white border-slate-100'}`}>
                                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                                        <div className="flex-1 min-w-[150px]">
                                                            <h4 className="text-xs font-black uppercase tracking-tight truncate">{centre.centreName}</h4>
                                                            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{centre.enterCode}</p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 flex-2">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">Start Time</span>
                                                                <input
                                                                    type="datetime-local"
                                                                    className={`p-2 rounded-[3px] border text-[9px] font-bold outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                                                    value={allotment.start_time ? allotment.start_time.slice(0, 16) : ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setModalAllotments(prev => {
                                                                            const idx = prev.findIndex(a => a.centre_details?.code === centre.enterCode);
                                                                            if (idx > -1) {
                                                                                const updated = [...prev];
                                                                                updated[idx] = { ...updated[idx], start_time: val };
                                                                                return updated;
                                                                            }
                                                                            return [...prev, { centre_details: { code: centre.enterCode }, start_time: val }];
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">End Time</span>
                                                                <input
                                                                    type="datetime-local"
                                                                    className={`p-2 rounded-[3px] border text-[9px] font-bold outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                                                    value={allotment.end_time ? allotment.end_time.slice(0, 16) : ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setModalAllotments(prev => {
                                                                            const idx = prev.findIndex(a => a.centre_details?.code === centre.enterCode);
                                                                            if (idx > -1) {
                                                                                const updated = [...prev];
                                                                                updated[idx] = { ...updated[idx], end_time: val };
                                                                                return updated;
                                                                            }
                                                                            return [...prev, { centre_details: { code: centre.enterCode }, end_time: val }];
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        <div className={`p-6 border-t flex justify-end gap-4 ${isDarkMode ? 'border-white/5 bg-[#1A1F2B]' : 'border-slate-100 bg-white'}`}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className={`px-6 py-2.5 rounded-[5px] text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                Cancel
                            </button>
                            {!isViewOnlyMode && (
                                <button
                                    onClick={handleSaveAllotment}
                                    disabled={isActionLoading}
                                    className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save Channels'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Section Allotment Modal */}
            {isSectionModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSectionModalOpen(false)} />
                    <div className={`relative w-full max-w-lg rounded-[5px] shadow-xl overflow-hidden border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className="bg-orange-600 p-6 flex justify-between items-center text-white font-black">
                            <div>
                                <h3 className="text-lg uppercase tracking-tight">Select Sections</h3>
                                <p className="text-[10px] font-medium opacity-80 mt-1 uppercase tracking-widest">{selectedTest?.name}</p>
                            </div>
                            <button onClick={() => setIsSectionModalOpen(false)} className="hover:rotate-90 transition-all text-white/90 hover:text-white">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        <div className={`p-6 pb-0 space-y-5 ${isDarkMode ? 'bg-[#10141D]' : 'bg-slate-50'}`}>
                            {/* Selected Packages Summary (Legend Style) */}
                            <div className="relative group">
                                <label className={`absolute -top-2.5 left-3 px-1 text-[10px] font-black uppercase tracking-[0.2em] z-10 transition-all ${isDarkMode ? 'bg-[#10141D] text-blue-400' : 'bg-slate-50 text-blue-600'}`}>
                                    Section List
                                </label>
                                <div className={`w-full p-4 rounded-[5px] border min-h-[58px] shadow-sm flex flex-wrap gap-2 transition-all ${isDarkMode ? 'bg-black/20 border-blue-500/50' : 'bg-white border-blue-400 shadow-blue-500/5'}`}>
                                    {selectedSectionIds.length > 0 ? (
                                        availableSections
                                            .filter(s => selectedSectionIds.includes(Number(s.id)))
                                            .map(s => (
                                                <div
                                                    key={`sel-sec-${s.id}`}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-wider animate-in zoom-in-95 duration-200 shadow-lg shadow-blue-600/20"
                                                >
                                                    <span>{s.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedSectionIds(prev => prev.filter(id => Number(id) !== Number(s.id)));
                                                        }}
                                                        className="p-0.5 hover:bg-white/20 rounded-[5px] transition-colors"
                                                    >
                                                        <X size={12} strokeWidth={4} />
                                                    </button>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="flex items-center h-full px-1">
                                            <span className="text-slate-400 font-bold italic text-xs opacity-50">No Sections Selected...</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Search/Filter Option */}
                            <div className="relative group pb-2 flex items-center justify-between gap-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 ml-1">Available Sections</h4>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedSectionIds(availableSections.map(s => s.id));
                                            triggerAlert(`All ${availableSections.length} sections selected`, 'info');
                                        }}
                                        className="px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all border border-blue-500/20 whitespace-nowrap"
                                    >
                                        Select All
                                    </button>
                                    {selectedSectionIds.length > 0 && (
                                        <button
                                            onClick={() => {
                                                setSelectedSectionIds([]);
                                                triggerAlert("Section selection cleared", "warning");
                                            }}
                                            className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all border border-red-500/20 whitespace-nowrap"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Section Modal Search */}
                            <div className="relative group pb-2">
                                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                                <input
                                    type="text"
                                    placeholder="Search sections by name or code..."
                                    value={sectionSearchTerm}
                                    onChange={(e) => setSectionSearchTerm(e.target.value)}
                                    className={`w-full pl-11 pr-4 py-3 rounded-[5px] border text-xs font-bold transition-all outline-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-blue-500/50 text-white' : 'bg-white border-slate-200 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/5 text-slate-700'}`}
                                />
                                {sectionSearchTerm && (
                                    <button
                                        onClick={() => setSectionSearchTerm('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X size={14} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className={`p-0 max-h-[40vh] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#10141D]' : 'bg-slate-50 shadow-inner'}`}>
                            <div className="px-6 pb-6 space-y-2">
                                {availableSections.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest opacity-50">No sections found</div>
                                ) : (
                                    [...availableSections]
                                        .filter(s =>
                                            s.name?.toLowerCase().includes(sectionSearchTerm.toLowerCase()) ||
                                            s.subject_code?.toLowerCase().includes(sectionSearchTerm.toLowerCase()) ||
                                            s.code?.toLowerCase().includes(sectionSearchTerm.toLowerCase())
                                        )
                                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                                        .map(section => {
                                            const isSelected = selectedSectionIds.includes(Number(section.id));
                                            return (
                                                <div
                                                    key={section.id}
                                                    onClick={() => {
                                                        if (isSelected) setSelectedSectionIds(prev => prev.filter(id => Number(id) !== Number(section.id)));
                                                        else setSelectedSectionIds(prev => [...prev, Number(section.id)]);
                                                    }}
                                                    className={`flex items-center gap-4 p-4 rounded-[5px] cursor-pointer border transition-all active:scale-[0.98] ${isSelected
                                                        ? (isDarkMode ? 'bg-blue-500/10 border-blue-500/50' : 'bg-blue-50 border-blue-200 shadow-sm shadow-blue-500/5')
                                                        : (isDarkMode ? 'bg-white/2 border-white/5 hover:border-white/10' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md hover:shadow-slate-200/50')}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-[5px] border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                                                        ? 'bg-blue-600 border-blue-600 scale-110'
                                                        : (isDarkMode ? 'border-white/20 bg-black/20' : 'border-slate-300 bg-white shadow-inner')}`}>
                                                        {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-blue-600' : (isDarkMode ? 'text-slate-300' : 'text-slate-600')}`}>
                                                            {section.name}
                                                        </span>
                                                        <span className="text-[9px] opacity-40 font-bold uppercase tracking-[0.2em]">{section.subject_code || section.code || 'NO CODE'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>

                        <div className={`p-6 border-t flex justify-end gap-4 ${isDarkMode ? 'border-white/5 bg-[#1A1F2B]' : 'border-slate-100 bg-white'}`}>
                            <button
                                onClick={() => setIsSectionModalOpen(false)}
                                className={`px-6 py-2.5 rounded-[5px] text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSectionAllotment}
                                disabled={isActionLoading}
                                className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2"
                            >
                                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Premium Custom Alert */}
            {alert.show && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-10 duration-500 w-[90%] max-w-sm">
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-[5px] shadow-2xl border backdrop-blur-md ${alert.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : alert.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : alert.type === 'warning' ? 'bg-amber-500/90 border-amber-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
                        <div className="w-10 h-10 rounded-[5px] bg-white/20 flex items-center justify-center shadow-inner">
                            {alert.type === 'success' ? <ShieldCheck size={22} /> : <BellRing size={22} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5">Notification</p>
                            <p className="text-sm font-bold tracking-tight">{alert.message}</p>
                        </div>
                        <button onClick={() => setAlert(prev => ({ ...prev, show: false }))} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
                            <X size={18} strokeWidth={3} />
                        </button>
                    </div>
                    {/* Auto-discard progress bar */}
                    <div className="absolute bottom-0 left-4 right-4 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white animate-progress-shrink" style={{ animationDuration: '3000ms' }} />
                    </div>
                </div>
            )}
        </div>
    );
};
// USXW
export default TestAllotment;
