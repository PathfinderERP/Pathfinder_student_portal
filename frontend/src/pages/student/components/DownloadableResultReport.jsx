import React, { forwardRef } from 'react';
import MathRenderer from '../../../components/MathRenderer';
import { 
    Award, Trophy, CheckCircle, XCircle, MinusCircle, 
    Clock, Target, Zap, AlertTriangle, HelpCircle, Check, X
} from 'lucide-react';

const DownloadableResultReport = forwardRef(({ 
    test, 
    data, 
    user,
    report, 
    sections, 
    scoreCompare, 
    accuracyCompare 
}, ref) => {
    if (!data) return null;

    const studentName = data.student_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Student';
    const enrollment = data.enrollment || user?.admission_number || user?.username || 'N/A';
    const batch = user?.assigned_batch || user?.batch || 'General Batch';
    const centre = user?.centre_name || user?.centre || 'Main Centre';
    const examName = test?.name || report?.testName || 'Examination Report';
    const examCode = test?.code || test?.test_code || 'N/A';
    const submittedDate = report?.submittedDate || data.submitted_date || 'N/A';
    const duration = report?.totalTime || data.duration_str || 'N/A';
    const timeSpent = report?.timeSpent || data.time_spent_str || 'N/A';

    return (
        <div 
            ref={ref} 
            id="downloadable-result-report"
            className="bg-white text-slate-900 p-8 max-w-5xl mx-auto text-left font-sans"
            style={{ minWidth: '800px', color: '#0f172a', backgroundColor: '#ffffff' }}
        >
            <style>{`
                @media print {
                    body {
                        background-color: #ffffff !important;
                        color: #0f172a !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print { display: none !important; }
                    .page-break { page-break-before: always; break-before: page; }
                    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
                }
                .report-avoid-break {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
            `}</style>

            {/* ── 1. Institute & Report Header ── */}
            <div className="border-b-2 border-slate-800 pb-5 mb-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black tracking-tight text-blue-700 uppercase">Pathfinder</span>
                            <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                Student Examination Portal
                            </span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
                            Academic Performance & Result Report
                        </h1>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            Comprehensive Scorecard & Detailed Question-by-Question Solution Key
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black">
                            <Award size={16} />
                            <span>RANK {report?.rank || `${data.rank}/${data.total_students || 1}`}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            Generated on: {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                    </div>
                </div>

                {/* Info Boxes */}
                <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-200">
                    {/* Student Info */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                            Student Profile
                        </p>
                        <div className="flex justify-between">
                            <span className="font-semibold text-slate-500">Student Name:</span>
                            <span className="font-black text-slate-800 uppercase">{studentName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold text-slate-500">Enrollment / Roll No:</span>
                            <span className="font-bold text-slate-800">{enrollment}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold text-slate-500">Batch / Centre:</span>
                            <span className="font-bold text-slate-700">{batch} ({centre})</span>
                        </div>
                    </div>

                    {/* Test Info */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                            Examination Details
                        </p>
                        <div className="flex justify-between">
                            <span className="font-semibold text-slate-500">Test Name:</span>
                            <span className="font-black text-slate-800 truncate max-w-[240px] text-right" title={examName}>{examName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold text-slate-500">Test Code:</span>
                            <span className="font-bold text-slate-800 uppercase">{examCode}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold text-slate-500">Duration / Submitted:</span>
                            <span className="font-bold text-slate-700">{duration} | {submittedDate}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2. Executive Performance Highlights ── */}
            <div className="mb-6 report-avoid-break">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-3 flex items-center gap-1.5">
                    <Trophy size={14} className="text-blue-600" />
                    Overall Performance Summary
                </h2>
                
                <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-emerald-50/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Total Score</p>
                        <p className="text-xl font-black text-emerald-700 mt-1">
                            {report?.isMissed ? '—' : `${report?.score || 0} / ${report?.totalMarks || 0}`}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                            {report?.isMissed ? 'Missed Test' : `${report?.percentage || '0%'} Percentage`}
                        </p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-blue-50/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-800">Rank & Percentile</p>
                        <p className="text-xl font-black text-blue-700 mt-1">
                            {report?.isMissed ? '—' : (report?.rank || '—')}
                        </p>
                        <p className="text-[10px] font-bold text-blue-600 mt-0.5">
                            {report?.isMissed ? '—' : `${report?.percentile || '0%'} Percentile`}
                        </p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-orange-50/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-orange-800">Accuracy</p>
                        <p className="text-xl font-black text-orange-700 mt-1">
                            {report?.isMissed ? '—' : (report?.accuracy || '0%')}
                        </p>
                        <p className="text-[10px] font-bold text-orange-600 mt-0.5">
                            Based on attempted questions
                        </p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-purple-50/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-purple-800">Attempted</p>
                        <p className="text-xl font-black text-purple-700 mt-1">
                            {report?.attempted || '0 / 0'}
                        </p>
                        <p className="text-[10px] font-bold text-purple-600 mt-0.5">
                            Total Questions: {report?.totalQuestions || 0}
                        </p>
                    </div>
                </div>

                {/* Sub Stats Row */}
                <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center justify-between px-2">
                        <span className="font-semibold text-slate-500">Correct (+ve):</span>
                        <span className="font-black text-emerald-600">{report?.correct || 0} ({report?.positiveMarks || '+0.00'})</span>
                    </div>
                    <div className="flex items-center justify-between px-2 border-l border-slate-200">
                        <span className="font-semibold text-slate-500">Incorrect (-ve):</span>
                        <span className="font-black text-red-600">{report?.incorrect || 0} ({report?.negativeMarks || '-0.00'})</span>
                    </div>
                    <div className="flex items-center justify-between px-2 border-l border-slate-200">
                        <span className="font-semibold text-slate-500">Partial / Skipped:</span>
                        <span className="font-black text-slate-700">{report?.partial || 0} / {report?.unattempted || 0}</span>
                    </div>
                    <div className="flex items-center justify-between px-2 border-l border-slate-200">
                        <span className="font-semibold text-slate-500">Time Spent:</span>
                        <span className="font-black text-slate-800">{timeSpent}</span>
                    </div>
                </div>
            </div>

            {/* ── 3. Benchmark Comparison ── */}
            <div className="mb-6 report-avoid-break">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-3 flex items-center gap-1.5">
                    <Target size={14} className="text-indigo-600" />
                    Comparative Analysis vs Benchmarks
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-[11px] font-black uppercase text-slate-700">
                            Score Comparison
                        </div>
                        <div className="p-3 divide-y divide-slate-100 text-xs">
                            <div className="flex justify-between py-1.5">
                                <span className="font-semibold text-slate-500">Topper Score:</span>
                                <span className="font-black text-emerald-600">{data.top_score ?? 0}</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="font-semibold text-slate-500">Batch Average Score:</span>
                                <span className="font-black text-slate-600">{data.average_score ?? 0}</span>
                            </div>
                            <div className="flex justify-between py-1.5 bg-blue-50/50 px-2 rounded">
                                <span className="font-black text-blue-800">Your Score:</span>
                                <span className="font-black text-blue-700">{report?.isMissed ? '—' : data.score ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-[11px] font-black uppercase text-slate-700">
                            Accuracy Comparison
                        </div>
                        <div className="p-3 divide-y divide-slate-100 text-xs">
                            <div className="flex justify-between py-1.5">
                                <span className="font-semibold text-slate-500">Topper Accuracy:</span>
                                <span className="font-black text-emerald-600">{(data.top_accuracy || 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="font-semibold text-slate-500">Batch Average Accuracy:</span>
                                <span className="font-black text-slate-600">{(data.average_accuracy || 50).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between py-1.5 bg-blue-50/50 px-2 rounded">
                                <span className="font-black text-blue-800">Your Accuracy:</span>
                                <span className="font-black text-blue-700">{report?.isMissed ? '—' : `${data.accuracy?.toFixed(2) || 0}%`}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 4. Section-Wise Breakdown Table ── */}
            <div className="mb-8 report-avoid-break">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-3 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-600" />
                    Section-Wise Performance Breakdown
                </h2>
                <div className="border border-slate-300 rounded-lg overflow-hidden shadow-none">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-300">
                                <th className="py-2.5 px-3 text-center">#</th>
                                <th className="py-2.5 px-3">Section Name</th>
                                <th className="py-2.5 px-2 text-center">Total Qs</th>
                                <th className="py-2.5 px-2 text-center">Correct</th>
                                <th className="py-2.5 px-2 text-center">Partial</th>
                                <th className="py-2.5 px-2 text-center">Incorrect</th>
                                <th className="py-2.5 px-2 text-center">Skipped</th>
                                <th className="py-2.5 px-2 text-center">+ve Marks</th>
                                <th className="py-2.5 px-2 text-center">-ve Marks</th>
                                <th className="py-2.5 px-3 text-center">Net Score</th>
                                <th className="py-2.5 px-3 text-center">Time Spent</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {sections?.map((row, idx) => {
                                const skipped = Math.max(0, row.total - row.correct - row.partial - row.incorrect);
                                return (
                                    <tr key={row.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                        <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                                        <td className="py-2 px-3 font-black text-blue-950">{row.section}</td>
                                        <td className="py-2 px-2 text-center font-bold text-slate-700">{row.total}</td>
                                        <td className="py-2 px-2 text-center font-black text-emerald-600">{row.correct}</td>
                                        <td className="py-2 px-2 text-center font-bold text-amber-600">{row.partial}</td>
                                        <td className="py-2 px-2 text-center font-black text-red-600">{row.incorrect}</td>
                                        <td className="py-2 px-2 text-center font-bold text-slate-400">{skipped}</td>
                                        <td className="py-2 px-2 text-center font-bold text-emerald-700">+{row.posM}</td>
                                        <td className="py-2 px-2 text-center font-bold text-red-700">{parseFloat(row.negM) > 0 ? `-${row.negM}` : '0.00'}</td>
                                        <td className="py-2 px-3 text-center font-black text-slate-900 bg-slate-100/50">
                                            {row.marks} / {row.totalM}
                                        </td>
                                        <td className="py-2 px-3 text-center font-semibold text-slate-600">{row.time}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── 5. Detailed Question-Wise Solutions ── */}
            <div className="mt-8 pt-6 border-t-2 border-slate-800">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
                            Detailed Question-by-Question Solutions & Analysis
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                            Complete record of student responses, correct solutions, and step-by-step explanations.
                        </p>
                    </div>
                </div>

                {/* Section Questions Loop */}
                {data.all_section_names?.map((secName, sIdx) => {
                    const questions = data.section_questions?.[secName] || [];
                    if (questions.length === 0) return null;

                    return (
                        <div key={secName} className="mb-8">
                            {/* Section Subheader */}
                            <div className="bg-slate-800 text-white px-4 py-2 rounded-t-lg flex items-center justify-between text-xs font-black uppercase tracking-wider mb-4 report-avoid-break">
                                <span>Section {sIdx + 1}: {secName}</span>
                                <span>{questions.length} Questions</span>
                            </div>

                            <div className="space-y-6">
                                {questions.map((q, qIndex) => {
                                    const isGrace = q.is_wrong === true;
                                    const isCorrect = !isGrace && q.result === 'CA';
                                    const isPartial = !isGrace && q.result === 'PA';
                                    const isIncorrect = !isGrace && q.result === 'IA';
                                    const isSkipped = !isGrace && q.result === 'NA';

                                    return (
                                        <div 
                                            key={q.id || qIndex} 
                                            className="report-avoid-break border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm"
                                        >
                                            {/* Question Header */}
                                            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-slate-900">Q.{qIndex + 1}</span>
                                                    <span className="font-bold text-slate-500 text-[11px]">
                                                        Type: <span className="uppercase text-slate-800 font-black">{q.type}</span>
                                                    </span>
                                                    
                                                    {/* Status Badge */}
                                                    {isGrace && (
                                                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-black text-[10px] border border-amber-300">
                                                            ✦ Grace Marks Awarded
                                                        </span>
                                                    )}
                                                    {isCorrect && (
                                                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300">
                                                            ✓ Correct
                                                        </span>
                                                    )}
                                                    {isPartial && (
                                                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-black text-[10px] border border-amber-300">
                                                            ~ Partial
                                                        </span>
                                                    )}
                                                    {isIncorrect && (
                                                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-black text-[10px] border border-red-300">
                                                            ✗ Incorrect
                                                        </span>
                                                    )}
                                                    {isSkipped && (
                                                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-black text-[10px]">
                                                            — Unattempted
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-[11px] font-bold text-slate-600 flex items-center gap-3">
                                                    <span>Max: <b className="text-emerald-700">+{q.correct_marks}</b></span>
                                                    <span>Neg: <b className="text-red-700">-{q.negative_marks}</b></span>
                                                    <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
                                                        Marks: <b className={q.earned > 0 ? 'text-emerald-700 font-black' : q.earned < 0 ? 'text-red-700 font-black' : 'text-slate-800'}>{q.earned}</b>
                                                    </span>
                                                    {q.time_spent ? (
                                                        <span className="text-slate-500">
                                                            Time: {parseInt(q.time_spent / 60)}m {q.time_spent % 60}s
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {/* Question Content */}
                                            <div className="p-4 text-xs leading-relaxed text-slate-800">
                                                <MathRenderer html={q.content} className="text-slate-800 font-normal" />
                                            </div>

                                            {/* Options for MCQ / Multiple */}
                                            {q.type !== 'INTEGER_TYPE' && q.type !== 'NUMERICAL' && q.options && q.options.length > 0 && (
                                                <div className="px-4 pb-3 space-y-1.5 text-xs">
                                                    {q.options.map((opt, oi) => {
                                                        const optLabel = ['A','B','C','D','E','F'][oi] || `${oi + 1}`;
                                                        const uAnsOpts = Array.isArray(q.user_answer) 
                                                            ? q.user_answer.map(x => String(x).toLowerCase().trim()) 
                                                            : (q.user_answer ? [String(q.user_answer).toLowerCase().trim()] : []);
                                                        
                                                        const allOptIds = (q.options || []).map((o, i) => String(o.id || o._id || i).toLowerCase().trim());
                                                        const anyIdMatch = uAnsOpts.some(ans => allOptIds.includes(ans));
                                                        const optIdStr = String(opt.id || opt._id || oi).toLowerCase().trim();

                                                        const isYours = anyIdMatch
                                                            ? uAnsOpts.includes(optIdStr)
                                                            : uAnsOpts.some(ans => 
                                                                ans === optIdStr || 
                                                                ans === optLabel.toLowerCase() || 
                                                                ans === String(oi + 1) ||
                                                                (opt.content && ans === String(opt.content).replace(/(<([^>]+)>)/gi, "").toLowerCase().trim())
                                                            );

                                                        const correctOptionsArr = Array.isArray(q.correct_options) ? q.correct_options : [];
                                                        const isCorrectOpt = correctOptionsArr.some(c => String(c).toLowerCase() === String(opt.id).toLowerCase()) || opt.isCorrect;

                                                        let rowStyle = "bg-white border-slate-200 text-slate-700";
                                                        if (isYours && isCorrectOpt) rowStyle = "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold";
                                                        else if (isYours && !isCorrectOpt) rowStyle = "bg-red-50 border-red-400 text-red-950 font-semibold";
                                                        else if (isCorrectOpt) rowStyle = "bg-emerald-50/60 border-emerald-300 text-emerald-900";

                                                        return (
                                                            <div 
                                                                key={opt.id || oi} 
                                                                className={`p-2.5 rounded border flex items-center justify-between text-xs ${rowStyle}`}
                                                            >
                                                                <div className="flex items-start gap-2 max-w-[85%]">
                                                                    <span className="font-black text-slate-800">{optLabel}.</span>
                                                                    <MathRenderer html={opt.content || opt.text} />
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {isYours && (
                                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                                                                            Your Answer
                                                                        </span>
                                                                    )}
                                                                    {isCorrectOpt && (
                                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase flex items-center gap-0.5">
                                                                            <Check size={12} /> Correct Option
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Numerical / Integer Answer Display */}
                                            {(q.type === 'NUMERICAL' || q.type === 'INTEGER_TYPE') && (
                                                <div className="px-4 pb-3">
                                                    <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center gap-6 text-xs font-semibold">
                                                        <div>Your Answer: <span className="font-black text-blue-700">{q.user_answer || 'Skipped'}</span></div>
                                                        <div>Correct Answer: <span className="font-black text-emerald-700">{q.answer_from === q.answer_to ? q.answer_to : `${q.answer_from} - ${q.answer_to}`}</span></div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Solution Block */}
                                            <div className="px-4 py-3 bg-blue-50/40 border-t border-slate-200 text-xs">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-blue-900 mb-1 flex items-center gap-1">
                                                    <span>Solution & Explanation:</span>
                                                </p>
                                                <div className="text-slate-700 leading-relaxed">
                                                    <MathRenderer html={q.solution || '<p className="italic text-slate-400">No step-by-step explanation provided.</p>'} />
                                                </div>
                                            </div>

                                            {/* Student Reflection (if exists) */}
                                            {q.student_reflection && (
                                                <div className="px-4 py-2 bg-amber-50/60 border-t border-amber-200 text-[11px] flex items-center justify-between text-amber-900">
                                                    <span className="font-bold">Student Mistake Reflection:</span>
                                                    <span className="font-black uppercase">{q.student_reflection}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── 6. Official Footer ── */}
            <div className="mt-10 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-400 font-semibold flex justify-between items-center">
                <span>Pathfinder ERP - Student Examination System</span>
                <span>Confidential Academic Report • Page End</span>
                <span>{new Date().getFullYear()} © All Rights Reserved</span>
            </div>
        </div>
    );
});

DownloadableResultReport.displayName = 'DownloadableResultReport';

export default DownloadableResultReport;
