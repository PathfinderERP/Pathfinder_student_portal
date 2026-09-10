import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { 
    Search, MapPin, Trash2, X, Check, Loader2, Filter, LayoutGrid, 
    ChevronDown, Mail, Phone, BellRing, ShieldCheck, ChevronLeft, 
    ChevronRight, Layers, RefreshCw, GraduationCap, BookOpen, 
    RotateCcw, SlidersHorizontal 
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import CentreAllotmentDetails from './CentreAllotmentDetails';

const TestAllotment = ({ isOMR = false }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Multi-Select Filters State
    const [sessions, setSessions] = useState([]);
    const [masterTargetExams, setMasterTargetExams] = useState([]);
    const [masterClassLevels, setMasterClassLevels] = useState([]);
    const [masterCentres, setMasterCentres] = useState([]);

    const [selectedSessions, setSelectedSessions] = useState([]);
    const [selectedTargetExams, setSelectedTargetExams] = useState([]);
    const [selectedClassLevels, setSelectedClassLevels] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState({ value: '', label: 'All Status' });
    const [selectedCompletion, setSelectedCompletion] = useState({ value: '', label: 'All State' });

    const activeFetchKeysRef = useRef(new Set()); // Track in-flight requests

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

    const fetchData = useCallback(async (force = false) => {
        if (!force && tests.length > 0) return;
        
        const fetchKey = 'test-allotment-list';
        if (activeFetchKeysRef.current.has(fetchKey)) return;

        setIsLoading(true);
        activeFetchKeysRef.current.add(fetchKey);
        try {
            const apiUrl = getApiUrl();
            const [testsRes, sessionsRes, targetExamsRes, classesRes, centresRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/${force ? '?refresh=true' : ''}`, getAuthConfig()),
                axios.get(`${apiUrl}/api/master-data/sessions/`, getAuthConfig()).catch(() => ({ data: [] })),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, getAuthConfig()).catch(() => ({ data: [] })),
                axios.get(`${apiUrl}/api/master-data/classes/`, getAuthConfig()).catch(() => ({ data: [] })),
                axios.get(`${apiUrl}/api/centres/`, getAuthConfig()).catch(() => ({ data: [] })),
            ]);

            const testsData = Array.isArray(testsRes.data) ? testsRes.data : (testsRes.data.results || []);
            const sessionsData = Array.isArray(sessionsRes.data) ? sessionsRes.data : (sessionsRes.data.results || []);
            const targetExamsData = Array.isArray(targetExamsRes.data) ? targetExamsRes.data : (targetExamsRes.data.results || []);
            const classesData = Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data.results || []);
            const centresData = Array.isArray(centresRes.data) ? centresRes.data : (centresRes.data.results || []);

            setTests(testsData);
            setSessions(sessionsData.filter(s => s.is_active !== false));
            setMasterTargetExams(targetExamsData.filter(e => e.is_active !== false));
            setMasterClassLevels(classesData.filter(c => c.is_active !== false));
            setMasterCentres(centresData.filter(c => c.is_active !== false));

        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setIsLoading(false);
            activeFetchKeysRef.current.delete(fetchKey);
        }
    }, [getApiUrl, getAuthConfig, tests.length]);

    useEffect(() => {
        fetchData();
        const handleTestsUpdated = () => fetchData(true);
        if (typeof window !== 'undefined') {
            window.addEventListener('tests-updated', handleTestsUpdated);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('tests-updated', handleTestsUpdated);
            }
        };
    }, [fetchData]);

    const handleEditCentres = async (test, isViewOnly = false) => {
        setSelectedTest(test);
        setIsViewOnlyMode(isViewOnly);
        setIsActionLoading(true);
        setIsTableView(false); // Default to search/select view

        try {
            const apiUrl = getApiUrl();

            let uniqueErpData = availableCentres;
            let localData = localCentres;

            if (availableCentres.length === 0 || localCentres.length === 0) {
                // Fetch ERP Centres (via Backend Proxy) and Local Centres concurrently
                const [erpCentresRes, localCentresRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/admin/erp-centres/`, getAuthConfig()),
                    axios.get(`${apiUrl}/api/centres/`, getAuthConfig())
                ]);

                const erpDataRaw = erpCentresRes.data || [];
                const erpData = Array.isArray(erpDataRaw) ? erpDataRaw : (erpDataRaw.data || []);

                // Highly robust deduplication by normalized code
                uniqueErpData = [];
                const seenCodes = new Set();
                erpData.forEach(c => {
                    const rawCode = c.enterCode || c.code || c.id || "";
                    const normalizedCode = rawCode.toString().trim().toUpperCase();
                    if (normalizedCode && !seenCodes.has(normalizedCode) && c.status?.toLowerCase() === 'active') {
                        uniqueErpData.push(c);
                        seenCodes.add(normalizedCode);
                    }
                });

                localData = localCentresRes.data || [];

                // Map ERP centres to available list
                setAvailableCentres(uniqueErpData);
                setLocalCentres(localData);
            }

            // Map the test's existing allotted local IDs back to ERP codes
            const alreadyAllottedCodes = localData
                .filter(lc => test.centres?.includes(lc.id))
                .map(lc => lc.code);

            if (isOMR && alreadyAllottedCodes.length === 0) {
                // By default select all centres for OMR if none are allotted yet
                setSelectedCentreIds(uniqueErpData.map(c => c.enterCode || c.code || c.id).filter(Boolean));
            } else {
                setSelectedCentreIds(alreadyAllottedCodes);
            }
            setIsModalOpen(true);
        } catch (err) {
            console.error("🚀 Allotment Sync Error:", err);
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
            const res = await axios.get(`${apiUrl}/api/tests/${selectedTest.id}/centres/?refresh=true&t=${new Date().getTime()}`, getAuthConfig());
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
                } else {
                    // Patch existing centre if email/phone are missing (they may have been blank at creation time)
                    const erpEmail = (erpDetail.email || erpDetail.contactEmail || "").substring(0, 254);
                    const erpPhone = (erpDetail.phoneNumber || erpDetail.phone || erpDetail.mobile || "").substring(0, 20);
                    const needsPatch = (!local.email && erpEmail) || (!local.phone_number && erpPhone);
                    if (needsPatch) {
                        const patchPayload = {};
                        if (!local.email && erpEmail) patchPayload.email = erpEmail;
                        if (!local.phone_number && erpPhone) patchPayload.phone_number = erpPhone;
                        try {
                            const patchRes = await axios.patch(`${apiUrl}/api/centres/${local.id}/`, patchPayload, getAuthConfig());
                            local = { ...local, ...patchRes.data };
                        } catch (patchErr) {
                            console.warn("Could not patch centre contact info:", patchErr);
                        }
                    }
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
                const allotmentsToUpdate = modalAllotments.filter(a => selectedCentreIds.includes(a.centre_details?.code));
                
                const updatePromises = allotmentsToUpdate.map(a => 
                    axios.patch(`${apiUrl}/api/tests/allotments/${a.id}/`, {
                        start_time: a.start_time,
                        end_time: a.end_time
                    }, getAuthConfig())
                );
                await Promise.all(updatePromises);

                // Also generate codes for these allotments
                const codeGenPromises = allotmentsToUpdate.map(a => 
                    axios.post(`${apiUrl}/api/tests/allotments/${a.id}/generate_code/`, {}, getAuthConfig())
                );
                await Promise.all(codeGenPromises);
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

    const sessionOptions = useMemo(() => {
        const uniqueNames = new Set();
        sessions.forEach(s => {
            if (s.name) uniqueNames.add(String(s.name).trim());
        });
        tests.forEach(t => {
            if (t.session_details?.name) uniqueNames.add(String(t.session_details.name).trim());
            if (Array.isArray(t.sessions_details)) {
                t.sessions_details.forEach(sd => {
                    if (sd.name) uniqueNames.add(String(sd.name).trim());
                });
            }
        });
        return Array.from(uniqueNames)
            .filter(Boolean)
            .map(name => ({ value: name, label: name }))
            .sort((a, b) => b.label.localeCompare(a.label));
    }, [sessions, tests]);

    const targetExamOptions = useMemo(() => {
        const uniqueNames = new Set();
        masterTargetExams.forEach(e => {
            if (e.name) uniqueNames.add(String(e.name).trim());
        });
        tests.forEach(t => {
            if (t.target_exam_details?.name) uniqueNames.add(String(t.target_exam_details.name).trim());
            if (Array.isArray(t.target_exam_details)) {
                t.target_exam_details.forEach(ed => {
                    if (ed.name) uniqueNames.add(String(ed.name).trim());
                });
            }
        });
        return Array.from(uniqueNames)
            .filter(Boolean)
            .map(name => ({ value: name, label: name }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [masterTargetExams, tests]);

    const classLevelOptions = useMemo(() => {
        const uniqueNames = new Set();
        masterClassLevels.forEach(c => {
            if (c.name) uniqueNames.add(String(c.name).trim());
        });
        tests.forEach(t => {
            if (t.class_level_details?.name) uniqueNames.add(String(t.class_level_details.name).trim());
            if (Array.isArray(t.class_levels_details)) {
                t.class_levels_details.forEach(cd => {
                    if (cd.name) uniqueNames.add(String(cd.name).trim());
                });
            }
        });
        return Array.from(uniqueNames)
            .filter(Boolean)
            .map(name => ({ value: name, label: name }))
            .sort((a, b) => {
                const numA = parseInt(a.label, 10);
                const numB = parseInt(b.label, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.label.localeCompare(b.label);
            });
    }, [masterClassLevels, tests]);

    const centreOptions = useMemo(() => {
        const seenCodes = new Set();
        const list = [];
        masterCentres.forEach(c => {
            const key = String(c.id || c.pk || c._id || c.code);
            const label = c.code ? `${c.name} (${c.code})` : c.name;
            const dedupeKey = (c.code || c.name || key).toLowerCase();
            if (!seenCodes.has(dedupeKey)) {
                seenCodes.add(dedupeKey);
                list.push({ value: key, label });
            }
        });
        return list.sort((a, b) => a.label.localeCompare(b.label));
    }, [masterCentres]);

    const statusOptions = [
        { value: '', label: 'All Status' },
        { value: 'allotted', label: 'Allotted Only' },
        { value: 'not_allotted', label: 'Not Allotted Only' },
        { value: 'codes_sent', label: 'Codes Sent' },
        { value: 'codes_pending', label: 'Codes Pending' },
    ];

    const completionOptions = [
        { value: '', label: 'All State' },
        { value: 'completed', label: 'Completed' },
        { value: 'live', label: 'Live' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'not_scheduled', label: 'Not Scheduled' },
        { value: 'ended', label: 'Ended' },
        { value: 'not_allotted', label: 'Not Allotted' },
    ];

    const customSelectStyles = useMemo(() => ({
        control: (provided, state) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#10141D' : '#ffffff',
            borderColor: state.isFocused 
                ? (isDarkMode ? '#3b82f6' : '#2563eb') 
                : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
            borderRadius: '5px',
            padding: '1px 2px',
            minHeight: '38px',
            boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
            '&:hover': {
                borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
            },
            cursor: 'pointer',
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#10141D' : '#ffffff',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            borderRadius: '5px',
            zIndex: 9999,
        }),
        menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({
            ...provided,
            padding: '4px',
            maxHeight: '220px',
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
                ? (isDarkMode ? '#2563eb' : '#3b82f6')
                : state.isFocused
                    ? (isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9')
                    : 'transparent',
            color: state.isSelected
                ? '#ffffff'
                : (isDarkMode ? '#f1f5f9' : '#1e293b'),
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: '4px',
            padding: '8px 12px',
            margin: '2px 0',
            cursor: 'pointer',
            '&:active': {
                backgroundColor: isDarkMode ? '#1d4ed8' : '#2563eb',
                color: '#fff',
            }
        }),
        placeholder: (provided) => ({
            ...provided,
            color: isDarkMode ? '#94a3b8' : '#64748b',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        }),
        singleValue: (provided) => ({
            ...provided,
            color: isDarkMode ? '#f8fafc' : '#0f172a',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
            border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #bfdbfe',
            borderRadius: '4px',
            margin: '2px',
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: isDarkMode ? '#93c5fd' : '#1d4ed8',
            fontSize: '10px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '2px 6px',
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: isDarkMode ? '#93c5fd' : '#1d4ed8',
            cursor: 'pointer',
            ':hover': {
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                color: '#ef4444',
            },
        }),
        input: (provided) => ({
            ...provided,
            color: isDarkMode ? '#f8fafc' : '#0f172a',
            fontSize: '11px',
            fontWeight: '700',
        }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (provided) => ({
            ...provided,
            color: isDarkMode ? '#64748b' : '#94a3b8',
            padding: '4px',
            ':hover': {
                color: isDarkMode ? '#f8fafc' : '#0f172a',
            }
        }),
        clearIndicator: (provided) => ({
            ...provided,
            color: isDarkMode ? '#64748b' : '#94a3b8',
            padding: '4px',
            ':hover': {
                color: '#ef4444',
            }
        }),
    }), [isDarkMode]);

    const filteredRecords = useMemo(() => {
        return tests.filter(t => {
            // 1. Text Search
            const searchLower = searchTerm.trim().toLowerCase();
            const matchesSearch = !searchLower || 
                t.name?.toLowerCase().includes(searchLower) ||
                t.code?.toLowerCase().includes(searchLower);

            // 2. Session Multi-Select
            let matchesSession = true;
            if (selectedSessions.length > 0) {
                const selectedVals = selectedSessions.map(s => String(s.value));
                const selectedLabels = selectedSessions.map(s => s.label);
                const tSessionId = t.session ? String(t.session) : (t.session_details?.id ? String(t.session_details.id) : null);
                const tSessionName = t.session_details?.name;
                const tMultiSessions = Array.isArray(t.sessions) ? t.sessions.map(String) : [];
                const tMultiDetails = Array.isArray(t.sessions_details) ? t.sessions_details : [];

                matchesSession = selectedVals.includes(tSessionId) ||
                    (tSessionName && selectedLabels.includes(tSessionName)) ||
                    tMultiSessions.some(id => selectedVals.includes(id)) ||
                    tMultiDetails.some(sd => selectedLabels.includes(sd.name) || selectedVals.includes(String(sd.id)));
            }

            // 3. Target Exam Multi-Select
            let matchesTargetExam = true;
            if (selectedTargetExams.length > 0) {
                const selectedVals = selectedTargetExams.map(e => String(e.value));
                const selectedLabels = selectedTargetExams.map(e => e.label.toLowerCase());
                const tTargetExams = Array.isArray(t.target_exams) ? t.target_exams.map(String) : [];
                const tTargetDetails = Array.isArray(t.target_exam_details) ? t.target_exam_details : [];

                matchesTargetExam = tTargetExams.some(id => selectedVals.includes(id)) ||
                    tTargetDetails.some(ed => selectedLabels.includes((ed.name || '').toLowerCase()) || selectedVals.includes(String(ed.id)));
            }

            // 4. Class Level Multi-Select
            let matchesClassLevel = true;
            if (selectedClassLevels.length > 0) {
                const selectedVals = selectedClassLevels.map(c => String(c.value));
                const selectedLabels = selectedClassLevels.map(c => c.label.toLowerCase());
                const tClassId = t.class_level ? String(t.class_level) : (t.class_level_details?.id ? String(t.class_level_details.id) : null);
                const tClassName = t.class_level_details?.name;
                const tMultiClasses = Array.isArray(t.class_levels) ? t.class_levels.map(String) : [];
                const tMultiDetails = Array.isArray(t.class_levels_details) ? t.class_levels_details : [];

                matchesClassLevel = selectedVals.includes(tClassId) ||
                    (tClassName && selectedLabels.includes(tClassName.toLowerCase())) ||
                    tMultiClasses.some(id => selectedVals.includes(id)) ||
                    tMultiDetails.some(cd => selectedLabels.includes((cd.name || '').toLowerCase()) || selectedVals.includes(String(cd.id)));
            }

            // 5. Centre Multi-Select
            let matchesCentres = true;
            if (selectedCentres.length > 0) {
                const selectedCentreIds = selectedCentres.map(c => String(c.value));
                const tCentres = Array.isArray(t.centres) ? t.centres.map(String) : [];
                matchesCentres = selectedCentreIds.some(id => tCentres.includes(id));
            }

            // 6. Allotment Status
            let matchesStatus = true;
            const statusVal = selectedStatus?.value;
            if (statusVal === 'allotted') {
                matchesStatus = (t.centres_count || 0) > 0;
            } else if (statusVal === 'not_allotted') {
                matchesStatus = (t.centres_count || 0) === 0;
            } else if (statusVal === 'codes_sent') {
                matchesStatus = (t.codes_sent_count || 0) > 0;
            } else if (statusVal === 'codes_pending') {
                matchesStatus = (t.centres_count || 0) > 0 && (t.codes_sent_count || 0) < (t.centres_count || 0);
            }

            // 7. Completion / State Filter
            let matchesCompletion = true;
            const compVal = selectedCompletion?.value;
            if (compVal === 'completed') {
                matchesCompletion = Boolean(t.is_completed);
            } else if (compVal === 'live') {
                matchesCompletion = Boolean(t.is_running) && !t.is_completed;
            } else if (compVal === 'scheduled') {
                matchesCompletion = Boolean(t.has_schedule) && !t.is_running && !t.is_over && !t.is_completed;
            } else if (compVal === 'not_scheduled') {
                matchesCompletion = (t.centres_count || 0) > 0 && !t.has_schedule && !t.is_completed;
            } else if (compVal === 'ended') {
                matchesCompletion = Boolean(t.is_over) && !t.is_completed;
            } else if (compVal === 'not_allotted') {
                matchesCompletion = (t.centres_count || 0) === 0 && !t.is_completed;
            }

            // 8. OMR filter
            let matchesOMR = true;
            const examTypeName = t.exam_type_details?.name?.toLowerCase() || '';
            const isOMRTest = examTypeName.includes('omr') || Boolean(t.is_omr_based);
            if (isOMR) {
                matchesOMR = isOMRTest;
            } else {
                matchesOMR = !isOMRTest;
            }

            return matchesSearch && matchesSession && matchesTargetExam && matchesClassLevel && matchesCentres && matchesStatus && matchesCompletion && matchesOMR;
        });
    }, [tests, searchTerm, selectedSessions, selectedTargetExams, selectedClassLevels, selectedCentres, selectedStatus, selectedCompletion, isOMR]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (searchTerm.trim()) count++;
        if (selectedSessions.length > 0) count += selectedSessions.length;
        if (selectedTargetExams.length > 0) count += selectedTargetExams.length;
        if (selectedClassLevels.length > 0) count += selectedClassLevels.length;
        if (selectedCentres.length > 0) count += selectedCentres.length;
        if (selectedStatus?.value) count++;
        if (selectedCompletion?.value) count++;
        return count;
    }, [searchTerm, selectedSessions, selectedTargetExams, selectedClassLevels, selectedCentres, selectedStatus, selectedCompletion]);

    const handleClearAllFilters = () => {
        setSearchTerm('');
        setSelectedSessions([]);
        setSelectedTargetExams([]);
        setSelectedClassLevels([]);
        setSelectedCentres([]);
        setSelectedStatus({ value: '', label: 'All Status' });
        setSelectedCompletion({ value: '', label: 'All State' });
        setCurrentPage(1);
    };

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedSessions, selectedTargetExams, selectedClassLevels, selectedCentres, selectedStatus, selectedCompletion]);

    const pageCount = Math.ceil(filteredRecords.length / itemsPerPage);
    const currentTests = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Show Centre Details Page if view is 'details'
    if (view === 'details' && selectedTestForDetails) {
        return <CentreAllotmentDetails test={selectedTestForDetails} onBack={() => { setView('list'); fetchData(true); }} />;
    }

    return (
        <div className={`p-8 animate-in fade-in duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {/* Header */}
            <div className={`p-8 rounded-[5px] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                            Test <span className="text-orange-500">Allotment</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Allot tests to specific centres and manage distributions.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Clear All Filters Button */}
                        {activeFiltersCount > 0 && (
                            <button
                                onClick={handleClearAllFilters}
                                className={`px-4 py-2.5 rounded-[5px] border text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    isDarkMode
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                                        : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                                }`}
                                title="Reset all applied filters"
                            >
                                <RotateCcw size={14} /> Clear Filters ({activeFiltersCount})
                            </button>
                        )}

                        {/* Refresh Button */}
                        <button
                            onClick={() => fetchData(true)}
                            disabled={isLoading}
                            className={`p-2.5 rounded-[5px] border transition-all flex items-center gap-2 text-xs font-bold ${
                                isDarkMode
                                    ? 'bg-[#10141D] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                            }`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin text-orange-500' : ''} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Filter Options Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 z-10" size={15} />
                        <input
                            type="text"
                            placeholder="Search name / code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-8 py-2 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-2 h-[38px] ${
                                isDarkMode 
                                    ? 'bg-[#10141D] border-white/10 text-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-500' 
                                    : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/10 placeholder:text-slate-400 shadow-sm'
                            }`}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Session Multi-Select */}
                    <div className="min-w-[140px]">
                        <Select
                            isMulti
                            options={sessionOptions}
                            value={selectedSessions}
                            onChange={(val) => setSelectedSessions(val || [])}
                            placeholder="Sessions..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>

                    {/* Target Exam Multi-Select */}
                    <div className="min-w-[140px]">
                        <Select
                            isMulti
                            options={targetExamOptions}
                            value={selectedTargetExams}
                            onChange={(val) => setSelectedTargetExams(val || [])}
                            placeholder="Target Exams..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>

                    {/* Class Level Multi-Select */}
                    <div className="min-w-[130px]">
                        <Select
                            isMulti
                            options={classLevelOptions}
                            value={selectedClassLevels}
                            onChange={(val) => setSelectedClassLevels(val || [])}
                            placeholder="Classes..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>

                    {/* Centre Multi-Select */}
                    <div className="min-w-[140px]">
                        <Select
                            isMulti
                            options={centreOptions}
                            value={selectedCentres}
                            onChange={(val) => setSelectedCentres(val || [])}
                            placeholder="Centres..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>

                    {/* Allotment Status Select */}
                    <div className="min-w-[130px]">
                        <Select
                            options={statusOptions}
                            value={selectedStatus}
                            onChange={(val) => setSelectedStatus(val || { value: '', label: 'All Status' })}
                            placeholder="Status..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>

                    {/* Completion Status Select */}
                    <div className="min-w-[130px]">
                        <Select
                            options={completionOptions}
                            value={selectedCompletion}
                            onChange={(val) => setSelectedCompletion(val || { value: '', label: 'All State' })}
                            placeholder="State..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>
                </div>

                {/* Filter Summary Footer */}
                <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold pt-3 border-t ${isDarkMode ? 'text-slate-400 border-white/5' : 'text-slate-600 border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal size={14} className="text-orange-500" />
                        <span>Showing <strong className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{filteredRecords.length}</strong> of <strong className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{tests.length}</strong> tests</span>
                    </div>
                    {activeFiltersCount > 0 && (
                        <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider bg-orange-500/10 px-2.5 py-1 rounded-[4px]">
                            {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied
                        </span>
                    )}
                </div>
            </div>

            {/* Table Card */}
            <div className={`rounded-[5px] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-400 border-white/5' : 'text-slate-600 border-slate-200 bg-slate-50/50'}`}>
                                <th className="py-6 px-6 text-center">#</th>
                                <th className="py-6 px-6">Name</th>
                                <th className="py-6 px-6">Test Code</th>

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
                                        <td className="py-5 px-6 text-center"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    </tr>
                                ))
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className={`py-20 text-center font-bold text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No tests found matching your criteria.</td>
                                </tr>
                            ) : currentTests.map((test, index) => (
                                <tr key={test.id} className={`group ${test.is_running ? (isDarkMode ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-l-4 border-l-emerald-500' : 'bg-emerald-50 hover:bg-emerald-100 border-l-4 border-l-emerald-500') : (isDarkMode ? 'hover:bg-white/2' : 'hover:bg-slate-50')} transition-colors border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                                    <td className={`py-5 px-6 text-center font-bold text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`font-extrabold text-xs uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{test.name}</span>
                                                {test.is_completed ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                                                        <Check size={10} strokeWidth={3} /> Completed
                                                    </span>
                                                ) : test.is_running ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/20 border border-emerald-500/30 dark:text-emerald-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        Live
                                                    </span>
                                                ) : (test.centres_count || 0) === 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 dark:text-slate-400 dark:bg-white/5 dark:border-white/10">
                                                        Not Allotted
                                                    </span>
                                                ) : !test.has_schedule ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20">
                                                        Not Scheduled
                                                    </span>
                                                ) : test.is_over ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 border border-purple-200 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/20">
                                                        Ended
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20">
                                                        Scheduled
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {Array.isArray(test.sessions_details) && test.sessions_details.length > 0 ? (test.sessions_details.length > 3 ? `${test.sessions_details.slice(0, 3).map(s => s.name).join(', ')} + ${test.sessions_details.length - 3} session` : test.sessions_details.map(s => s.name).join(', ')) : (test.session_details?.name || '-')} • {Array.isArray(test.class_levels_details) && test.class_levels_details.length > 0 ? test.class_levels_details.map(c => c.name).join(', ') : (test.class_level_details?.name || '-')} • {Array.isArray(test.target_exam_details) ? (test.target_exam_details.length > 3 ? `${test.target_exam_details.slice(0, 3).map(te => te.name).join(', ')} + ${test.target_exam_details.length - 3} test` : test.target_exam_details.map(te => te.name).join(', ')) : (test.target_exam_details?.name || '-')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className={`py-5 px-6 font-black text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{test.code}</td>
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
            {/* Premium Custom Alert */}
            {alert.show && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-999 animate-in slide-in-from-top-10 duration-500 w-[90%] max-w-sm">
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
