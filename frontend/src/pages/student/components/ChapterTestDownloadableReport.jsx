import React, { forwardRef } from 'react';
import MathRenderer from '../../../components/MathRenderer';
import { 
    Award, CheckCircle, XCircle, MinusCircle, 
    Clock, Target, Zap, AlertTriangle, FileText, Check, X
} from 'lucide-react';

const ChapterTestDownloadableReport = forwardRef(({ 
    testResult, 
    user,
    questionAnalysis,
    mistakeReasonsList = []
}, ref) => {
    if (!testResult) return null;

    const studentUsername = testResult.username || testResult.email || user?.email || user?.username || testResult.student_name || 'N/A';
    
    const rawFullName = testResult.full_name || 
        `${testResult.first_name || user?.first_name || ''} ${testResult.last_name || user?.last_name || ''}`.trim() ||
        user?.name || 
        '';

    const studentFullName = rawFullName || (studentUsername.includes('@') 
        ? studentUsername.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : (testResult.student_name || 'Student'));

    const studentName = studentFullName;
    const studentFirstName = testResult.first_name || user?.first_name || studentFullName.split(' ')[0] || 'Student';
    const rollNo = testResult.admission_number || user?.admission_number || user?.username || 'N/A';
    const centre = testResult.centre_name || user?.centre_name || user?.centre || 'HAZRA H.O';
    const className = testResult.class_name || user?.class_name || user?.assigned_batch || 'General';
    const subjectName = testResult.subject_name || 'Chemistry';
    const chapterName = testResult.chapter_name || 'Classification of Elements & Periodicity in Properties';
    const testTitle = `${subjectName} - ${chapterName} (Chapter Test)`;

    const formattedDate = testResult.created_at ? new Date(testResult.created_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }) : new Date().toLocaleString();

    const timeSpentFormatted = (() => {
        const secs = testResult.time_taken_seconds || 0;
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        return `${mins}m ${remSecs}s`;
    })();

    const list = questionAnalysis?.list || [];
    const totalQ = testResult.total_questions || list.length || 0;
    const score = testResult.score ?? questionAnalysis?.correct ?? 0;
    const correctCount = questionAnalysis?.correct ?? score;
    const incorrectCount = questionAnalysis?.incorrect ?? (totalQ - correctCount);
    const skippedCount = questionAnalysis?.unattempted ?? 0;
    const totalMistakes = incorrectCount + skippedCount;
    const percentage = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;
    const accuracy = questionAnalysis?.accuracy ?? (totalQ - skippedCount > 0 ? Math.round((correctCount / (totalQ - skippedCount)) * 100) : 0);

    const reflections = testResult.reflections || {};

    // 1. Build Mistake Items List
    const mistakeItems = list.map((q, idx) => {
        if (q.isCorrect) return null;
        const reflection = reflections[q.id];
        let issue = reflection || (q.isSkipped ? 'Skipped / Unattempted' : 'Unspecified Error');
        
        let priority = 'Medium';
        const lowerIssue = issue.toLowerCase();
        if (lowerIssue.includes('concept') || lowerIssue.includes('properly') || lowerIssue.includes('formula') || lowerIssue.includes('pressure') || lowerIssue.includes('silly')) {
            priority = 'High';
        } else if (lowerIssue.includes('skipped') || lowerIssue.includes('unattempted')) {
            priority = 'Low';
        }

        return {
            qNum: idx + 1,
            subject: subjectName,
            topic: q.topic || chapterName,
            issue: issue,
            priority: priority,
            isSkipped: q.isSkipped
        };
    }).filter(Boolean);

    // 2. Error Pattern Aggregation
    const patternCounts = {};
    mistakeItems.forEach(item => {
        patternCounts[item.issue] = (patternCounts[item.issue] || 0) + 1;
    });

    const getInterpretation = (pattern) => {
        const p = pattern.toLowerCase();
        if (p.includes('pressure') || p.includes('silly')) {
            return 'Largest category. Improve pacing, concentration and final checking routine.';
        }
        if (p.includes('properly') || p.includes('read')) {
            return 'Carefully identify conditions, keywords and what is specifically being asked.';
        }
        if (p.includes('concept') || p.includes('misunderstood')) {
            return `Requires focused conceptual revision, especially in ${chapterName}.`;
        }
        if (p.includes('calc') || p.includes('calculation')) {
            return 'Use step-by-step rough calculation and verify signs/arithmetic operations.';
        }
        if (p.includes('formula')) {
            return 'Strengthen regular formula recall and maintain a dedicated formula sheet.';
        }
        if (p.includes('guess')) {
            return 'Avoid blind guessing; use process of elimination and confidence-based selection.';
        }
        if (p.includes('skip') || p.includes('unattempted')) {
            return 'Assess question difficulty faster; practice question sets under time limits.';
        }
        return 'Review question fundamentals and re-solve to consolidate concept understanding.';
    };

    const errorPatternList = Object.entries(patternCounts).map(([pattern, count]) => ({
        pattern,
        count,
        interpretation: getInterpretation(pattern)
    })).sort((a, b) => b.count - a.count);

    // Top dominant pattern for narrative
    const dominantPattern = errorPatternList[0]?.pattern || 'avoidable errors';
    const dominantCount = errorPatternList[0]?.count || totalMistakes;
    const secondPattern = errorPatternList[1]?.pattern;
    const secondCount = errorPatternList[1]?.count;

    // 3. Priority Improvement Plan items
    const improvementPlan = [];
    if (errorPatternList.some(e => e.pattern.toLowerCase().includes('pressure') || e.pattern.toLowerCase().includes('silly'))) {
        improvementPlan.push({
            action: 'Control time-pressure & silly mistakes',
            practice: 'Use a final-check routine for signs, calculations, option units and question conditions.'
        });
    }
    if (errorPatternList.some(e => e.pattern.toLowerCase().includes('read') || e.pattern.toLowerCase().includes('properly'))) {
        improvementPlan.push({
            action: 'Careful question reading',
            practice: 'Read the full question statement before solving; highlight given data and required target.'
        });
    }
    improvementPlan.push({
        action: `Strengthen ${chapterName} core concepts`,
        practice: `Revise core theory notes and solve 20–30 graded practice problems on this chapter.`
    });
    if (errorPatternList.some(e => e.pattern.toLowerCase().includes('formula'))) {
        improvementPlan.push({
            action: 'Formula retention & speed',
            practice: 'Maintain a one-page formula sheet and practice quick daily recall drills.'
        });
    }
    if (errorPatternList.some(e => e.pattern.toLowerCase().includes('calc'))) {
        improvementPlan.push({
            action: 'Step-by-step calculations',
            practice: 'Avoid mental arithmetic shortcuts; write down key intermediate algebraic steps.'
        });
    }

    return (
        <div 
            ref={ref} 
            id="chapter-test-downloadable-report"
            className="bg-white text-slate-900 max-w-5xl mx-auto text-left font-sans"
            style={{ 
                minWidth: '850px', 
                color: '#0f172a', 
                backgroundColor: '#ffffff',
                padding: '30px'
            }}
        >
            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 8mm 10mm 12mm 10mm !important;
                    @bottom-right {
                        content: "Page " counter(page);
                        font-family: system-ui, -apple-system, sans-serif;
                        font-size: 8pt;
                        font-weight: 600;
                        color: #64748b;
                    }
                    @bottom-left {
                        content: "Pathfinder Educational Centre";
                        font-family: system-ui, -apple-system, sans-serif;
                        font-size: 8pt;
                        color: #94a3b8;
                    }
                }
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm 12mm 10mm !important;
                        @bottom-right {
                            content: "Page " counter(page);
                            font-family: system-ui, -apple-system, sans-serif;
                            font-size: 8pt;
                            font-weight: 600;
                            color: #64748b;
                        }
                        @bottom-left {
                            content: "Pathfinder Educational Centre";
                            font-family: system-ui, -apple-system, sans-serif;
                            font-size: 8pt;
                            color: #94a3b8;
                        }
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background-color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .report-page-1, .report-page-2 {
                        padding: 4mm 6mm !important;
                        box-sizing: border-box !important;
                    }
                    .no-print { display: none !important; }
                    .page-break { page-break-before: always !important; break-before: page !important; }
                    .report-avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
                }
                .page-break {
                    page-break-before: always;
                    break-before: page;
                }
                .report-avoid-break {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
            `}</style>

            {/* ══════════════════════════════════════════════════════════════════
                PAGE 1: STUDENT PERFORMANCE ANALYSIS & DIAGNOSTIC REPORT
            ══════════════════════════════════════════════════════════════════ */}
            <div className="report-page-1">
                {/* ── Official Report Header ── */}
                <div className="text-center mb-5 pb-3">
                    <div className="flex items-center justify-center mb-2.5">
                        <img 
                            src="/images/icon/pathfinder-logo-hd.png" 
                            alt="Pathfinder Logo" 
                            className="h-12 object-contain inline-block"
                            style={{ imageRendering: '-webkit-optimize-contrast' }}
                            crossOrigin="anonymous"
                        />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                        STUDENT PERFORMANCE ANALYSIS REPORT
                    </h1>
                    <p className="text-xs font-bold text-slate-600 mt-1">
                        {subjectName} • {chapterName} • Diagnostic & Improvement Report
                    </p>
                </div>

                {/* ── Metadata Table ── */}
                <div className="mb-5 border border-slate-300 rounded-xs overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                        <tbody>
                            <tr className="border-b border-slate-300">
                                <td className="w-1/4 px-4 py-2 font-bold bg-slate-100 text-slate-800 border-r border-slate-300">
                                    Name
                                </td>
                                <td className="w-3/4 px-4 py-2 font-bold text-slate-900 uppercase">
                                    {studentFullName}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="w-1/4 px-4 py-2 font-bold bg-slate-100 text-slate-800 border-r border-slate-300">
                                    Email
                                </td>
                                <td className="w-3/4 px-4 py-2 font-bold text-slate-800 uppercase">
                                    {studentUsername}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="px-4 py-2 font-bold bg-slate-100 text-slate-800 border-r border-slate-300">
                                    Test
                                </td>
                                <td className="px-4 py-2 font-semibold text-slate-800">
                                    {testTitle}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="px-4 py-2 font-bold bg-slate-100 text-slate-800 border-r border-slate-300">
                                    Centre
                                </td>
                                <td className="px-4 py-2 font-semibold text-slate-800">
                                    {centre}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="px-4 py-2 font-bold bg-slate-100 text-slate-800 border-r border-slate-300">
                                    Roll Number
                                </td>
                                <td className="px-4 py-2 font-semibold text-slate-800">
                                    {rollNo}
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 font-bold bg-slate-100 text-slate-800 border-r border-slate-300">
                                    Total Mistakes
                                </td>
                                <td className="px-4 py-2 font-extrabold text-red-600">
                                    {totalMistakes} <span className="font-normal text-slate-500">({score}/{totalQ} Correct, {accuracy}% Accuracy)</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 1. Overall Diagnostic ── */}
                <div className="mb-5 report-avoid-break">
                    <h2 className="text-sm font-black text-blue-900 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        1. Overall Diagnostic
                    </h2>
                    <p className="text-xs text-slate-800 leading-relaxed text-justify">
                        <strong className="font-bold text-slate-900">Key finding:</strong> {studentFirstName} made{' '}
                        <strong className="font-bold">{totalMistakes} mistakes</strong> out of {totalQ} questions in {subjectName} ({chapterName}). The dominant error pattern is{' '}
                        <strong className="font-bold text-slate-900">{dominantPattern} ({dominantCount})</strong>
                        {secondPattern ? `, followed by ${secondPattern} (${secondCount})` : ''}. 
                        {accuracy >= 75 
                            ? ` Overall conceptual foundation is solid (${accuracy}% accuracy), with primary scope to eliminate avoidable mistakes and optimize solving speed.`
                            : ` There is clear scope for score improvement by eliminating avoidable mistakes while consolidating core topic fundamentals.`}
                    </p>
                </div>

                {/* ── 2. Topic-wise Mistake Analysis (Table) ── */}
                {mistakeItems.length > 0 && (
                    <div className="mb-5 report-avoid-break">
                        <h2 className="text-sm font-black text-blue-900 uppercase tracking-wide mb-1.5">
                            2. Topic-wise Mistake Analysis
                        </h2>
                        <div className="border border-slate-300 rounded-xs overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-[#dbeafe] text-slate-900 font-extrabold border-b border-slate-300">
                                    <tr>
                                        <th className="px-3 py-1.5 border-r border-slate-300 w-1/5">Subject</th>
                                        <th className="px-3 py-1.5 border-r border-slate-300 w-2/5">Topic</th>
                                        <th className="px-3 py-1.5 border-r border-slate-300 w-12 text-center">Q.</th>
                                        <th className="px-3 py-1.5 border-r border-slate-300 w-1/4">Issue / Reflection</th>
                                        <th className="px-3 py-1.5 text-center w-16">Priority</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mistakeItems.map((item, mIdx) => (
                                        <tr key={mIdx} className="border-b last:border-b-0 border-slate-200 even:bg-slate-50/70">
                                            <td className="px-3 py-1.5 font-semibold text-slate-800 border-r border-slate-300">
                                                {item.subject}
                                            </td>
                                            <td className="px-3 py-1.5 text-slate-700 border-r border-slate-300">
                                                {item.topic}
                                            </td>
                                            <td className="px-3 py-1.5 text-center font-bold text-slate-900 border-r border-slate-300">
                                                {item.qNum}
                                            </td>
                                            <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-300">
                                                {item.issue}
                                            </td>
                                            <td className="px-3 py-1.5 text-center font-bold text-slate-800">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                    item.priority === 'High' ? 'text-red-700 bg-red-100/80' : 'text-slate-700 bg-slate-100'
                                                }`}>
                                                    {item.priority}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── 3. Subject-wise Performance (Table) ── */}
                <div className="mb-5 report-avoid-break">
                    <h2 className="text-sm font-black text-blue-900 uppercase tracking-wide mb-1.5">
                        3. Subject-wise Performance
                    </h2>
                    <div className="border border-slate-300 rounded-xs overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#dbeafe] text-slate-900 font-extrabold border-b border-slate-300">
                                <tr>
                                    <th className="px-3 py-1.5 border-r border-slate-300 w-1/4">Subject</th>
                                    <th className="px-3 py-1.5 border-r border-slate-300 w-20 text-center">Mistakes</th>
                                    <th className="px-3 py-1.5 border-r border-slate-300 w-20 text-center">Share</th>
                                    <th className="px-3 py-1.5">Primary Concern</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b last:border-b-0 border-slate-200">
                                    <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-300">
                                        {subjectName}
                                    </td>
                                    <td className="px-3 py-1.5 text-center font-extrabold text-red-600 border-r border-slate-300">
                                        {totalMistakes}
                                    </td>
                                    <td className="px-3 py-1.5 text-center font-bold text-slate-700 border-r border-slate-300">
                                        100.0%
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-800">
                                        {chapterName}: {dominantPattern.toLowerCase()} ({dominantCount})
                                        {secondPattern ? `; ${secondPattern.toLowerCase()} (${secondCount}).` : '.'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 4. Error Pattern Analysis (Table) ── */}
                {errorPatternList.length > 0 && (
                    <div className="mb-5 report-avoid-break">
                        <h2 className="text-sm font-black text-blue-900 uppercase tracking-wide mb-1.5">
                            4. Error Pattern Analysis
                        </h2>
                        <div className="border border-slate-300 rounded-xs overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-[#dbeafe] text-slate-900 font-extrabold border-b border-slate-300">
                                    <tr>
                                        <th className="px-3 py-1.5 border-r border-slate-300 w-1/3">Error Pattern</th>
                                        <th className="px-3 py-1.5 border-r border-slate-300 w-16 text-center">Count</th>
                                        <th className="px-3 py-1.5">Interpretation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {errorPatternList.map((err, eIdx) => (
                                        <tr key={eIdx} className="border-b last:border-b-0 border-slate-200 even:bg-slate-50/70">
                                            <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-300">
                                                {err.pattern}
                                            </td>
                                            <td className="px-3 py-1.5 text-center font-extrabold text-slate-800 border-r border-slate-300">
                                                {err.count}
                                            </td>
                                            <td className="px-3 py-1.5 text-slate-800">
                                                {err.interpretation}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── 5. Priority Improvement Plan (Table) ── */}
                <div className="mb-5 report-avoid-break">
                    <h2 className="text-sm font-black text-blue-900 uppercase tracking-wide mb-1.5">
                        5. Priority Improvement Plan
                    </h2>
                    <div className="border border-slate-300 rounded-xs overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#dbeafe] text-slate-900 font-extrabold border-b border-slate-300">
                                <tr>
                                    <th className="px-3 py-1.5 border-r border-slate-300 w-16 text-center">Priority</th>
                                    <th className="px-3 py-1.5 border-r border-slate-300 w-1/3">Action</th>
                                    <th className="px-3 py-1.5">Suggested Practice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {improvementPlan.map((plan, pIdx) => (
                                    <tr key={pIdx} className="border-b last:border-b-0 border-slate-200 even:bg-slate-50/70">
                                        <td className="px-3 py-1.5 text-center font-bold text-slate-900 border-r border-slate-300">
                                            {pIdx + 1}
                                        </td>
                                        <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-300">
                                            {plan.action}
                                        </td>
                                        <td className="px-3 py-1.5 text-slate-800">
                                            {plan.practice}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 6. Mentor's Final Assessment ── */}
                <div className="mb-6 report-avoid-break">
                    <h2 className="text-sm font-black text-blue-900 uppercase tracking-wide mb-1.5">
                        6. Mentor's Final Assessment
                    </h2>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xs text-xs space-y-2">
                        <p className="text-slate-800 leading-relaxed text-justify">
                            <strong className="font-bold text-slate-900">{studentFirstName}'s mistake profile is highly improvable.</strong> The largest opportunity is to recover marks lost through {dominantPattern.toLowerCase()} and incomplete reading of questions. {subjectName} requires focused practice on {chapterName}. The next test should prioritise <strong className="font-bold text-slate-900">accuracy first, then speed</strong>.
                        </p>
                        <p className="text-blue-900 font-bold">
                            Target for Next Test:{' '}
                            <span className="font-semibold text-slate-800">
                                Fewer avoidable errors • Better question reading • Stronger {chapterName} concepts • Improved formula recall • Controlled speed • More confident decision-making
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                PAGE 2 ONWARDS: COMPLETE QUESTION-BY-QUESTION SOLUTIONS
            ══════════════════════════════════════════════════════════════════ */}
            <div className="report-page-2 page-break pt-6" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
                {/* Mini Header on Solution Pages */}
                <div className="flex items-center justify-between pb-3 mb-6 border-b-2 border-slate-800">
                    <div className="flex items-center gap-3">
                        <img 
                            src="/images/icon/pathfinder-logo-hd.png" 
                            alt="Pathfinder Logo" 
                            className="h-7 object-contain"
                            style={{ imageRendering: '-webkit-optimize-contrast' }}
                            crossOrigin="anonymous"
                        />
                        <span className="text-[11px] text-slate-600 font-bold border-l border-slate-300 pl-3">
                            {subjectName} — {chapterName} Solutions Key
                        </span>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-bold">
                        Student: {studentName} ({rollNo})
                    </div>
                </div>

                <div className="mb-4">
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <Zap size={18} className="text-orange-600" />
                        7. Mistake Question Analysis & Solution Key
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Detailed review of {mistakeItems.length} incorrect / skipped questions with student reflections and step-by-step solutions.
                    </p>
                </div>

                <div className="space-y-4">
                    {(() => {
                        const incorrectList = list
                            .map((q, idx) => ({ ...q, originalIndex: idx }))
                            .filter(q => q.isIncorrect || (!q.isCorrect && q.isSkipped));

                        if (incorrectList.length === 0) {
                            return (
                                <div className="p-8 rounded-lg border border-emerald-300 bg-emerald-50 text-center text-emerald-800 font-bold text-sm">
                                    ✓ Outstanding Performance! All questions were answered correctly in this test.
                                </div>
                            );
                        }

                        return incorrectList.map((q) => {
                            const idx = q.originalIndex;
                            const isCorrect = q.isCorrect;
                            const isIncorrect = q.isIncorrect;
                            const isSkipped = q.isSkipped;
                            const reflection = reflections[q.id];

                            let statusBadge = (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                    <MinusCircle size={12} /> Skipped (0)
                                </span>
                            );
                            if (isCorrect) {
                                statusBadge = (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <CheckCircle size={12} /> Correct (+1)
                                    </span>
                                );
                            } else if (isIncorrect) {
                                statusBadge = (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase bg-red-100 text-red-800 border border-red-300">
                                        <XCircle size={12} /> Incorrect (0)
                                    </span>
                                );
                            }

                        return (
                            <div 
                                key={q.id || idx}
                                className="border border-slate-300 rounded-lg p-4 bg-white shadow-2xs"
                            >
                                {/* Top Question Header */}
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                                            {idx + 1}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Question {idx + 1}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {statusBadge}
                                    </div>
                                </div>

                                {/* Question Content */}
                                <div className="text-sm font-medium text-slate-900 mb-4 leading-relaxed">
                                    <MathRenderer html={q.question} />
                                </div>

                                {/* Question Images */}
                                {q.image_1 && (
                                    <div className="mb-4 flex justify-center">
                                        <img 
                                            src={q.image_1} 
                                            alt="Question Visual 1" 
                                            className="max-h-56 rounded border border-slate-200 object-contain"
                                            crossOrigin="anonymous"
                                        />
                                    </div>
                                )}
                                {q.image_2 && (
                                    <div className="mb-4 flex justify-center">
                                        <img 
                                            src={q.image_2} 
                                            alt="Question Visual 2" 
                                            className="max-h-56 rounded border border-slate-200 object-contain"
                                            crossOrigin="anonymous"
                                        />
                                    </div>
                                )}

                                {/* Options Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 text-xs">
                                    {q.options?.map((opt, optIdx) => {
                                        const isSelected = opt === q.userAnswer;
                                        const isActualCorrect = opt === q.correctAnswer;

                                        let optStyle = "bg-slate-50 border-slate-200 text-slate-700";
                                        let badge = null;

                                        if (isActualCorrect && isSelected) {
                                            optStyle = "bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold";
                                            badge = <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">✓ Your Answer (Correct)</span>;
                                        } else if (isActualCorrect) {
                                            optStyle = "bg-emerald-50/70 border-emerald-400 text-emerald-900 font-semibold";
                                            badge = <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">✓ Correct Answer</span>;
                                        } else if (isSelected) {
                                            optStyle = "bg-red-50 border-red-300 text-red-900 font-semibold";
                                            badge = <span className="text-[10px] font-black text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-300">✗ Your Answer</span>;
                                        }

                                        return (
                                            <div 
                                                key={optIdx} 
                                                className={`p-2.5 rounded border flex items-start justify-between gap-2 ${optStyle}`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className="font-bold opacity-60 shrink-0 mt-0.5">
                                                        {String.fromCharCode(65 + optIdx)}.
                                                    </span>
                                                    <div>
                                                        <MathRenderer html={opt} />
                                                    </div>
                                                </div>
                                                {badge && <div className="shrink-0">{badge}</div>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Mistake Reflection Pill */}
                                {reflection && (
                                    <div className="mb-3 p-2.5 rounded bg-orange-50 border border-orange-300 text-xs flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black uppercase tracking-wider text-orange-800 text-[10px]">
                                                Student Mistake Reason:
                                            </span>
                                            <span className="font-bold text-orange-900">
                                                {reflection}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                                            Self-Reviewed
                                        </span>
                                    </div>
                                )}

                                {/* Explanation / Solution */}
                                {q.explanation && (
                                    <div className="p-3.5 rounded bg-blue-50/60 border border-blue-200 text-xs text-blue-950">
                                        <span className="font-black uppercase tracking-wider text-blue-800 block mb-1">
                                            Detailed Explanation & Solution:
                                        </span>
                                        <div className="leading-relaxed">
                                            <MathRenderer html={q.explanation} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    });})()}
                </div>

                {/* Document Final Footer */}
                <div className="mt-12 pt-4 border-t border-slate-300 text-center text-xs text-slate-500 report-avoid-break">
                    <p className="font-black text-slate-800 uppercase tracking-widest text-[11px]">
                        Pathfinder Educational Centre — Academic Excellence & Continuous Evaluation
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                        This document is a computer-generated performance scorecard and solution key for student self-study.
                    </p>
                </div>
            </div>
        </div>
    );
});

ChapterTestDownloadableReport.displayName = 'ChapterTestDownloadableReport';

export default ChapterTestDownloadableReport;
