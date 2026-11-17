import { useState, useMemo } from 'react';

export const useTestFilters = ({
    tests = [],
    masterSessions = [],
    masterTargetExams = [],
    masterClassLevels = [],
    masterCentres = [],
    isOMR = false,
    includeAllotmentStatus = false,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSessions, setSelectedSessions] = useState([]);
    const [selectedTargetExams, setSelectedTargetExams] = useState([]);
    const [selectedClassLevels, setSelectedClassLevels] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState({ value: '', label: 'All Status' });
    const [selectedCompletion, setSelectedCompletion] = useState({ value: '', label: 'All State' });

    // Date Range Filter State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateFilterType, setDateFilterType] = useState('any'); // 'any', 'schedule', 'created'

    const toLocalDateString = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const applyDatePreset = (preset) => {
        const now = new Date();
        if (preset === 'today') {
            const str = toLocalDateString(now);
            setStartDate(str);
            setEndDate(str);
        } else if (preset === 'week') {
            const currentDay = now.getDay();
            const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
            const monday = new Date(now);
            monday.setDate(now.getDate() + distanceToMon);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            setStartDate(toLocalDateString(monday));
            setEndDate(toLocalDateString(sunday));
        } else if (preset === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setStartDate(toLocalDateString(firstDay));
            setEndDate(toLocalDateString(lastDay));
        }
    };

    const formatDateDisplay = (dateStr, dateOnly = false) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = d.getDate();
            const month = d.toLocaleString('en-US', { month: 'short' });
            const year = d.getFullYear();
            if (dateOnly) {
                return `${day} ${month} ${year}`;
            }
            let hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
        } catch {
            return dateStr;
        }
    };

    // Options Generators
    const sessionOptions = useMemo(() => {
        const uniqueNames = new Set();
        masterSessions.forEach(s => {
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
    }, [masterSessions, tests]);

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

    const statusOptions = useMemo(() => {
        if (!includeAllotmentStatus) return null;
        return [
            { value: '', label: 'All Status' },
            { value: 'allotted', label: 'Allotted Only' },
            { value: 'not_allotted', label: 'Not Allotted Only' },
            { value: 'codes_sent', label: 'Codes Sent' },
            { value: 'codes_pending', label: 'Codes Pending' },
        ];
    }, [includeAllotmentStatus]);

    const completionOptions = useMemo(() => {
        const base = [
            { value: '', label: 'All State' },
            { value: 'completed', label: 'Completed' },
            { value: 'live', label: 'Live' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'not_scheduled', label: 'Not Scheduled' },
            { value: 'ended', label: 'Ended' },
        ];
        if (!includeAllotmentStatus) {
            base.push({ value: 'not_allotted', label: 'Not Allotted' });
        }
        return base;
    }, [includeAllotmentStatus]);

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
                const selectedLabels = selectedSessions.map(s => s.label.toLowerCase());
                const tSessionName = (t.session_details?.name || '').toLowerCase();
                const tMultiDetails = Array.isArray(t.sessions_details) ? t.sessions_details : [];

                matchesSession = (tSessionName && selectedLabels.includes(tSessionName)) ||
                    tMultiDetails.some(sd => selectedLabels.includes((sd.name || '').toLowerCase()));
            }

            // 3. Target Exam Multi-Select
            let matchesTargetExam = true;
            if (selectedTargetExams.length > 0) {
                const selectedLabels = selectedTargetExams.map(e => e.label.toLowerCase());
                const tTargetName = (t.target_exam_details?.name || '').toLowerCase();
                const tTargetDetails = Array.isArray(t.target_exam_details) ? t.target_exam_details : [];

                matchesTargetExam = (tTargetName && selectedLabels.includes(tTargetName)) ||
                    tTargetDetails.some(ed => selectedLabels.includes((ed.name || '').toLowerCase()));
            }

            // 4. Class Level Multi-Select
            let matchesClassLevel = true;
            if (selectedClassLevels.length > 0) {
                const selectedLabels = selectedClassLevels.map(c => c.label.toLowerCase());
                const tClassName = (t.class_level_details?.name || '').toLowerCase();
                const tMultiDetails = Array.isArray(t.class_levels_details) ? t.class_levels_details : [];

                matchesClassLevel = (tClassName && selectedLabels.includes(tClassName)) ||
                    tMultiDetails.some(cd => selectedLabels.includes((cd.name || '').toLowerCase()));
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
            if (includeAllotmentStatus) {
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

            // 9. Date Range Filter
            let matchesDateRange = true;
            if (startDate || endDate) {
                const startTs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
                const endTs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

                const testStartTs = t.start_time ? new Date(t.start_time).getTime() : null;
                const testEndTs = t.end_time ? new Date(t.end_time).getTime() : null;
                const testCreatedTs = t.created_at ? new Date(t.created_at).getTime() : null;

                const hasSchedule = Boolean(testStartTs || testEndTs);

                // Schedule overlap: test interval intersects with filter interval
                const scheduleMatches = hasSchedule && (
                    (!startTs || (testEndTs ? testEndTs >= startTs : testStartTs >= startTs)) &&
                    (!endTs || (testStartTs ? testStartTs <= endTs : testEndTs <= endTs))
                );

                // Creation date match
                const createdMatches = Boolean(testCreatedTs) && (
                    (!startTs || testCreatedTs >= startTs) &&
                    (!endTs || testCreatedTs <= endTs)
                );

                if (dateFilterType === 'schedule') {
                    matchesDateRange = scheduleMatches;
                } else if (dateFilterType === 'created') {
                    matchesDateRange = createdMatches;
                } else {
                    // 'any': match schedule overlap if scheduled, or created if unscheduled, or either
                    matchesDateRange = hasSchedule ? (scheduleMatches || createdMatches) : createdMatches;
                }
            }

            return matchesSearch && matchesSession && matchesTargetExam && matchesClassLevel && matchesCentres && matchesStatus && matchesCompletion && matchesOMR && matchesDateRange;
        });
    }, [tests, searchTerm, selectedSessions, selectedTargetExams, selectedClassLevels, selectedCentres, selectedStatus, selectedCompletion, isOMR, includeAllotmentStatus, startDate, endDate, dateFilterType]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (searchTerm.trim()) count++;
        if (startDate || endDate) count++;
        if (selectedSessions.length > 0) count += selectedSessions.length;
        if (selectedTargetExams.length > 0) count += selectedTargetExams.length;
        if (selectedClassLevels.length > 0) count += selectedClassLevels.length;
        if (selectedCentres.length > 0) count += selectedCentres.length;
        if (includeAllotmentStatus && selectedStatus?.value) count++;
        if (selectedCompletion?.value) count++;
        return count;
    }, [searchTerm, startDate, endDate, selectedSessions, selectedTargetExams, selectedClassLevels, selectedCentres, selectedStatus, selectedCompletion, includeAllotmentStatus]);

    const handleClearAllFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setDateFilterType('any');
        setSelectedSessions([]);
        setSelectedTargetExams([]);
        setSelectedClassLevels([]);
        setSelectedCentres([]);
        setSelectedStatus({ value: '', label: 'All Status' });
        setSelectedCompletion({ value: '', label: 'All State' });
    };

    return {
        searchTerm,
        setSearchTerm,
        selectedSessions,
        setSelectedSessions,
        selectedTargetExams,
        setSelectedTargetExams,
        selectedClassLevels,
        setSelectedClassLevels,
        selectedCentres,
        setSelectedCentres,
        selectedStatus,
        setSelectedStatus,
        selectedCompletion,
        setSelectedCompletion,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        dateFilterType,
        setDateFilterType,
        applyDatePreset,
        formatDateDisplay,
        sessionOptions,
        targetExamOptions,
        classLevelOptions,
        centreOptions,
        statusOptions,
        completionOptions,
        filteredRecords,
        activeFiltersCount,
        handleClearAllFilters,
    };
};

export default useTestFilters;
