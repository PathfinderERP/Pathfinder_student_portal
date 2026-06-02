import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Brain, Target, GraduationCap, ChevronLeft, ChevronRight, Activity, CheckCircle2, XCircle,
    BookOpen, Calculator, Atom, Orbit, Sparkles, Loader2, ArrowRight, Dna,
    Database, Cpu, Network, ShieldCheck, Microscope, Zap, GitBranch, Crosshair, Search, ChevronDown, AlertTriangle, X, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { getMyResults } from '../../../services/resultsService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import StudentPsychometricForm from './StudentPsychometricForm';


const StudyPlanner = ({ isDarkMode, studentData }) => {
    const { getApiUrl, token } = useAuth();
    const navigate = useNavigate();

    const studentClass = studentData?.class?.name || "N/A";

    const CLASSES = [studentClass];

    const CAREER_OPTIONS = [
        { value: "Computer Science & AI", label: "Computer Science & AI" },
        { value: "Information Technology", label: "Information Technology" },
        { value: "Electronics & Communication", label: "Electronics & Communication" },
        { value: "Electrical Engineering", label: "Electrical Engineering" },
        { value: "Mechanical Engineering", label: "Mechanical Engineering" },
        { value: "Civil Engineering", label: "Civil Engineering" },
        { value: "Chemical Engineering", label: "Chemical Engineering" },
        { value: "Aerospace Engineering", label: "Aerospace Engineering" },
        { value: "Marine Engineering", label: "Marine Engineering" },
        { value: "Medicine (MBBS)", label: "Medicine (MBBS)" },
        { value: "Dental (BDS)", label: "Dental (BDS)" },
        { value: "Pharmacy", label: "Pharmacy" },
        { value: "Architecture", label: "Architecture" },
        { value: "Data Science & Analytics", label: "Data Science & Analytics" },
        { value: "Biotechnology", label: "Biotechnology" },
        { value: "Psychology", label: "Psychology" },
        { value: "Economics", label: "Economics" },
        { value: "Law", label: "Law" },
        { value: "Commerce & Finance", label: "Commerce & Finance" },
        { value: "Pure Sciences / Research", label: "Pure Sciences / Research" }
    ];

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const loadColleges = async (inputValue) => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.post(`${apiUrl}/api/student/ai-mentor/college-search/`, {
                query: inputValue || "",
                exam_type: profile.targetExam || "JEE"
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = response.data || [];
            return data.map(college => ({ value: college, label: college }));
        } catch (error) {
            console.error('Failed to search colleges:', error);
            if (error.response?.status === 429) setIsQuotaExceeded(true);
            return [];
        }
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
                    if (res.data) {
                        if (res.data.target_college) {
                            const collegeObj = res.data.target_college;
                            setPlanConfig(prev => ({ ...prev, targetCollege: collegeObj.name || "", targetCareer: res.data.target_career || "" }));
                            setSelectedCollege(collegeObj);
                            setCollegeSearch(collegeObj.name || "");
                        }
                        // Track whether the student already has a previous master plan
                        if (res.data.has_previous_plan) {
                            setHasPreviousPlan(true);
                        }
                        if (res.data.latest_plan) {
                            setAiPlan(res.data.latest_plan.content);
                            // Initial check: if no test selected yet, or if matches
                            if (selectedTest && (selectedTest.id === res.data.latest_plan.test_id)) {
                                setPlanSavedForCurrentTest(true);
                            }
                        }
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
    const [viewMode, setViewMode] = useState('cutoff'); // 'cutoff', 'solutions', 'plan'
    const [activeSolutionSection, setActiveSolutionSection] = useState("");
    const [showPsychometric, setShowPsychometric] = useState(false);
    const [psychometricResult, setPsychometricResult] = useState(null);
    const [hasPreviousPlan, setHasPreviousPlan] = useState(false); // true if any plan ever saved in DB
    const [planSavedForCurrentTest, setPlanSavedForCurrentTest] = useState(false); // true once plan is saved/loaded for this specific exam

    // Auto-fetch/Synthesize Master Plan logic
    useEffect(() => {
        if (!selectedTest || !testScores) return;
        
        const tId = selectedTest.id || selectedTest._id;
        
        // If we don't have ANY plan yet, auto-synthesize for the first time
        if (!hasPreviousPlan && !aiPlan && !aiLoading) {
            console.log("[Plan] No previous plan found. Auto-synthesizing for first assessment...");
            generateAIPlan(false);
            return;
        }

        // If we have a plan, check if it belongs to THIS test
        // The backend generate_ai_study_plan (POST) with is_update_request=false 
        // will return the cached plan if it exists for this test_id.
        const checkCurrentTestPlan = async () => {
            if (planSavedForCurrentTest || aiLoading) return;
            
            try {
                const apiUrl = getApiUrl();
                // We call the same endpoint; if cached it's fast and doesn't use quota
                const res = await axios.post(`${apiUrl}/api/student/ai-mentor/study-plan/`, {
                    test_id: tId,
                    is_update_request: false
                }, { headers: { Authorization: `Bearer ${token}` } });
                
                if (res.data && res.data.cached) {
                    setAiPlan(res.data.ai_plan);
                    setPlanSavedForCurrentTest(true);
                }
            } catch (err) {
                console.error("[Plan] Error checking for current test plan:", err);
            }
        };

        checkCurrentTestPlan();
    }, [selectedTest, testScores, hasPreviousPlan]);


    // --- College Logo Helper ---
    // Maps common Indian engineering/medical college names to their official domains
    const COLLEGE_DOMAIN_MAP = {
        'indian institute of technology bombay': 'iitb.ac.in',
        'indian institute of technology delhi': 'iitd.ac.in',
        'indian institute of technology madras': 'iitm.ac.in',
        'indian institute of technology kanpur': 'iitk.ac.in',
        'indian institute of technology kharagpur': 'iitkgp.ac.in',
        'indian institute of technology roorkee': 'iitr.ac.in',
        'indian institute of technology guwahati': 'iitg.ac.in',
        'indian institute of technology hyderabad': 'iith.ac.in',
        'indian institute of technology jodhpur': 'iitj.ac.in',
        'indian institute of technology bhubaneswar': 'iitbbs.ac.in',
        'indian institute of technology indore': 'iiti.ac.in',
        'national institute of technology trichy': 'nitt.edu',
        'national institute of technology warangal': 'nitw.ac.in',
        'national institute of technology surathkal': 'nitk.ac.in',
        'national institute of technology calicut': 'nitc.ac.in',
        'bits pilani': 'bits-pilani.ac.in',
        'vellore institute of technology': 'vit.ac.in',
        'aiims delhi': 'aiims.edu',
        'aiims new delhi': 'aiims.edu',
        'armed forces medical college': 'afmc.nic.in',
        'christian medical college': 'cmch-vellore.edu',
    };

    const COLLEGE_URL_MAP = {
        'indian institute of technology bombay': 'https://www.iitb.ac.in',
        'indian institute of technology delhi': 'https://home.iitd.ac.in',
        'indian institute of technology madras': 'https://www.iitm.ac.in',
        'indian institute of technology kanpur': 'https://www.iitk.ac.in',
        'indian institute of technology kharagpur': 'https://www.iitkgp.ac.in',
        'indian institute of technology roorkee': 'https://www.iitr.ac.in',
        'indian institute of technology guwahati': 'https://www.iitg.ac.in',
        'indian institute of technology hyderabad': 'https://www.iith.ac.in',
        'indian institute of technology jodhpur': 'https://www.iitj.ac.in',
        'indian institute of technology bhubaneswar': 'https://www.iitbbs.ac.in',
        'indian institute of technology indore': 'https://www.iiti.ac.in',
        'national institute of technology trichy': 'https://www.nitt.edu',
        'national institute of technology warangal': 'https://www.nitw.ac.in',
        'national institute of technology surathkal': 'https://www.nitk.ac.in',
        'national institute of technology calicut': 'https://www.nitc.ac.in',
        'bits pilani': 'https://www.bits-pilani.ac.in',
        'vellore institute of technology': 'https://vit.ac.in',
        'aiims delhi': 'https://www.aiims.edu',
        'aiims new delhi': 'https://www.aiims.edu',
        'armed forces medical college': 'https://www.afmc.nic.in',
        'christian medical college': 'https://www.cmch-vellore.edu',
        'delhi technological university': 'https://www.dtu.ac.in',
        'jadavpur university': 'https://jadavpuruniversity.in',
        'anna university': 'https://www.annauniv.edu',
        'psg college of technology': 'https://www.psgtech.edu',
    };

    const getCollegeUrl = (name = '') => {
        const key = name.toLowerCase().trim();
        if (COLLEGE_URL_MAP[key]) return COLLEGE_URL_MAP[key];
        const domain = COLLEGE_DOMAIN_MAP[key];
        if (domain) return `https://www.${domain}`;
        return null;
    };


    const getCollegeDomain = (name = '') => {
        const key = name.toLowerCase().trim();
        return COLLEGE_DOMAIN_MAP[key] || null;
    };


    // Direct Wikipedia Commons logo URLs — verified, stable
    const COLLEGE_LOGO_MAP = {
        'indian institute of technology bombay':    'https://upload.wikimedia.org/wikipedia/en/thumb/b/b2/IIT_Bombay_Logo.svg/400px-IIT_Bombay_Logo.svg.png',
        'iit bombay':                               'https://upload.wikimedia.org/wikipedia/en/thumb/b/b2/IIT_Bombay_Logo.svg/400px-IIT_Bombay_Logo.svg.png',
        'indian institute of technology delhi':     'https://upload.wikimedia.org/wikipedia/en/thumb/f/fd/Indian_Institute_of_Technology_Delhi_Logo.svg/400px-Indian_Institute_of_Technology_Delhi_Logo.svg.png',
        'iit delhi':                                'https://upload.wikimedia.org/wikipedia/en/thumb/f/fd/Indian_Institute_of_Technology_Delhi_Logo.svg/400px-Indian_Institute_of_Technology_Delhi_Logo.svg.png',
        'indian institute of technology madras':    'https://upload.wikimedia.org/wikipedia/en/thumb/6/69/IIT_Madras_Logo.svg/400px-IIT_Madras_Logo.svg.png',
        'iit madras':                               'https://upload.wikimedia.org/wikipedia/en/thumb/6/69/IIT_Madras_Logo.svg/400px-IIT_Madras_Logo.svg.png',
        'indian institute of technology kanpur':    'https://upload.wikimedia.org/wikipedia/en/thumb/b/b8/IIT_Kanpur_Logo.svg/400px-IIT_Kanpur_Logo.svg.png',
        'iit kanpur':                               'https://upload.wikimedia.org/wikipedia/en/thumb/b/b8/IIT_Kanpur_Logo.svg/400px-IIT_Kanpur_Logo.svg.png',
        'indian institute of technology kharagpur': 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1c/IIT_Kharagpur_Logo.svg/400px-IIT_Kharagpur_Logo.svg.png',
        'iit kharagpur':                            'https://upload.wikimedia.org/wikipedia/en/thumb/1/1c/IIT_Kharagpur_Logo.svg/400px-IIT_Kharagpur_Logo.svg.png',
        'indian institute of technology roorkee':   'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/IIT_Roorkee_Logo.svg/400px-IIT_Roorkee_Logo.svg.png',
        'iit roorkee':                              'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/IIT_Roorkee_Logo.svg/400px-IIT_Roorkee_Logo.svg.png',
        'indian institute of technology guwahati':  'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/IIT_Guwahati_Logo.svg/400px-IIT_Guwahati_Logo.svg.png',
        'iit guwahati':                             'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/IIT_Guwahati_Logo.svg/400px-IIT_Guwahati_Logo.svg.png',
        'national institute of technology trichy':  'https://upload.wikimedia.org/wikipedia/en/thumb/a/ad/National_Institute_of_Technology%2C_Tiruchirappalli_logo.svg/400px-National_Institute_of_Technology%2C_Tiruchirappalli_logo.svg.png',
        'nit trichy':                               'https://upload.wikimedia.org/wikipedia/en/thumb/a/ad/National_Institute_of_Technology%2C_Tiruchirappalli_logo.svg/400px-National_Institute_of_Technology%2C_Tiruchirappalli_logo.svg.png',
        'bits pilani':                              'https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/BITS_Pilani-Logo.svg/400px-BITS_Pilani-Logo.svg.png',
        'vellore institute of technology':          'https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/Vellore_Institute_of_Technology_seal_2017.svg/400px-Vellore_Institute_of_Technology_seal_2017.svg.png',
        'vit vellore':                              'https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/Vellore_Institute_of_Technology_seal_2017.svg/400px-Vellore_Institute_of_Technology_seal_2017.svg.png',
        'aiims delhi':                              'https://upload.wikimedia.org/wikipedia/en/thumb/6/62/AIIMS_Delhi.png/400px-AIIMS_Delhi.png',
        'aiims new delhi':                          'https://upload.wikimedia.org/wikipedia/en/thumb/6/62/AIIMS_Delhi.png/400px-AIIMS_Delhi.png',
    };


    const getCollegeLogo = (name = '') => COLLEGE_LOGO_MAP[name.toLowerCase().trim()] || null;

    const CollegeLogo = ({ name, size = 56, aiLogoUrl = null }) => {
        const [srcIndex, setSrcIndex] = useState(0);
        const initials = (name || '').split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'C';
        const staticLogo = getCollegeLogo(name);
        const domain = getCollegeDomain(name);

        // Build waterfall: Static Map -> AI URL -> Google Favicon -> DuckDuckGo -> initials
        const sources = [
            staticLogo,
            aiLogoUrl,
            domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null,
            domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : null
        ].filter(Boolean);

        // Reset waterfall if name or aiLogoUrl changes
        useEffect(() => {
            setSrcIndex(0);
        }, [name, aiLogoUrl]);

        const currentSrc = sources[srcIndex];

        if (!currentSrc || srcIndex >= sources.length) {
            return (
                <div
                    style={{ width: size, height: size, fontSize: size * 0.33 }}
                    className="shrink-0 rounded-[6px] flex items-center justify-center font-black text-white bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg border border-white/10"
                >
                    {initials}
                </div>
            );
        }

        return (
            <img
                key={`${name}-${srcIndex}`}
                src={currentSrc}
                alt={name}
                onError={() => setSrcIndex(i => i + 1)}
                style={{ width: size, height: size }}
                className="shrink-0 rounded-[6px] object-contain bg-white p-1.5 border border-slate-200 shadow-md"
            />
        );
    };




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

            const isServiceNotConfigured = error.response?.status === 503;
            const fallback = {
                summary: `Intelligence for ${collegeName} is being synchronized from national databases.`,
                location: "Information currently unavailable",
                is_compatible: false, // Strict mode: Block progression if AI cannot verify
                compatibility_error: isServiceNotConfigured
                    ? "AI validation is temporarily unavailable. Please contact support."
                    : "Institutional validation failed due to high server traffic. Please wait a moment and try again.",
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
        targetCollege: '',
        targetCareer: ''
    });

    useEffect(() => {
        // AI Validation moved to Proceed button click to save quota and only validate final choice
        if (!planConfig.targetCollege) {
            setCollegeInfo(null);
        }
    }, [planConfig.targetCollege]);

    const [aiLoading, setAiLoading] = useState(false);
    const [aiPlan, setAiPlan] = useState('');

    // Auto-fetch intelligence if missing on Step 3/4
    useEffect(() => {
        if ((currentStep === 3 || currentStep === 4) && planConfig.targetCollege && !collegeInfo && !loadingInfo) {
            fetchCollegeInfo(planConfig.targetCollege);
        }
    }, [currentStep, planConfig.targetCollege, collegeInfo, loadingInfo]);


    const fetchTests = async () => {
        setLoadingTests(true);
        try {
            const apiUrl = getApiUrl();
            const [testsRes, resultsData] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                getMyResults().catch(() => [])
            ]);

            const testsData = (testsRes.data || []).filter(test => {
                return test.exam_type_details?.name === 'STUDY PLANNER';
            });
            const resultsDataArr = Array.isArray(resultsData) ? resultsData : (resultsData?.data || []);

            // Create a lookup map for O(1) performance
            const resultsMap = {};
            resultsDataArr.forEach(r => {
                if (r.code) resultsMap[r.code] = r;
                if (r.id) resultsMap[r.id] = r;
            });

            const mergedData = testsData.map(test => {
                const result = resultsMap[test.code] || resultsMap[test.id];
                
                let percentageScore = 0;
                const totalMarks = Number(result?.total || test.total_marks || 0);
                const rawScore = Number(result?.marks || test.submission?.score || 0);
                if (totalMarks > 0) {
                    percentageScore = (rawScore / totalMarks) * 100;
                } else {
                    percentageScore = rawScore <= 100 ? rawScore : 100;
                }

                if (result) {
                    return {
                        ...test,
                        submission: {
                            ...(test.submission || {}),
                            score: percentageScore,
                            raw_score: result.marks || test.submission?.score || 0,
                            rank: result.rank || test.submission?.rank || null,
                            is_finalized: result.is_finalized ?? true,
                            submitted_date: result.submission_date || result.created_at || result.date || test.submission?.submitted_date
                        }
                    };
                }
                return {
                    ...test,
                    submission: test.submission ? { 
                        ...test.submission, 
                        score: percentageScore,
                        raw_score: test.submission.score || 0
                    } : null
                };
            });
            setTests(mergedData);

            // Auto-select the most recently completed test if none is selected
            const completedTests = mergedData.filter(t => t.submission?.is_finalized);
            if (completedTests.length > 0) {
                // Sort by submission date or use the first one if dates are missing
                completedTests.sort((a, b) => {
                    const dateA = new Date(a.submission?.submitted_date || 0);
                    const dateB = new Date(b.submission?.submitted_date || 0);
                    return dateB - dateA;
                });
                
                // We only auto-select if no test is currently selected to avoid overwriting user choice
                if (!selectedTest) {
                    handleSelectTest(completedTests[0]);
                }
            }

        } catch (error) {
            console.error('Failed to load real exams:', error);
        } finally {
            setLoadingTests(false);
        }
    };

    const handleSelectTest = async (test) => {
        const tId = test.id || test._id;
        setAnalyzingId(tId);
        setSelectedTest(test);
        setAiPlan('');
        setPlanSavedForCurrentTest(false);
        
        let sectionScores = [];
        let correctPercentage = Math.floor(Number(test.submission?.score) || 0); // fallback to stored score
        try {
            const res = await axios.get(`${getApiUrl()}/api/tests/${tId}/student_performance/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Use the correct percentage from the performance API (not the incorrectly computed one)
            if (res.data.percentage != null) {
                correctPercentage = Math.round(res.data.percentage);
            }
            if (res.data.section_stats) {
                const stats = res.data.section_stats;
                if (Array.isArray(stats)) {
                    // Backend returns an array: [{name, net_marks, total_max, ...}, ...]
                    sectionScores = stats.map(s => ({
                        name: s.name,
                        score: s.total_max > 0 ? (s.net_marks / s.total_max) * 100 : 0
                    }));
                } else {
                    // Fallback: treat as a dict keyed by section name
                    sectionScores = Object.entries(stats).map(([name, s]) => ({
                        name: name,
                        score: s.total_max > 0 ? (s.net_marks / s.total_max) * 100 : 0
                    }));
                }
            }
            setPerformanceData(res.data);
            // Update the test's stored score with the correct percentage so the table shows it correctly
            setTests(prev => prev.map(t => (t.id === tId || t._id === tId)
                ? { ...t, submission: { ...t.submission, score: correctPercentage } }
                : t
            ));
            if (res.data.all_section_names?.length > 0) {
                setActiveSolutionSection(res.data.all_section_names[0]);
            }
        } catch (err) {
            console.error("Error fetching performance:", err);
        }

        setTestScores({ 
            total: correctPercentage, 
            sections: sectionScores,
            q1Score: correctPercentage, q2Score: correctPercentage, q3Score: correctPercentage 
        });
        setAnalyzingId(null);
    };

    const generateAIPlan = async (isUpdate = false) => {
        setAiLoading(true);
        try {
            const apiUrl = getApiUrl();

            // Build section-wise score breakdown for richer AI context
            const sectionScoreText = (testScores?.sections || []).map(s => `${s.name}: ${Math.round(s.score)}%`).join(', ');

            const payload = {
                test_id: selectedTest?.id || selectedTest?._id,
                target_college: selectedCollege?.name || planConfig.targetCollege || "Top National Engineering College",
                target_career: planConfig.targetCareer || "General Field",
                target_college_obj: selectedCollege,
                class: profile.classLevel || "12",
                total_score: (testScores?.total || 0).toString(),
                math_score: isMedical ? "N/A" : (testScores?.q3Score || testScores?.total || 0).toString(),
                physics_score: (testScores?.q1Score || testScores?.total || 0).toString(),
                chemistry_score: (testScores?.q2Score || testScores?.total || 0).toString(),
                weak_topics: performanceData?.weak_topics ||
                    (testScores?.sections?.filter(s => s.score < 50).map(s => s.name).join(', ') ||
                    "Concepts requiring accuracy improvement"),
                strong_topics: performanceData?.strong_topics ||
                    (testScores?.sections?.filter(s => s.score >= 70).map(s => s.name).join(', ') ||
                    "Foundational conceptual grasp"),
                daily_time_hours: "8",
                psychometric_profile: {
                    classification: psychometricResult?.classification,
                    traits: psychometricResult?.traits,
                    summary: psychometricResult?.summary
                },
                section_analysis: testScores?.sections || [],
                exam_name: profile.targetExam,
                // Update mode: triggers comparative analysis with previous plan
                is_update_request: isUpdate,
                request_detail: isUpdate
                    ? `This is an UPDATE request. The student has completed a new exam. Sections scored: ${sectionScoreText}. Re-analyze the student's trajectory since the last plan and create a refined, targeted strategy based on these new results.`
                    : `Provide a granular 1-year trajectory and a specific 1-month intensive study plan based on the assessment deficit and psychometric profile. Sections: ${sectionScoreText}.`
            };

            const response = await axios.post(`${apiUrl}/api/student/ai-mentor/study-plan/`, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data && response.data.ai_plan) {
                setAiPlan(response.data.ai_plan);
                // Mark plan as saved/locked for this test — no more buttons shown
                setHasPreviousPlan(true);
                setPlanSavedForCurrentTest(true);

                // Restore college context if fetched from cache
                if (response.data.cached && response.data.target_college) {
                    setSelectedCollege(response.data.target_college);
                    setPlanConfig(prev => ({ ...prev, targetCollege: response.data.target_college.name }));
                }

                setCurrentStep(4);
            }
        } catch (error) {
            console.error('Failed to generate AI plan:', error);
            const errorMsg = error.response?.data?.error || "Error generating plan. Please ensure Gemini API Key is configured.";
            alert(errorMsg);
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
        <AnimatePresence initial={false}>
            {isSidebarOpen && (
                <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 300, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className={`hidden lg:flex flex-col shrink-0 border-r ${isDarkMode ? 'border-white/5 bg-[#0a0d14]' : 'border-slate-200 bg-slate-50'} min-h-full overflow-hidden`}
                >
                    <div className="w-[300px] p-6 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[4px] bg-indigo-600 flex items-center justify-center text-white">
                                    <Brain size={20} />
                                </div>
                                <div>
                                    <h2 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Strategy</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">v2.0 Beta Engine</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8 flex-1">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-500/20 pb-2">Evaluation Core</h3>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                        <Database size={14} className="text-indigo-500" /> Deep Analytics Engine
                                    </li>
                                    <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                        <Cpu size={14} className="text-emerald-500" /> Gemini Pro Processing
                                    </li>
                                    <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
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

                        <div className="mt-8 pt-6 border-t border-slate-500/20 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">
                            <ShieldCheck size={14} className="text-indigo-500" /> End-to-end encrypted
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
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

                {loadingTests ? (
                    <div className="flex flex-col items-center justify-center min-h-[500px] gap-8 py-20">
                        <div className="relative">
                            <div className="w-20 h-20 border-2 border-indigo-500/10 rounded-full" />
                            <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-indigo-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center animate-pulse">
                                    <Brain size={24} className="text-indigo-500" />
                                </div>
                            </div>
                        </div>
                        <div className="text-center space-y-3">
                            <h3 className={`text-sm font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Initializing Academic Vector
                            </h3>
                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Scanning cognitive baselines...</p>
                                <div className={`w-48 h-1 mx-auto rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                    <motion.div 
                                        initial={{ x: "-100%" }}
                                        animate={{ x: "100%" }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                        className="w-full h-full bg-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
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

                            return (
                                <div className={`p-6 rounded-[4px] border-2 border-emerald-500/20 bg-emerald-500/5 animate-in fade-in slide-in-from-top-4`}>
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-[4px] flex items-center justify-center text-white shadow-lg bg-emerald-600">
                                                <Activity size={24} />
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    Previous Assessment Detected
                                                </h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                                                    You have already completed your cognitive baseline. View your analysis below.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => setCurrentStep(3)}
                                                className="px-6 py-3 rounded-[2px] font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
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

                        {!tests.some(t => t.submission?.is_finalized) && (
                        <div className="pt-8 flex justify-end pb-10 border-t border-slate-500/20">
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
                        </div>
                        )}
                    </>
                )}
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
                            {tests.some(t => t.submission?.is_finalized) ? (
                                /* Locked view — exam already completed */
                                <div className={`p-4 rounded-[4px] border-2 border-emerald-500/30 flex items-center gap-3 ${isDarkMode ? 'bg-emerald-500/5' : 'bg-emerald-50'}`}>
                                    <CollegeLogo name={planConfig.targetCollege} size={52} aiLogoUrl={collegeInfo?.logo_url} />
                                    <div className="flex items-center gap-3 flex-1">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">Target Locked</p>
                                            <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{planConfig.targetCollege || 'No Institution Selected'}</p>
                                            <p className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-widest">Your target is set. Complete more exams to update your master plan.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Editable search — first-time setup */
                                <div className="relative z-50">
                                    <AsyncSelect
                                        cacheOptions
                                        defaultOptions
                                        loadOptions={loadColleges}
                                        value={planConfig.targetCollege ? { value: planConfig.targetCollege, label: planConfig.targetCollege } : null}
                                        onChange={(selected) => {
                                            const collegeName = selected ? selected.value : '';
                                            setPlanConfig({ ...planConfig, targetCollege: collegeName });
                                            setSelectedCollege({ name: collegeName });
                                            setCollegeSearch(collegeName);
                                        }}
                                        placeholder="Search top colleges dynamically..."
                                        isClearable
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                backgroundColor: isDarkMode ? '#0a0d14' : '#f8fafc',
                                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                                                padding: '2px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                boxShadow: 'none',
                                                '&:hover': {
                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#cbd5e1'
                                                }
                                            }),
                                            menu: (base) => ({
                                                ...base,
                                                backgroundColor: isDarkMode ? '#0a0d14' : '#ffffff',
                                                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }),
                                            option: (base, state) => ({
                                                ...base,
                                                backgroundColor: state.isSelected
                                                    ? '#10b981'
                                                    : state.isFocused
                                                        ? (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9')
                                                        : 'transparent',
                                                color: state.isSelected ? '#ffffff' : (isDarkMode ? '#e2e8f0' : '#1e293b'),
                                                '&:active': {
                                                    backgroundColor: '#10b981'
                                                }
                                            }),
                                            singleValue: (base) => ({
                                                ...base,
                                                color: isDarkMode ? '#ffffff' : '#1e293b'
                                            }),
                                            input: (base) => ({
                                                ...base,
                                                color: isDarkMode ? '#ffffff' : '#1e293b'
                                            }),
                                            placeholder: (base) => ({
                                                ...base,
                                                color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#94a3b8'
                                            })
                                        }}
                                    />
                                </div>
                            )}
                            <div className={`p-4 rounded-[4px] border border-l-4 border-l-indigo-500 ${isDarkMode ? 'bg-indigo-500/5 border-white/10' : 'bg-indigo-50/50 border-slate-200'}`}>
                                <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Current Target</p>
                                <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{planConfig.targetCollege || "No Institution Selected"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Career Selection Section */}
                    <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <h3 className={`text-sm font-black uppercase tracking-tight flex items-center gap-2 mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Brain size={18} className="text-indigo-500" /> Target Career Field
                        </h3>
                        <div className="space-y-4">
                            {tests.some(t => t.submission?.is_finalized) ? (
                                <div className={`p-4 rounded-[4px] border-2 border-indigo-500/30 flex items-center gap-3 ${isDarkMode ? 'bg-indigo-500/5' : 'bg-indigo-50'}`}>
                                    <div className="flex items-center gap-3 flex-1">
                                        <CheckCircle2 size={16} className="text-indigo-500 shrink-0" />
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">Career Locked</p>
                                            <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{planConfig.targetCareer || 'No Career Selected'}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Select
                                        options={CAREER_OPTIONS}
                                        value={CAREER_OPTIONS.find(c => c.value === planConfig.targetCareer) || null}
                                        onChange={(selected) => setPlanConfig({ ...planConfig, targetCareer: selected ? selected.value : '' })}
                                        placeholder="-- Search or Select Target Career --"
                                        isClearable
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                backgroundColor: isDarkMode ? '#0a0d14' : '#f8fafc',
                                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                                                padding: '2px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                boxShadow: 'none',
                                                '&:hover': {
                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#cbd5e1'
                                                }
                                            }),
                                            menu: (base) => ({
                                                ...base,
                                                backgroundColor: isDarkMode ? '#0a0d14' : '#ffffff',
                                                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }),
                                            option: (base, state) => ({
                                                ...base,
                                                backgroundColor: state.isSelected
                                                    ? '#4f46e5'
                                                    : state.isFocused
                                                        ? (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9')
                                                        : 'transparent',
                                                color: state.isSelected ? '#ffffff' : (isDarkMode ? '#e2e8f0' : '#1e293b'),
                                                '&:active': {
                                                    backgroundColor: '#4f46e5'
                                                }
                                            }),
                                            singleValue: (base) => ({
                                                ...base,
                                                color: isDarkMode ? '#ffffff' : '#1e293b'
                                            }),
                                            input: (base) => ({
                                                ...base,
                                                color: isDarkMode ? '#ffffff' : '#1e293b'
                                            }),
                                            placeholder: (base) => ({
                                                ...base,
                                                color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#94a3b8'
                                            })
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Intelligence section removed from here to be shown in Step 4 */}

                <div className="flex justify-end pt-4 border-t border-slate-500/20">
                    {tests.some(t => t.submission?.is_finalized) ? (
                        <button
                            onClick={() => { setViewMode('cutoff'); setCurrentStep(4); }}
                            className="px-10 py-5 rounded-[4px] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-4 group shadow-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            Go to My Analysis <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button 
                            onClick={async () => { 
                                if (!planConfig.targetCollege) {
                                    setAlertMessage("Please select a target institution from the list to establish your academic benchmark.");
                                    setShowAlert(true);
                                    return;
                                }
                                
                                let currentInfo = collegeInfo;
                                if (!currentInfo || currentInfo.validatedCollege !== planConfig.targetCollege) {
                                    currentInfo = await fetchCollegeInfo(planConfig.targetCollege);
                                }

                                if (currentInfo && currentInfo.is_compatible === false) {
                                    setAlertMessage(currentInfo.compatibility_error || `This institution does not appear to accept ${profile.targetExam} for admissions. Please select a compatible college.`);
                                    setShowAlert(true);
                                    return;
                                }

                                try {
                                    const apiUrl = getApiUrl();
                                    await axios.post(`${apiUrl}/api/student/study-planner-config/`, {
                                        target_college: selectedCollege || { name: planConfig.targetCollege },
                                        target_career: planConfig.targetCareer
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
                    )}
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
                        <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Evaluation Modules</h3>
                    </div>
                </div>

                <p className={`text-xs font-bold leading-relaxed mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Complete both baseline modules below to synthesize your custom Master Plan for <strong>{planConfig.targetCollege}</strong>.
                </p>

                <div className="grid grid-cols-1 gap-6">
                    {/* Module 1: Cognitive Profile */}
                    <div className={`p-6 rounded-[4px] border border-l-4 border-l-amber-500 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">
                                    <Brain size={16} /> Module 1: Cognitive Profile
                                </label>
                                <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Identify your learning style to personalize your AI Master Plan schedule.
                                </p>
                            </div>
                            
                            {psychometricResult ? (
                                <div className={`flex items-center gap-3 p-3 rounded-[4px] border shrink-0 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <div className="w-8 h-8 rounded-[4px] bg-emerald-500 text-white flex items-center justify-center">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Completed</div>
                                        <div className={`text-[11px] font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{psychometricResult.classification || 'Profile Saved'}</div>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setShowPsychometric(true)}
                                    className="px-6 py-3 bg-amber-500 text-white rounded-[2px] font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md flex items-center gap-2 shrink-0"
                                >
                                    Take Assessment <ArrowRight size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Module 2: Academic Baseline */}
                    <div className={`p-6 rounded-[4px] border border-l-4 border-l-indigo-500 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                                <BookOpen size={16} /> Module 2: Academic Baseline
                            </label>
                            {selectedTest && <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-[2px] flex items-center gap-1"><CheckCircle2 size={12}/> Selected</span>}
                        </div>
                        <div className={`rounded-[4px] border overflow-hidden ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
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
                                            const canLaunch = !isCompleted && !isExpired;
                                            const isSelected = selectedTest && (selectedTest.id === tId || selectedTest._id === tId);

                                            return (
                                                <tr key={tId} className={`border-b last:border-b-0 ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-50 hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50') : ''}`}>
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
                                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest">Completed</span>
                                                        ) : isExpired ? (
                                                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-widest">Expired</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-widest">Available</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <div className={`text-sm font-black ${isCompleted ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {isCompleted ? `${Math.floor(Number(test.submission?.score) || 0)}%` : '—'}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-center w-32">
                                                        {isCompleted ? (
                                                            <button 
                                                                disabled={analyzingId === tId || isSelected}
                                                                onClick={() => handleSelectTest(test)}
                                                                className={`px-4 py-2 rounded-[2px] font-black text-[9px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2 justify-center w-full ${isSelected ? 'bg-emerald-600 text-white cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                                            >
                                                                {analyzingId === tId ? <Loader2 size={12} className="animate-spin" /> : (isSelected ? <CheckCircle2 size={12} /> : null)}
                                                                {analyzingId === tId ? 'Wait...' : (isSelected ? 'Selected' : 'Select')}
                                                            </button>
                                                        ) : canLaunch ? (
                                                            <button 
                                                                onClick={() => {
                                                                    if (!psychometricResult) {
                                                                        alert("Please complete Module 1: Cognitive Profile first.");
                                                                    } else {
                                                                        navigate(`/student/exam/instructions/${test.id}`);
                                                                    }
                                                                }} 
                                                                title={!psychometricResult ? "Complete Cognitive Profile first" : "Launch Exam"}
                                                                className={`px-4 py-2 text-white rounded-[2px] font-black text-[9px] uppercase tracking-widest transition-all shadow-md w-full ${!psychometricResult ? 'bg-slate-400 cursor-not-allowed hover:bg-slate-500' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                                            >
                                                                Launch
                                                            </button>
                                                        ) : (
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>—</span>
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
                </div>

                <div className="flex justify-end pt-8 border-t border-slate-500/20 mt-8">
                    <button
                        disabled={!selectedTest || !psychometricResult}
                        onClick={() => { setViewMode('cutoff'); setCurrentStep(4); }}
                        className={`px-10 py-5 rounded-[4px] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-4 group shadow-lg ${
                            !selectedTest || !psychometricResult
                            ? 'bg-slate-500 opacity-50 text-white cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                    >
                        Generate AI Master Plan <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-[1600px] mx-auto space-y-8">
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

                        {/* TAB NAVIGATION */}
                        <div className={`flex items-center gap-2 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'} pb-px overflow-x-auto custom-scrollbar mt-8`}>
                            <button onClick={() => setViewMode('cutoff')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${viewMode === 'cutoff' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}>Intelligence & Cutoff</button>
                            <button onClick={() => setViewMode('solutions')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${viewMode === 'solutions' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}>Correct Answers</button>
                            <button onClick={() => setViewMode('plan')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${viewMode === 'plan' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}>
                                {aiPlan ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Sparkles size={14} className={viewMode === 'plan' ? "text-indigo-500" : "text-slate-400"} />} Master Plan
                            </button>
                        </div>

                        {viewMode === 'cutoff' && (
                            <div className={`p-8 mt-6 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-lg'}`}>
                                {/* Intelligence & Gap Analysis */}
                                <div className="flex flex-col lg:flex-row gap-8">
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <CollegeLogo name={planConfig.targetCollege} size={60} aiLogoUrl={collegeInfo?.logo_url} />
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
                                            {(() => {
                                                const url = getCollegeUrl(planConfig.targetCollege) || collegeInfo?.website;
                                                return url ? (
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer noopener"
                                                        className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline hover:text-emerald-400 transition-colors"
                                                    >
                                                        View Official Records <ArrowRight size={12} />
                                                    </a>
                                                ) : null;
                                            })()}
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
                        )}

                        {viewMode === 'plan' && (
                            <div className="space-y-6 mt-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className={`text-xl font-black uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <Brain className="text-indigo-500" size={24} />
                                            {aiPlan ? 'Master Strategy Vector' : 'Synthesize Master Plan'}
                                        </h2>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-[2px]">Target: {planConfig.targetCollege}</span>
                                            {aiPlan && planSavedForCurrentTest && (
                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-[2px] flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Plan Locked
                                                </span>
                                            )}
                                            {!planSavedForCurrentTest && hasPreviousPlan && (
                                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-[2px]">
                                                    Previous plan found — Update available
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Buttons only visible when plan is NOT yet saved/locked for this exam */}
                                    {!planSavedForCurrentTest && (
                                        <div className="flex items-center gap-3">
                                            {/* First-time: no plan ever in DB */}
                                            {!hasPreviousPlan && (
                                                <button
                                                    onClick={() => generateAIPlan(false)}
                                                    disabled={aiLoading}
                                                    className="px-6 py-3 rounded-[4px] bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg"
                                                >
                                                    {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                    {aiLoading ? 'Synthesizing...' : 'Synthesize Master Plan'}
                                                </button>
                                            )}
                                            {/* Update: previous plan exists but this exam has no plan yet */}
                                            {hasPreviousPlan && (
                                                <button
                                                    onClick={() => generateAIPlan(true)}
                                                    disabled={aiLoading}
                                                    className="px-6 py-3 rounded-[4px] bg-amber-500 text-white text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg"
                                                >
                                                    {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                    {aiLoading ? 'Updating Strategy...' : 'Update Master Plan'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {!aiPlan ? (
                                    aiLoading ? (
                                        <div className={`p-16 text-center border-2 border-dashed rounded-[4px] flex flex-col items-center gap-8 justify-center transition-all ${isDarkMode ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
                                            <div className="relative flex items-center justify-center">
                                                <div className="absolute w-24 h-24 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                                                <div className="absolute w-20 h-20 border-b-4 border-purple-500 rounded-full animate-spin animation-delay-200"></div>
                                                <Brain size={40} className="text-indigo-500 animate-pulse" />
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className={`text-base font-black uppercase tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse`}>
                                                    Synthesizing Neural Strategy...
                                                </h3>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    Analyzing psychometric vector space, performance data, and curriculum targets. Please wait...
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`p-12 text-center border-2 border-dashed rounded-[4px] flex flex-col items-center gap-4 justify-center ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                            <Brain size={48} className="text-indigo-500 opacity-20" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 max-w-md leading-relaxed">Master Plan not yet generated. Click synthesize to analyze your psychometric profile and performance gaps.</p>
                                        </div>
                                    )
                                ) : (
                                    <div className={`p-6 md:p-8 lg:p-10 rounded-[4px] border relative overflow-hidden w-full ${isDarkMode ? 'bg-[#0a0d14] border-white/10 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
                            <div className={`prose prose-sm md:prose-base max-w-full w-full relative z-10 break-words overflow-x-hidden 
                                ${isDarkMode ? 'prose-invert prose-p:text-slate-300 prose-strong:text-indigo-400 prose-li:text-slate-300 prose-hr:border-white/10' : 'prose-p:text-slate-700 prose-strong:text-indigo-600 prose-li:text-slate-700 prose-hr:border-slate-200'}
                                prose-h1:font-black prose-h1:text-4xl prose-h1:text-transparent prose-h1:bg-clip-text prose-h1:bg-gradient-to-r prose-h1:from-indigo-500 prose-h1:to-purple-500 prose-h1:mb-8
                                prose-h2:font-black prose-h2:text-2xl prose-h2:uppercase prose-h2:tracking-tight prose-h2:mt-16 prose-h2:mb-6 prose-h2:pb-4 prose-h2:border-b prose-h2:border-indigo-500/20 prose-h2:text-transparent prose-h2:bg-clip-text prose-h2:bg-gradient-to-r prose-h2:from-emerald-400 prose-h2:to-teal-500
                                prose-h3:font-bold prose-h3:text-xl prose-h3:text-indigo-500 prose-h3:uppercase prose-h3:tracking-wide prose-h3:mt-10
                                prose-a:text-emerald-500 hover:prose-a:text-emerald-400 prose-a:transition-colors
                                prose-blockquote:border-l-4 prose-blockquote:border-l-emerald-500 prose-blockquote:bg-emerald-500/10 prose-blockquote:p-6 prose-blockquote:rounded-r-lg prose-blockquote:font-bold prose-blockquote:text-lg prose-blockquote:shadow-sm prose-blockquote:my-8
                                prose-ul:list-none prose-ul:pl-0 prose-li:relative prose-li:pl-6 prose-li:my-2 before:prose-li:absolute before:prose-li:left-0 before:prose-li:top-2 before:prose-li:w-2 before:prose-li:h-2 before:prose-li:bg-indigo-500 before:prose-li:rounded-full
                                prose-table:w-full
                                prose-th:bg-indigo-600 prose-th:text-white prose-th:p-4 prose-th:text-left prose-th:uppercase prose-th:text-xs prose-th:tracking-widest
                                prose-td:p-4 prose-td:border-b ${isDarkMode ? 'prose-td:border-white/5 prose-td:bg-white/5' : 'prose-td:border-slate-100 prose-td:bg-slate-50'}
                                prose-tr:transition-colors ${isDarkMode ? 'hover:prose-tr:bg-white/10' : 'hover:prose-tr:bg-indigo-50'}
                            `}>
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        table: ({node, ...props}) => (
                                            <div className={`overflow-x-auto w-full my-8 rounded-xl shadow-lg border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                                <table className="w-full min-w-[1200px] m-0" {...props} />
                                            </div>
                                        )
                                    }}
                                >
                                    {aiPlan}
                                </ReactMarkdown>
                            </div>
                            </div>
                                )}
                            </div>
                        )}

                        {viewMode === 'solutions' && (
                            <div className="space-y-6 mt-6">
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
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Question {idx + 1}</span>
                                            {q.type && (
                                                <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-wider ${
                                                    q.type === 'MULTI_CHOICE' ? 'bg-blue-500/10 text-blue-500' :
                                                    q.type === 'SINGLE_CHOICE' ? 'bg-indigo-500/10 text-indigo-500' :
                                                    q.type === 'INTEGER_TYPE' || q.type === 'NUMERICAL' ? 'bg-amber-500/10 text-amber-600' :
                                                    'bg-slate-500/10 text-slate-500'
                                                }`}>
                                                    {q.type === 'MULTI_CHOICE' ? 'Multiple' :
                                                     q.type === 'SINGLE_CHOICE' ? 'Single' :
                                                     q.type === 'INTEGER_TYPE' ? 'Integer' :
                                                     q.type === 'NUMERICAL' ? 'Numerical' :
                                                     q.type.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
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
                                    
                                    <div className="space-y-3">
                                        {q.type !== 'INTEGER_TYPE' && q.type !== 'NUMERICAL' && q.options?.map((opt, oIdx) => {
                                            const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
                                            const optIdStr = String(opt.id || opt._id || oIdx);
                                            
                                            // Handle correct options array matching
                                            const correctOptionsArr = Array.isArray(q.correct_options) 
                                                ? q.correct_options.map(String) 
                                                : (q.correct_options ? [String(q.correct_options)] : []);
                                            
                                            const isCorrect = correctOptionsArr.some(c => c.toLowerCase() === optIdStr.toLowerCase()) 
                                                || opt.isCorrect || opt.is_correct || opt.id === q.correct_option_id;

                                            // Robust matching for user answer (by ID, by index, or by label)
                                            const userAnswerStr = Array.isArray(q.user_answer)
                                                ? q.user_answer.map(String)
                                                : q.user_answer != null ? [String(q.user_answer)] : [];

                                            const isUserAnswer = userAnswerStr.some(ua => {
                                                const uaStr = String(ua).toLowerCase().trim();
                                                return (
                                                    uaStr === optIdStr.toLowerCase() ||
                                                    uaStr === String(oIdx) ||
                                                    uaStr === keys[oIdx] ||
                                                    uaStr === (opt?.content?.toLowerCase().trim() || '') ||
                                                    uaStr === (opt?.text?.toLowerCase().trim() || '')
                                                );
                                            }) || opt.id === q.student_answer_id;

                                            return (
                                                <div
                                                    key={optIdStr}
                                                    className={`p-4 rounded-[4px] border transition-all flex justify-between items-center ${
                                                        isCorrect && isUserAnswer ? 'border-emerald-500/40 bg-emerald-500/8 text-emerald-500' :
                                                        isCorrect ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' :
                                                        isUserAnswer ? 'border-red-500/30 bg-red-500/5 text-red-500' :
                                                        isDarkMode ? 'border-white/5 text-slate-400 bg-white/5' : 'border-slate-100 text-slate-600 bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex gap-4 items-start">
                                                        <span className={`text-xs font-black uppercase min-w-[16px] ${isDarkMode ? 'opacity-50' : 'text-slate-600 opacity-80'}`}>{keys[oIdx] ?? oIdx})</span>
                                                        <div
                                                            className={`text-xs font-bold leading-relaxed prose-sm max-w-none ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}
                                                            dangerouslySetInnerHTML={{ __html: opt.content || opt.text || optIdStr }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 ml-4">
                                                        {isCorrect && isUserAnswer && (
                                                            <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                                                Your Answer (Correct) <CheckCircle2 size={14} />
                                                            </span>
                                                        )}
                                                        {isCorrect && !isUserAnswer && (
                                                            <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Correct Option</span>
                                                        )}
                                                        {!isCorrect && isUserAnswer && (
                                                            <span className="flex items-center gap-1 text-red-500 text-[10px] font-black uppercase tracking-widest">
                                                                Your Answer <XCircle size={14} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {(q.type === 'NUMERICAL' || q.type === 'INTEGER_TYPE') && (
                                        <div className={`p-4 rounded-[4px] border mt-2 ${isDarkMode ? 'bg-white/[0.02] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                            <div className="flex items-center gap-6 text-[12px] font-semibold">
                                                <div>Your Answer: <span className="font-black tracking-widest text-blue-500">{q.user_answer || 'N/A'}</span></div>
                                                <div>Correct Answer: <span className="font-black tracking-widest text-emerald-500">{q.answer_from === q.answer_to ? q.answer_to : `${q.answer_from} - ${q.answer_to}`}</span></div>
                                            </div>
                                        </div>
                                    )}

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
                )}
            </div>
        </motion.div>
    );

    return (
        <div className={`flex flex-col lg:flex-row h-full min-h-[800px] rounded-[4px] border overflow-hidden relative ${isDarkMode ? 'bg-[#050505] border-white/10' : 'bg-white border-slate-200'}`}>
            {renderSidePanel()}
            
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`hidden lg:flex absolute left-0 top-45 z-50 p-1.5 rounded-r-[4px] border-y border-r transition-all ${isDarkMode ? 'bg-[#10141D] border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'} ${isSidebarOpen ? 'translate-x-[300px]' : 'translate-x-0'}`}
                title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
                {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
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
                            onCancel={() => setShowPsychometric(false)}
                            onSubmit={async (res) => {
                                try {
                                    const apiUrl = getApiUrl();
                                    const saveRes = await axios.post(`${apiUrl}/api/student/psychometric-profile/`, res, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    setPsychometricResult(saveRes.data);
                                    setShowPsychometric(false);
                                } catch (err) {
                                    console.error("Failed to save psychometric profile:", err);
                                    // Fallback to local state if backend fails
                                    setPsychometricResult(res);
                                    setShowPsychometric(false);
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
