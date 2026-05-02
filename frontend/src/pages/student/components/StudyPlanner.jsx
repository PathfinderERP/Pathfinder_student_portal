import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Brain, Target, GraduationCap, ChevronLeft, ChevronRight, Activity, Clock, CheckCircle2, XCircle,
    BookOpen, Calculator, Atom, Orbit, Sparkles, Loader2, ArrowRight, Dna,
    Database, Cpu, Network, ShieldCheck, Microscope, Zap, GitBranch, Crosshair, Search, ChevronDown, AlertTriangle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useLocation } from 'react-router-dom';
import StudentPsychometricForm from './StudentPsychometricForm';


const StudyPlanner = ({ isDarkMode, studentData }) => {
    const { getApiUrl, token } = useAuth();
    const navigate = useNavigate();

    const studentClass = studentData?.class?.name || "N/A";

    const CLASSES = [studentClass];

    // Application Flow State: 1: Setup, 2: Test, 3: College/Review, 4: AI Plan
    const [currentStep, setCurrentStep] = useState(1);

    const location = useLocation();

    // Deep-linking for steps
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const step = params.get('step');
        if (step) {
            const stepNum = parseInt(step);
            if (!isNaN(stepNum) && stepNum >= 1 && stepNum <= 4) {
                setCurrentStep(stepNum);
            }
        } else {
            // Reset to Step 1 if no step param is present (e.g. clicking sidebar)
            setCurrentStep(1);
        }
    }, [location.search]);

    // Keep URL in sync with internal step changes
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const currentUrlStep = params.get('step');
        if (params.get('tab') === 'Study Planner' && currentUrlStep !== currentStep.toString()) {
            params.set('step', currentStep.toString());
            navigate({ search: params.toString() }, { replace: true });
        }
    }, [currentStep, navigate]); 

    // Form / Data States
    const [profile, setProfile] = useState({ classLevel: 'N/A', targetExam: '' });

    // New search state for colleges
    const [collegeSearch, setCollegeSearch] = useState('');
    const [isCollegeDropdownOpen, setIsCollegeDropdownOpen] = useState(false);
    const [dynamicColleges, setDynamicColleges] = useState([]);
    const [isSearchingColleges, setIsSearchingColleges] = useState(false);
    const [selectedCollege, setSelectedCollege] = useState(null);
    
    // New states for external data
    const [collegeInfo, setCollegeInfo] = useState(null);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [cutoffData, setCutoffData] = useState([]);
    const [branchDetails, setBranchDetails] = useState([]);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
    const [dismissQuotaAlert, setDismissQuotaAlert] = useState(false);
    const [intelligenceCache, setIntelligenceCache] = useState({});
    const searchTimeout = useRef(null);

    const [filteredColleges, setFilteredColleges] = useState([]);

    const searchColleges = async (query) => {
        if (!query || query.length < 2 || !profile.targetExam) {
            setFilteredColleges([]);
            return;
        }
        
        setIsSearchingColleges(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.post(`${apiUrl}/api/student/ai-mentor/college-search/`, {
                query: query,
                exam_type: profile.targetExam
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setFilteredColleges(response.data || []);
        } catch (error) {
            console.error('Failed to search colleges:', error);
            if (error.response?.status === 429) setIsQuotaExceeded(true);
        } finally {
            setIsSearchingColleges(false);
        }
    };

    const handleSearchChange = (val) => {
        setCollegeSearch(val);
        setIsCollegeDropdownOpen(true);
        
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            searchColleges(val);
        }, 800);
    };

    // Auto-sync profile and fetch tests on load
    useEffect(() => {
        if (studentData) {
            const details = studentData.student?.studentsDetails?.[0] || {};
            const examTagRaw = details.examTag || studentData.examTag || studentData.student?.examTag;
            const tagName = (examTagRaw && typeof examTagRaw === 'object') 
                ? (examTagRaw.name || examTagRaw.tagName) 
                : (typeof examTagRaw === 'string' ? examTagRaw : "");
            
            let mappedExam = "";
            if (tagName) {
                const upperTag = tagName.toUpperCase();
                if (upperTag.includes('NEET')) {
                    mappedExam = 'NEET';
                } else if (upperTag.includes('JEE')) {
                    mappedExam = 'JEE';
                } else {
                    mappedExam = tagName;
                }
            }

            setProfile(prev => ({ 
                ...prev, 
                classLevel: studentData.class?.name || prev.classLevel,
                targetExam: mappedExam
            }));

            // Fetch tests immediately so we know the status on Step 1
            fetchTests();

            // Fetch psychometric profile to see if it already exists
            const fetchPsychometric = async () => {
                try {
                    const apiUrl = getApiUrl();
                    const res = await axios.get(`${apiUrl}/api/student/psychometric-profile/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.data) {
                        setPsychometricResult(res.data);
                    }
                } catch (err) {
                    console.error("Failed to fetch psychometric profile:", err);
                }
            };
            fetchPsychometric();
            
            // Fetch study planner config
            const fetchPlannerConfig = async () => {
                try {
                    const apiUrl = getApiUrl();
                    const res = await axios.get(`${apiUrl}/api/student/study-planner-config/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.data && res.data.target_college) {
                        const collegeObj = res.data.target_college;
                        setPlanConfig(prev => ({ ...prev, targetCollege: collegeObj.name || "" }));
                        setSelectedCollege(collegeObj);
                        setCollegeSearch(collegeObj.name || "");
                    }
                } catch (err) {
                    console.error("Failed to fetch planner config:", err);
                }
            };
            fetchPlannerConfig();
        }
    }, [studentData]);

    const isMedical = profile.targetExam === 'NEET' || profile.classLevel.includes('Med');

    const examQuestions = isMedical
        ? [{ subject: 'Physics' }, { subject: 'Chemistry' }, { subject: 'Biology' }]
        : [{ subject: 'Physics' }, { subject: 'Chemistry' }, { subject: 'Mathematics' }];

    const [tests, setTests] = useState([]);
    const [loadingTests, setLoadingTests] = useState(false);

    const [testScores, setTestScores] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);
    const [analyzingId, setAnalyzingId] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [viewMode, setViewMode] = useState('plan'); // 'plan' or 'solutions'
    const [activeSolutionSection, setActiveSolutionSection] = useState("");
    const [showPsychometric, setShowPsychometric] = useState(false);
    const [psychometricResult, setPsychometricResult] = useState(null);

    const fetchCollegeInfo = async (collegeName) => {
        const cacheKey = `${collegeName}-${profile.targetExam}`;
        if (intelligenceCache[cacheKey]) {
            const cached = intelligenceCache[cacheKey];
            setCollegeInfo({ ...cached.info, validatedCollege: collegeName });
            setCutoffData(cached.cutoffs);
            setBranchDetails(cached.branches);
            return { ...cached.info, validatedCollege: collegeName };
        }

        setLoadingInfo(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.post(`${apiUrl}/api/student/ai-mentor/college-intelligence/`, {
                college_name: collegeName,
                exam_type: profile.targetExam
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = response.data;
            setBranchDetails(data.branches || []);
            setIsQuotaExceeded(false);

            const resultInfo = {
                summary: data.summary,
                location: data.location,
                wikiUrl: data.website || `https://www.google.com/search?q=${encodeURIComponent(collegeName)}`,
                is_compatible: data.is_compatible !== false,
                compatibility_error: data.compatibility_error,
                validatedCollege: collegeName
            };

            setCollegeInfo(resultInfo);
            setCutoffData(data.cutoffs || []);

            setIntelligenceCache(prev => ({
                ...prev,
                [cacheKey]: {
                    info: resultInfo,
                    cutoffs: data.cutoffs || [],
                    branches: data.branches || []
                }
            }));

            return resultInfo;
        } catch (error) {
            console.error('Failed to fetch AI college intelligence:', error);
            
            if (error.response?.status === 429) {
                setIsQuotaExceeded(true);
            }

            const fallback = {
                summary: `Intelligence for ${collegeName} is being synchronized from national databases.`,
                location: "Information currently unavailable",
                is_compatible: false, // Strict mode: Block progression if AI cannot verify
                compatibility_error: "Institutional validation failed due to high server traffic. Please wait a moment and try again.",
                validatedCollege: collegeName
            };
            setCollegeInfo(fallback);
            setCutoffData([]);
            setBranchDetails([]);
            return fallback;
        } finally {
            setLoadingInfo(false);
        }
    };

    const [planConfig, setPlanConfig] = useState({
        targetCollege: ''
    });

    useEffect(() => {
        // AI Validation moved to Proceed button click to save quota and only validate final choice
        if (!planConfig.targetCollege) {
            setCollegeInfo(null);
        }
    }, [planConfig.targetCollege]);

    const [aiLoading, setAiLoading] = useState(false);
    const [aiPlan, setAiPlan] = useState('');

    const [cooldowns, setCooldowns] = useState({});

    // Auto-fetch intelligence if missing on Step 3/4
    useEffect(() => {
        if ((currentStep === 3 || currentStep === 4) && planConfig.targetCollege && !collegeInfo && !loadingInfo) {
            fetchCollegeInfo(planConfig.targetCollege);
        }
    }, [currentStep, planConfig.targetCollege, collegeInfo, loadingInfo]);

    // Countdown Timer Effect
    useEffect(() => {
        const timer = setInterval(() => {
            const newCooldowns = {};
            tests.forEach(test => {
                const tId = test.id || test._id;
                if (test.submission?.submitted_date && tId) {
                    const submittedDate = new Date(test.submission.submitted_date);
                    const unlockDate = new Date(submittedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
                    const now = new Date();
                    const diff = unlockDate - now;

                    if (diff > 0) {
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        newCooldowns[test.id || test._id] = { days, hours, mins, totalMs: diff };
                    }
                }
            });
            setCooldowns(newCooldowns);
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, [tests]);

    const fetchTests = async () => {
        setLoadingTests(true);
        try {
            const apiUrl = getApiUrl();
            const [testsRes, resultsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                axios.get(`${apiUrl}/api/tests/my_results/`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ data: [] }))
            ]);

            const testsData = (testsRes.data || []).filter(test => {
                return test.exam_type_details?.name === 'STUDY PLANNER';
            });
            const resultsData = resultsRes.data || [];

            const mergedData = testsData.map(test => {
                const result = resultsData.find(r => r.code === test.code || r.id === test.id);
                if (result) {
                    return {
                        ...test,
                        submission: {
                            ...(test.submission || {}),
                            score: (result.marks != null && result.total > 0)
                                ? (result.marks / result.total) * 100
                                : (test.submission?.score || 0),
                            rank: result.rank || test.submission?.rank || null,
                            is_finalized: result.is_finalized ?? true,
                            submitted_date: result.submission_date || result.created_at || test.submission?.submitted_date
                        }
                    };
                }
                return {
                    ...test,
                    submission: test.submission ? { ...test.submission, score: test.submission.score || 0 } : null
                };
            });

            // Initial cooldown calculation
            const initialCooldowns = {};
            mergedData.forEach(test => {
                if (test.submission?.submitted_date) {
                    const submittedDate = new Date(test.submission.submitted_date);
                    const unlockDate = new Date(submittedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
                    const diff = unlockDate - new Date();
                    if (diff > 0) {
                        initialCooldowns[test.id || test._id] = {
                            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                            mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                            totalMs: diff
                        };
                    }
                }
            });

            setTests(mergedData);
            setCooldowns(initialCooldowns);
        } catch (error) {
            console.error('Failed to load real exams:', error);
        } finally {
            setLoadingTests(false);
        }
    };

    const generateAIPlan = async () => {
        setAiLoading(true);
        try {
            const apiUrl = getApiUrl();
            const payload = {
                test_id: selectedTest?.id || selectedTest?._id,
                target_college: selectedCollege?.name || planConfig.targetCollege || "Top National Engineering College",
                target_college_obj: selectedCollege,
                class: profile.classLevel || "12",
                total_score: (testScores?.total || 0).toString(),
                math_score: isMedical ? "N/A" : (testScores?.q3Score || 0).toString(),
                physics_score: (testScores?.q1Score || 0).toString(),
                chemistry_score: (testScores?.q2Score || 0).toString(),
                weak_topics: performanceData?.weak_topics || "Concepts requiring accuracy improvement",
                strong_topics: performanceData?.strong_topics || "Foundational conceptual grasp",
                daily_time_hours: "8",
                psychometric_profile: {
                    classification: psychometricResult?.classification,
                    traits: psychometricResult?.traits,
                    summary: psychometricResult?.summary
                },
                section_analysis: testScores?.sections || [],
                exam_name: profile.targetExam,
                request_detail: "Provide a granular 1-year trajectory and a specific 1-month intensive study plan based on the assessment deficit and psychometric profile."
            };

            const response = await axios.post(`${apiUrl}/api/student/ai-mentor/study-plan/`, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data && response.data.ai_plan) {
                setAiPlan(response.data.ai_plan);
                
                // Restore college context if cached
                if (response.data.cached && response.data.target_college) {
                    setSelectedCollege(response.data.target_college);
                    setPlanConfig(prev => ({ ...prev, targetCollege: response.data.target_college.name }));
                }
                
                setCurrentStep(4);
            }
        } catch (error) {
            console.error('Failed to generate AI plan:', error);
            alert("Error generating plan. Please ensure Gemini API Key is configured.");
        } finally {
            setAiLoading(false);
        }
    };

    const resetPlanner = () => {
        setCurrentStep(1);
        setAiPlan('');
        setTestScores(null);
    };

    // Shared Static Side Panel
    const renderSidePanel = () => (
        <div className={`hidden lg:flex flex-col w-[300px] shrink-0 p-6 border-r ${isDarkMode ? 'border-white/5 bg-[#0a0d14]' : 'border-slate-200 bg-slate-50'} min-h-full`}>
            <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-[4px] bg-indigo-600 flex items-center justify-center text-white">
                    <Brain size={20} />
                </div>
                <div>
                    <h2 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Strategy</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">v2.0 Beta Engine</p>
                </div>
            </div>

            <div className="space-y-8 flex-1">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-500/20 pb-2">Evaluation Core</h3>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <Database size={14} className="text-indigo-500" /> Deep Analytics Engine
                        </li>
                        <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <Cpu size={14} className="text-emerald-500" /> Gemini Pro Processing
                        </li>
                        <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <Network size={14} className="text-emerald-500" /> Neural Gap Detection
                        </li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-500/20 pb-2">Global Stats</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-[4px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                            <div className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>1.2M+</div>
                            <div className="text-[9px] font-black uppercase text-slate-500">Plans</div>
                        </div>
                        <div className={`p-3 rounded-[4px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                            <div className={`text-lg font-black text-emerald-500`}>98%</div>
                            <div className="text-[9px] font-black uppercase text-slate-500">Success</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-500/20 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <ShieldCheck size={14} className="text-indigo-500" /> End-to-end encrypted
            </div>
        </div>
    );

    const renderStep1 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar relative">
            {/* Subtle Grid Background */}
            <div className={`absolute inset-0 pointer-events-none ${isDarkMode ? 'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]' : 'bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[24px_24px]'}`}></div>

            <div className="max-w-5xl mx-auto space-y-10 relative z-10">
                {/* Header Sequence Tracker */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-[4px] bg-indigo-600 text-white flex items-center justify-center font-black text-xs">01</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Configuration</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>02</div>
                        <span className={`text-[10px] font-black hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Target</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>03</div>
                        <span className={`text-[10px] font-black hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Assessment</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>04</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Master Plan</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className={`text-3xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Configure Academic Vector
                    </h1>
                    <p className={`text-sm font-bold tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Provide your current standing and objective to initialize the exam sequence.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-[4px] border border-l-4 border-l-indigo-500 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-6">
                            <GraduationCap size={16} /> Select Stage
                        </label>

                        <div className={`p-5 rounded-[4px] border relative overflow-hidden transition-all ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100 flex-1 shadow-inner'}`}>
                            <div className="absolute top-0 right-0 p-2">
                                <div className="bg-indigo-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter shadow-lg">Verified Profile</div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[4px] bg-indigo-600 flex items-center justify-center text-white shadow-xl">
                                    <span className="text-xl font-black">{profile.classLevel.split(' ').pop()}</span>
                                </div>
                                <div>
                                    <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {profile.classLevel}
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Current Standing</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-[4px] border border-l-4 border-l-emerald-500 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4">
                            <Target size={16} /> Primary Objective
                        </label>
                        <div className={`p-5 rounded-[4px] border relative overflow-hidden transition-all ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-indigo-50 flex-1 shadow-inner'}`}>
                            <div className="absolute top-0 right-0 p-2">
                                <div className="bg-emerald-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter shadow-lg">Verified Objective</div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[4px] bg-emerald-600 flex items-center justify-center text-white shadow-xl">
                                    <Target size={24} />
                                </div>
                                <div>
                                    <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {profile.targetExam || "Fetching..."}
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Automated Selection</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resume Shortcut if test already completed */}
                {(() => {
                    const completedTests = tests.filter(t => t.submission?.is_finalized);
                    if (completedTests.length === 0) return null;

                    // Find ANY active cooldown from the global state, or calculate on the fly
                    let activeCooldown = Object.values(cooldowns).find(c => c.totalMs > 0);
                    
                    if (!activeCooldown) {
                        const mostRecentFinalized = completedTests.sort((a,b) => {
                            const dateA = new Date(a.submission?.submitted_date || 0);
                            const dateB = new Date(b.submission?.submitted_date || 0);
                            return dateB - dateA;
                        })[0];
                        
                        if (mostRecentFinalized?.submission?.submitted_date) {
                            activeCooldown = calculateCooldown(mostRecentFinalized.submission.submitted_date);
                        }
                    }
                    
                    return (
                        <div className={`p-6 rounded-[4px] border-2 ${activeCooldown ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'} animate-in fade-in slide-in-from-top-4`}>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-[4px] flex items-center justify-center text-white shadow-lg ${activeCooldown ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                                        {activeCooldown ? <Clock size={24} /> : <Activity size={24} />}
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {activeCooldown ? 'Retake Cooldown Active' : 'Previous Assessment Detected'}
                                        </h4>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                                            {activeCooldown 
                                                ? `The cognitive baseline is locked for ${activeCooldown.days}d ${activeCooldown.hours}h ${activeCooldown.mins}m to ensure strategy implementation.` 
                                                : 'You have already completed your cognitive baseline.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setCurrentStep(3)}
                                        className={`px-6 py-3 rounded-[2px] font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2 ${activeCooldown ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                                    >
                                        View Latest Analysis <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <div className={`p-5 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <Zap size={16} className="text-emerald-500 mb-3" />
                        <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Take Assessment Exam</h4>
                        <p className={`text-[10px] font-bold leading-relaxed opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>A short evaluation exam across core subjects to instantly map your current cognitive baseline.</p>
                    </div>
                    <div className={`p-5 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <Crosshair size={16} className="text-emerald-500 mb-3" />
                        <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Gap Detection</h4>
                        <p className={`text-[10px] font-bold leading-relaxed opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>The AI precisely measures the distance between your baseline and your target institution's threshold.</p>
                    </div>
                    <div className={`p-5 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <GitBranch size={16} className="text-indigo-500 mb-3" />
                        <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Strategy Synthesis</h4>
                        <p className={`text-[10px] font-bold leading-relaxed opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Generates a granular 1-year and 1-month trajectory specifically engineered for your explicit goal.</p>
                    </div>
                </div>

                <div className="pt-8 flex justify-end pb-10 border-t border-slate-500/20">
                    {(() => {
                        // Double-layered check: Check state AND raw tests array
                        const hasActiveCooldownState = Object.values(cooldowns).some(c => c.totalMs > 0);
                        const hasRecentSubmission = tests.some(t => {
                            if (!t.submission?.is_finalized || !t.submission?.submitted_date) return false;
                            const diff = (new Date(t.submission.submitted_date).getTime() + (30 * 24 * 60 * 60 * 1000)) - Date.now();
                            return diff > 0;
                        });

                        if (!hasActiveCooldownState && !hasRecentSubmission) {
                            return (
                                <button 
                                    onClick={() => {
                                        if (!profile.targetExam) {
                                            setAlertMessage("You must define your Primary Objective (JEE or NEET) before the system can initialize your target destination and assessment sequence.");
                                            setShowAlert(true);
                                            return;
                                        }
                                        setCurrentStep(2);
                                    }}
                                    className={`px-10 py-5 rounded-[4px] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-4 group ${
                                        !profile.targetExam 
                                        ? 'bg-slate-500 opacity-50 text-white' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_0_30px_rgba(79,70,229,0.2)] hover:shadow-[0_0_40px_rgba(79,70,229,0.4)]'
                                    }`}
                                >
                                    Define Target Destination <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            );
                        }

                        // Get days from first active cooldown
                        const cd = Object.values(cooldowns).find(c => c.totalMs > 0) || { days: 30 };
                        
                        return (
                            <div className={`px-8 py-4 rounded-[4px] border border-amber-500/20 bg-amber-500/5 text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg`}>
                                <Clock size={16} /> New Assessment Cycle Unlocks in {cd.days} Days
                            </div>
                        );
                    })()}
                </div>
            </div>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header Sequence Tracker */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>01</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Configuration</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-[4px] bg-indigo-600 text-white flex items-center justify-center font-black text-xs">02</div>
                        <span className={`text-[10px] font-black hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Target</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>03</div>
                        <span className={`text-[10px] font-black hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Assessment</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>04</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Master Plan</span>
                    </div>
                </div>

                <div className="flex items-center">
                    <button onClick={() => setCurrentStep(1)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                        <ChevronLeft size={14} /> Back to Configuration
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <h3 className={`text-sm font-black uppercase tracking-tight flex items-center gap-2 mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Target size={18} className="text-emerald-500" /> Target Destination
                        </h3>
                        <div className="space-y-4">
                            <div className="relative">
                                <div className={`flex items-center gap-2 p-3 rounded-[4px] border ${isDarkMode ? 'bg-[#0a0d14] border-white/10' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
                                    <Search size={14} className="text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search top colleges dynamically..."
                                        value={collegeSearch}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        onFocus={() => setIsCollegeDropdownOpen(true)}
                                        className={`bg-transparent border-none outline-none text-xs font-bold w-full ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
                                    />
                                    <button onClick={() => setIsCollegeDropdownOpen(!isCollegeDropdownOpen)} className="p-1 hover:bg-white/10 rounded transition-colors">
                                        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isCollegeDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                                {isCollegeDropdownOpen && (
                                    <div className={`absolute z-20 mt-1 w-full max-h-[200px] overflow-y-auto rounded-[4px] border shadow-2xl ${isDarkMode ? 'bg-[#0a0d14] border-white/10' : 'bg-white border-slate-200'}`}>
                                        {isSearchingColleges && (
                                            <div className="p-4 flex items-center justify-center gap-2">
                                                <Loader2 size={12} className="animate-spin text-indigo-500" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Searching API...</span>
                                            </div>
                                        )}
                                        {filteredColleges.length > 0 ? filteredColleges.map(college => (
                                            <button 
                                                key={college} 
                                                onClick={() => { 
                                                    setPlanConfig({ ...planConfig, targetCollege: college }); 
                                                    setSelectedCollege({ name: college }); // Store as object for AI context
                                                    setCollegeSearch(college); 
                                                    setIsCollegeDropdownOpen(false); 
                                                }} 
                                                className={`w-full p-3 text-left text-[11px] font-bold border-b last:border-b-0 transition-all ${planConfig.targetCollege === college ? 'bg-indigo-600 text-white border-indigo-600' : isDarkMode ? 'border-white/5 hover:bg-white/5 text-slate-400 hover:text-white' : 'border-slate-50 hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}
                                            >
                                                {college}
                                            </button>
                                        )) : !isSearchingColleges && <div className="p-4 text-center text-[10px] font-bold text-slate-500 uppercase">No results found</div>}
                                    </div>
                                )}
                            </div>
                            <div className={`p-4 rounded-[4px] border border-l-4 border-l-indigo-500 ${isDarkMode ? 'bg-indigo-500/5 border-white/10' : 'bg-indigo-50/50 border-slate-200'}`}>
                                <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Current Target</p>
                                <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{planConfig.targetCollege || "No Institution Selected"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Intelligence section removed from here to be shown in Step 4 */}

                <div className="flex justify-end pt-4 border-t border-slate-500/20">
                    <button 
                        onClick={async () => { 
                            if (!planConfig.targetCollege) {
                                setAlertMessage("Please select a target institution from the list to establish your academic benchmark.");
                                setShowAlert(true);
                                return;
                            }
                            
                            // Only validate if we haven't validated this specific college yet
                            let currentInfo = collegeInfo;
                            if (!currentInfo || currentInfo.validatedCollege !== planConfig.targetCollege) {
                                currentInfo = await fetchCollegeInfo(planConfig.targetCollege);
                            }

                            // Now validate based on currentInfo
                            if (currentInfo && currentInfo.is_compatible === false) {
                                setAlertMessage(currentInfo.compatibility_error || `This institution does not appear to accept ${profile.targetExam} for admissions. Please select a compatible college.`);
                                setShowAlert(true);
                                return;
                            }

                            // Save configuration to DB before proceeding
                            try {
                                const apiUrl = getApiUrl();
                                await axios.post(`${apiUrl}/api/student/study-planner-config/`, {
                                    target_college: selectedCollege || { name: planConfig.targetCollege }
                                }, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                            } catch (err) {
                                console.error("Failed to save planner config:", err);
                            }

                            setCurrentStep(3); 
                            fetchTests(); 
                        }} 
                        className={`px-10 py-5 rounded-[4px] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-4 group shadow-lg ${
                            !planConfig.targetCollege
                            ? 'bg-slate-500 opacity-50 text-white' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                    >
                        {loadingInfo ? (
                            <>Analyzing... <Loader2 size={18} className="animate-spin" /></>
                        ) : (
                            <>Proceed to Assessment <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                        )}
                    </button>
                </div>

                {isQuotaExceeded && !dismissQuotaAlert && (
                    <div className="mt-4 p-3 rounded-[4px] border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                                AI Validation is currently offline due to high traffic. Basic verification is active.
                            </p>
                        </div>
                        <button 
                            onClick={() => setDismissQuotaAlert(true)}
                            className="p-1 hover:bg-amber-500/10 rounded-full transition-colors text-amber-500/50 hover:text-amber-500"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Sequence Tracker */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>01</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Configuration</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>02</div>
                        <span className={`text-[10px] font-black hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Target</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-[4px] bg-indigo-600 text-white flex items-center justify-center font-black text-xs">03</div>
                        <span className={`text-[10px] font-black hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Assessment</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>04</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Master Plan</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setCurrentStep(2)} className={`mr-2 p-1 rounded-[4px] border transition-colors ${isDarkMode ? 'border-white/10 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`} title="Go Back">
                            <ChevronLeft size={16} />
                        </button>
                        <Activity className="text-emerald-500" />
                        <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Evaluate Real Exams</h3>
                    </div>
                </div>

                <p className={`text-xs font-bold leading-relaxed mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Choose an active exam set by the institution to establish your baseline. Your target institution is <strong>{planConfig.targetCollege}</strong>.
                </p>

                <div className={`rounded-[4px] border overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                    {loadingTests ? (
                        <div className="p-12 flex justify-center flex-col items-center gap-4">
                            <Loader2 size={32} className="animate-spin text-indigo-500" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Synchronizing Master Database</p>
                        </div>
                    ) : tests.length === 0 ? (
                        <div className="p-12 text-center text-xs font-bold text-slate-500 uppercase">
                            No exams configured by administration
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`text-[9px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    <th className="py-4 px-6">Available Assessments</th>
                                    <th className="py-4 px-6 text-center">Status</th>
                                    <th className="py-4 px-6 text-center">Your Score</th>
                                    <th className="py-4 px-6 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-xs font-bold ${isDarkMode ? 'divide-white/5 text-slate-300' : 'divide-slate-50 text-slate-600'}`}>
                                {tests.map(test => {
                                    const now = new Date();
                                    const isCompleted = test.submission?.is_finalized;
                                    const end = test.end_time ? new Date(test.end_time) : null;
                                    const isExpired = end && now > end;
                                    
                                    const tId = test.id || test._id;
                                    const cooldown = cooldowns[tId];
                                    const isAvailable = !isCompleted && !isExpired && !cooldown;

                                    return (
                                        <tr key={tId} className={`border-b last:border-b-0 ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-50 hover:bg-slate-50/50'} transition-colors`}>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center ${isDarkMode ? 'bg-white/5 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        <BookOpen size={16} />
                                                    </div>
                                                    <div>
                                                        <div className={isDarkMode ? 'text-white' : 'text-slate-900 font-bold'}>{test.name}</div>
                                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{test.duration} Min • {test.total_marks} Marks</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                {isCompleted ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest">Completed</span>
                                                        {cooldown && (
                                                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter flex items-center gap-1">
                                                                <Clock size={10} /> Reset in {cooldown.days}d {cooldown.hours}h
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : isExpired ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-widest">Expired</span>
                                                ) : cooldown ? (
                                                   <div className="flex flex-col items-center gap-1">
                                                       <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest">In Cooldown</span>
                                                       <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">Available in {cooldown.days}d</span>
                                                   </div>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-widest">Active</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className={`text-sm font-black ${isCompleted ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    {isCompleted ? `${Math.floor(Number(test.submission?.score) || 0)}%` : '—'}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                {isCompleted ? (
                                                    <button 
                                                        disabled={analyzingId === tId}
                                                        onClick={async () => {
                                                            setAnalyzingId(tId);
                                                            setSelectedTest(test);
                                                            const score = Math.floor(test.submission?.score || 0);
                                                            
                                                            let sectionScores = [];
                                                            try {
                                                                const res = await axios.get(`${getApiUrl()}/api/tests/${tId}/student_performance/`, {
                                                                    headers: { Authorization: `Bearer ${token}` }
                                                                });
                                                                if (res.data.section_stats) {
                                                                    sectionScores = res.data.section_stats.map(s => ({
                                                                        name: s.name,
                                                                        score: s.total_max > 0 ? (s.net_marks / s.total_max) * 100 : 0
                                                                    }));
                                                                }
                                                                setPerformanceData(res.data);
                                                                if (res.data.all_section_names?.length > 0) {
                                                                    setActiveSolutionSection(res.data.all_section_names[0]);
                                                                }
                                                            } catch (err) {
                                                                console.error("Error fetching performance:", err);
                                                            }

                                                            setTestScores({ 
                                                                total: score, 
                                                                sections: sectionScores,
                                                                q1Score: score, q2Score: score, q3Score: score 
                                                            });
                                                            setAnalyzingId(null);
                                                            if (psychometricResult) {
                                                                setCurrentStep(4);
                                                            } else {
                                                                setShowPsychometric(true);
                                                            }
                                                        }} 
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-[2px] font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
                                                    >
                                                        {analyzingId === tId ? <Loader2 size={12} className="animate-spin" /> : null}
                                                        {analyzingId === tId ? 'Analyzing...' : 'Analyze Result'}
                                                    </button>
                                                ) : isAvailable ? (
                                                    <button onClick={() => navigate(`/student/exam/instructions/${test.id}`)} className="px-4 py-2 bg-emerald-600 text-white rounded-[2px] font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md">
                                                        Launch Exam
                                                    </button>
                                                ) : (
                                                    <button disabled className="px-4 py-2 bg-slate-500 opacity-50 text-white rounded-[2px] font-black text-[9px] uppercase tracking-widest cursor-not-allowed">
                                                        {cooldown ? 'Locked' : 'Unavailable'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header Sequence Tracker */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>01</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Configuration</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>02</div>
                        <span className={`text-[10px] font-black hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Target</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>03</div>
                        <span className={`text-[10px] font-black hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Assessment</span>
                    </div>
                    <div className={`flex-1 h-px mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-[4px] bg-indigo-600 text-white flex items-center justify-center font-black text-xs">04</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Master Plan</span>
                    </div>
                </div>

                <div className="mb-4">
                    <button onClick={() => setCurrentStep(3)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                        <ChevronLeft size={14} /> Back to Assessment
                    </button>
                </div>

                {/* Results Header (If test taken) */}
                {testScores && (
                    <div className="space-y-8">
                        <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'} relative overflow-hidden`}>
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                    <div className="w-32 h-32 shrink-0 rounded-[4px] bg-[#0a0d14] border border-white/10 flex flex-col items-center justify-center text-white relative outline-2 outline-offset-4 outline-indigo-500/50">
                                        <span className="text-4xl font-black">
                                            {Math.round(
                                                performanceData?.accuracy ?? 
                                                (testScores?.sections?.length > 0 
                                                    ? testScores.sections.reduce((acc, s) => acc + (s.score || 0), 0) / testScores.sections.length
                                                    : testScores?.total || 0)
                                            )}%
                                        </span>
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-1">Accuracy</span>
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="px-2 py-0.5 bg-indigo-500 text-white text-[8px] font-black uppercase rounded-full">Psychometric Profile</div>
                                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{psychometricResult?.classification || "Evaluating..."}</span>
                                            </div>
                                            <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                <CheckCircle2 className="text-emerald-500" /> Assessment Analyzed
                                            </h2>
                                            <p className={`text-xs font-bold leading-relaxed mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Baseline established against <strong>{planConfig.targetCollege}</strong> thresholds.
                                            </p>
                                        </div>
                                    <div className={`grid gap-4 p-4 rounded-[4px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 ${
                                        (testScores?.sections?.length || 3) > 3 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'
                                    }`}>
                                        {(testScores?.sections?.length > 0 ? testScores.sections : examQuestions).map((sec, idx) => {
                                            const name = sec.name || sec.subject;
                                            const score = sec.score !== undefined ? sec.score : (idx === 0 ? testScores?.q1Score : idx === 1 ? testScores?.q2Score : testScores?.q3Score);
                                            return (
                                                <div key={idx}>
                                                    <span className="block text-[9px] font-black uppercase opacity-60 mb-1 truncate" title={name}>{name}</span>
                                                    <span className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Math.round(score || 0)}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Intelligence & Gap Analysis */}
                        <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-lg'}`}>
                            <div className="flex flex-col lg:flex-row gap-8">
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center gap-4">
                                        {collegeInfo?.thumbnail && <img src={collegeInfo.thumbnail} alt="College" className="w-16 h-16 rounded-[4px] object-cover border border-white/10" />}
                                        <div>
                                            <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{planConfig.targetCollege}</h3>
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{collegeInfo?.location || 'Fetching intelligence...'}</p>
                                        </div>
                                    </div>
                                    
                                    {/* GAP ANALYSIS METRIC */}
                                    {collegeInfo?.required_percentage && (
                                        <div className={`p-6 rounded-[4px] border-2 ${testScores.total >= collegeInfo.required_percentage ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Baseline Gap Analysis</h4>
                                                <Crosshair size={14} className={testScores.total >= collegeInfo.required_percentage ? 'text-emerald-500' : 'text-rose-500'} />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <span className="block text-[9px] font-black uppercase opacity-60 mb-1">Required Score</span>
                                                        <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{collegeInfo.required_percentage}%</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-[9px] font-black uppercase opacity-60 mb-1">Status</span>
                                                        <span className={`text-xs font-black uppercase tracking-widest ${testScores.total >= collegeInfo.required_percentage ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {testScores.total >= collegeInfo.required_percentage ? 'Within Threshold' : `-${(collegeInfo.required_percentage - testScores.total).toFixed(1)}% Deficit`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`h-2 w-full rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'} overflow-hidden relative`}>
                                                    <div className="absolute top-0 bottom-0 w-px bg-white z-10" style={{ left: `${collegeInfo.required_percentage}%` }} />
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${testScores.total}%` }} className={`h-full ${testScores.total >= collegeInfo.required_percentage ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                </div>
                                                <p className={`text-[10px] font-bold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {testScores.total >= collegeInfo.required_percentage 
                                                        ? `Your baseline accuracy exceeds the current admission threshold for ${planConfig.targetCollege}. Optimization should focus on consistency.`
                                                        : `You are currently ${(collegeInfo.required_percentage - testScores.total).toFixed(1)}% below the target institutional threshold. Critical concept reinforcement required.`}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {loadingInfo ? (
                                        <div className="flex items-center gap-3 py-4 animate-pulse">
                                            <Loader2 size={16} className="animate-spin text-indigo-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Synthesizing institutional intelligence...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{collegeInfo?.summary}</p>
                                            <a href={collegeInfo?.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline">View Official Records <ArrowRight size={12} /></a>
                                        </div>
                                    )}
                                </div>
                                <div className={`w-full lg:w-[350px] p-6 rounded-[4px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-200'}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>10-Year Cutoff Matrix</h4>
                                        <Activity size={14} className="text-emerald-500" />
                                    </div>
                                    
                                    {loadingInfo ? (
                                        <div className="h-[200px] flex flex-col items-center justify-center gap-4 border border-dashed border-slate-500/20 rounded-[4px]">
                                            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center px-6">Parsing historical archives...</span>
                                        </div>
                                    ) : cutoffData.length > 0 ? (
                                        <div className="space-y-5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                            {cutoffData.slice().reverse().map((item, idx) => (
                                                <div key={item.year} className="space-y-2">
                                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wide">
                                                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{item.year}</span>
                                                        <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>{Math.round(item.value)} {profile.targetExam === 'NEET' ? 'Marks' : 'Rank'}</span>
                                                    </div>
                                                    <div className={`h-1.5 w-full rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'} overflow-hidden`}>
                                                        <div className={`h-full ${profile.targetExam === 'NEET' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${(item.value / (profile.targetExam === 'NEET' ? 720 : 2000)) * 100}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-[100px] flex items-center justify-center text-[10px] font-black text-slate-500 uppercase border border-dashed border-slate-500/10 rounded-[4px]">
                                            No historical data retrieved
                                        </div>
                                    )}
                                    
                                    <div className="mt-8 pt-4 border-t border-slate-500/10">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed italic">* Historical {profile.targetExam} archives ({new Date().getFullYear() - 10}-{new Date().getFullYear() - 1}).</p>
                                    </div>
                                </div>
                            </div>

                            {/* Branch Details Table - NEW AI INTEGRATION */}
                            {branchDetails.length > 0 && (
                                <div className={`mt-8 pt-8 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            Branch-wise Opening & Closing Ranks
                                        </h4>
                                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase">
                                            AI Verified Data
                                        </div>
                                    </div>
                                    <div className={`overflow-hidden rounded-[4px] border ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50/30'}`}>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                                    <th className="py-3 px-4">Branch / Discipline</th>
                                                    <th className="py-3 px-4 text-center">Opening Rank</th>
                                                    <th className="py-3 px-4 text-center">Closing Rank</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {branchDetails.map((branch, idx) => (
                                                    <tr key={idx} className={`border-t ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-50 hover:bg-white'} transition-colors`}>
                                                        <td className="py-3 px-4">{branch.branch}</td>
                                                        <td className="py-3 px-4 text-center text-emerald-500">{branch.opening || '--'}</td>
                                                        <td className="py-3 px-4 text-center text-indigo-500">{branch.closing || '--'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="mt-4 text-[9px] font-bold text-slate-500 uppercase italic">
                                        * Ranks are based on previous year's {profile.targetExam} statistics. AI models may provide approximations.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-500/20 gap-4">
                    <div>
                        <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {viewMode === 'plan' ? (
                                <><Brain className="text-indigo-500" size={32} /> Master Strategy Vector</>
                            ) : (
                                <><Target className="text-emerald-500" size={32} /> Detailed Solutions</>
                            )}
                        </h1>
                        <div className="flex items-center gap-4 mt-3">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-[2px]">Target: {planConfig.targetCollege}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {performanceData && (
                            <button 
                                onClick={() => setViewMode(viewMode === 'plan' ? 'solutions' : 'plan')} 
                                className={`px-6 py-3 rounded-[4px] border text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                            >
                                {viewMode === 'plan' ? 'View Correct Answers' : 'Back to Strategy Plan'}
                            </button>
                        )}
                        {viewMode === 'plan' && !aiPlan && testScores && (
                            <button onClick={generateAIPlan} disabled={aiLoading} className={`px-6 py-3 rounded-[4px] bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50`}>
                                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {aiLoading ? 'Synthesizing...' : 'Synthesize Master Plan'}
                            </button>
                        )}
                    </div>
                </div>

                {viewMode === 'plan' ? (
                    aiPlan && (
                        <div className={`p-8 md:p-12 rounded-[4px] border relative ${isDarkMode ? 'bg-[#0a0d14] border-white/10 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
                            <div className={`prose prose-sm md:prose-base max-w-none relative z-10 
                                ${isDarkMode ? 'prose-invert prose-headings:text-white prose-p:text-slate-400 prose-strong:text-white prose-li:text-slate-400 prose-hr:border-white/10' : 'prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-hr:border-slate-200'}
                                prose-h2:font-black prose-h2:text-2xl prose-h2:uppercase prose-h2:tracking-tight prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-4 prose-h2:border-b prose-h2:border-slate-500/20
                                prose-h3:font-bold prose-h3:text-lg prose-h3:text-indigo-500 prose-h3:uppercase prose-h3:tracking-wide
                                prose-a:text-emerald-500
                                prose-blockquote:border-l-4 prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:p-4 prose-blockquote:rounded-r-[4px] prose-blockquote:font-medium prose-blockquote:not-italic
                                prose-ul:list-square
                            `}>
                                <ReactMarkdown>{aiPlan}</ReactMarkdown>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="space-y-6">
                        {/* Section Tabs for Solutions */}
                        <div className={`flex overflow-x-auto gap-2 border-b pb-2 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                            {performanceData?.all_section_names?.map(name => (
                                <button
                                    key={name}
                                    onClick={() => setActiveSolutionSection(name)}
                                    className={`px-4 py-2 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeSolutionSection === name
                                            ? 'bg-indigo-600 text-white'
                                            : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>

                        {/* Questions List */}
                        <div className="space-y-6">
                            {(performanceData?.section_questions?.[activeSolutionSection] || []).map((q, idx) => (
                                <div key={idx} className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Question {idx + 1}</span>
                                        {(() => {
                                            const isCorrect = q.result === 'CA' || q.is_correct;
                                            const isUnattempted = q.result === 'NA' || q.is_unattempted;
                                            const isPartial = q.result === 'PA';
                                            
                                            return (
                                                <div className={`px-2 py-1 rounded-[2px] text-[9px] font-black uppercase ${
                                                    isCorrect ? 'bg-emerald-500/10 text-emerald-500' : 
                                                    isPartial ? 'bg-amber-500/10 text-amber-500' :
                                                    isUnattempted ? 'bg-slate-500/10 text-slate-500' : 'bg-rose-500/10 text-rose-500'
                                                }`}>
                                                    {isCorrect ? 'Correct' : isPartial ? 'Partial' : isUnattempted ? 'Unattempted' : 'Incorrect'}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className={`text-sm font-bold mb-6 leading-relaxed ${isDarkMode ? 'text-white' : 'text-slate-800'}`} dangerouslySetInnerHTML={{ __html: q.content || q.question_text }} />
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {q.options?.map((opt, oIdx) => {
                                            const optLabel = ['A','B','C','D','E','F'][oIdx];
                                            const uAnsOpts = Array.isArray(q.user_answer) 
                                                ? q.user_answer.map(x => String(x).toLowerCase().trim()) 
                                                : (q.user_answer ? [String(q.user_answer).toLowerCase().trim()] : []);
                                            
                                            const isYours = uAnsOpts.some(ans => 
                                                ans === String(opt.id).toLowerCase() || 
                                                ans === optLabel?.toLowerCase() || 
                                                (opt.content && ans === String(opt.content).replace(/(<([^>]+)>)/gi, "").toLowerCase())
                                            ) || opt.id === q.student_answer_id;

                                            const correctOptionsArr = Array.isArray(q.correct_options) ? q.correct_options : [];
                                            const isCorrectOpt = correctOptionsArr.some(c => String(c).toLowerCase() === String(opt.id).toLowerCase()) 
                                                || opt.is_correct || opt.id === q.correct_option_id;
                                            
                                            return (
                                                <div 
                                                    key={oIdx} 
                                                    className={`p-4 rounded-[4px] border text-xs font-bold transition-all flex items-center justify-between ${
                                                        isCorrectOpt ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                        isYours && !isCorrectOpt ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                                        isDarkMode ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
                                                    }`}
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-start gap-2">
                                                            <span className="opacity-50 shrink-0">{optLabel}.</span>
                                                            <div className="flex-1 overflow-hidden" dangerouslySetInnerHTML={{ __html: opt.content || opt.text }} />
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 ml-6">
                                                            {isCorrectOpt && <span className="text-[8px] uppercase tracking-widest font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-[1px]">Correct Answer</span>}
                                                            {isYours && <span className={`text-[8px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-[1px] ${isCorrectOpt ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'}`}>Your Answer</span>}
                                                        </div>
                                                    </div>
                                                    {isCorrectOpt && <CheckCircle2 size={14} className="shrink-0" />}
                                                    {isYours && !isCorrectOpt && <XCircle size={14} className="shrink-0" />}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {q.solution && (
                                        <div className={`mt-6 p-4 rounded-[4px] ${isDarkMode ? 'bg-indigo-500/5 text-slate-400' : 'bg-indigo-50 text-slate-600'}`}>
                                            <span className="block text-[9px] font-black uppercase text-indigo-500 mb-2">Solution Logic</span>
                                            <div className="text-xs font-bold leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: q.solution }} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );

    return (
        <div className={`flex flex-col lg:flex-row h-full min-h-[800px] rounded-[4px] border overflow-hidden ${isDarkMode ? 'bg-[#050505] border-white/10' : 'bg-white border-slate-200'}`}>
            {renderSidePanel()}
            <AnimatePresence mode="wait">
                {currentStep === 1 && <motion.div key="s1" exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">{renderStep1()}</motion.div>}
                {currentStep === 2 && <motion.div key="s2" exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">{renderStep2()}</motion.div>}
                {currentStep === 3 && <motion.div key="s3" exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">{renderStep3()}</motion.div>}
                {currentStep === 4 && <motion.div key="s4" exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">{renderStep4()}</motion.div>}
            </AnimatePresence>

            {/* Custom Sliding Alert (Toast Style) - Rendered via Portal to escape stacking context */}
            {showAlert && createPortal(
                <div className="fixed top-8 right-8 z-[10000] w-full max-w-sm pointer-events-none">
                    <AnimatePresence>
                        {showAlert && (
                            <motion.div 
                                initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
                                className={`overflow-hidden rounded-[4px] border shadow-2xl pointer-events-auto ${isDarkMode ? 'bg-[#0a0d14] border-white/20' : 'bg-white border-slate-300'}`}
                            >
                                <div className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                                            <AlertTriangle className="text-rose-500" size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Selection Required</h3>
                                            <p className={`text-[10px] font-bold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {alertMessage}
                                            </p>
                                        </div>
                                        <button onClick={() => setShowAlert(false)} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button 
                                            onClick={() => setShowAlert(false)}
                                            className="px-4 py-2 bg-rose-600 text-white rounded-[2px] font-black text-[9px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg"
                                        >
                                            Got it
                                        </button>
                                    </div>
                                </div>
                                {/* Auto-close Progress Bar */}
                                <div className="h-1 w-full bg-rose-500/10">
                                    <motion.div 
                                        initial={{ width: "100%" }}
                                        animate={{ width: "0%" }}
                                        transition={{ duration: 5, ease: "linear" }}
                                        onAnimationComplete={() => setShowAlert(false)}
                                        className="h-full bg-rose-500"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>,
                document.body
            )}

            {showPsychometric && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className={`w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden shadow-2xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                    >
                        <StudentPsychometricForm 
                            isDarkMode={isDarkMode} 
                            studentData={studentData}
                            onSubmit={async (res) => {
                                try {
                                    const apiUrl = getApiUrl();
                                    const saveRes = await axios.post(`${apiUrl}/api/student/psychometric-profile/`, res, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    setPsychometricResult(saveRes.data);
                                    setShowPsychometric(false);
                                    setCurrentStep(4);
                                } catch (err) {
                                    console.error("Failed to save psychometric profile:", err);
                                    // Fallback to local state if backend fails
                                    setPsychometricResult(res);
                                    setShowPsychometric(false);
                                    setCurrentStep(4);
                                }
                            }}
                        />
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default StudyPlanner;
