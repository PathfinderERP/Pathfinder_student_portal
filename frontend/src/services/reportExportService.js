import katex from 'katex';

/**
 * Parses raw HTML string and converts any KaTeX latex spans (<span data-latex="...">)
 * into pre-rendered KaTeX HTML.
 */
export const renderLatexInHtml = (html) => {
    if (!html) return '';
    try {
        return html.replace(/<span[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, (match, latex) => {
            try {
                const unescapedLatex = latex
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");
                const isDisplayMode = match.includes('data-display-mode="true"');
                return katex.renderToString(unescapedLatex, { throwOnError: false, displayMode: isDisplayMode });
            } catch (e) {
                return match;
            }
        });
    } catch (e) {
        return html;
    }
};

/**
 * Builds a complete standalone, print-perfect HTML document string for a test result.
 */
export const buildReportHtml = ({ test, data, user, report, sections }) => {
    const studentName = data?.student_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Student';
    const enrollment = data?.enrollment || user?.admission_number || user?.username || 'N/A';
    const batch = user?.assigned_batch || user?.batch || 'General Batch';
    const centre = user?.centre_name || user?.centre || 'Main Centre';
    const examName = test?.name || report?.testName || 'Examination Report';
    const examCode = test?.code || test?.test_code || 'N/A';
    const submittedDate = report?.submittedDate || data?.submitted_date || 'N/A';
    const duration = report?.totalTime || data?.duration_str || 'N/A';
    const timeSpent = report?.timeSpent || data?.time_spent_str || 'N/A';
    const dateStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    // Section Breakdown Rows
    const sectionRowsHtml = (sections || []).map((row, idx) => {
        const skipped = Math.max(0, row.total - row.correct - row.partial - row.incorrect);
        return `
            <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 7px 10px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
                <td style="padding: 7px 10px; font-weight: 800; color: #1e3a8a;">${row.section}</td>
                <td style="padding: 7px 8px; text-align: center; font-weight: bold;">${row.total}</td>
                <td style="padding: 7px 8px; text-align: center; font-weight: 800; color: #16a34a;">${row.correct}</td>
                <td style="padding: 7px 8px; text-align: center; font-weight: bold; color: #d97706;">${row.partial}</td>
                <td style="padding: 7px 8px; text-align: center; font-weight: 800; color: #dc2626;">${row.incorrect}</td>
                <td style="padding: 7px 8px; text-align: center; color: #94a3b8;">${skipped}</td>
                <td style="padding: 7px 8px; text-align: center; font-weight: bold; color: #15803d;">+${row.posM}</td>
                <td style="padding: 7px 8px; text-align: center; font-weight: bold; color: #b91c1c;">${parseFloat(row.negM) > 0 ? `-${row.negM}` : '0.00'}</td>
                <td style="padding: 7px 10px; text-align: center; font-weight: 900; color: #0f172a; background: #f1f5f9;">${row.marks} / ${row.totalM}</td>
                <td style="padding: 7px 10px; text-align: center; font-weight: 600; color: #475569;">${row.time}</td>
            </tr>
        `;
    }).join('');

    // Detailed Question-by-Question Sections
    const questionsSectionsHtml = (data?.all_section_names || []).map((secName, sIdx) => {
        const questions = data?.section_questions?.[secName] || [];
        if (!questions.length) return '';

        const qItemsHtml = questions.map((q, qIndex) => {
            const isGrace = q.is_wrong === true;
            const isCorrect = !isGrace && q.result === 'CA';
            const isPartial = !isGrace && q.result === 'PA';
            const isIncorrect = !isGrace && q.result === 'IA';
            const isSkipped = !isGrace && q.result === 'NA';

            let badgeHtml = '';
            if (isGrace) badgeHtml = `<span style="background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 10px;">✦ Grace Marks Awarded</span>`;
            else if (isCorrect) badgeHtml = `<span style="background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 10px;">✓ Correct</span>`;
            else if (isPartial) badgeHtml = `<span style="background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 10px;">~ Partial</span>`;
            else if (isIncorrect) badgeHtml = `<span style="background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 10px;">✗ Incorrect</span>`;
            else if (isSkipped) badgeHtml = `<span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 10px;">— Unattempted</span>`;

            // Render question options
            let optionsHtml = '';
            if (q.type !== 'INTEGER_TYPE' && q.type !== 'NUMERICAL' && q.options && q.options.length > 0) {
                const optItems = q.options.map((opt, oi) => {
                    const optLabel = ['A', 'B', 'C', 'D', 'E', 'F'][oi] || `${oi + 1}`;
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

                    let bg = '#ffffff';
                    let borderColor = '#e2e8f0';
                    let textColor = '#334155';
                    if (isYours && isCorrectOpt) { bg = '#f0fdf4'; borderColor = '#86efac'; textColor = '#14532d'; }
                    else if (isYours && !isCorrectOpt) { bg = '#fef2f2'; borderColor = '#fca5a5'; textColor = '#7f1d1d'; }
                    else if (isCorrectOpt) { bg = '#f0fdf4'; borderColor = '#bbf7d0'; textColor = '#166534'; }

                    const optContentHtml = renderLatexInHtml(opt.content || opt.text || '');

                    return `
                        <div style="background: ${bg}; border: 1px solid ${borderColor}; color: ${textColor}; padding: 7px 10px; border-radius: 6px; margin-bottom: 5px; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                            <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px;">
                                <strong style="color: #0f172a; min-width: 16px;">${optLabel}.</strong>
                                <div>${optContentHtml}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                                ${isYours ? `<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">YOUR ANSWER</span>` : ''}
                                ${isCorrectOpt ? `<span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">✓ CORRECT</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
                optionsHtml = `<div style="padding: 0 12px 10px 12px;">${optItems}</div>`;
            } else if (q.type === 'NUMERICAL' || q.type === 'INTEGER_TYPE') {
                optionsHtml = `
                    <div style="padding: 0 12px 10px 12px;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; display: flex; gap: 20px; font-size: 11.5px; font-weight: 600;">
                            <div>Your Answer: <strong style="color: #2563eb;">${q.user_answer || 'Skipped'}</strong></div>
                            <div>Correct Answer: <strong style="color: #16a34a;">${q.answer_from === q.answer_to ? q.answer_to : `${q.answer_from} - ${q.answer_to}`}</strong></div>
                        </div>
                    </div>
                `;
            }

            const qContentHtml = renderLatexInHtml(q.content || '');
            const solutionHtml = renderLatexInHtml(q.solution || '<p style="color: #94a3b8; font-style: italic;">No detailed solution provided.</p>');
            const earnedColor = q.earned > 0 ? '#16a34a' : q.earned < 0 ? '#dc2626' : '#0f172a';

            return `
                <div class="page-avoid" style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff; margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid;">
                    <!-- Question Header Bar -->
                    <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <strong style="color: #0f172a; font-size: 12px;">Q.${qIndex + 1}</strong>
                            <span style="color: #64748b;">Type: <b style="color: #334155; text-transform: uppercase;">${q.type}</b></span>
                            ${badgeHtml}
                        </div>
                        <div style="color: #475569; display: flex; align-items: center; gap: 10px; font-size: 11px;">
                            <span>Max: <b style="color: #16a34a;">+${q.correct_marks}</b></span>
                            <span>Neg: <b style="color: #dc2626;">-${q.negative_marks}</b></span>
                            <span style="background: #ffffff; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px;">
                                Marks: <b style="color: ${earnedColor}; font-weight: 800;">${q.earned}</b>
                            </span>
                            ${q.time_spent ? `<span style="color: #64748b;">Time: ${parseInt(q.time_spent / 60)}m ${q.time_spent % 60}s</span>` : ''}
                        </div>
                    </div>

                    <!-- Question Content -->
                    <div style="padding: 10px 12px; font-size: 12px; line-height: 1.5; color: #1e293b;">
                        ${qContentHtml}
                    </div>

                    <!-- Options / Numerical -->
                    ${optionsHtml}

                    <!-- Solution -->
                    <div style="background: #eff6ff; border-top: 1px solid #dbeafe; padding: 8px 12px; font-size: 11.5px;">
                        <div style="font-weight: 800; text-transform: uppercase; font-size: 10px; color: #1e40af; margin-bottom: 3px;">
                            Solution & Explanation:
                        </div>
                        <div style="color: #334155; line-height: 1.5;">
                            ${solutionHtml}
                        </div>
                    </div>

                    <!-- Reflection if exists -->
                    ${q.student_reflection ? `
                        <div style="background: #fffbeb; border-top: 1px solid #fef3c7; padding: 6px 12px; font-size: 11px; color: #92400e; display: flex; justify-content: space-between;">
                            <span><strong>Student Reflection:</strong> ${q.student_reflection}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        return `
            <div style="margin-top: 20px;">
                <div class="page-avoid" style="background: #1e293b; color: #ffffff; padding: 7px 12px; border-radius: 6px; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; margin-bottom: 12px; break-inside: avoid;">
                    <span>Section ${sIdx + 1}: ${secName}</span>
                    <span>${questions.length} Questions</span>
                </div>
                ${qItemsHtml}
            </div>
        `;
    }).join('');

    // Clean, sanitized filename title
    const cleanExam = examName.replace(/[\\/:*?"<>|]/g, '_').trim();
    const cleanStudent = studentName.replace(/[\\/:*?"<>|]/g, '_').trim();
    const cleanEnroll = (enrollment && enrollment !== 'N/A') ? enrollment.replace(/[\\/:*?"<>|]/g, '_').trim() : '';
    const documentTitle = cleanEnroll ? `${cleanExam}_${cleanEnroll}_${cleanStudent}_Report` : `${cleanExam}_${cleanStudent}_Report`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${documentTitle}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 12px;
            line-height: 1.4;
            padding: 24px;
        }
        @page {
            size: A4 portrait;
            margin: 10mm;
        }
        @media print {
            body { padding: 0; }
            .page-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
        }
        table { width: 100%; border-collapse: collapse; }
        img { max-width: 100%; height: auto; }
        .katex { font-size: 1.05em; }
    </style>
</head>
<body>
    <!-- Top Header -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px; font-weight: 900; color: #1d4ed8; text-transform: uppercase;">PATHFINDER</span>
                    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px;">STUDENT EXAMINATION PORTAL</span>
                </div>
                <h1 style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px;">Academic Performance & Result Report</h1>
                <p style="font-size: 11px; color: #64748b;">Comprehensive Scorecard & Detailed Question-by-Question Solution Key</p>
            </div>
            <div style="text-align: right;">
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 900; display: inline-block;">
                    RANK ${report?.rank || `${data?.rank || 1}/${data?.total_students || 1}`}
                </div>
                <div style="font-size: 9.5px; color: #94a3b8; margin-top: 4px;">Generated: ${dateStr}</div>
            </div>
        </div>

        <!-- Info Boxes -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-size: 11.5px;">
                <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">Student Profile</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span style="color: #64748b;">Name:</span> <strong style="color: #0f172a; text-transform: uppercase;">${studentName}</strong></div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span style="color: #64748b;">Roll / Enrollment:</span> <strong>${enrollment}</strong></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">Batch / Centre:</span> <span>${batch} (${centre})</span></div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-size: 11.5px;">
                <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">Test Information</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span style="color: #64748b;">Test Name:</span> <strong style="color: #0f172a;">${examName}</strong></div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span style="color: #64748b;">Test Code:</span> <strong style="text-transform: uppercase;">${examCode}</strong></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">Duration / Submitted:</span> <span>${duration} | ${submittedDate}</span></div>
            </div>
        </div>
    </div>

    <!-- Executive Metric Cards -->
    <div class="page-avoid" style="margin-bottom: 18px;">
        <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; margin-bottom: 8px;">
            Overall Performance Summary
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 10px;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px;">
                <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #166534;">Total Score</div>
                <div style="font-size: 18px; font-weight: 900; color: #15803d; margin-top: 2px;">${report?.isMissed ? '—' : `${report?.score || 0} / ${report?.totalMarks || 0}`}</div>
                <div style="font-size: 10px; font-weight: 700; color: #16a34a;">${report?.percentage || '0%'} Percentage</div>
            </div>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 12px;">
                <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #1e40af;">Rank & Percentile</div>
                <div style="font-size: 18px; font-weight: 900; color: #1d4ed8; margin-top: 2px;">${report?.isMissed ? '—' : (report?.rank || '—')}</div>
                <div style="font-size: 10px; font-weight: 700; color: #2563eb;">${report?.percentile || '0%'} Percentile</div>
            </div>
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px 12px;">
                <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #9a3412;">Accuracy</div>
                <div style="font-size: 18px; font-weight: 900; color: #c2410c; margin-top: 2px;">${report?.isMissed ? '—' : (report?.accuracy || '0%')}</div>
                <div style="font-size: 10px; font-weight: 700; color: #ea580c;">Attempt Accuracy</div>
            </div>
            <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 10px 12px;">
                <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #6b21a8;">Attempted</div>
                <div style="font-size: 18px; font-weight: 900; color: #7e22ce; margin-top: 2px;">${report?.attempted || '0/0'}</div>
                <div style="font-size: 10px; font-weight: 700; color: #9333ea;">Total Qs: ${report?.totalQuestions || 0}</div>
            </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; display: grid; grid-template-columns: repeat(4, 1fr); font-size: 11px;">
            <div>Correct: <strong style="color: #16a34a;">${report?.correct || 0} (${report?.positiveMarks || '+0.00'})</strong></div>
            <div>Incorrect: <strong style="color: #dc2626;">${report?.incorrect || 0} (${report?.negativeMarks || '-0.00'})</strong></div>
            <div>Partial / Skipped: <strong>${report?.partial || 0} / ${report?.unattempted || 0}</strong></div>
            <div>Time Spent: <strong>${timeSpent}</strong></div>
        </div>
    </div>

    <!-- Comparative Benchmarks -->
    <div class="page-avoid" style="margin-bottom: 18px;">
        <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; margin-bottom: 8px;">
            Comparative Benchmarks
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <div style="background: #f1f5f9; padding: 5px 10px; font-size: 10.5px; font-weight: 800; color: #475569;">SCORE ANALYSIS</div>
                <div style="padding: 8px 10px; font-size: 11.5px; display: flex; justify-content: space-between;">
                    <span>Topper: <b style="color: #16a34a;">${data?.top_score ?? 0}</b></span>
                    <span>Average: <b style="color: #64748b;">${data?.average_score ?? 0}</b></span>
                    <span>You: <b style="color: #2563eb;">${report?.isMissed ? '—' : data?.score ?? 0}</b></span>
                </div>
            </div>
            <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <div style="background: #f1f5f9; padding: 5px 10px; font-size: 10.5px; font-weight: 800; color: #475569;">ACCURACY ANALYSIS</div>
                <div style="padding: 8px 10px; font-size: 11.5px; display: flex; justify-content: space-between;">
                    <span>Topper: <b style="color: #16a34a;">${(data?.top_accuracy || 100).toFixed(2)}%</b></span>
                    <span>Average: <b style="color: #64748b;">${(data?.average_accuracy || 50).toFixed(2)}%</b></span>
                    <span>You: <b style="color: #2563eb;">${report?.isMissed ? '—' : `${data?.accuracy?.toFixed(2) || 0}%`}</b></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Section-wise Table -->
    <div class="page-avoid" style="margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; margin-bottom: 8px;">
            Section-Wise Performance Breakdown
        </div>
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
            <table>
                <thead>
                    <tr style="background: #f1f5f9; color: #334155; font-size: 9.5px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">
                        <th style="padding: 7px 10px; text-align: center;">#</th>
                        <th style="padding: 7px 10px; text-align: left;">Section</th>
                        <th style="padding: 7px 8px; text-align: center;">Total Qs</th>
                        <th style="padding: 7px 8px; text-align: center;">Correct</th>
                        <th style="padding: 7px 8px; text-align: center;">Partial</th>
                        <th style="padding: 7px 8px; text-align: center;">Incorrect</th>
                        <th style="padding: 7px 8px; text-align: center;">Skipped</th>
                        <th style="padding: 7px 8px; text-align: center;">+ve Marks</th>
                        <th style="padding: 7px 8px; text-align: center;">-ve Marks</th>
                        <th style="padding: 7px 10px; text-align: center;">Net Score</th>
                        <th style="padding: 7px 10px; text-align: center;">Time Spent</th>
                    </tr>
                </thead>
                <tbody>
                    ${sectionRowsHtml}
                </tbody>
            </table>
        </div>
    </div>

    <!-- Detailed Solutions -->
    <div style="border-top: 2px solid #0f172a; padding-top: 16px;">
        <h2 style="font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-bottom: 2px;">
            Detailed Question-by-Question Solutions & Analysis
        </h2>
        <p style="font-size: 11px; color: #64748b; margin-bottom: 16px;">Complete record of student responses, correct solutions, and step-by-step KaTeX explanations.</p>
        ${questionsSectionsHtml}
    </div>

    <!-- Footer -->
    <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 9.5px; color: #94a3b8; font-weight: 600;">
        <span>Pathfinder ERP - Student Examination System</span>
        <span>Confidential Academic Report</span>
        <span>${new Date().getFullYear()} © All Rights Reserved</span>
    </div>
</body>
</html>
    `;
};

/**
 * Triggers clean, instant background printing or saving as PDF via an isolated iframe.
 * Automatically synchronizes the window title so "Save as PDF" defaults to the correct clean exam & student filename.
 */
export const printOrSaveReport = ({ test, data, user, report, sections }) => {
    return new Promise((resolve) => {
        const studentName = data?.student_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Student';
        const enrollment = data?.enrollment || user?.admission_number || user?.username || '';
        const examName = test?.name || report?.testName || 'Examination Report';

        const cleanExam = examName.replace(/[\\/:*?"<>|]/g, '_').trim();
        const cleanStudent = studentName.replace(/[\\/:*?"<>|]/g, '_').trim();
        const cleanEnroll = (enrollment && enrollment !== 'N/A') ? enrollment.replace(/[\\/:*?"<>|]/g, '_').trim() : '';
        const pdfFileName = cleanEnroll ? `${cleanExam}_${cleanEnroll}_${cleanStudent}_Report` : `${cleanExam}_${cleanStudent}_Report`;

        const originalTitle = document.title;
        // Temporarily set document title for browser print / save-as-pdf dialog
        document.title = pdfFileName;

        const html = buildReportHtml({ test, data, user, report, sections });

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.title = pdfFileName;
        doc.close();

        // Wait briefly for KaTeX CSS and KaTeX fonts to bind
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.error("Iframe print error:", err);
            } finally {
                setTimeout(() => {
                    try {
                        document.body.removeChild(iframe);
                    } catch (e) {}
                    // Restore original window title
                    document.title = originalTitle;
                    resolve(true);
                }, 1500);
            }
        }, 400);
    });
};

