import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Award, Download, Printer, RefreshCw, GraduationCap, CheckCircle2, 
    XCircle, AlertCircle, FileText, Calendar, User, BookOpen, 
    TrendingUp, ShieldCheck, Sparkles, BarChart2, ChevronRight, ChevronDown, 
    ChevronUp, Target, Clock, Info, Layers
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { getMyResults } from '../../../services/resultsService';

const ReportCard = ({ isDarkMode, studentData: initialStudentData }) => {
    const { token, getApiUrl, user } = useAuth();
    const [studentData, setStudentData] = useState(initialStudentData || null);
    const [results, setResults] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [swotData, setSwotData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTerm, setSelectedTerm] = useState('ALL');
    const [expandedTests, setExpandedTests] = useState({});
    const reportCardRef = useRef(null);

    // Sync prop changes if initialStudentData updates
    useEffect(() => {
        if (initialStudentData) {
            setStudentData(initialStudentData);
        }
    }, [initialStudentData]);

    // Fetch all student report data
    const fetchReportData = async (forceRefresh = false) => {
        if (!token) return;
        if (forceRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const apiUrl = getApiUrl();
            const [erpRes, resultsRes, attRes, swotRes] = await Promise.allSettled([
                axios.get(`${apiUrl}/api/student/erp-data/`, { 
                    params: { refresh: forceRefresh },
                    headers: { Authorization: `Bearer ${token}` } 
                }),
                getMyResults({ force: forceRefresh }),
                axios.get(`${apiUrl}/api/student/attendance/`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                }),
                axios.get(`${apiUrl}/api/student/swot-analysis/`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                })
            ]);

            if (erpRes.status === 'fulfilled' && erpRes.value.data) {
                setStudentData(erpRes.value.data);
            }
            if (resultsRes.status === 'fulfilled') {
                const data = resultsRes.value;
                setResults(Array.isArray(data) ? data : (data?.data || []));
            }
            if (attRes.status === 'fulfilled') {
                const attData = attRes.value.data;
                setAttendance(Array.isArray(attData) ? attData : (attData?.data || []));
            }
            if (swotRes.status === 'fulfilled') {
                setSwotData(swotRes.value.data);
            }
        } catch (err) {
            console.error("Failed to load report card data:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [token]);

    // Extract Basic Information
    const studentProfile = useMemo(() => {
        const detailsList = studentData?.student?.studentsDetails || [];
        const basic = detailsList.find(d =>
            (user?.email && d?.studentEmail?.toLowerCase() === user.email.toLowerCase()) ||
            d?.studentEmail?.toLowerCase() === user?.username?.toLowerCase()
        ) || detailsList[0] || {};

        let derivedClass = studentData?.class?.name;
        if (!derivedClass) {
            const examSchema = studentData?.student?.examSchema || [];
            const fallback = examSchema.find(ex => ex.class && ex.class !== 'ALL CLASS');
            if (fallback) derivedClass = fallback.class;
        }

        const guardian = studentData?.student?.guardians?.[0] || {};
        const venue = studentData?.venue || studentData?.centre || {};

        // Extract Centre Name robustly across all possible ERP schema formats
        let centreVal = basic.centre || basic.centreName || basic.centre_name;
        if (!centreVal) {
            if (typeof venue === 'string' && venue.trim()) {
                centreVal = venue.trim();
            } else if (typeof venue === 'object' && venue !== null) {
                centreVal = venue.centreName || venue.name || venue.centre || venue.code;
            }
        }
        if (!centreVal) {
            centreVal = studentData?.centreName || studentData?.centre_name || 
                        user?.centre_name || user?.centre || user?.centre_code || 'Main Centre';
        }
        if (typeof centreVal === 'object' && centreVal !== null) {
            centreVal = centreVal.centreName || centreVal.name || centreVal.code || 'Main Centre';
        }

        return {
            name: basic.studentName || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Student',
            email: basic.studentEmail || user?.email || 'N/A',
            phone: basic.mobileNum || 'N/A',
            rollNo: studentData?.admissionNumber || user?.admission_number || user?.username || 'N/A',
            className: derivedClass || 'N/A',
            batch: studentData?.student?.batches?.[0]?.batchName || user?.assigned_batch || 'General Batch',
            studySection: studentData?.sectionAllotment?.studySection || user?.study_section || 'N/A',
            examSection: studentData?.sectionAllotment?.examSection || user?.exam_section || 'N/A',
            omrCode: studentData?.sectionAllotment?.omrCode || user?.omr_code || 'N/A',
            centre: centreVal,
            schoolName: basic.schoolName || 'N/A',
            board: basic.board || 'CBSE / State Board',
            guardianName: guardian.guardianName || guardian.name || 'N/A',
            guardianPhone: guardian.mobileNum || guardian.phone || 'N/A',
            courseName: studentData?.course?.courseName || 'Classroom Program',
            session: studentData?.course?.courseSession || '2025 - 2026'
        };
    }, [studentData, user]);

    // Process Performance & Results
    const performanceSummary = useMemo(() => {
        const validResults = results.filter(r => !r.isMissed && !r.isUpcoming);
        
        let filteredResults = validResults;
        if (selectedTerm === 'RECENT_5') {
            filteredResults = validResults.slice(0, 5);
        } else if (selectedTerm === 'RECENT_10') {
            filteredResults = validResults.slice(0, 10);
        }

        const totalTests = filteredResults.length;
        let totalScoredMarks = 0;
        let totalPossibleMarks = 0;

        filteredResults.forEach(r => {
            totalScoredMarks += (r.marks || 0);
            totalPossibleMarks += (r.total || 0);
        });

        const overallPercentage = totalPossibleMarks > 0 
            ? Math.round((totalScoredMarks / totalPossibleMarks) * 100) 
            : 0;

        // Calculate Grade based on percentage
        let gradeSymbol = 'N/A';
        let gradeDescription = 'Evaluation';
        let gradeColor = 'text-gray-500';
        let gradeBadgeBg = 'bg-gray-500/10 border-gray-500/20';
        let remarks = 'No evaluation data available yet.';

        if (totalTests > 0) {
            if (overallPercentage >= 90) {
                gradeSymbol = 'A+';
                gradeDescription = 'Outstanding';
                gradeColor = 'text-emerald-500';
                gradeBadgeBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500';
                remarks = 'Exceptional academic performance! Demonstrates thorough mastery across subjects.';
            } else if (overallPercentage >= 80) {
                gradeSymbol = 'A';
                gradeDescription = 'Excellent';
                gradeColor = 'text-blue-500';
                gradeBadgeBg = 'bg-blue-500/10 border-blue-500/30 text-blue-500';
                remarks = 'Consistent high performance! Keep maintaining speed and accuracy.';
            } else if (overallPercentage >= 70) {
                gradeSymbol = 'B+';
                gradeDescription = 'Very Good';
                gradeColor = 'text-cyan-500';
                gradeBadgeBg = 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500';
                remarks = 'Good grasp of concepts. Focus on error analysis to reach top rank.';
            } else if (overallPercentage >= 60) {
                gradeSymbol = 'B';
                gradeDescription = 'Good';
                gradeColor = 'text-amber-500';
                gradeBadgeBg = 'bg-amber-500/10 border-amber-500/30 text-amber-500';
                remarks = 'Solid performance. Regular revision in weak subjects recommended.';
            } else if (overallPercentage >= 50) {
                gradeSymbol = 'C';
                gradeDescription = 'Average';
                gradeColor = 'text-orange-500';
                gradeBadgeBg = 'bg-orange-500/10 border-orange-500/30 text-orange-500';
                remarks = 'Needs targeted practice in core weak chapters.';
            } else {
                gradeSymbol = 'D';
                gradeDescription = 'Needs Support';
                gradeColor = 'text-red-500';
                gradeBadgeBg = 'bg-red-500/10 border-red-500/30 text-red-500';
                remarks = 'Requires dedicated review and doubt resolution sessions.';
            }
        }
        const grade = `${gradeSymbol} (${gradeDescription})`;

        // Attendance Stats
        const gradedAtt = attendance.filter(r => (r.attendanceStatus || r.status) === 'Present' || (r.attendanceStatus || r.status) === 'Absent');
        const presentCount = gradedAtt.filter(r => (r.attendanceStatus || r.status) === 'Present').length;
        const totalClasses = gradedAtt.length;
        const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

        // Subject Breakdown Aggregation
        const subjectMap = {};
        filteredResults.forEach(r => {
            if (r.section_stats && r.section_stats.length > 0) {
                r.section_stats.forEach(sec => {
                    const sName = (sec.name || 'General').toUpperCase();
                    if (!subjectMap[sName]) {
                        subjectMap[sName] = { name: sName, scored: 0, total: 0, count: 0 };
                    }
                    subjectMap[sName].scored += (sec.marks || 0);
                    subjectMap[sName].total += (sec.total || 0);
                    subjectMap[sName].count += 1;
                });
            } else {
                const sName = (r.subject_details?.name || r.subject_name || r.name?.split(' - ')[0] || 'General').toUpperCase();
                if (!subjectMap[sName]) {
                    subjectMap[sName] = { name: sName, scored: 0, total: 0, count: 0 };
                }
                subjectMap[sName].scored += (r.marks || 0);
                subjectMap[sName].total += (r.total || 0);
                subjectMap[sName].count += 1;
            }
        });

        const subjectList = Object.values(subjectMap).map(subj => {
            const pct = subj.total > 0 ? Math.round((subj.scored / subj.total) * 100) : 0;
            let subjGrade = 'C';
            if (pct >= 85) subjGrade = 'A+';
            else if (pct >= 75) subjGrade = 'A';
            else if (pct >= 65) subjGrade = 'B+';
            else if (pct >= 55) subjGrade = 'B';
            else if (pct >= 45) subjGrade = 'C';
            else subjGrade = 'D';

            return {
                ...subj,
                percentage: pct,
                grade: subjGrade
            };
        });

        const highestRank = filteredResults.reduce((minRank, r) => {
            if (r.rank && r.rank > 0 && (minRank === '—' || r.rank < minRank)) {
                return r.rank;
            }
            return minRank;
        }, '—');

        return {
            totalTests,
            totalScoredMarks,
            totalPossibleMarks,
            overallPercentage,
            grade,
            gradeSymbol,
            gradeDescription,
            gradeColor,
            gradeBadgeBg,
            remarks,
            attendanceRate,
            totalClasses,
            presentCount,
            absentCount: totalClasses - presentCount,
            subjectList,
            highestRank,
            filteredResults
        };
    }, [results, attendance, selectedTerm]);

    // Handle Print / Export via Dedicated Print Iframe & Document Setup
    const handlePrint = () => {
        const reportNode = reportCardRef.current;
        if (!reportNode) {
            window.print();
            return;
        }

        // Collect all Tailwind & App stylesheets from the page head
        const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(node => node.outerHTML)
            .join('\n');

        const clone = reportNode.cloneNode(true);
        const noPrints = clone.querySelectorAll('.no-print');
        noPrints.forEach(el => el.remove());

        // Make logos visible in print clone
        const logos = clone.querySelectorAll('img');
        logos.forEach(img => {
            img.style.display = 'block';
        });

        let iframe = document.getElementById('report-card-print-frame');
        if (iframe) {
            document.body.removeChild(iframe);
        }

        iframe = document.createElement('iframe');
        iframe.id = 'report-card-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = '0px';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;

        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html class="light">
                <head>
                    <title>Report_Card_${(studentProfile.name || 'Student').replace(/\s+/g, '_')}_${studentProfile.rollNo}</title>
                    <meta charset="utf-8" />
                    ${headStyles}
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 10mm 10mm 10mm 10mm;
                        }
                        * {
                            box-sizing: border-box !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                            background-color: #ffffff !important;
                            color: #0f172a !important;
                        }
                        h1 {
                            font-size: 17px !important;
                            line-height: 1.25 !important;
                            margin-top: 2px !important;
                            margin-bottom: 2px !important;
                        }
                        .print-area {
                            width: 100% !important;
                            background: #ffffff !important;
                            color: #0f172a !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            box-shadow: none !important;
                            border: none !important;
                        }
                        /* Light mode color overrides for printed document */
                        .bg-\\[\\#0E131F\\], .bg-\\[\\#10141D\\], .bg-white\\/5 {
                            background-color: #ffffff !important;
                            border-color: #cbd5e1 !important;
                        }
                        .print-card, div[class*="rounded-xl"], div[class*="rounded-2xl"] {
                            border-color: #cbd5e1 !important;
                            background-color: #f8fafc !important;
                        }
                        .border-white\\/10, .border-white\\/5, .border-slate-200 {
                            border-color: #cbd5e1 !important;
                        }
                        /* Table Print Formatting */
                        table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            margin-top: 8px !important;
                            margin-bottom: 8px !important;
                            font-size: 10px !important;
                        }
                        th {
                            background-color: #f1f5f9 !important;
                            color: #0f172a !important;
                            font-weight: 800 !important;
                            padding: 8px 8px !important;
                            border: 1px solid #cbd5e1 !important;
                            font-size: 10px !important;
                            text-align: left !important;
                        }
                        td {
                            padding: 8px 8px !important;
                            border: 1px solid #cbd5e1 !important;
                            color: #0f172a !important;
                            font-size: 10px !important;
                        }
                        tr:nth-child(even) {
                            background-color: #f8fafc !important;
                        }
                        
                        /* Accent Color Preservations */
                        .text-orange-500 { color: #ea580c !important; }
                        .text-emerald-500 { color: #059669 !important; }
                        .text-blue-500, .text-blue-400 { color: #2563eb !important; }
                        .text-amber-500 { color: #d97706 !important; }
                        .text-cyan-500 { color: #0891b2 !important; }
                        .text-red-500 { color: #dc2626 !important; }
                        .text-slate-400 { color: #475569 !important; }
                        .print-text-dark { color: #0f172a !important; }
                        
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body class="bg-white text-slate-900">
                    <div class="print-area p-4">
                        ${clone.innerHTML}
                    </div>
                </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.error("Iframe print error:", err);
                window.print();
            }
        }, 400);
    };

    const toggleTestExpand = (testId) => {
        setExpandedTests(prev => ({
            ...prev,
            [testId]: !prev[testId]
        }));
    };

    const toggleExpandAll = () => {
        const allTestIds = performanceSummary.filteredResults.map((r, i) => r.id || `test-${i}`);
        const allExpanded = allTestIds.length > 0 && allTestIds.every(id => expandedTests[id]);
        if (allExpanded) {
            setExpandedTests({});
        } else {
            const nextState = {};
            allTestIds.forEach(id => { nextState[id] = true; });
            setExpandedTests(nextState);
        }
    };

    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center min-h-[60vh] space-y-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <RefreshCw size={36} className="animate-spin text-orange-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Generating Official Report Card...</p>
            </div>
        );
    }

    const reportTimestamp = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const reportVerificationId = `PF-RC-${studentProfile.rollNo}-${Date.now().toString(36).toUpperCase()}`;

    const areAllExpanded = performanceSummary.filteredResults.length > 0 && 
        performanceSummary.filteredResults.every((r, i) => expandedTests[r.id || `test-${i}`]);

    return (
        <div className="space-y-6 pb-12">
            {/* Inject CSS Print Styles */}
            <style>{`
                @media print {
                    html, body, #root, #portal-layout, main, div {
                        height: auto !important;
                        overflow: visible !important;
                        max-height: none !important;
                        position: static !important;
                    }
                    header, nav, aside, .no-print {
                        display: none !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    .print-area, .print-area * {
                        visibility: visible !important;
                    }
                    .print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: #ffffff !important;
                        color: #0f172a !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    .print-card {
                        background: #f8fafc !important;
                        border: 1px solid #cbd5e1 !important;
                        color: #0f172a !important;
                        box-shadow: none !important;
                    }
                    .print-text-dark, .text-white, .text-slate-300 {
                        color: #0f172a !important;
                    }
                    .print-bg-light {
                        background-color: #f8fafc !important;
                    }
                    .print-border {
                        border-color: #cbd5e1 !important;
                    }
                }
            `}</style>

            {/* Action Bar (Hidden during print) */}
            <div className={`no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div>
                    <div className="flex items-center gap-2">
                        <Award className="text-orange-500" size={24} />
                        <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Official Report Card
                        </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Dynamic academic performance summary, marksheet & institution standing.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Term Selector */}
                    <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border outline-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1A202C] border-white/15 text-white hover:border-orange-500/50' : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-orange-500'}`}
                    >
                        <option value="ALL">All Examinations</option>
                        <option value="RECENT_10">Last 10 Examinations</option>
                        <option value="RECENT_5">Last 5 Examinations</option>
                    </select>

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchReportData(true)}
                        disabled={refreshing}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}
                        title="Sync latest performance data"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin text-orange-500' : ''} />
                        <span className="hidden md:inline">Sync Data</span>
                    </button>

                    {/* Print / Download Button */}
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                    >
                        <Printer size={15} />
                        <span>Download / Print PDF</span>
                    </button>
                </div>
            </div>

            {/* Printable Report Card Container */}
            <div ref={reportCardRef} className={`print-area rounded-2xl border p-6 sm:p-8 space-y-8 transition-all ${isDarkMode ? 'bg-[#0E131F] border-white/10 text-white' : 'bg-white border-slate-200 shadow-xl text-slate-900'}`}>
                
                {/* 1. Header Banner */}
                <div className="border-b pb-4 print-border border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <img 
                            src="/images/icon/logo-1.svg" 
                            alt="Pathfinder ERP Logo" 
                            className="h-10 sm:h-12 w-auto object-contain block flex-shrink-0" 
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                    Pathfinder Educational Institute
                                </span>
                            </div>
                            <h1 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight mt-0.5 print-text-dark leading-tight">
                                Academic Performance Report Card
                            </h1>
                            <p className="text-[11px] text-slate-400 mt-0.5 print-text-dark">
                                Course: {studentProfile.courseName} | Session: {studentProfile.session}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-0.5 flex-shrink-0">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            <ShieldCheck size={13} />
                            <span>Verified Institutional Record</span>
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono print-text-dark">
                            Ref: <span className="font-bold">{reportVerificationId}</span>
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono print-text-dark">
                            Issued Date: {reportTimestamp}
                        </p>
                    </div>
                </div>

                {/* 2. Student Identity Grid */}
                <div className={`p-5 rounded-xl border print-card print-bg-light ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className="text-xs font-black uppercase tracking-wider text-orange-500 mb-4 flex items-center gap-2">
                        <User size={15} />
                        Student Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider print-text-dark">Student Name</span>
                            <span className="font-black text-sm print-text-dark">{studentProfile.name}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider print-text-dark">Admission / Roll No.</span>
                            <span className="font-bold font-mono text-sm text-orange-500">{studentProfile.rollNo}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider print-text-dark">Class & Target Exam</span>
                            <span className="font-bold print-text-dark">{studentProfile.className} ({studentProfile.board})</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider print-text-dark">Assigned Batch</span>
                            <span className="font-bold print-text-dark">{studentProfile.batch}</span>
                        </div>

                        <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider print-text-dark">Centre / Campus</span>
                            <span className="font-semibold print-text-dark">{studentProfile.centre}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider print-text-dark">OMR / Study Section</span>
                            <span className="font-semibold print-text-dark">{studentProfile.omrCode} / {studentProfile.studySection}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider print-text-dark">Guardian Name</span>
                            <span className="font-semibold print-text-dark">{studentProfile.guardianName}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider print-text-dark">Contact Email</span>
                            <span className="font-semibold print-text-dark truncate block">{studentProfile.email}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Overall Performance Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-xl border text-center print-card ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 print-text-dark">
                            Cumulative Average
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-orange-500">
                            {performanceSummary.overallPercentage}%
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1 print-text-dark">
                            Score: {performanceSummary.totalScoredMarks} / {performanceSummary.totalPossibleMarks}
                        </span>
                    </div>

                    <div className={`p-4 rounded-xl border text-center print-card ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 print-text-dark">
                            Overall Grade
                        </span>
                        <div className={`text-xl sm:text-2xl font-black ${performanceSummary.gradeColor}`}>
                            {performanceSummary.gradeSymbol}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1 print-text-dark font-medium">
                            {performanceSummary.gradeDescription}
                        </span>
                    </div>

                    <div className={`p-4 rounded-xl border text-center print-card ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 print-text-dark">
                            Examinations Attended
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-blue-500">
                            {performanceSummary.totalTests}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1 print-text-dark">
                            Highest Rank: #{performanceSummary.highestRank}
                        </span>
                    </div>

                    <div className={`p-4 rounded-xl border text-center print-card ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 print-text-dark">
                            Attendance Rate
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-500">
                            {performanceSummary.attendanceRate}%
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1 print-text-dark">
                            {performanceSummary.presentCount} of {performanceSummary.totalClasses} classes
                        </span>
                    </div>
                </div>

                {/* 4. Subject-Wise Marksheet */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center gap-2">
                        <BookOpen size={15} />
                        Subject-Wise Academic Performance Marksheet
                    </h3>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                    <th className="py-3 px-4">Subject</th>
                                    <th className="py-3 px-4 text-center">Tests Taken</th>
                                    <th className="py-3 px-4 text-center">Score / Max Marks</th>
                                    <th className="py-3 px-4 text-center">Percentage</th>
                                    <th className="py-3 px-4 text-center">Grade</th>
                                    <th className="py-3 px-4">Performance Indicator</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                {performanceSummary.subjectList.length > 0 ? (
                                    performanceSummary.subjectList.map((subj, idx) => (
                                        <tr key={idx} className={isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}>
                                            <td className="py-3 px-4 font-bold print-text-dark">{subj.name}</td>
                                            <td className="py-3 px-4 text-center font-mono print-text-dark">{subj.count}</td>
                                            <td className="py-3 px-4 text-center font-mono print-text-dark">{subj.scored} / {subj.total}</td>
                                            <td className="py-3 px-4 text-center font-black text-sm text-orange-500">{subj.percentage}%</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${
                                                    subj.percentage >= 80 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                    subj.percentage >= 65 ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                    subj.percentage >= 50 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                    'bg-red-500/10 text-red-500 border border-red-500/20'
                                                }`}>
                                                    {subj.grade}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 min-w-[140px]">
                                                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            subj.percentage >= 80 ? 'bg-emerald-500' :
                                                            subj.percentage >= 65 ? 'bg-blue-500' :
                                                            subj.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${Math.min(subj.percentage, 100)}%` }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-6 text-center text-slate-400 italic">
                                            No subject breakdown records found for the selected period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Grading Scale & Evaluation Legend */}
                <div className={`p-4 rounded-xl border print-card print-bg-light ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className="text-xs font-black uppercase tracking-wider text-orange-500 mb-3 flex items-center gap-2">
                        <Info size={14} />
                        Grading System & Evaluation Criteria
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                        {/* Overall Grade Criteria */}
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block print-text-dark">
                                Overall Grade Scale (Cumulative Average)
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                <div className="p-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 font-semibold text-[11px] flex justify-between items-center">
                                    <span>A+ (≥ 90%)</span>
                                    <span className="text-[9px] font-bold opacity-80">Outstanding</span>
                                </div>
                                <div className="p-1.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-500 font-semibold text-[11px] flex justify-between items-center">
                                    <span>A (80 - 89%)</span>
                                    <span className="text-[9px] font-bold opacity-80">Excellent</span>
                                </div>
                                <div className="p-1.5 rounded border border-cyan-500/20 bg-cyan-500/10 text-cyan-500 font-semibold text-[11px] flex justify-between items-center">
                                    <span>B+ (70 - 79%)</span>
                                    <span className="text-[9px] font-bold opacity-80">Very Good</span>
                                </div>
                                <div className="p-1.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-500 font-semibold text-[11px] flex justify-between items-center">
                                    <span>B (60 - 69%)</span>
                                    <span className="text-[9px] font-bold opacity-80">Good</span>
                                </div>
                                <div className="p-1.5 rounded border border-orange-500/20 bg-orange-500/10 text-orange-500 font-semibold text-[11px] flex justify-between items-center">
                                    <span>C (50 - 59%)</span>
                                    <span className="text-[9px] font-bold opacity-80">Average</span>
                                </div>
                                <div className="p-1.5 rounded border border-red-500/20 bg-red-500/10 text-red-500 font-semibold text-[11px] flex justify-between items-center">
                                    <span>D (&lt; 50%)</span>
                                    <span className="text-[9px] font-bold opacity-80">Needs Support</span>
                                </div>
                            </div>
                        </div>

                        {/* Subject Grade Criteria */}
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block print-text-dark">
                                Subject Grade Scale (Individual Subject Average)
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                <div className="p-1.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 font-semibold text-[11px]">
                                    A+ : ≥ 85%
                                </div>
                                <div className="p-1.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-500 font-semibold text-[11px]">
                                    A : 75% - 84%
                                </div>
                                <div className="p-1.5 rounded border border-cyan-500/20 bg-cyan-500/5 text-cyan-500 font-semibold text-[11px]">
                                    B+ : 65% - 74%
                                </div>
                                <div className="p-1.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-500 font-semibold text-[11px]">
                                    B : 55% - 64%
                                </div>
                                <div className="p-1.5 rounded border border-orange-500/20 bg-orange-500/5 text-orange-500 font-semibold text-[11px]">
                                    C : 45% - 54%
                                </div>
                                <div className="p-1.5 rounded border border-red-500/20 bg-red-500/5 text-red-500 font-semibold text-[11px]">
                                    D : &lt; 45%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Detailed Test Examination Matrix with Subject-Wise Breakdown */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center gap-2">
                                <FileText size={15} />
                                Examination Record & Performance History
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5 print-text-dark">
                                Detailed test standing, subject-wise marks allocation & question solution analysis.
                            </p>
                        </div>

                        {performanceSummary.filteredResults.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleExpandAll}
                                className={`no-print flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                    isDarkMode 
                                        ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200' 
                                        : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                <Layers size={13} className="text-orange-500" />
                                <span>{areAllExpanded ? 'Collapse All Details' : 'Expand All Subject Marks'}</span>
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                    <th className="py-3 px-3 w-8 no-print"></th>
                                    <th className="py-3 px-4">Test Code / Name</th>
                                    <th className="py-3 px-3 text-center">Date</th>
                                    <th className="py-3 px-4">Subject-Wise Marks</th>
                                    <th className="py-3 px-3 text-center">Score</th>
                                    <th className="py-3 px-3 text-center">Max</th>
                                    <th className="py-3 px-3 text-center">%</th>
                                    <th className="py-3 px-3 text-center">Rank</th>
                                    <th className="py-3 px-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                {performanceSummary.filteredResults.length > 0 ? (
                                    performanceSummary.filteredResults.map((r, i) => {
                                        const testId = r.id || `test-${i}`;
                                        const isExpanded = !!expandedTests[testId];
                                        const pct = r.total > 0 ? Math.round((r.marks / r.total) * 100) : 0;
                                        const testDate = r.date || r.end_time || r.start_time
                                            ? new Date(r.date || r.end_time || r.start_time).toLocaleDateString('en-GB')
                                            : 'N/A';

                                        const sectionList = (r.section_stats && r.section_stats.length > 0)
                                            ? r.section_stats
                                            : [{
                                                name: r.subject_details?.name || r.subject_name || 'General',
                                                marks: r.marks || 0,
                                                total: r.total || 0
                                            }];

                                        return (
                                            <React.Fragment key={testId}>
                                                <tr 
                                                    className={`transition-colors ${
                                                        isExpanded 
                                                            ? (isDarkMode ? 'bg-orange-500/5' : 'bg-orange-50/50') 
                                                            : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                                                    }`}
                                                >
                                                    {/* Expand Toggle */}
                                                    <td className="py-3 px-2 text-center no-print">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleTestExpand(testId)}
                                                            className={`p-1 rounded-md transition-all ${
                                                                isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                                                            }`}
                                                            title={isExpanded ? 'Collapse breakdown' : 'Expand subject marks'}
                                                        >
                                                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                        </button>
                                                    </td>

                                                    {/* Test Name & Code */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold print-text-dark leading-snug">
                                                                {r.name || r.code || `Test #${i+1}`}
                                                            </span>
                                                            {r.code && r.name && (
                                                                <span className="text-[10px] text-slate-400 font-mono print-text-dark">
                                                                    {r.code}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Date */}
                                                    <td className="py-3 px-3 text-center font-mono text-slate-400 print-text-dark whitespace-nowrap">
                                                        {testDate}
                                                    </td>

                                                    {/* Subject-Wise Marks Badges */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {sectionList.map((sec, secIdx) => {
                                                                const secPct = sec.total > 0 ? Math.round((sec.marks / sec.total) * 100) : 0;
                                                                return (
                                                                    <span
                                                                        key={secIdx}
                                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                                                            secPct >= 80 
                                                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                                                : secPct >= 65 
                                                                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                                                                                : secPct >= 50 
                                                                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                        }`}
                                                                        title={`${sec.name}: ${sec.marks}/${sec.total} (${secPct}%)`}
                                                                    >
                                                                        <span className="font-bold uppercase tracking-tight">{sec.name}:</span>
                                                                        <span className="font-mono font-black">{sec.marks}/{sec.total}</span>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>

                                                    {/* Score */}
                                                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-500">
                                                        {r.marks}
                                                    </td>

                                                    {/* Max */}
                                                    <td className="py-3 px-3 text-center font-mono text-slate-400 print-text-dark">
                                                        {r.total}
                                                    </td>

                                                    {/* Percentage */}
                                                    <td className="py-3 px-3 text-center font-black text-orange-500">
                                                        {pct}%
                                                    </td>

                                                    {/* Rank */}
                                                    <td className="py-3 px-3 text-center font-bold font-mono text-blue-400">
                                                        {r.rank ? `#${r.rank}` : '—'}
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            pct >= 75 ? 'bg-emerald-500/10 text-emerald-500' :
                                                            pct >= 50 ? 'bg-blue-500/10 text-blue-500' :
                                                            'bg-amber-500/10 text-amber-500'
                                                        }`}>
                                                            {pct >= 75 ? 'Distinction' : pct >= 50 ? 'Pass' : 'Review'}
                                                        </span>
                                                    </td>
                                                </tr>

                                                {/* Expandable Subject-Wise Breakdown Sub-Card */}
                                                {isExpanded && (
                                                    <tr className={isDarkMode ? 'bg-[#151a28]/60' : 'bg-slate-50/80'}>
                                                        <td colSpan="9" className="p-4 sm:p-5 border-t border-b border-orange-500/20">
                                                            <div className="space-y-4">
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                                                                    <div>
                                                                        <h4 className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center gap-2">
                                                                            <BookOpen size={14} />
                                                                            {r.name || r.code} — Subject-Wise Marksheet
                                                                        </h4>
                                                                        <p className="text-[11px] text-slate-400 mt-0.5 print-text-dark">
                                                                            Sectional marks, accuracy indicators & exam standing.
                                                                        </p>
                                                                    </div>

                                                                    {r.percentile !== undefined && r.percentile !== null && (
                                                                        <div className="text-[11px] font-bold">
                                                                            <span className="text-slate-400 print-text-dark">Percentile: </span>
                                                                            <span className="text-blue-500 font-mono font-black">{r.percentile}%</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Subject Cards Grid */}
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                                    {sectionList.map((sec, secIdx) => {
                                                                        const secPct = sec.total > 0 ? Math.round((sec.marks / sec.total) * 100) : 0;
                                                                        let secGrade = 'D';
                                                                        if (secPct >= 85) secGrade = 'A+';
                                                                        else if (secPct >= 75) secGrade = 'A';
                                                                        else if (secPct >= 65) secGrade = 'B+';
                                                                        else if (secPct >= 55) secGrade = 'B';
                                                                        else if (secPct >= 45) secGrade = 'C';

                                                                        const colorClass = secPct >= 80 
                                                                            ? 'text-emerald-500' 
                                                                            : secPct >= 65 
                                                                            ? 'text-blue-500' 
                                                                            : secPct >= 50 
                                                                            ? 'text-amber-500' 
                                                                            : 'text-red-500';

                                                                        const barBg = secPct >= 80 
                                                                            ? 'bg-emerald-500' 
                                                                            : secPct >= 65 
                                                                            ? 'bg-blue-500' 
                                                                            : secPct >= 50 
                                                                            ? 'bg-amber-500' 
                                                                            : 'bg-red-500';

                                                                        return (
                                                                            <div 
                                                                                key={secIdx}
                                                                                className={`p-3.5 rounded-xl border print-card ${
                                                                                    isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                                                    <span className="font-extrabold uppercase text-[11px] tracking-wide truncate print-text-dark">
                                                                                        {sec.name}
                                                                                    </span>
                                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                                        secPct >= 75 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                                                        secPct >= 50 ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                                                        'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                                                    }`}>
                                                                                        Grade {secGrade}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="flex items-baseline justify-between mb-1.5">
                                                                                    <div className="flex items-baseline gap-1">
                                                                                        <span className={`text-base font-black font-mono ${colorClass}`}>
                                                                                            {sec.marks}
                                                                                        </span>
                                                                                        <span className="text-[11px] text-slate-400 font-mono print-text-dark">
                                                                                            / {sec.total}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className={`text-xs font-black ${colorClass}`}>
                                                                                        {secPct}%
                                                                                    </span>
                                                                                </div>

                                                                                {/* Progress Bar */}
                                                                                <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                                                                                    <div 
                                                                                        className={`h-full rounded-full transition-all duration-500 ${barBg}`}
                                                                                        style={{ width: `${Math.min(Math.max(secPct, 0), 100)}%` }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="py-6 text-center text-slate-400 italic">
                                            No test examination records recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 6. Academic Remarks & Remarks Section */}
                <div className={`p-5 rounded-xl border print-card print-bg-light ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className="text-xs font-black uppercase tracking-wider text-orange-500 mb-2 flex items-center gap-2">
                        <Sparkles size={15} />
                        Academic Director & AI Faculty Evaluation Remarks
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-300 print-text-dark">
                        {performanceSummary.remarks}
                    </p>
                    
                    {swotData && (swotData.strengths?.length > 0 || swotData.weaknesses?.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="font-bold text-emerald-500 block mb-1">Key Identified Strengths:</span>
                                <ul className="list-disc list-inside text-slate-400 print-text-dark space-y-0.5">
                                    {(swotData.strengths || []).slice(0, 3).map((st, sIdx) => (
                                        <li key={sIdx}>{typeof st === 'string' ? st : (st.topic || st.subject || 'Strong performance')}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <span className="font-bold text-amber-500 block mb-1">Recommended Focus Areas:</span>
                                <ul className="list-disc list-inside text-slate-400 print-text-dark space-y-0.5">
                                    {(swotData.weaknesses || []).slice(0, 3).map((wk, wIdx) => (
                                        <li key={wIdx}>{typeof wk === 'string' ? wk : (wk.topic || wk.subject || 'Needs revision')}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* 7. Institutional Signatures & Verification Footer */}
                <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-8 mt-12">
                    <div className="text-center sm:text-left space-y-1">
                        <div className="w-36 border-b-2 border-slate-400 dark:border-white/30 mx-auto sm:mx-0 mb-2" />
                        <span className="text-xs font-bold block print-text-dark">Class Coordinator / Mentor</span>
                        <span className="text-[10px] text-slate-400 block print-text-dark">Pathfinder Faculty Council</span>
                    </div>

                    <div className="text-center space-y-1">
                        <div className="w-36 border-b-2 border-slate-400 dark:border-white/30 mx-auto mb-2" />
                        <span className="text-xs font-bold block print-text-dark">Parent / Guardian Signature</span>
                        <span className="text-[10px] text-slate-400 block print-text-dark">Acknowledgment</span>
                    </div>

                    <div className="text-center sm:text-right space-y-1">
                        <div className="w-36 border-b-2 border-slate-400 dark:border-white/30 mx-auto sm:ml-auto mb-2" />
                        <span className="text-xs font-bold block print-text-dark">Academic Controller</span>
                        <span className="text-[10px] text-slate-400 block print-text-dark">Pathfinder Administration</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ReportCard;
