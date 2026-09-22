import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    Search, BookOpen, Eye, FileText, ChevronRight, ChevronLeft,
    Loader2, X, Maximize2, Minimize2, RefreshCw, 
    PlayCircle, ExternalLink, Sparkles, Layers, 
    CheckCircle2, Clock, Atom, ArrowRight,
    FlaskConical, Calculator, Dna, Cpu, Zap, Folder, FolderOpen,
    HelpCircle, BookMarked, Compass, Filter, Bookmark,
    Trophy, Award, CheckCircle, XCircle, RotateCcw, Brain,
    FastForward, Target, BarChart3
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { logVideoActivity } from '../../../services/useActivityTracker';
import MathRenderer from '../../../components/MathRenderer';

const getSubjectDetails = (subject) => {
    const s = (subject || '').toLowerCase();
    if (s.includes('physic')) {
        return {
            icon: Atom,
            label: 'Physics',
            code: 'PHY',
            iconGradient: 'from-blue-500 to-cyan-500',
            iconColor: 'text-blue-500',
            badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
    }
    if (s.includes('chem')) {
        return {
            icon: FlaskConical,
            label: 'Chemistry',
            code: 'CHEM',
            iconGradient: 'from-purple-500 to-indigo-500',
            iconColor: 'text-purple-500',
            badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
    }
    if (s.includes('math')) {
        return {
            icon: Calculator,
            label: 'Mathematics',
            code: 'MATH',
            iconGradient: 'from-emerald-500 to-teal-500',
            iconColor: 'text-emerald-500',
            badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
    }
    if (s.includes('bio') || s.includes('botan') || s.includes('zool')) {
        return {
            icon: Dna,
            label: s.includes('botan') ? 'Botany' : s.includes('zool') ? 'Zoology' : 'Biology',
            code: 'BIO',
            iconGradient: 'from-rose-500 to-pink-500',
            iconColor: 'text-rose-500',
            badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
    }
    if (s.includes('eng') || s.includes('lit')) {
        return {
            icon: BookOpen,
            label: 'English',
            code: 'ENG',
            iconGradient: 'from-amber-500 to-orange-500',
            iconColor: 'text-amber-500',
            badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
    }
    if (s.includes('comp') || s.includes('it') || s.includes('code')) {
        return {
            icon: Cpu,
            label: 'Computer Science',
            code: 'CS',
            iconGradient: 'from-indigo-500 to-blue-500',
            iconColor: 'text-indigo-500',
            badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
    }
    return {
        icon: Sparkles,
        label: subject || 'General',
        code: 'GEN',
        iconGradient: 'from-orange-500 to-amber-500',
        iconColor: 'text-orange-500',
        badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    };
};

const StudyMaterials = ({ cache, setCache, studentClass, initialType = 'VIDEO' }) => {
    const { getApiUrl, token, user } = useAuth();
    const { isDarkMode } = useTheme();

    const assignedClass = studentClass && studentClass !== 'N/A' ? studentClass.trim() : null;

    const materialsRef = useRef(cache?.loaded ? cache.data : []);
    const [materials, setMaterials] = useState(materialsRef.current);
    const [isLoading, setIsLoading] = useState(!cache?.loaded);

    const [searchQuery, setSearchQuery] = useState('');
    const [chapterSearchQuery, setChapterSearchQuery] = useState('');
    const [activeContentType, setActiveContentType] = useState(initialType);
    const [activeSubject, setActiveSubject] = useState(null);
    const [activeChapter, setActiveChapter] = useState(null);
    const [activeTopic, setActiveTopic] = useState(null);

    const studentSession = user?.academic_session || '';
    const studentSection = user?.section || '';

    // Sync with sidebar navigation
    useEffect(() => {
        if (initialType) {
            setActiveContentType(initialType);
        }
    }, [initialType]);

    // View Modal State
    const [selectedItem, setSelectedItem] = useState(null);
    const [viewPage, setViewPage] = useState(1); // 1 for Info, 2 for Content
    const [isFullScreen, setIsFullScreen] = useState(false);

    // AI Quiz Generator Modal State
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [quizItem, setQuizItem] = useState(null);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizData, setQuizData] = useState(null);
    const [quizCurrentIdx, setQuizCurrentIdx] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizSkipped, setQuizSkipped] = useState({});
    const [quizReviewFilter, setQuizReviewFilter] = useState('ALL');
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizNumQuestions, setQuizNumQuestions] = useState(5);
    const [quizDifficulty, setQuizDifficulty] = useState('MEDIUM');
    const [quizTimerDuration, setQuizTimerDuration] = useState(60); // seconds per question (30, 45, 60, 90, 0 for off)
    const [quizTimeLeft, setQuizTimeLeft] = useState(60);
    const [quizTotalElapsed, setQuizTotalElapsed] = useState(0);
    const [quizQuestionTimes, setQuizQuestionTimes] = useState({});
    const [quizConfigMode, setQuizConfigMode] = useState(false);

    const quizCurrentIdxRef = useRef(quizCurrentIdx);
    quizCurrentIdxRef.current = quizCurrentIdx;

    const quizDataRef = useRef(quizData);
    quizDataRef.current = quizData;

    // YouTube IFrame Player API
    const ytPlayerRef = useRef(null);
    const ytContainerRef = useRef(null);
    const ytVideoStartTime = useRef(null);

    const getYouTubeVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    // Load YouTube IFrame API script once
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
        }
    }, []);

    // Initialize/re-create YouTube player when a YT video is shown
    useEffect(() => {
        if (
            viewPage !== 2 ||
            !selectedItem?.video_link ||
            !ytContainerRef.current
        ) return;

        const videoId = getYouTubeVideoId(selectedItem.video_link);
        if (!videoId) return;

        const initPlayer = () => {
            if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
                ytPlayerRef.current.destroy();
            }
            ytVideoStartTime.current = Date.now();
            ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
                videoId,
                width: '100%',
                height: '100%',
                playerVars: { autoplay: 1, rel: 0 },
                events: {
                    onStateChange: (event) => {
                        const elapsed = Math.floor((Date.now() - ytVideoStartTime.current) / 1000);
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            ytVideoStartTime.current = Date.now();
                            logVideoActivity('play', selectedItem.id, selectedItem.name, 0);
                        } else if (event.data === window.YT.PlayerState.PAUSED) {
                            logVideoActivity('pause', selectedItem.id, selectedItem.name, elapsed);
                        } else if (event.data === window.YT.PlayerState.ENDED) {
                            logVideoActivity('complete', selectedItem.id, selectedItem.name, elapsed);
                        }
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            const prev = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (prev) prev();
                initPlayer();
            };
        }

        return () => {
            if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
                ytPlayerRef.current.destroy();
                ytPlayerRef.current = null;
            }
        };
    }, [viewPage, selectedItem?.video_link]);

    const getYouTubeThumbnail = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
        }
        if (url?.includes('vimeo.com')) {
            return 'https://f.vimeocdn.com/images_v6/default_640.png';
        }
        return null;
    };

    const fetchMaterials = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);

        const activeToken = token || localStorage.getItem('auth_token');

        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/library/`, {
                headers: activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}
            });

            const data = Array.isArray(response.data) ? response.data : (response.data.results || []);

            const isDataSame = JSON.stringify(data) === JSON.stringify(materialsRef.current);
            if (!isDataSame) {
                materialsRef.current = data;
                setMaterials(data);
                if (setCache) {
                    setCache({ data: data, loaded: true });
                }
            }

        } catch (error) {
            console.error("Failed to fetch study materials", error);
            // Only set fallback data if we don't have any cached materials
            if (!materialsRef.current || materialsRef.current.length === 0) {
                const mockData = [
                    { id: 1, name: 'Physics Module: Kinematics & 2D Motion', subject_name: 'Physics', description: 'Comprehensive guide covering 1D and 2D motion with worked examples and numerical problems.', thumbnail: null, pdf_file: '#' },
                    { id: 2, name: 'Organic Chemistry: Hydrocarbons Lecture', subject_name: 'Chemistry', description: 'Video introduction to carbon compounds, functional groups and reaction mechanisms.', thumbnail: null, video_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
                    { id: 3, name: 'Calculus: Integration Techniques & Applications', subject_name: 'Mathematics', description: 'Advanced methods for solving complex definite & indefinite integrals.', thumbnail: null, pdf_file: '#' },
                    { id: 4, name: 'Biology: Cell Structure & Molecular Biology', subject_name: 'Biology', description: 'Detailed analysis of plant and animal cell components, mitosis, and DNA replication.', thumbnail: null, pdf_file: '#' },
                    { id: 5, name: 'Modern Physics & Quantum Theory', subject_name: 'Physics', description: 'Key concepts of quantum mechanics, photoelectric effect and atomic structures.', thumbnail: null, video_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
                ];
                materialsRef.current = mockData;
                setMaterials(mockData);
            }
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    }, [getApiUrl, token, setCache]);

    useEffect(() => {
        if (!cache?.loaded) {
            fetchMaterials(false);
        } else {
            fetchMaterials(true);
        }
    }, [fetchMaterials, cache?.loaded]);

    // Handle AI Document Quiz Generation
    const handleStartQuiz = async (item, numQ = quizNumQuestions, diff = quizDifficulty) => {
        setQuizItem(item);
        setQuizModalOpen(true);
        setQuizConfigMode(false);
        setQuizLoading(true);
        setQuizData(null);
        setQuizCurrentIdx(0);
        setQuizAnswers({});
        setQuizSkipped({});
        setQuizReviewFilter('ALL');
        setQuizSubmitted(false);
        setQuizTotalElapsed(0);
        setQuizQuestionTimes({});
        setQuizTimeLeft(quizTimerDuration > 0 ? quizTimerDuration : 0);

        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            const res = await axios.post(`${apiUrl}/api/student/ai-mentor/generate-document-quiz/`, {
                material_name: item.name,
                subject_name: item.subject_name,
                chapter_name: item.chapter_name,
                topic_name: item.topic_name,
                description: item.description,
                file_url: item.pdf_file || item.dpp_file,
                num_questions: numQ,
                difficulty: diff
            }, {
                headers: activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}
            });

            if (res.data && res.data.questions && res.data.questions.length > 0) {
                setQuizData(res.data);
                toast.success(`Generated ${res.data.questions.length} AI Quiz Questions!`, { icon: '🎯' });
            } else {
                toast.error("Failed to generate quiz questions. Please try again.");
                setQuizModalOpen(false);
            }
        } catch (err) {
            console.error("Quiz generation error:", err);
            const errMsg = err.response?.data?.error || "Could not generate AI quiz from this document.";
            toast.error(errMsg);
            setQuizModalOpen(false);
        } finally {
            setQuizLoading(false);
        }
    };

    // Open Quiz Config Modal
    const handleOpenQuizConfig = (item) => {
        setQuizItem(item);
        setQuizModalOpen(true);
        setQuizConfigMode(true);
        setQuizData(null);
        setQuizAnswers({});
        setQuizSkipped({});
        setQuizReviewFilter('ALL');
        setQuizSubmitted(false);
    };

    // Per-question countdown reset on index change
    useEffect(() => {
        if (!quizModalOpen || !quizData || quizLoading || quizSubmitted) return;
        setQuizTimeLeft(quizTimerDuration > 0 ? quizTimerDuration : 0);
    }, [quizCurrentIdx, quizTimerDuration]);

    // Active Quiz Timer interval
    useEffect(() => {
        if (!quizModalOpen || !quizData || quizLoading || quizSubmitted || quizConfigMode) return;

        const timer = setInterval(() => {
            setQuizTotalElapsed(prev => prev + 1);

            const currIdx = quizCurrentIdxRef.current;
            const questions = quizDataRef.current?.questions || [];
            const currQ = questions[currIdx];
            if (currQ) {
                setQuizQuestionTimes(prev => ({
                    ...prev,
                    [currQ.id]: (prev[currQ.id] || 0) + 1
                }));
            }

            if (quizTimerDuration > 0) {
                setQuizTimeLeft(prev => {
                    if (prev <= 1) {
                        setTimeout(() => {
                            const activeIdx = quizCurrentIdxRef.current;
                            const totalQs = quizDataRef.current?.questions?.length || 0;
                            if (activeIdx < totalQs - 1) {
                                toast('Time up for this question! Moving to next.', { icon: '⏳' });
                                setQuizCurrentIdx(activeIdx + 1);
                            } else {
                                toast('Time up! Submitting quiz.', { icon: '🏁' });
                                setQuizSubmitted(true);
                            }
                        }, 0);
                        return quizTimerDuration;
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [quizModalOpen, !quizData, quizLoading, quizSubmitted, quizConfigMode, quizTimerDuration]);

    const handleSelectOption = (questionId, option) => {
        if (quizSubmitted) return;
        setQuizAnswers(prev => ({
            ...prev,
            [questionId]: option
        }));
        setQuizSkipped(prev => {
            const next = { ...prev };
            delete next[questionId];
            return next;
        });
    };

    const handleSkipQuestion = (questionId) => {
        if (quizSubmitted) return;
        setQuizSkipped(prev => ({
            ...prev,
            [questionId]: true
        }));
        setQuizAnswers(prev => {
            const next = { ...prev };
            delete next[questionId];
            return next;
        });
        if (quizCurrentIdx < (quizData?.questions?.length || 0) - 1) {
            setQuizCurrentIdx(idx => idx + 1);
        } else {
            toast('Skipped question. You are at the last question.', { icon: '⏭️' });
        }
    };

    // Calculate Comprehensive Quiz Score & Breakdown Metrics
    const quizScoreResult = useMemo(() => {
        if (!quizData || !quizData.questions) return { 
            score: 0, 
            total: 0, 
            percentage: 0,
            attempted: 0,
            correct: 0,
            incorrect: 0,
            skipped: 0,
            accuracy: 0
        };
        const total = quizData.questions.length;
        let correctCount = 0;
        let incorrectCount = 0;
        let attemptedCount = 0;
        let skippedCount = 0;

        quizData.questions.forEach(q => {
            const userAns = quizAnswers[q.id];
            if (userAns !== undefined && userAns !== null && userAns !== '') {
                attemptedCount++;
                if (userAns === q.correctAnswer) {
                    correctCount++;
                } else {
                    incorrectCount++;
                }
            } else {
                skippedCount++;
            }
        });

        const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
        const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
        
        return { 
            score: correctCount, 
            total, 
            percentage,
            attempted: attemptedCount,
            correct: correctCount,
            incorrect: incorrectCount,
            skipped: skippedCount,
            accuracy
        };
    }, [quizData, quizAnswers]);

    const subjectsHierarchy = useMemo(() => {
        const hierarchy = {};
        const flattenedMaterials = [];

        materials.forEach(baseItem => {
            let hasGranular = false;

            if (baseItem.pdfs?.length > 0) {
                hasGranular = true;
                baseItem.pdfs.forEach((p, i) => flattenedMaterials.push({ ...baseItem, id: `${baseItem.id}-p-${i}`, name: p.title || baseItem.name, description: p.description || baseItem.description, pdf_file: p.file, thumbnail: p.thumbnail || baseItem.thumbnail, video_link: null, video_file: null, dpp_file: null, resource_type: 'PDF' }));
            }
            if (baseItem.videos?.length > 0) {
                hasGranular = true;
                baseItem.videos.forEach((v, i) => flattenedMaterials.push({ ...baseItem, id: `${baseItem.id}-v-${i}`, name: v.title || baseItem.name, description: v.description || baseItem.description, video_file: v.video_file, video_link: v.video_link, thumbnail: v.thumbnail || (v.video_link ? getYouTubeThumbnail(v.video_link) : null) || baseItem.thumbnail, pdf_file: null, dpp_file: null, resource_type: 'VIDEO' }));
            }
            if (baseItem.dpps?.length > 0) {
                hasGranular = true;
                baseItem.dpps.forEach((d, i) => flattenedMaterials.push({ ...baseItem, id: `${baseItem.id}-d-${i}`, name: d.title || baseItem.name, description: d.description || baseItem.description, dpp_file: d.file, thumbnail: d.thumbnail || baseItem.thumbnail, pdf_file: null, video_link: null, video_file: null, resource_type: 'DPP' }));
            }

            if (!hasGranular) {
                flattenedMaterials.push(baseItem);
            }
        });

        flattenedMaterials.forEach(item => {
            const normalize = (val) => String(val || '').toLowerCase().trim().replace(/class\s*/g, '');
            const normAssigned = assignedClass ? normalize(assignedClass) : '';

            if (assignedClass) {
                const classNames = item.class_level_names?.length > 0
                    ? item.class_level_names
                    : (item.class_name ? [item.class_name] : []);

                if (classNames.length > 0) {
                    const hasClassMatch = classNames.some(c => normalize(c).includes(normAssigned) || normAssigned.includes(normalize(c)));
                    if (!hasClassMatch) return;
                }
            }

            if (studentSection && item.section_name) {
                if (normalize(item.section_name) !== normalize(studentSection)) return;
            }

            const subName = item.subject_name || 'Unsorted';
            const chapName = item.chapter_name || 'General';
            const topName = item.topic_name || item.name || 'Intro';

            const classMatch = assignedClass?.match(/\d+/);
            let classNum = classMatch ? parseInt(classMatch[0]) : 0;
            if (normAssigned === 'repeater' || normAssigned === 'dropper') {
                classNum = 13;
            }

            if (classNum >= 5 && classNum <= 10) {
                if (subName.toLowerCase().includes('botany') || subName.toLowerCase().includes('zoology')) return;
            } else if (classNum >= 11) {
                if (subName.toLowerCase() === 'biology') return;
            }

            const targetExamStr = String(user?.target_exam_name || user?.exam_tag_name || '').toLowerCase();
            if (targetExamStr.includes('jee')) {
                if (subName.toLowerCase().includes('biology') || subName.toLowerCase().includes('botany') || subName.toLowerCase().includes('zoology')) return;
            } else if (targetExamStr.includes('neet')) {
                if (subName.toLowerCase().includes('math')) return;
            }

            const isVideo = !!(item.resource_type === 'VIDEO' || item.video_link || item.video_file);
            const isDPP = !!(item.resource_type === 'DPP' || item.dpp_file || item.questions?.length > 0);
            const isPDF = !!(item.resource_type === 'PDF' || item.pdf_file || (!isVideo && !isDPP));

            if (activeContentType === 'DPP') {
                if (!isDPP) return;
            } else if (activeContentType === 'STUDY_MATERIAL') {
                if (!isPDF && (isVideo || isDPP)) return;
            } else if (activeContentType === 'VIDEO') {
                if (!isVideo) return;
            }

            if (!hierarchy[subName]) hierarchy[subName] = { name: subName, chapters: {} };
            if (!hierarchy[subName].chapters[chapName]) hierarchy[subName].chapters[chapName] = { name: chapName, topics: {} };
            if (!hierarchy[subName].chapters[chapName].topics[topName]) {
                hierarchy[subName].chapters[chapName].topics[topName] = {
                    name: topName,
                    materials: []
                };
            }

            hierarchy[subName].chapters[chapName].topics[topName].materials.push(item);
        });

        return hierarchy;
    }, [materials, assignedClass, activeContentType, studentSession, studentSection, user]);

    const activeSubjectData = activeSubject ? subjectsHierarchy[activeSubject] : null;
    const activeChapterData = (activeSubjectData && activeChapter) ? activeSubjectData.chapters[activeChapter] : null;

    const subjectsList = Object.keys(subjectsHierarchy).sort().reverse();

    // Auto-select first subject on initial load
    useEffect(() => {
        if (subjectsList.length > 0) {
            if (!activeSubject || !subjectsList.includes(activeSubject)) {
                setActiveSubject(subjectsList[0]);
            }
        } else if (activeSubject) {
            setActiveSubject(null);
        }
    }, [subjectsList, activeSubject]);

    // Handle hierarchy changes
    useEffect(() => {
        if (activeSubject && activeSubjectData) {
            const chapters = Object.keys(activeSubjectData.chapters).sort().reverse();
            if (activeChapter && !chapters.includes(activeChapter)) {
                setActiveChapter(chapters[0] || null);
            } else if (!activeChapter && chapters.length > 0) {
                setActiveChapter(chapters[0]);
            }
        }
    }, [activeSubject, activeSubjectData, activeChapter]);

    const totalSubjectsCount = subjectsList.length;
    const totalChaptersCount = useMemo(() => {
        return Object.values(subjectsHierarchy).reduce((acc, sub) => acc + Object.keys(sub.chapters || {}).length, 0);
    }, [subjectsHierarchy]);
    const totalMaterialsCount = useMemo(() => {
        return Object.values(subjectsHierarchy).reduce((acc, sub) => {
            return acc + Object.values(sub.chapters || {}).reduce((cAcc, chap) => {
                return cAcc + Object.values(chap.topics || {}).reduce((tAcc, top) => tAcc + (top.materials?.length || 0), 0);
            }, 0);
        }, 0);
    }, [subjectsHierarchy]);

    // Filter chapters in the left column index by chapterSearchQuery
    const filteredChapters = useMemo(() => {
        if (!activeSubjectData?.chapters) return [];
        const allChaps = Object.keys(activeSubjectData.chapters).sort().reverse();
        if (!chapterSearchQuery.trim()) return allChaps;
        const q = chapterSearchQuery.toLowerCase();
        return allChaps.filter(c => c.toLowerCase().includes(q));
    }, [activeSubjectData, chapterSearchQuery]);

    // Active Chapter Items filtered by top search
    const currentChapterMaterials = useMemo(() => {
        if (!activeChapterData) return [];
        let items = [];
        Object.entries(activeChapterData.topics || {}).forEach(([tName, tObj]) => {
            (tObj.materials || []).forEach(m => {
                items.push({ ...m, _topicTitle: tName });
            });
        });

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(m => 
                (m.name && m.name.toLowerCase().includes(q)) ||
                (m.description && m.description.toLowerCase().includes(q)) ||
                (m._topicTitle && m._topicTitle.toLowerCase().includes(q))
            );
        }

        return items;
    }, [activeChapterData, searchQuery]);

    const currentQuizQ = quizData?.questions?.[quizCurrentIdx];

    return (
        <>
            {/* AI DOCUMENT QUIZ MODAL */}
            {quizModalOpen && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 md:p-8 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !quizLoading && setQuizModalOpen(false)} />
                    <div className={`relative w-full max-w-3xl max-h-[92vh] rounded-[5px] overflow-hidden shadow-2xl border flex flex-col z-10 animate-in zoom-in-95
                        ${isDarkMode ? 'bg-[#10141D] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                        
                        {/* Modal Header */}
                        <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${isDarkMode ? 'bg-[#141926] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-[5px] bg-orange-500 flex items-center justify-center text-white shadow-sm shrink-0">
                                    <Brain size={18} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[5px] bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                                            AI Document Quiz
                                        </span>
                                        {quizItem && (
                                            <span className="text-[9px] font-medium text-slate-400 truncate">
                                                {quizItem.subject_name}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-sm sm:text-base font-bold uppercase tracking-tight truncate max-w-xs sm:max-w-md mt-0.5">
                                        {quizItem?.name || 'Study Material Quiz'}
                                    </h4>
                                </div>
                            </div>
                            
                            {/* Header Right: Timers & Close */}
                            <div className="flex items-center gap-2.5">
                                {!quizLoading && !quizSubmitted && quizData && quizData.questions && (
                                    <div className="flex items-center gap-2">
                                        {/* Per Question Countdown Timer */}
                                        {quizTimerDuration > 0 && (
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border text-xs font-mono font-bold transition-all ${
                                                quizTimeLeft <= 15
                                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
                                                    : 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400'
                                            }`}>
                                                <Clock size={12} className={quizTimeLeft <= 15 ? 'text-rose-500' : 'text-orange-500'} />
                                                <span>{String(Math.floor(quizTimeLeft / 60)).padStart(2, '0')}:{String(quizTimeLeft % 60).padStart(2, '0')}</span>
                                            </div>
                                        )}
                                        {/* Total Elapsed Timer */}
                                        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-[5px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                            <span>Total: {String(Math.floor(quizTotalElapsed / 60)).padStart(2, '0')}:{String(quizTotalElapsed % 60).padStart(2, '0')}</span>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => setQuizModalOpen(false)}
                                    className="p-2 rounded-[5px] text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                                >
                                    <X size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-between">
                            {quizLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-[5px] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 animate-pulse">
                                            <Sparkles size={28} className="animate-spin" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-base font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                                            Gemini AI is generating your quiz...
                                        </h3>
                                        <p className="text-xs text-slate-400 max-w-sm">
                                            Reading document content and creating {quizNumQuestions} exam-style questions with KaTeX formulas and step-by-step solutions.
                                        </p>
                                    </div>
                                </div>
                            ) : quizConfigMode || (!quizData && !quizSubmitted) ? (
                                /* QUIZ SETUP / CONFIG VIEW */
                                <div className="space-y-6 py-2">
                                    <div className="text-center space-y-1.5">
                                        <div className="w-12 h-12 rounded-[5px] bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-2">
                                            <Zap size={24} />
                                        </div>
                                        <h3 className="text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                                            Customize Your AI Quiz
                                        </h3>
                                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                                            Select your desired number of questions, difficulty level, and per-question timer.
                                        </p>
                                    </div>

                                    {/* Config Options */}
                                    <div className="space-y-4 max-w-md mx-auto">
                                        {/* Number of Questions Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <Layers size={13} className="text-orange-500" />
                                                Number of Questions
                                            </label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[5, 10, 15, 20].map(count => (
                                                    <button
                                                        key={count}
                                                        type="button"
                                                        onClick={() => setQuizNumQuestions(count)}
                                                        className={`py-2.5 rounded-[5px] font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer text-center ${
                                                            quizNumQuestions === count
                                                                ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                                                                : isDarkMode
                                                                    ? 'bg-[#141926] border-white/5 text-slate-300 hover:border-white/20'
                                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {count} Qs
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Difficulty Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <Award size={13} className="text-orange-500" />
                                                Difficulty Level
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { id: 'EASY', label: 'Easy' },
                                                    { id: 'MEDIUM', label: 'Medium' },
                                                    { id: 'HARD', label: 'Hard' }
                                                ].map(d => (
                                                    <button
                                                        key={d.id}
                                                        type="button"
                                                        onClick={() => setQuizDifficulty(d.id)}
                                                        className={`py-2.5 rounded-[5px] font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer text-center ${
                                                            quizDifficulty === d.id
                                                                ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                                                                : isDarkMode
                                                                    ? 'bg-[#141926] border-white/5 text-slate-300 hover:border-white/20'
                                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {d.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Per-Question Timer Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <Clock size={13} className="text-orange-500" />
                                                Timer Per Question
                                            </label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { sec: 30, label: '30s' },
                                                    { sec: 45, label: '45s' },
                                                    { sec: 60, label: '60s' },
                                                    { sec: 90, label: '90s' }
                                                ].map(t => (
                                                    <button
                                                        key={t.sec}
                                                        type="button"
                                                        onClick={() => setQuizTimerDuration(t.sec)}
                                                        className={`py-2.5 rounded-[5px] font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer text-center ${
                                                            quizTimerDuration === t.sec
                                                                ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                                                                : isDarkMode
                                                                    ? 'bg-[#141926] border-white/5 text-slate-300 hover:border-white/20'
                                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Start Action Button */}
                                    <div className="pt-4 max-w-md mx-auto">
                                        <button
                                            type="button"
                                            onClick={() => handleStartQuiz(quizItem, quizNumQuestions, quizDifficulty)}
                                            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                                        >
                                            <Zap size={14} className="fill-current" />
                                            <span>Generate & Start {quizNumQuestions}-Question Quiz</span>
                                        </button>
                                    </div>
                                </div>
                            ) : quizSubmitted ? (
                                /* QUIZ RESULT & DETAILED REPORT VIEW */
                                <div className="space-y-6">
                                    {/* Performance Hero Banner */}
                                    <div className={`p-5 rounded-[5px] border text-center space-y-3 ${isDarkMode ? 'bg-[#141926] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="inline-flex p-3.5 rounded-full bg-orange-500/10 text-orange-500 mb-0.5">
                                            <Trophy size={32} strokeWidth={2.2} />
                                        </div>
                                        <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                                            Quiz Assessment Report
                                        </h3>
                                        
                                        {/* Score & Accuracy Highlight */}
                                        <div className="flex items-center justify-center gap-4 sm:gap-6 pt-1">
                                            <div className="text-center">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Score</span>
                                                <span className="text-3xl font-black text-orange-500">
                                                    {quizScoreResult.score} / {quizScoreResult.total}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                                                    ({quizScoreResult.percentage}%)
                                                </span>
                                            </div>
                                            <div className="h-10 w-px bg-slate-200 dark:bg-white/10" />
                                            <div className="text-center">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Accuracy</span>
                                                <span className="text-3xl font-black text-emerald-500">
                                                    {quizScoreResult.accuracy}%
                                                </span>
                                                <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                                                    (on attempted)
                                                </span>
                                            </div>
                                        </div>

                                        {/* 4 Detailed Metric Cards Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 max-w-xl mx-auto text-left">
                                            <div className={`p-3 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-xs'}`}>
                                                <div className="flex items-center justify-between text-emerald-500 mb-1">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Correct</span>
                                                    <CheckCircle size={14} />
                                                </div>
                                                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                                    {quizScoreResult.correct} Qs
                                                </div>
                                            </div>

                                            <div className={`p-3 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-xs'}`}>
                                                <div className="flex items-center justify-between text-rose-500 mb-1">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Incorrect</span>
                                                    <XCircle size={14} />
                                                </div>
                                                <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                                                    {quizScoreResult.incorrect} Qs
                                                </div>
                                            </div>

                                            <div className={`p-3 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-xs'}`}>
                                                <div className="flex items-center justify-between text-amber-500 mb-1">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Skipped</span>
                                                    <FastForward size={14} />
                                                </div>
                                                <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                                                    {quizScoreResult.skipped} Qs
                                                </div>
                                            </div>

                                            <div className={`p-3 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-xs'}`}>
                                                <div className="flex items-center justify-between text-orange-500 mb-1">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Time Taken</span>
                                                    <Clock size={14} />
                                                </div>
                                                <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                                                    {Math.floor(quizTotalElapsed / 60)}m {quizTotalElapsed % 60}s
                                                </div>
                                            </div>
                                        </div>

                                        {/* Motivational Feedback */}
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pt-1">
                                            {quizScoreResult.percentage >= 80 
                                                ? '🎉 Outstanding mastery of this study material!' 
                                                : quizScoreResult.percentage >= 50 
                                                    ? '👍 Good performance! Review the step-by-step solutions below to fix incorrect & skipped concepts.' 
                                                    : '💪 Learning is a process! Check the detailed explanations below to strengthen your understanding.'}
                                        </p>

                                        {/* Primary Action Buttons */}
                                        <div className="flex items-center justify-center gap-3 pt-2">
                                            <button
                                                onClick={() => {
                                                    setQuizAnswers({});
                                                    setQuizSkipped({});
                                                    setQuizSubmitted(false);
                                                    setQuizCurrentIdx(0);
                                                    setQuizTotalElapsed(0);
                                                    setQuizQuestionTimes({});
                                                    setQuizTimeLeft(quizTimerDuration > 0 ? quizTimerDuration : 0);
                                                }}
                                                className="px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-white rounded-[5px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
                                            >
                                                <RotateCcw size={14} /> Retake Quiz
                                            </button>
                                            <button
                                                onClick={() => setQuizConfigMode(true)}
                                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                                            >
                                                <Sparkles size={14} /> New Quiz Settings
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filterable Detailed Questions Breakdown */}
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 dark:border-white/10">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                                <BarChart3 size={15} className="text-orange-500" />
                                                <span>Question Breakdown & Solutions</span>
                                            </h4>

                                            {/* Filter Pills */}
                                            <div className="flex items-center gap-1.5 overflow-x-auto">
                                                {[
                                                    { id: 'ALL', label: `All (${quizData.questions.length})` },
                                                    { id: 'CORRECT', label: `Correct (${quizScoreResult.correct})` },
                                                    { id: 'INCORRECT', label: `Incorrect (${quizScoreResult.incorrect})` },
                                                    { id: 'SKIPPED', label: `Skipped (${quizScoreResult.skipped})` },
                                                ].map(tab => (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => setQuizReviewFilter(tab.id)}
                                                        className={`px-2.5 py-1 rounded-[5px] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                                            quizReviewFilter === tab.id
                                                                ? 'bg-orange-500 text-white shadow-xs'
                                                                : isDarkMode
                                                                    ? 'bg-[#141926] text-slate-400 hover:text-white border border-white/5'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                                        }`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Filtered Question Review Cards */}
                                        {quizData.questions
                                            .filter(q => {
                                                const userAns = quizAnswers[q.id];
                                                const isAnswered = userAns !== undefined && userAns !== null && userAns !== '';
                                                const isCorrect = isAnswered && userAns === q.correctAnswer;
                                                const isIncorrect = isAnswered && userAns !== q.correctAnswer;
                                                const isSkipped = !isAnswered;

                                                if (quizReviewFilter === 'CORRECT') return isCorrect;
                                                if (quizReviewFilter === 'INCORRECT') return isIncorrect;
                                                if (quizReviewFilter === 'SKIPPED') return isSkipped;
                                                return true;
                                            })
                                            .map((q, qIdx) => {
                                                const userAns = quizAnswers[q.id];
                                                const isAnswered = userAns !== undefined && userAns !== null && userAns !== '';
                                                const isCorrect = isAnswered && userAns === q.correctAnswer;
                                                const isIncorrect = isAnswered && userAns !== q.correctAnswer;
                                                const isSkipped = !isAnswered;
                                                const timeSpent = quizQuestionTimes[q.id] || 0;

                                                return (
                                                    <div
                                                        key={q.id || qIdx}
                                                        className={`p-4 sm:p-5 rounded-[5px] border space-y-3.5 transition-all ${
                                                            isCorrect 
                                                                ? isDarkMode ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                                                                : isIncorrect
                                                                    ? isDarkMode ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50/40 border-rose-200'
                                                                    : isDarkMode ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/40 border-amber-200'
                                                        }`}
                                                    >
                                                        {/* Question Card Header Bar */}
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 dark:border-white/10">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-mono font-black text-white ${
                                                                    isCorrect ? 'bg-emerald-500' : isIncorrect ? 'bg-rose-500' : 'bg-amber-500'
                                                                }`}>
                                                                    Q{q.id || qIdx + 1}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                    {q.concept || 'Document Concept'}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {/* Time on Question Badge */}
                                                                <span className="text-[10px] font-mono font-medium text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-[5px]">
                                                                    <Clock size={11} className="text-orange-500" />
                                                                    {timeSpent}s
                                                                </span>

                                                                {/* Status Badge */}
                                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-[5px] flex items-center gap-1 ${
                                                                    isCorrect 
                                                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                                                        : isIncorrect
                                                                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                                                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                                }`}>
                                                                    {isCorrect && <><CheckCircle size={12} /> Correct (+1)</>}
                                                                    {isIncorrect && <><XCircle size={12} /> Incorrect (0)</>}
                                                                    {isSkipped && <><FastForward size={12} /> Skipped / Not Attempted</>}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Question Text */}
                                                        <div 
                                                            className={`text-xs sm:text-sm font-bold leading-relaxed ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                                                            style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}
                                                        >
                                                            <MathRenderer 
                                                                html={q.question} 
                                                                className={isDarkMode ? 'text-white' : 'text-slate-900'} 
                                                                style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }} 
                                                            />
                                                        </div>

                                                        {/* Options Grid with Clear Answers Status */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                            {q.options?.map((opt, oIdx) => {
                                                                const isThisCorrect = opt === q.correctAnswer;
                                                                const isThisUser = opt === userAns;

                                                                return (
                                                                    <div
                                                                        key={oIdx}
                                                                        className={`p-3 rounded-[5px] border text-[11px] font-medium flex items-center justify-between gap-2.5 transition-all ${
                                                                            isThisCorrect 
                                                                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/40' 
                                                                                : isThisUser 
                                                                                    ? 'bg-rose-500/15 border-rose-500 text-rose-950 dark:text-rose-200 font-bold ring-1 ring-rose-500/40' 
                                                                                    : isDarkMode 
                                                                                        ? 'bg-[#141926] border-white/5 text-slate-400 opacity-60' 
                                                                                        : 'bg-white border-slate-200 text-slate-600 opacity-70'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                            <span className={`w-5 h-5 rounded-[5px] flex items-center justify-center font-mono text-[10px] font-bold uppercase shrink-0 ${
                                                                                isThisCorrect 
                                                                                    ? 'bg-emerald-500 text-white' 
                                                                                    : isThisUser 
                                                                                        ? 'bg-rose-500 text-white' 
                                                                                        : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                                                                            }`}>
                                                                                {String.fromCharCode(65 + oIdx)}
                                                                            </span>
                                                                            <div 
                                                                                className="flex-1 min-w-0 font-medium"
                                                                                style={{ color: isThisCorrect ? (isDarkMode ? '#a7f3d0' : '#064e3b') : isThisUser ? (isDarkMode ? '#fecdd3' : '#881337') : (isDarkMode ? '#94a3b8' : '#475569') }}
                                                                            >
                                                                                <MathRenderer html={opt} />
                                                                            </div>
                                                                        </div>

                                                                        {/* Status Icon */}
                                                                        <div className="shrink-0 flex items-center">
                                                                            {isThisCorrect && (
                                                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[5px] bg-emerald-500 text-white flex items-center gap-1">
                                                                                    <CheckCircle size={10} /> Correct
                                                                                </span>
                                                                            )}
                                                                            {isThisUser && !isThisCorrect && (
                                                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[5px] bg-rose-500 text-white flex items-center gap-1">
                                                                                    <XCircle size={10} /> Your Answer
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                            })}
                        </div>

                                                        {/* Detailed Step-by-Step Solution & Explanation */}
                                                        {q.explanation && (
                                                            <div 
                                                                className={`p-3 rounded-[5px] border text-[11px] space-y-1 ${
                                                                    isDarkMode 
                                                                        ? 'bg-[#10141D] border-white/10 text-slate-200' 
                                                                        : 'bg-slate-50 border-slate-200 text-slate-800'
                                                                }`}
                                                                style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}
                                                            >
                                                                <div className="flex items-center gap-1.5 font-bold text-orange-500 uppercase text-[10px] tracking-wider">
                                                                    <Sparkles size={12} />
                                                                    <span>Explanation & Solution:</span>
                                                                </div>
                                                                <MathRenderer 
                                                                    html={q.explanation} 
                                                                    className="leading-relaxed font-normal" 
                                                                    style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }} 
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            ) : (
                                /* ACTIVE QUIZ STEPPER VIEW */
                                currentQuizQ && (
                                    <div className="space-y-5">
                                        {/* Stepper Progress Bar & Numbers Row */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400">
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    Question {quizCurrentIdx + 1} of {quizData.questions.length}
                                                </span>
                                                <span className="text-orange-500">
                                                    {currentQuizQ.concept || 'Knowledge Question'}
                                                </span>
                                            </div>

                                            {/* Top Horizontal Progress bar */}
                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-orange-500 transition-all duration-300"
                                                    style={{ width: `${((quizCurrentIdx + 1) / quizData.questions.length) * 100}%` }}
                                                />
                                            </div>

                                            {/* Numeric Jump Pills (1, 2, 3... 20) */}
                                            <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
                                                {quizData.questions.map((q, idx) => {
                                                    const isAnswered = !!quizAnswers[q.id];
                                                    const isSkipped = !!quizSkipped[q.id] && !isAnswered;
                                                    const isCurrent = idx === quizCurrentIdx;

                                                    return (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => setQuizCurrentIdx(idx)}
                                                            className={`w-7 h-7 rounded-[5px] text-[10px] font-bold font-mono transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                                                                isCurrent
                                                                    ? 'bg-orange-500 text-white ring-2 ring-orange-500/30 font-black shadow-xs'
                                                                    : isAnswered
                                                                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold'
                                                                        : isSkipped
                                                                            ? 'bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold'
                                                                            : isDarkMode
                                                                                ? 'bg-[#141926] border border-white/5 text-slate-400 hover:border-white/20'
                                                                                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                            title={`Question ${idx + 1} (${isAnswered ? 'Answered' : isSkipped ? 'Skipped' : 'Not Visited'})`}
                                                        >
                                                            {idx + 1}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* High-Contrast Question Card (Crisp in Light & Dark Mode) */}
                                        <div 
                                            className={`p-4 sm:p-5 rounded-[5px] border space-y-2 transition-all shadow-xs ${
                                                isDarkMode 
                                                    ? 'bg-[#141926] border-white/10 text-white' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-900'
                                            }`}
                                            style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="px-1.5 py-0.5 rounded-[5px] bg-orange-500 text-white text-[10px] font-mono font-bold">
                                                    Q{quizCurrentIdx + 1}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                                    Select the correct option
                                                </span>
                                            </div>
                                            <div 
                                                className={`text-sm sm:text-base font-bold leading-relaxed ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                                                style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}
                                            >
                                                <MathRenderer 
                                                    html={currentQuizQ.question} 
                                                    className={isDarkMode ? 'text-white' : 'text-slate-900'} 
                                                    style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Options Grid */}
                                        <div className="space-y-2.5">
                                            {currentQuizQ.options?.map((opt, optIdx) => {
                                                const isSelected = quizAnswers[currentQuizQ.id] === opt;
                                                return (
                                                    <button
                                                        key={optIdx}
                                                        type="button"
                                                        onClick={() => handleSelectOption(currentQuizQ.id, opt)}
                                                        className={`w-full p-3.5 rounded-[5px] border text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                                                            isSelected 
                                                                ? isDarkMode 
                                                                    ? 'bg-orange-500/15 border-orange-500 text-orange-300 ring-1 ring-orange-500/40' 
                                                                    : 'bg-orange-500/10 border-orange-500 text-orange-950 ring-1 ring-orange-500/30 font-semibold' 
                                                                : isDarkMode 
                                                                    ? 'bg-[#141926] border-white/5 text-slate-200 hover:border-white/20 hover:bg-[#182032]' 
                                                                    : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                                                        }`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-[5px] flex items-center justify-center font-bold text-xs shrink-0 ${
                                                            isSelected 
                                                                ? 'bg-orange-500 text-white shadow-sm' 
                                                                : isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {String.fromCharCode(65 + optIdx)}
                                                        </div>
                                                        <div 
                                                            className={`text-xs sm:text-sm font-medium flex-1 min-w-0 ${
                                                                isSelected
                                                                    ? isDarkMode ? 'text-orange-300 font-bold' : 'text-orange-950 font-bold'
                                                                    : isDarkMode ? 'text-slate-100' : 'text-slate-900'
                                                            }`}
                                                            style={{
                                                                color: isSelected
                                                                    ? isDarkMode ? '#fdba74' : '#431407'
                                                                    : isDarkMode ? '#f1f5f9' : '#0f172a'
                                                            }}
                                                        >
                                                            <MathRenderer 
                                                                html={opt} 
                                                                className={
                                                                    isSelected
                                                                        ? isDarkMode ? 'text-orange-300' : 'text-orange-950'
                                                                        : isDarkMode ? 'text-slate-100' : 'text-slate-900'
                                                                }
                                                                style={{
                                                                    color: isSelected
                                                                        ? isDarkMode ? '#fdba74' : '#431407'
                                                                        : isDarkMode ? '#f1f5f9' : '#0f172a'
                                                                }}
                                                            />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Bottom Question Controls */}
                                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2.5">
                                            <button
                                                type="button"
                                                disabled={quizCurrentIdx === 0}
                                                onClick={() => setQuizCurrentIdx(prev => Math.max(0, prev - 1))}
                                                className={`px-4 py-2 rounded-[5px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                                    quizCurrentIdx === 0 
                                                        ? 'opacity-40 cursor-not-allowed text-slate-400' 
                                                        : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <ChevronLeft size={14} /> Previous
                                            </button>

                                            <div className="flex items-center gap-2">
                                                {/* Clear button if answered */}
                                                {quizAnswers[currentQuizQ.id] && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setQuizAnswers(prev => {
                                                                const updated = { ...prev };
                                                                delete updated[currentQuizQ.id];
                                                                return updated;
                                                            });
                                                        }}
                                                        className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        Clear
                                                    </button>
                                                )}

                                                {/* Skip Question Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleSkipQuestion(currentQuizQ.id)}
                                                    className="px-3.5 py-2 rounded-[5px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                                                    title="Skip this question and move to next"
                                                >
                                                    <FastForward size={13} className="text-amber-500" />
                                                    <span>Skip</span>
                                                </button>

                                                {/* Save & Next or Submit Button */}
                                                {quizCurrentIdx < quizData.questions.length - 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuizCurrentIdx(prev => prev + 1)}
                                                        className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-98"
                                                    >
                                                        <span>Save & Next</span>
                                                        <ChevronRight size={14} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuizSubmitted(true)}
                                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98"
                                                    >
                                                        <CheckCircle2 size={14} /> Submit Quiz
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* View Modal - Rendered at root level via portal */}
            {selectedItem && createPortal(
                <div className={`fixed inset-0 z-[999999] flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-3 sm:p-6 md:p-8'} animate-in fade-in duration-300`}>
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedItem(null)} />
                    <div className={`relative w-full ${
                        isFullScreen 
                            ? 'h-full max-w-none rounded-none m-0' 
                            : viewPage === 1 
                                ? 'max-w-4xl max-h-[90vh] rounded-[5px]' 
                                : 'max-w-7xl h-[90vh] rounded-[5px]'
                    } transition-all duration-300 overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col z-10`}>
                        
                        {/* Modal Header */}
                        <div className={`flex items-center justify-between px-6 py-4 border-b relative z-20 ${isDarkMode ? 'bg-[#10141D] border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-[5px] flex items-center justify-center text-white shadow bg-orange-500">
                                    {(selectedItem.video_link || selectedItem.video_file) ? <PlayCircle size={20} /> : <FileText size={20} />}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-base sm:text-lg font-bold uppercase tracking-tight leading-tight truncate max-w-[220px] sm:max-w-md">{selectedItem.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[5px] bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                                            {selectedItem.subject_name}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400">
                                            {(selectedItem.video_link || selectedItem.video_file) ? 'Video Player' : 'Curriculum Document'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    className={`p-2 rounded-[5px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                >
                                    {isFullScreen ? <Minimize2 size={16} strokeWidth={2.5} /> : <Maximize2 size={16} strokeWidth={2.5} />}
                                </button>
                                <button
                                    onClick={() => {
                                        if (viewPage === 2 && (selectedItem.video_link || selectedItem.video_file)) {
                                            logVideoActivity('pause', selectedItem.id, selectedItem.name);
                                        }
                                        setSelectedItem(null);
                                    }}
                                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-[5px] transition-all active:scale-95 shadow cursor-pointer"
                                >
                                    <X size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className={`flex-grow flex flex-col md:flex-row relative ${isDarkMode ? 'bg-[#0B0F19]' : 'bg-slate-50'}`}>
                            {viewPage === 1 ? (
                                <div className="flex flex-col md:flex-row items-center justify-center w-full p-6 sm:p-8 lg:p-10 gap-6 sm:gap-8 lg:gap-10 overflow-y-auto custom-scrollbar">
                                    <div className={`relative group overflow-hidden rounded-[5px] shadow-lg w-full md:w-[380px] lg:w-[420px] aspect-video border flex-shrink-0 flex items-center justify-center ${isDarkMode ? 'bg-black/50 border-white/10' : 'bg-white border-slate-200'}`}>
                                        {selectedItem.thumbnail ? (
                                            <img src={selectedItem.thumbnail} alt={selectedItem.name} className="w-full h-full object-cover" />
                                        ) : (selectedItem.video_link && getYouTubeThumbnail(selectedItem.video_link)) ? (
                                            <img src={getYouTubeThumbnail(selectedItem.video_link)} alt={selectedItem.name} className="w-full h-full object-cover" />
                                        ) : selectedItem.video_file ? (
                                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                                <video src={`${selectedItem.video_file}#t=0.1`} preload="metadata" className="w-full h-full object-cover absolute inset-0" muted playsInline />
                                                <div className="relative z-10 w-full h-full flex items-center justify-center bg-black/40">
                                                    <PlayCircle size={64} strokeWidth={1.5} className="text-white drop-shadow-lg" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white">
                                                {selectedItem.video_link ? <PlayCircle size={64} strokeWidth={1.5} /> : <FileText size={64} strokeWidth={1.5} />}
                                            </div>
                                        )}
                                    </div>

                                    <div className="max-w-xl text-center md:text-left space-y-4">
                                        <div className="space-y-1.5">
                                            <span className="px-2.5 py-0.5 rounded-[5px] text-[10px] font-bold uppercase tracking-wider border inline-block bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20">
                                                {selectedItem.subject_name} • {selectedItem.chapter_name || 'General'}
                                            </span>
                                            <h2 className={`text-xl sm:text-2xl font-bold uppercase leading-tight tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {selectedItem.name}
                                            </h2>
                                        </div>

                                        <p className={`text-xs sm:text-sm font-normal leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {selectedItem.description || 'Structured academic learning module and notes prepared for your curriculum.'}
                                        </p>

                                        <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                                            {(selectedItem.pdf_file || selectedItem.dpp_file || selectedItem.video_link || selectedItem.video_file) && (
                                                <button
                                                    onClick={() => {
                                                        setViewPage(2);
                                                        if (selectedItem.video_link || selectedItem.video_file) {
                                                            logVideoActivity('play', selectedItem.id, selectedItem.name);
                                                        }
                                                    }}
                                                    className="group/btn px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] font-bold uppercase text-xs tracking-wider shadow-sm transition-all hover:scale-102 active:scale-98 flex items-center gap-2 cursor-pointer"
                                                >
                                                    {(selectedItem.video_link || selectedItem.video_file) ? <PlayCircle size={17} strokeWidth={2.2} /> : <Eye size={17} strokeWidth={2.2} />}
                                                    <span>{(selectedItem.video_link || selectedItem.video_file) ? 'Launch Video Player' : 'Open Reader'}</span>
                                                </button>
                                            )}

                                            {/* AI Document Quiz Trigger (Only for Documents/Notes/DPPs) */}
                                            {!(selectedItem.video_link || selectedItem.video_file) && (
                                                <button
                                                    onClick={() => {
                                                        const itemToQuiz = selectedItem;
                                                        setSelectedItem(null);
                                                        handleOpenQuizConfig(itemToQuiz);
                                                    }}
                                                    className="px-5 py-2.5 bg-slate-900 hover:bg-black dark:bg-white/10 dark:hover:bg-white/20 text-white border border-slate-700 dark:border-white/15 rounded-[5px] font-bold uppercase text-xs tracking-wider shadow-sm transition-all hover:scale-102 active:scale-98 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Zap size={16} className="text-amber-400" />
                                                    <span>Generate AI Quiz</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full bg-black flex items-center justify-center relative">
                                    <button
                                        onClick={() => {
                                            if (viewPage === 2 && (selectedItem.video_link || selectedItem.video_file)) {
                                                logVideoActivity('pause', selectedItem.id, selectedItem.name);
                                            }
                                            setViewPage(1);
                                        }}
                                        className="absolute top-4 left-4 z-50 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-[5px] transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-wider cursor-pointer"
                                    >
                                        <ChevronRight size={14} className="rotate-180" /> Back to Overview
                                    </button>
                                    {(selectedItem.pdf_file || selectedItem.dpp_file) && !selectedItem.video_link && !selectedItem.video_file ? (
                                        <iframe
                                            src={selectedItem.pdf_file || selectedItem.dpp_file}
                                            className="w-full h-full border-none bg-white"
                                            title="PDF Document"
                                        />
                                    ) : selectedItem.video_link ? (
                                        <div className="w-full h-full">
                                            {(selectedItem.video_link.includes('youtube.com') || selectedItem.video_link.includes('youtu.be')) ? (
                                                <div ref={ytContainerRef} className="w-full h-full" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-white gap-4">
                                                    <ExternalLink size={48} />
                                                    <a href={selectedItem.video_link} target="_blank" rel="noopener noreferrer" className="text-orange-500 font-bold uppercase hover:underline">
                                                        Launch External Video Player
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ) : selectedItem.video_file ? (
                                        <video
                                            src={selectedItem.video_file}
                                            className="max-w-full max-h-full"
                                            controls
                                            controlsList="nodownload"
                                            disablePictureInPicture
                                            onContextMenu={(e) => e.preventDefault()}
                                            autoPlay
                                            onPause={(e) => logVideoActivity('pause', selectedItem.id, selectedItem.name, Math.floor(e.target.currentTime))}
                                            onEnded={(e) => logVideoActivity('complete', selectedItem.id, selectedItem.name, Math.floor(e.target.currentTime))}
                                        />
                                    ) : (
                                        <div className="text-white/30 font-bold uppercase tracking-widest">Resource Unavailable</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MAIN PORTAL CONTENT WRAPPER */}
            <div className="flex flex-col gap-6 animate-fade-in-up">
                
                {/* 1. TOP HEADER STRIP */}
                <div className={`p-3.5 sm:p-4 md:p-5 rounded-[5px] border flex flex-col gap-3.5 md:gap-4 transition-all duration-200
                    ${isDarkMode 
                        ? 'bg-[#10141D] border-white/10 shadow-sm' 
                        : 'bg-white border-slate-200 shadow-sm'}`}>
                    
                    {/* Header Top Row: Brand & Type Filter Tabs */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                        {/* Left: Brand Title */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[5px] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                                {activeContentType === 'VIDEO' ? <PlayCircle size={18} strokeWidth={2.2} /> : activeContentType === 'DPP' ? <HelpCircle size={18} strokeWidth={2.2} /> : <BookMarked size={18} strokeWidth={2.2} />}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-500">
                                        Learning Vault
                                    </span>
                                    <span className="text-[8px] font-medium px-2 py-0.5 rounded-[5px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                                        Class: {assignedClass || 'Enrolled'}
                                    </span>
                                </div>
                                <h1 className={`text-sm sm:text-base md:text-lg font-bold uppercase tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {activeContentType === 'VIDEO' ? 'Video Masterclasses' : activeContentType === 'DPP' ? 'Daily Practice Problems' : 'Curriculum Study Vault'}
                                </h1>
                            </div>
                        </div>

                        {/* Center/Right on desktop, full-width 3-grid on mobile: Content-Type Filter Pills */}
                        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-[5px] border border-slate-200 dark:border-white/5 w-full md:w-auto">
                            {[
                                { id: 'STUDY_MATERIAL', label: 'Notes & PDFs', shortLabel: 'Notes', icon: BookMarked },
                                { id: 'VIDEO', label: 'Video Lectures', shortLabel: 'Videos', icon: PlayCircle },
                                { id: 'DPP', label: 'DPP Sheets', shortLabel: 'DPP', icon: HelpCircle },
                            ].map(tab => {
                                const isTabActive = activeContentType === tab.id;
                                const TabIcon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveContentType(tab.id)}
                                        className={`px-2 sm:px-3 py-1.5 rounded-[5px] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center
                                            ${isTabActive 
                                                ? 'bg-orange-500 text-white shadow-sm' 
                                                : isDarkMode 
                                                    ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'}`}
                                    >
                                        <TabIcon size={11} strokeWidth={2.2} className="shrink-0" />
                                        <span className="truncate sm:hidden">{tab.shortLabel}</span>
                                        <span className="hidden sm:inline truncate">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search & Refresh Row */}
                    <div className="flex items-center gap-2 w-full pt-2 border-t border-slate-100 dark:border-white/5">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                            <input
                                type="text"
                                placeholder="Search resources by title, topic..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-8 pr-7 py-1.5 rounded-[5px] border text-xs font-normal outline-none transition-all
                                ${isDarkMode 
                                    ? 'bg-black/30 border-white/10 text-white placeholder-slate-500 focus:border-orange-500' 
                                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-orange-500'}`}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => fetchMaterials(false)}
                            title="Refresh curriculum"
                            className={`p-2 rounded-[5px] border transition-all cursor-pointer shrink-0 ${isDarkMode ? 'bg-black/30 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'}`}
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin text-orange-500' : ''} />
                        </button>
                    </div>
                </div>

                {/* 2. SUBJECTS CARDS */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Subjects ({subjectsList.length})
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                            {totalChaptersCount} Chapters • {totalMaterialsCount} Resources
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {subjectsList.map(subName => {
                            const isSelected = activeSubject === subName;
                            const details = getSubjectDetails(subName);
                            const SubjectIcon = details.icon;
                            const chaptersCount = Object.keys(subjectsHierarchy[subName].chapters || {}).length;
                            const subMaterialsCount = Object.values(subjectsHierarchy[subName].chapters || {}).reduce((acc, chap) => {
                                return acc + Object.values(chap.topics || {}).reduce((tAcc, top) => tAcc + (top.materials?.length || 0), 0);
                            }, 0);

                            return (
                                <div
                                    key={subName}
                                    onClick={() => {
                                        setActiveSubject(subName);
                                        const chaps = Object.keys(subjectsHierarchy[subName].chapters || {}).sort().reverse();
                                        setActiveChapter(chaps[0] || null);
                                        setActiveTopic(null);
                                        setChapterSearchQuery('');
                                    }}
                                    className={`group relative p-3.5 sm:p-4 rounded-[5px] text-left transition-all duration-200 border flex items-center justify-between gap-3.5 cursor-pointer
                                        ${isSelected
                                            ? `${isDarkMode ? 'bg-[#151c2e] border-orange-500 ring-1 ring-orange-500/30' : 'bg-white border-orange-500 ring-1 ring-orange-500/20 shadow-sm'}`
                                            : isDarkMode
                                                ? 'bg-[#10141D] border-white/10 hover:border-white/20 hover:bg-[#141926]'
                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'}`}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {/* Distinct Subject Icon Squircle */}
                                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-[5px] flex items-center justify-center text-white shadow-sm bg-gradient-to-br ${details.iconGradient} shrink-0`}>
                                            <SubjectIcon size={20} strokeWidth={2.2} />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[5px] border ${details.badgeBg}`}>
                                                    {details.code}
                                                </span>
                                            </div>
                                            <h4 className={`text-xs sm:text-sm font-bold uppercase tracking-tight truncate ${isSelected ? (isDarkMode ? 'text-white' : 'text-slate-900') : (isDarkMode ? 'text-slate-200' : 'text-slate-800')}`}>
                                                {subName}
                                            </h4>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                                                {chaptersCount} {chaptersCount === 1 ? 'Chapter' : 'Chapters'} • {subMaterialsCount} Items
                                            </p>
                                        </div>
                                    </div>

                                    {/* Clean Orange Status Indicator */}
                                    <div className="shrink-0">
                                        {isSelected ? (
                                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-orange-500/20"></div>
                                        ) : (
                                            <ChevronRight size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. SPLIT WORKSPACE / CURRICULUM EXPLORER */}
                {isLoading ? (
                    <div className={`flex flex-col items-center justify-center min-h-[350px] rounded-[5px] border border-dashed ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="w-12 h-12 rounded-[5px] bg-orange-500/10 flex items-center justify-center mb-3">
                            <Loader2 size={24} className="text-orange-500 animate-spin" />
                        </div>
                        <h3 className={`text-base font-bold tracking-tight uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Loading Curriculum...</h3>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">Preparing your study materials</p>
                    </div>
                ) : !activeSubjectData ? (
                    <div className={`flex flex-col items-center justify-center min-h-[350px] rounded-[5px] border border-dashed ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="w-12 h-12 rounded-[5px] bg-orange-500/10 flex items-center justify-center mb-3">
                            <Compass size={24} className="text-orange-500 opacity-40" />
                        </div>
                        <h3 className={`text-base font-bold tracking-tight uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {materials.length === 0 ? 'No Materials Available' : 'Select a Subject'}
                        </h3>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">
                            {materials.length === 0 ? 'Check back later for newly assigned chapters' : 'Choose a subject above to explore curriculum and topics'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
                        
                        {/* LEFT COLUMN: CHAPTERS CURRICULUM INDEX (4 of 12 Cols) */}
                        <div className={`lg:col-span-4 p-3.5 sm:p-4 rounded-[5px] border transition-all duration-200 flex flex-col ${isDarkMode ? 'bg-[#10141D] border-white/10 shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
                            {/* Header */}
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                    <Layers size={16} className="text-orange-500" />
                                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        Curriculum Index
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-[5px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                                    {Object.keys(activeSubjectData.chapters || {}).length} Chapters
                                </span>
                            </div>

                            {/* Search Chapter Input */}
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                <input
                                    type="text"
                                    placeholder="Search chapters..."
                                    value={chapterSearchQuery}
                                    onChange={(e) => setChapterSearchQuery(e.target.value)}
                                    className={`w-full pl-8 pr-7 py-2 rounded-[5px] border text-xs font-normal outline-none transition-all
                                    ${isDarkMode 
                                        ? 'bg-black/40 border-white/10 text-white placeholder-slate-500 focus:border-orange-500' 
                                        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-orange-500'}`}
                                />
                                {chapterSearchQuery && (
                                    <button 
                                        onClick={() => setChapterSearchQuery('')} 
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Scrollable Chapter List */}
                            <div className="space-y-2 max-h-[300px] sm:max-h-[480px] overflow-y-auto pr-1.5 custom-scrollbar">
                                {filteredChapters.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <p className="text-xs font-medium text-slate-400">No chapters found</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Try searching with a different keyword</p>
                                    </div>
                                ) : (
                                    filteredChapters.map((chapName, idx) => {
                                        const isChapSelected = activeChapter === chapName;
                                        const chapTopics = activeSubjectData.chapters[chapName]?.topics || {};
                                        const matCount = Object.values(chapTopics).reduce((acc, t) => acc + (t.materials?.length || 0), 0);
                                        const topicsCount = Object.keys(chapTopics).length;

                                        return (
                                            <button
                                                key={chapName}
                                                onClick={() => {
                                                    setActiveChapter(chapName);
                                                    setActiveTopic(null);
                                                }}
                                                className={`w-full p-3 rounded-[5px] text-left transition-all duration-150 border flex items-center justify-between gap-3 cursor-pointer
                                                    ${isChapSelected
                                                        ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                                                        : isDarkMode
                                                            ? 'bg-[#141926] border-white/5 text-slate-300 hover:border-white/15 hover:bg-[#182032]'
                                                            : 'bg-slate-50/80 border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100/80'}`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-7 h-7 rounded-[5px] flex items-center justify-center font-bold text-[10px] shrink-0
                                                        ${isChapSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}>
                                                        {String(idx + 1).padStart(2, '0')}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h5 className="font-bold text-xs uppercase tracking-tight truncate">
                                                            {chapName}
                                                        </h5>
                                                        <p className={`text-[9px] font-medium uppercase tracking-wider mt-0.5 truncate ${isChapSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                                            {topicsCount} {topicsCount === 1 ? 'Topic' : 'Topics'} • {matCount} Files
                                                        </p>
                                                    </div>
                                                </div>

                                                <ChevronRight size={14} className={`shrink-0 transition-transform ${isChapSelected ? 'translate-x-0.5 text-white' : 'text-slate-400'}`} />
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: ACTIVE CHAPTER STUDY MATERIALS (8 of 12 Cols) */}
                        <div className="lg:col-span-8 space-y-4 sm:space-y-5">
                            
                            {/* Chapter Header Banner */}
                            <div className={`p-3.5 sm:p-4 rounded-[5px] border transition-all duration-200
                                ${isDarkMode ? 'bg-[#10141D] border-white/10 shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-[5px] bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                                                {activeSubject}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400 uppercase">
                                                Active Syllabus Module
                                            </span>
                                        </div>
                                        <h2 className={`text-sm sm:text-base md:text-lg font-bold uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {activeChapter || 'Select a Chapter'}
                                        </h2>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-xs font-bold uppercase px-3 py-1 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                            {currentChapterMaterials.length} {currentChapterMaterials.length === 1 ? 'Resource' : 'Resources'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Materials Cards Grid */}
                            {currentChapterMaterials.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center min-h-[240px] rounded-[5px] border border-dashed ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                    <FileText size={30} className="text-slate-400 mb-2 opacity-50" />
                                    <h4 className={`text-sm font-bold uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                        {searchQuery ? 'No matching resources found' : 'No materials uploaded for this chapter'}
                                    </h4>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">
                                        {searchQuery ? 'Try another search keyword' : 'Check other curriculum chapters'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                                    {currentChapterMaterials.map(item => {
                                        const isItemVideo = !!(item.video_link || item.video_file);
                                        const isItemDpp = activeContentType === 'DPP' || !!item.dpp_file;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => { setSelectedItem(item); setViewPage(1); }}
                                                className={`group rounded-[5px] border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col overflow-hidden
                                                ${isDarkMode 
                                                    ? 'bg-[#10141D] border-white/10 hover:border-orange-500/40 hover:bg-[#141926]' 
                                                    : 'bg-white border-slate-200 shadow-xs hover:border-orange-300'}`}
                                            >
                                                {/* Media Thumbnail Container */}
                                                <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center rounded-t-[5px]">
                                                    {item.thumbnail ? (
                                                        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102" />
                                                    ) : (item.video_link && getYouTubeThumbnail(item.video_link)) ? (
                                                        <img src={getYouTubeThumbnail(item.video_link)} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102" />
                                                    ) : item.video_file ? (
                                                        <video src={`${item.video_file}#t=0.1`} preload="metadata" className="w-full h-full object-cover" muted playsInline />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white">
                                                            {isItemVideo ? <PlayCircle size={36} className="text-white opacity-80" /> : <FileText size={36} className="text-white opacity-80" />}
                                                        </div>
                                                    )}

                                                    {/* Format Tag */}
                                                    <div className="absolute top-2 left-2 z-10">
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[8px] font-bold uppercase tracking-wider text-white ${isItemVideo ? 'bg-blue-600' : isItemDpp ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                                                            {isItemVideo ? <PlayCircle size={9} /> : <FileText size={9} />}
                                                            <span>{isItemVideo ? 'Video' : isItemDpp ? 'DPP' : 'Notes'}</span>
                                                        </span>
                                                    </div>

                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-xs">
                                                        <div className="px-3 py-1 rounded-[5px] bg-white/20 border border-white/30 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                                            <Eye size={12} />
                                                            <span>{isItemVideo ? 'Play Lecture' : 'Read Notes'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Content */}
                                                <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[8px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                                                {item.subject_name}
                                                            </span>
                                                            <span className="text-[8px] font-medium text-slate-400 uppercase truncate">
                                                                {item._topicTitle || 'Curriculum'}
                                                            </span>
                                                        </div>
                                                        <h4 className={`font-bold text-xs sm:text-sm uppercase leading-snug line-clamp-2 group-hover:text-orange-500 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                            {item.name}
                                                        </h4>
                                                        {item.description && (
                                                            <p className={`text-[10px] font-normal line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Card Bottom Actions: Launch & AI Quiz */}
                                                    <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1 text-xs font-bold text-orange-500">
                                                            <span className="text-[9px] uppercase font-bold tracking-wider">
                                                                {isItemVideo ? 'Watch' : 'Open'}
                                                            </span>
                                                            <ArrowRight size={11} />
                                                        </div>

                                                        {/* Quick AI Quiz Button on Card (Only for Notes, PDFs, and DPPs) */}
                                                        {!isItemVideo && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenQuizConfig(item);
                                                                }}
                                                                className="px-2.5 py-1 rounded-[5px] bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white dark:text-orange-400 dark:hover:text-white border border-orange-500/20 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                                                title="Generate AI Quiz from document"
                                                            >
                                                                <Zap size={10} className="fill-current" />
                                                                <span>AI Quiz</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default StudyMaterials;
