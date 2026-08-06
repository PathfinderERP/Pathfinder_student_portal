import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Search, Loader2, Eye, ChevronDown, ChevronUp, ChevronRight, Filter } from 'lucide-react';
import MathRenderer from '../../../components/MathRenderer';

const QuestionReviewItem = ({ q, index, isDarkMode, userAnswer }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isCorrect = userAnswer === q.correctAnswer;

    return (
        <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="flex gap-4">
                <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-[5px] font-bold text-sm ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}>
                    {index + 1}
                </div>
                <div className="flex-1">
                    <div className={`text-base font-medium mb-4 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        <MathRenderer html={q.question} />
                    </div>
                    <div className="grid gap-2">
                        {q.options.map((opt, i) => {
                            const isSelected = opt === userAnswer;
                            const isActualCorrect = opt === q.correctAnswer;
                            
                            let optClass = isDarkMode ? 'border-white/5 text-slate-300 bg-slate-900/50' : 'border-slate-200 text-slate-600 bg-slate-50';
                            if (isActualCorrect) {
                                optClass = isDarkMode ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-green-500 bg-green-50 text-green-700';
                            } else if (isSelected && !isCorrect) {
                                optClass = isDarkMode ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-red-500 bg-red-50 text-red-700';
                            }
                            
                            return (
                                <div key={i} className={`p-3 rounded-[5px] border text-sm flex items-start gap-3 ${optClass}`}>
                                    <span className="font-bold opacity-50 shrink-0 mt-0.5">{String.fromCharCode(65 + i)}</span>
                                    <div><MathRenderer html={opt} /></div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {q.explanation && (
                        <div className="mt-4">
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-[5px] transition-colors ${
                                    isDarkMode 
                                        ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' 
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                }`}
                            >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                {isExpanded ? 'Hide Explanation' : 'View Explanation'}
                            </button>
                            
                            {isExpanded && (
                                <div className={`mt-3 p-4 rounded-[5px] text-sm ${isDarkMode ? 'bg-slate-900 border border-white/5 text-slate-300' : 'bg-slate-50 border border-slate-200 text-slate-700'}`}>
                                    <MathRenderer html={q.explanation} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ChapterTestResultsAdmin({ isDarkMode }) {
    const { token, getApiUrl } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedCentre, setSelectedCentre] = useState('');
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedResult, setSelectedResult] = useState(null);
    
    // Filters for Student Detailed View
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedChapter, setSelectedChapter] = useState('');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [jumpToPage, setJumpToPage] = useState('');

    useEffect(() => {
        fetchResults();
    }, [token, getApiUrl]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${getApiUrl()}/api/chapter-tests/results/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResults(response.data);
        } catch (error) {
            console.error("Failed to fetch chapter test results", error);
        } finally {
            setLoading(false);
        }
    };

    const groupedStudents = useMemo(() => {
        const map = new Map();
        results.forEach(r => {
            const key = r.student || r.student_name; // Fallback to name if id not present
            if (!map.has(key)) {
                map.set(key, {
                    studentId: key,
                    studentName: r.first_name || r.student_name,
                    lastName: r.last_name || '',
                    email: r.email || r.student_name,
                    admissionNumber: r.admission_number,
                    centreName: r.centre_name || 'No Centre',
                    className: r.class_name || 'No Class',
                    targetExam: r.target_exam || 'No Exam',
                    totalTests: 0,
                    totalScore: 0,
                    totalQuestions: 0,
                    lastTestDate: r.created_at,
                    tests: []
                });
            }
            
            const studentData = map.get(key);
            studentData.totalTests += 1;
            studentData.totalScore += r.score || 0;
            studentData.totalQuestions += r.total_questions || 0;
            studentData.tests.push(r);
            
            if (new Date(r.created_at) > new Date(studentData.lastTestDate)) {
                studentData.lastTestDate = r.created_at;
            }
        });
        
        // Sort by last test date descending
        return Array.from(map.values()).sort((a, b) => new Date(b.lastTestDate) - new Date(a.lastTestDate));
    }, [results]);

    const uniqueClasses = [...new Set(groupedStudents.map(s => s.className))].filter(Boolean);
    const uniqueCentres = [...new Set(groupedStudents.map(s => s.centreName))].filter(Boolean);
    const uniqueExams = [...new Set(groupedStudents.map(s => s.targetExam))].filter(Boolean);

    const filteredStudents = groupedStudents.filter(s => {
        const matchSearch = s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchClass = selectedClass ? s.className === selectedClass : true;
        const matchCentre = selectedCentre ? s.centreName === selectedCentre : true;
        const matchExam = selectedExam ? s.targetExam === selectedExam : true;
        
        return matchSearch && matchClass && matchCentre && matchExam;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedClass, selectedCentre, selectedExam, selectedSubject, selectedChapter]);

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpToPage);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
        setJumpToPage('');
    };

    const uniqueSubjects = selectedStudent ? [...new Set(selectedStudent.tests.map(t => t.subject_name))].filter(Boolean) : [];
    const uniqueChapters = selectedStudent ? [...new Set(selectedStudent.tests.map(t => t.chapter_name))].filter(Boolean) : [];

    const filteredStudentTests = selectedStudent?.tests.filter(r => {
        const matchSearch = r.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.chapter_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchSubject = selectedSubject ? r.subject_name === selectedSubject : true;
        const matchChapter = selectedChapter ? r.chapter_name === selectedChapter : true;
        
        return matchSearch && matchSubject && matchChapter;
    }) || [];

    if (selectedResult) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSelectedResult(null)}
                            className={`p-2 rounded-[5px] ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
                        >
                            &larr; Back to List
                        </button>
                        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {selectedResult.student_name}'s Result: {selectedResult.subject_name} - {selectedResult.chapter_name}
                        </h2>
                    </div>
                </div>

                <div className={`p-6 rounded-[5px] border flex gap-8 items-center ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200'}`}>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Score</div>
                        <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedResult.score} / {selectedResult.total_questions}</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Time Taken</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Math.floor(selectedResult.time_taken_seconds / 60)}m {selectedResult.time_taken_seconds % 60}s</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Date</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{new Date(selectedResult.created_at).toLocaleString()}</div>
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Detailed Question Review</h3>
                    {selectedResult.question_data && selectedResult.question_data.length > 0 ? (
                        <div className="space-y-6">
                            {selectedResult.question_data.map((q, index) => {
                                const userAnswer = selectedResult.responses[q.id];
                                const isCorrect = userAnswer === q.correctAnswer;

                                return (
                                    <QuestionReviewItem 
                                        key={q.id || index}
                                        q={q}
                                        index={index}
                                        isDarkMode={isDarkMode}
                                        userAnswer={userAnswer}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`p-6 rounded-[5px] border text-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            Detailed question data was not saved for this attempt.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Chapter Test Results</h2>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Monitor student performance in practice chapter tests.</p>
                </div>
                {!selectedStudent && (
                    <button onClick={fetchResults} className={`p-2 rounded-[5px] ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}>
                        Refresh
                    </button>
                )}
            </div>

            {selectedStudent && (
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => {
                            setSelectedStudent(null);
                            setSearchTerm('');
                        }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-[5px] ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
                    >
                        &larr; Back to Students
                    </button>
                    <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selectedStudent.studentName}'s Tests
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className={`p-4 rounded-[5px] border flex flex-col md:flex-row gap-4 ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className="relative flex-1">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                        <input
                            type="text"
                            placeholder={selectedStudent ? "Search by subject or chapter..." : "Search by student name or roll no..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2 rounded-[5px] outline-none text-sm border ${isDarkMode ? 'bg-slate-900/50 border-white/5 text-white placeholder-slate-500 focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'}`}
                        />
                    </div>
                    
                    {!selectedStudent && (
                        <div className="flex gap-4">
                            <select 
                                value={selectedClass} 
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className={`px-4 py-2 rounded-[5px] outline-none text-sm border ${isDarkMode ? 'bg-slate-900/50 border-white/5 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                            >
                                <option value="">All Classes</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            
                            <select 
                                value={selectedCentre} 
                                onChange={(e) => setSelectedCentre(e.target.value)}
                                className={`px-4 py-2 rounded-[5px] outline-none text-sm border ${isDarkMode ? 'bg-slate-900/50 border-white/5 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                            >
                                <option value="">All Centres</option>
                                {uniqueCentres.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            
                            <select 
                                value={selectedExam} 
                                onChange={(e) => setSelectedExam(e.target.value)}
                                className={`px-4 py-2 rounded-[5px] outline-none text-sm border ${isDarkMode ? 'bg-slate-900/50 border-white/5 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                            >
                                <option value="">All Exams</option>
                                {uniqueExams.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {selectedStudent && (
                        <div className="flex gap-4">
                            <select 
                                value={selectedSubject} 
                                onChange={(e) => {
                                    setSelectedSubject(e.target.value);
                                    setSelectedChapter(''); // Reset chapter when subject changes
                                }}
                                className={`px-4 py-2 rounded-[5px] outline-none text-sm border ${isDarkMode ? 'bg-slate-900/50 border-white/5 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                            >
                                <option value="">All Subjects</option>
                                {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            
                            <select 
                                value={selectedChapter} 
                                onChange={(e) => setSelectedChapter(e.target.value)}
                                className={`px-4 py-2 rounded-[5px] outline-none text-sm border ${isDarkMode ? 'bg-slate-900/50 border-white/5 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                            >
                                <option value="">All Chapters</option>
                                {uniqueChapters
                                    .filter(c => {
                                        // Only show chapters for the selected subject if a subject is selected
                                        if (!selectedSubject) return true;
                                        const test = selectedStudent.tests.find(t => t.chapter_name === c);
                                        return test && test.subject_name === selectedSubject;
                                    })
                                    .map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className={`rounded-[5px] border overflow-hidden ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : !selectedStudent ? (
                    // SUMMARY VIEW
                    filteredStudents.length === 0 ? (
                        <div className={`text-center py-12 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            No students found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className={`text-xs uppercase font-bold ${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                    <tr>
                                        <th className="px-6 py-4">Student</th>
                                        <th className="px-6 py-4">Class & Centre</th>
                                        <th className="px-6 py-4">Target Exam</th>
                                        <th className="px-6 py-4">Total Tests Taken</th>
                                        <th className="px-6 py-4">Average Score</th>
                                        <th className="px-6 py-4">Last Test Date</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedStudents.map((student) => {
                                        const avgPercentage = student.totalQuestions > 0 ? (student.totalScore / student.totalQuestions) * 100 : 0;
                                        const fullName = `${student.studentName} ${student.lastName}`.trim();
                                        
                                        return (
                                            <tr 
                                                key={student.studentId} 
                                                onClick={() => {
                                                    setSelectedStudent(student);
                                                    setSearchTerm('');
                                                }}
                                                className={`border-b last:border-b-0 cursor-pointer transition-colors ${isDarkMode ? 'border-white/5 hover:bg-slate-800/80' : 'border-slate-100 hover:bg-slate-50'}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{fullName}</div>
                                                    <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{student.email}</div>
                                                    <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{student.admissionNumber || 'No Roll No'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.className}</div>
                                                    <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{student.centreName}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.targetExam}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.totalTests} tests</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-bold px-2 py-1 rounded-[4px] ${
                                                        avgPercentage >= 70 
                                                            ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                                                            : avgPercentage >= 40 
                                                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' 
                                                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {Math.round(avgPercentage)}%
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {new Date(student.lastTestDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <ChevronRight className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} size={20} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className={`p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'border-white/5 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                                            <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Jump to:</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max={totalPages}
                                                value={jumpToPage}
                                                onChange={(e) => setJumpToPage(e.target.value)}
                                                className={`w-16 px-2 py-1 text-sm rounded border outline-none ${isDarkMode ? 'bg-slate-800 border-white/10 text-white focus:border-blue-500/50' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
                                            />
                                            <button 
                                                type="submit"
                                                disabled={!jumpToPage}
                                                className={`px-3 py-1 text-sm font-medium rounded transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                            >
                                                Go
                                            </button>
                                        </form>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    // DETAILED STUDENT VIEW
                    filteredStudentTests.length === 0 ? (
                        <div className={`text-center py-12 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            No matching tests found for this student.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className={`text-xs uppercase font-bold ${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                    <tr>
                                        <th className="px-6 py-4">Subject & Chapter</th>
                                        <th className="px-6 py-4">Score</th>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudentTests.map((result) => (
                                        <tr key={result.id} className={`border-b last:border-b-0 ${isDarkMode ? 'border-white/5 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                                            <td className="px-6 py-4">
                                                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{result.subject_name}</div>
                                                <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{result.chapter_name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-bold px-2 py-1 rounded-[4px] ${
                                                    result.score / result.total_questions >= 0.7 
                                                        ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                                                        : result.score / result.total_questions >= 0.4 
                                                            ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' 
                                                            : 'bg-red-500/20 text-red-600 dark:text-red-400'
                                                }`}>
                                                    {result.score}/{result.total_questions}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {Math.floor(result.time_taken_seconds / 60)}m {result.time_taken_seconds % 60}s
                                            </td>
                                            <td className={`px-6 py-4 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {new Date(result.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedResult(result);
                                                    }}
                                                    className={`p-2 rounded-[5px] transition-colors ${isDarkMode ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
