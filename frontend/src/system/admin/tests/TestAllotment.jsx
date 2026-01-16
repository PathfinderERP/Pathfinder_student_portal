import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Search, MapPin, Trash2, X, Check, Loader2, Filter, LayoutGrid, ChevronDown, Mail, Phone, BellRing, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import CentreAllotmentDetails from './CentreAllotmentDetails';

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
    const [centreSearchTerm, setCentreSearchTerm] = useState('');

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
    }, [getApiUrl, getAuthConfig]); // Removed filterSession from here

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEditCentres = async (test) => {
        setSelectedTest(test);
        setIsActionLoading(true);

        try {
            const apiUrl = getApiUrl();
            const erpUrl = import.meta.env.VITE_ERP_API_URL || 'https://pathfinder-5ri2.onrender.com';
            const erpIdentifier = import.meta.env.VITE_ERP_ADMIN_EMAIL || "atanu@gmail.com";
            const erpPassword = import.meta.env.VITE_ERP_ADMIN_PASSWORD || "000000";

            // Concurrent fetch: ERP Centres, Local Centres, and ERP Token
            const [loginRes, localCentresRes] = await Promise.all([
                axios.post(`${erpUrl}/api/superAdmin/login`, { email: erpIdentifier, password: erpPassword }),
                axios.get(`${apiUrl}/api/centres/`, getAuthConfig())
            ]);

            const erpToken = loginRes.data.token;
            const erpCentresRes = await axios.get(`${erpUrl}/api/centre`, {
                headers: { 'Authorization': `Bearer ${erpToken}` }
            });

            const erpData = erpCentresRes.data?.data || (Array.isArray(erpCentresRes.data) ? erpCentresRes.data : []);
            const localData = localCentresRes.data;

            // Map ERP centres to available list
            setAvailableCentres(erpData);
            setLocalCentres(localData); // We need this in state to check for sync during save

            // Map the test's existing allotted local IDs back to ERP codes to set initial selection
            // We'll store the logic for matching here
            const alreadyAllottedCodes = localData
                .filter(lc => test.centres?.includes(lc.id))
                .map(lc => lc.code);

            // Actually, let's keep selectedCentreIds as ERP codes for simplicity during UI selection
            // and map them back to local IDs only upon saving.
            setSelectedCentreIds(alreadyAllottedCodes);

            setIsModalOpen(true);
        } catch (err) {
            console.error("❌ Allotment Sync Error:", err);
            alert('Failed to load ERP centre registry: ' + err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    // State for local centres to avoid extra fetches during save
    const [localCentres, setLocalCentres] = useState([]);

    const handleSaveAllotment = async () => {
        console.log("👉 handleSaveAllotment START");
        console.log("Selected IDs:", selectedCentreIds);
        console.log("Available ERP Centres:", availableCentres.length);
        console.log("Local Centres:", localCentres.length);

        if (selectedCentreIds.length === 0) {
            triggerAlert("No centres selected to save.", "warning");
            return;
        }

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const finalLocalIds = [];
            let updateCount = 0;

            // 1. Ensure all selected ERP centres exist in local DB and update contact info
            for (const erpCode of selectedCentreIds) {
                // Find local centre. PRIORITIZE one that is already allotted to this test to avoid duplicates issue.
                const allottedCentreIds = selectedTest?.centres || [];
                let local = localCentres.find(lc =>
                    lc.code?.toString().toLowerCase() === erpCode?.toString().toLowerCase() &&
                    allottedCentreIds.includes(lc.id)
                );

                // If not found in allotted, find ANY matching local centre
                if (!local) {
                    local = localCentres.find(lc => lc.code?.toString().toLowerCase() === erpCode?.toString().toLowerCase());
                }

                // Find ERP detail (case-insensitive safely)
                const erpDetail = availableCentres.find(c => c.enterCode?.toString().toLowerCase() === erpCode?.toString().toLowerCase());

                if (!erpDetail) {
                    console.warn(`[WARN] Skipping ${erpCode}: No ERP data found.`);
                    continue;
                }

                if (!local) {
                    // Create new centre
                    try {
                        const createPayload = {
                            code: erpDetail.enterCode,
                            name: (erpDetail.centreName || "").substring(0, 254),
                            // location: (erpDetail.state || "").substring(0, 254), // Excluded due to Djongo bug
                            email: (erpDetail.email || erpDetail.contactEmail || "").substring(0, 254),
                            phone_number: (erpDetail.phoneNumber || erpDetail.phone || erpDetail.mobile || "").substring(0, 20)
                        };
                        console.log(`[ACTION] Creating Centre ${erpCode}`, createPayload);
                        const createRes = await axios.post(`${apiUrl}/api/centres/`, createPayload, getAuthConfig());
                        local = createRes.data;
                        updateCount++;
                    } catch (e) {
                        console.error(`[ERROR] Create failed for ${erpCode}:`, e);
                        triggerAlert(`Failed to create ${erpCode}`, 'error');
                    }
                } else {
                    // Update existing centre
                    // NOTE: Excludng 'location' and 'name' from update to avoid Djongo SQLDecodeError: Keyword: Unsupported: location
                    // We primarily need to sync email and phone.
                    const updatePayload = {
                        email: (erpDetail.email || erpDetail.contactEmail || "").substring(0, 254),
                        phone_number: (erpDetail.phoneNumber || erpDetail.phone || erpDetail.mobile || "").substring(0, 20)
                    };

                    try {
                        console.log(`[ACTION] Updating Centre ${erpCode} (ID: ${local.id})`, updatePayload);
                        const updateRes = await axios.patch(`${apiUrl}/api/centres/${local.id}/`, updatePayload, getAuthConfig());
                        local = updateRes.data;
                        updateCount++;
                    } catch (e) {
                        console.error(`[ERROR] Update failed for ${erpCode}:`, e);
                    }
                }

                if (local) finalLocalIds.push(local.id);
            }

            console.log(`✅ Processed ${updateCount} centre updates/creations.`);

            // 2. Patch the test with final local IDs
            await axios.patch(`${apiUrl}/api/tests/${selectedTest.id}/`,
                { centres: finalLocalIds },
                getAuthConfig()
            );

            setIsModalOpen(false);
            fetchData();
            triggerAlert(`Allotment updated! Synced ${updateCount} centres.`, 'success');
        } catch (err) {
            console.error("❌ MAIN SAVE ERROR:", err);
            triggerAlert(err.response?.data?.message || 'Failed to update allotment', 'error');
        } finally {
            setIsActionLoading(false);
            console.log("👉 handleSaveAllotment END");
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
            triggerAlert('All allotments removed successfully.', 'success');
        } catch (err) {
            triggerAlert('Failed to remove allotment', 'error');
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
            fetchData();
            triggerAlert('Section allotment updated!', 'success');
        } catch (err) {
            triggerAlert('Failed to update section allotment', 'error');
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

    // Show Centre Details Page if view is 'details'
    if (view === 'details' && selectedTestForDetails) {
        return <CentreAllotmentDetails test={selectedTestForDetails} onBack={() => { setView('list'); fetchData(); }} />;
    }

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
                                        <button
                                            onClick={() => {
                                                setSelectedTestForDetails(test);
                                                setView('details');
                                            }}
                                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-md border text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer ${isDarkMode ? 'border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10' : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'}`}>
                                            {test.centres_count || 0} Centres
                                        </button>
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

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className={`relative w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className="bg-emerald-600 p-6 flex justify-between items-center text-white font-black">
                            <div>
                                <h3 className="text-lg uppercase tracking-tight">Centres Allotment</h3>
                                <p className="text-[10px] font-medium opacity-80 mt-1 uppercase tracking-widest">{selectedTest?.name}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-all text-white/90 hover:text-white">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        <div className={`p-0 max-h-[50vh] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#10141D]' : 'bg-slate-50 shadow-inner'}`}>
                            <div className="p-6 space-y-5">
                                {/* Selected Centres Summary (Like the User ScreenShot) */}
                                <div className="relative group">
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[10px] font-black uppercase tracking-[0.2em] z-10 transition-all ${isDarkMode ? 'bg-[#10141D] text-blue-400' : 'bg-slate-50 text-blue-600'}`}>
                                        ERP Centre List
                                    </label>
                                    <div className={`w-full p-4 rounded-xl border min-h-[58px] shadow-sm flex flex-wrap gap-2 transition-all ${isDarkMode ? 'bg-black/20 border-blue-500/50' : 'bg-white border-blue-400 shadow-blue-500/5'}`}>
                                        {selectedCentreIds.length > 0 ? (
                                            availableCentres
                                                .filter(c => selectedCentreIds.includes(c.enterCode))
                                                .map(c => (
                                                    <div
                                                        key={`sel-centre-${c.enterCode}`}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider animate-in zoom-in-95 duration-200 shadow-lg shadow-blue-600/20"
                                                    >
                                                        <span>{c.centreName}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedCentreIds(prev => prev.filter(code => code !== c.enterCode));
                                                            }}
                                                            className="p-0.5 hover:bg-white/20 rounded-md transition-colors"
                                                        >
                                                            <X size={12} strokeWidth={4} />
                                                        </button>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="flex items-center h-full px-1">
                                                <span className="text-slate-400 font-bold italic text-xs opacity-50">No Centres Selected...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`h-px my-2 ${isDarkMode ? 'bg-white/5' : 'bg-slate-200/60'}`} />

                                {/* Modal Search Option */}
                                <div className="relative group">
                                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search centres by name or code..."
                                        value={centreSearchTerm}
                                        onChange={(e) => setCentreSearchTerm(e.target.value)}
                                        className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-xs font-bold transition-all outline-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-blue-500/50 text-white' : 'bg-white border-slate-200 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/5 text-slate-700'}`}
                                    />
                                    {centreSearchTerm && (
                                        <button
                                            onClick={() => setCentreSearchTerm('')}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X size={14} strokeWidth={3} />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {[...availableCentres]
                                        .filter(c =>
                                            c.centreName?.toLowerCase().includes(centreSearchTerm.toLowerCase()) ||
                                            c.enterCode?.toLowerCase().includes(centreSearchTerm.toLowerCase())
                                        )
                                        .sort((a, b) => {
                                            return (a.centreName || "").localeCompare(b.centreName || "");
                                        })
                                        .map(centre => {
                                            const isSelected = selectedCentreIds.includes(centre.enterCode);
                                            return (
                                                <div
                                                    key={centre.enterCode || centre._id}
                                                    onClick={() => {
                                                        if (isSelected) setSelectedCentreIds(prev => prev.filter(code => code !== centre.enterCode));
                                                        else setSelectedCentreIds(prev => [...prev, centre.enterCode]);
                                                    }}
                                                    className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border transition-all active:scale-[0.98] ${isSelected
                                                        ? (isDarkMode ? 'bg-blue-500/10 border-blue-500/50' : 'bg-blue-50 border-blue-200 shadow-sm shadow-blue-500/5')
                                                        : (isDarkMode ? 'bg-white/[0.02] border-white/5 hover:border-white/10' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md hover:shadow-slate-200/50')}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                                                        ? 'bg-blue-600 border-blue-600 scale-110'
                                                        : (isDarkMode ? 'border-white/20 bg-black/20' : 'border-slate-300 bg-white shadow-inner')}`}>
                                                        {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className={`text-sm font-black uppercase tracking-tight truncate ${isSelected ? 'text-blue-600' : (isDarkMode ? 'text-slate-300' : 'text-slate-600')}`}>
                                                            {centre.centreName}
                                                        </span>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                                            <span className="text-[9px] opacity-40 font-bold uppercase tracking-[0.2em]">{centre.enterCode}</span>
                                                            <div className="flex items-center gap-1 opacity-40">
                                                                <Mail size={10} />
                                                                <span className="text-[9px] font-bold lowercase">{centre.email || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-40">
                                                                <Phone size={10} />
                                                                <span className="text-[9px] font-bold">{centre.phoneNumber || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>

                        <div className={`p-6 border-t flex justify-end gap-4 ${isDarkMode ? 'border-white/5 bg-[#1A1F2B]' : 'border-slate-100 bg-white'}`}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAllotment}
                                disabled={isActionLoading}
                                className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2"
                            >
                                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save Channels'}
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
                        <div className="bg-orange-600 p-6 flex justify-between items-center text-white font-black">
                            <div>
                                <h3 className="text-lg uppercase tracking-tight">Add to Sections</h3>
                                <p className="text-[10px] font-medium opacity-80 mt-1 uppercase tracking-widest">{selectedTest?.name}</p>
                            </div>
                            <button onClick={() => setIsSectionModalOpen(false)} className="hover:rotate-90 transition-all text-white/90 hover:text-white">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        <div className={`p-0 max-h-[50vh] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#10141D]' : 'bg-slate-50 shadow-inner'}`}>
                            <div className="p-6 space-y-5">
                                {/* Selected Packages Summary (Legend Style) */}
                                <div className="relative group">
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[10px] font-black uppercase tracking-[0.2em] z-10 transition-all ${isDarkMode ? 'bg-[#10141D] text-blue-400' : 'bg-slate-50 text-blue-600'}`}>
                                        Section List
                                    </label>
                                    <div className={`w-full p-4 rounded-xl border min-h-[58px] shadow-sm flex flex-wrap gap-2 transition-all ${isDarkMode ? 'bg-black/20 border-blue-500/50' : 'bg-white border-blue-400 shadow-blue-500/5'}`}>
                                        {selectedSectionIds.length > 0 ? (
                                            availableSections
                                                .filter(s => selectedSectionIds.includes(s.id))
                                                .map(s => (
                                                    <div
                                                        key={`sel-sec-${s.id}`}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider animate-in zoom-in-95 duration-200 shadow-lg shadow-blue-600/20"
                                                    >
                                                        <span>{s.name}</span>
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
                                                <span className="text-slate-400 font-bold italic text-xs opacity-50">No Sections Selected...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`h-px my-2 ${isDarkMode ? 'bg-white/5' : 'bg-slate-200/60'}`} />

                                {/* Section Modal Search */}
                                <div className="relative group">
                                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search sections by name or code..."
                                        value={sectionSearchTerm}
                                        onChange={(e) => setSectionSearchTerm(e.target.value)}
                                        className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-xs font-bold transition-all outline-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-blue-500/50 text-white' : 'bg-white border-slate-200 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/5 text-slate-700'}`}
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

                                <div className="space-y-2">
                                    {availableSections.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest opacity-50">No sections found</div>
                                    ) : (
                                        [...availableSections]
                                            .filter(s =>
                                                s.name?.toLowerCase().includes(sectionSearchTerm.toLowerCase()) ||
                                                s.subject_code?.toLowerCase().includes(sectionSearchTerm.toLowerCase()) ||
                                                s.code?.toLowerCase().includes(sectionSearchTerm.toLowerCase())
                                            )
                                            .sort((a, b) => {
                                                const aSel = selectedSectionIds.includes(a.id);
                                                const bSel = selectedSectionIds.includes(b.id);
                                                if (aSel && !bSel) return -1;
                                                if (!aSel && bSel) return 1;
                                                return (a.name || "").localeCompare(b.name || "");
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
                                                        className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border transition-all active:scale-[0.98] ${isSelected
                                                            ? (isDarkMode ? 'bg-blue-500/10 border-blue-500/50' : 'bg-blue-50 border-blue-200 shadow-sm shadow-blue-500/5')
                                                            : (isDarkMode ? 'bg-white/[0.02] border-white/5 hover:border-white/10' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md hover:shadow-slate-200/50')}`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${isSelected
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
                        </div>

                        <div className={`p-6 border-t flex justify-end gap-4 ${isDarkMode ? 'border-white/5 bg-[#1A1F2B]' : 'border-slate-100 bg-white'}`}>
                            <button
                                onClick={() => setIsSectionModalOpen(false)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSectionAllotment}
                                disabled={isActionLoading}
                                className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2"
                            >
                                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Premium Custom Alert */}
            {alert.show && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-10 duration-500">
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md ${alert.type === 'success'
                        ? 'bg-emerald-500/90 border-emerald-400 text-white'
                        : 'bg-red-500/90 border-red-400 text-white'
                        }`}>
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
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

export default TestAllotment;
