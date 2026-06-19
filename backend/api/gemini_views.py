import os
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import json
import logging
from .models import UploadedFile, CustomUser, StudentMasterPlan, CollegeIntelligence

logger = logging.getLogger(__name__)


def _get_gemini_api_key():
    return (getattr(settings, 'GEMINI_API_KEY', None) or '').strip()


def _gemini_not_configured_response():
    return Response(
        {"error": "AI service is not configured. Please contact admin."},
        status=status.HTTP_503_SERVICE_UNAVAILABLE
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_ai_study_plan(request):
    try:
        data = request.data
        test_id = data.get('test_id')
        target_college = data.get('target_college', 'Top National Engineering College')
        target_career = data.get('target_career', 'General Field')
        target_college_obj = data.get('target_college_obj', {})
        is_update_request = data.get('is_update_request', False)
        check_cache_only = data.get('check_cache_only', False)
        submission_date_str = data.get('submission_date')

        if test_id and not is_update_request:
            existing_plan = StudentMasterPlan.objects.filter(user=request.user, test_id=test_id).order_by('-created_at').first()
            if existing_plan:
                return Response({
                    "ai_plan": existing_plan.master_plan,
                    "cached": True,
                    "target_college": existing_plan.target_college,
                    "plan_created_at": existing_plan.created_at.isoformat() if existing_plan.created_at else None
                }, status=status.HTTP_200_OK)

            if check_cache_only:
                return Response({"cached": False}, status=status.HTTP_200_OK)

        previous_plan = None
        if test_id:
            previous_plan = StudentMasterPlan.objects.filter(user=request.user).exclude(test_id=test_id).order_by('-created_at').first()

        student_name = request.user.get_full_name().strip() or request.user.username
        class_level = str(data.get('class', '12'))
        total_score = data.get('total_score', '65')
        math_score = data.get('math_score', '60')
        physics_score = data.get('physics_score', '65')
        chemistry_score = data.get('chemistry_score', '70')
        weak_topics = data.get('weak_topics', 'Integration, Electromagnetism')
        strong_topics = data.get('strong_topics', 'Algebra, Optics')
        daily_time = data.get('daily_time_hours', '4')
        exam_name = data.get('exam_name', 'JEE Main')

        api_key = _get_gemini_api_key()
        if not api_key:
            return _gemini_not_configured_response()

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-lite-latest', generation_config={"response_mime_type": "application/json"})
        
        content_parts = []
        is_junior = False
        import re
        match = re.search(r'\d+', class_level)
        num = int(match.group(0)) if match else 0
        is_junior = 5 <= num <= 10
        is_class_10 = (num == 10)

        if is_class_10:
            # ── Class 10 specific data ─────────────────────────────────────────────
            # custom_subjects: list of {"name": str, "target": int, "class9_marks": int}
            custom_subjects = data.get('custom_subjects', [])
            marksheet_file_id = data.get('marksheet_file_id', None)

            # Build a readable subjects table for the prompt
            subjects_text_lines = []
            for s in custom_subjects:
                name = s.get('name', 'Subject')
                target = s.get('target', 80)
                cl9 = s.get('class9_marks', 'N/A')
                subjects_text_lines.append(f"  - {name}: Class 9 Marks = {cl9}/100 | Desired Class 10 Target = {target}/100")
            subjects_text = '\n'.join(subjects_text_lines) if subjects_text_lines else '  - No subjects provided'

            # ── Attempt multimodal marksheet upload ──────────────────────────────
            marksheet_uploaded_file = None
            marksheet_note = ""
            if marksheet_file_id:
                try:
                    import mimetypes
                    from django.core.files.storage import default_storage
                    uploaded_obj = UploadedFile.objects.filter(pk=marksheet_file_id).first()
                    if uploaded_obj and uploaded_obj.file:
                        file_name = str(uploaded_obj.file.name)
                        mime_type, _ = mimetypes.guess_type(file_name)
                        if not mime_type:
                            mime_type = 'image/jpeg'
                        with default_storage.open(file_name, 'rb') as fh:
                            file_bytes = fh.read()
                        import base64
                        b64_data = base64.b64encode(file_bytes).decode('utf-8')
                        marksheet_uploaded_file = {
                            'inline_data': {
                                'mime_type': mime_type,
                                'data': b64_data
                            }
                        }
                        marksheet_note = "A Class 9 marksheet image/document has been attached above. Carefully analyze all subject marks visible in it."
                        logger.info(f"[AI MENTOR Class10] Marksheet loaded, mime={mime_type}, size={len(file_bytes)}B")
                except Exception as me:
                    logger.warning(f"[AI MENTOR Class10] Marksheet load failed: {me}")
                    marksheet_note = "Note: The student attempted to upload their Class 9 marksheet but it could not be loaded. Proceed using the subject performance data provided below."

            # ── Build the Class 10 specific prompt ──────────────────────────────
            prompt = f"""You are an expert academic mentor and counselor specializing in CBSE/ICSE/State Board Class 10 Board Exam preparation.

{marksheet_note}

## STUDENT PROFILE
- **Name:** {student_name}
- **Current Class:** {class_level}
- **Exam Type:** {exam_name}
- **Daily Study Time Available:** {daily_time} hours

## DIAGNOSTIC TEST PERFORMANCE (Recent Assessment)
- **Overall Score:** {total_score}%
- **Section-wise Performance:**
  - Math: {math_score}%
  - Physics/Science: {physics_score}%
  - Chemistry: {chemistry_score}%
- **Weak Areas Identified:** {weak_topics}
- **Strong Areas:** {strong_topics}

## SUBJECT-WISE CLASS 9 vs CLASS 10 TARGETS
{subjects_text}

---

## YOUR TASKS:

### 1. 📊 Class 9 Marksheet Analysis {"& Progress Review" if is_update_request else ""}
{"(Cross-reference the attached marksheet with the data below)" if marksheet_uploaded_file else "(Based on subject data provided)"}
- Identify which subjects the student performed well in and which need urgent attention.
- Highlight subject-wise percentile drops or improvements.
- Spot any patterns (e.g., consistently weak in theory, good in numericals).
{"- Compare progress since their previous plan." if is_update_request else ""}

### 2. 🎯 Gap Analysis — Class 9 vs Class 10 Targets
For EACH subject listed:
- Current Class 9 performance level (if available from marksheet)
- Diagnostic test score
- Desired target score for Class 10 boards
- Gap = Target - Current (label as: Small Gap / Moderate Gap / Large Gap)
- Priority level: HIGH / MEDIUM / LOW

### 3. 📅 Next 1-Month Actionable Study Plan {"(Updated Strategy)" if is_update_request else ""}
Create an extremely detailed, Day-by-Day study plan strictly for the NEXT 30 DAYS:

- **Week 1 to Week 4 Breakdown**: Specific chapters/topics to cover EACH DAY based on the student's weaknesses.
- **Daily Time Allocation**: How much time to spend on each subject daily.
- **Progress Tracking**: Remind the student that after completing this 1-month plan, they should take a new assessment on the portal to update their plan for the following month.

Use a **Markdown table** for weekly/monthly breakdown.

### 4. ⏰ Daily Study Routine
Provide a realistic day plan based on {daily_time} hours:
| Time Slot | Activity | Subject | Duration |
|-----------|----------|---------|----------|

### 5. 📚 Subject-Specific Strategy
For EACH subject in the student's list, provide:
- Top 5 most important chapters for boards
- Common mistakes to avoid
- Best study technique (e.g., mind maps, flashcards, practice problems)
- Recommended resource (NCERT, sample papers, etc.)

### 6. 📝 Revision & Mock Test Plan
- How many mock tests to take per month
- How to analyze mistakes from mocks
- Last 10 years paper strategy

### 7. 💪 Motivation & Consistency Tips
- Practical tips to stay consistent
- How to recover from a bad mock test
- Daily/weekly milestones to celebrate small wins

---

## OUTPUT FORMATTING RULES:
- Use rich, visual Markdown with proper heading hierarchy (# ## ###)
- Add relevant emojis to ALL section headings and key bullet points
- Use **Markdown Tables** for schedules, comparisons, and gap analysis
- Use `> blockquotes` for critical insights and warnings
- Use **bold** for action items and *italic* for explanations
- Be HIGHLY specific — mention actual chapter names, not generic advice
- Provide a truly comprehensive plan. Do NOT summarize or shorten.
"""

            # Build content_parts for multimodal call
            if marksheet_uploaded_file:
                content_parts = [marksheet_uploaded_file, prompt]
            else:
                content_parts = [prompt]
        
        elif is_junior:
            target_scores = data.get('target_scores', {})
            prompt = f"""

Your role is NOT to decide admissions or calculate scores. 
The system already provides:
- Student exam score (already calculated externally)
- Subject-wise performance breakdown
- Weak and strong topics
- Target subject scores
- Current class level

Your job is to act as a:
1. Performance analyst
2. Weakness detector
3. Study planner
4. Motivational academic coach

for a junior student in {class_level}.

DO NOT:
- Do not calculate marks or ranks
- Do not decide admission eligibility
- Do not override system rules
- Do not guarantee admission outcomes

ONLY:
- Analyze given data
- Explain performance in simple language
- Suggest improvements
- Create structured study plans

---

INPUT DATA:

Student Profile:
- Class Level: {class_level}
- Target Subject Scores (out of 100):
  Mathematics: {target_scores.get('mathematics', '90')}
  Physics: {target_scores.get('physics', '90')}
  Chemistry: {target_scores.get('chemistry', '90')}
- Exam Type: {exam_name}

CURRENT EXAM PERFORMANCE:
- Total Score: {total_score}/100
- Subject-wise scores:
  Math: {math_score}
  Physics: {physics_score}
  Chemistry: {chemistry_score}
- Weak Topics: {weak_topics}
- Strong Topics: {strong_topics}

Time Available per day:
{daily_time} hours
"""

            if is_update_request and previous_plan:
                prompt += f"""
---
PREVIOUS STRATEGY CONTEXT:
The student has taken a new exam. You must act as a mentor evaluating their progress since their last assessment.
Compare their current performance to their past goals, acknowledge the new exam context, and provide a highly updated, refined strategy. Note changes in their weak topics or overall score conceptually.
---
"""

            prompt += f"""
TASKS YOU MUST PERFORM:

### 1. Performance Analysis {"& Progress Review" if is_update_request else ""}
Explain:
- Overall performance level (beginner / average / strong / advanced)
- Subject-wise strengths and weaknesses
- Key reasons for score loss
{"- How this performance compares to general expectations for a follow-up exam." if is_update_request else ""}

---

### 2. Gap Analysis
Compare current performance with target scores (Math: {target_scores.get('mathematics', '90')}/100, Physics: {target_scores.get('physics', '90')}/100, Chemistry: {target_scores.get('chemistry', '90')}/100):
- Identify skill gaps
- List missing concepts
- Highlight improvement areas

---

### 3. 📅 {"Updated 1-Month Study Plan" if is_update_request else "Next 1-Month Study Plan"}
Create a highly structured, day-by-day actionable plan strictly for the NEXT 30 DAYS:
- **Daily Schedule**: Week 1 to Week 4 breakdown with specific daily study tasks and topics.
- Subject priority order focusing on fixing weak areas.
- Revision strategy and mock test practice schedule.
Make it realistic based on available daily time ({daily_time} hours).
- **Progress Tracking**: Remind the student that after completing this 1-month plan, they should take a new assessment on the portal to update their plan for the following month.
{"Focus intensely on adapting the strategy to fix the weaknesses exposed in THIS latest exam." if is_update_request else ""}

---

### 4. Daily Routine Plan
Give:
- Morning study tasks
- Afternoon practice tasks
- Evening revision tasks
- Mock test frequency

---

### 5. Improvement Strategy
Give:
- Fastest ways to improve score and reach target goals
- High-impact topics to focus on first
- Study techniques (speed, accuracy, revision)

---

### 6. Motivation Section
Give short motivational guidance:
- Keep it practical, not emotional
- Focus on consistency and improvement

OUTPUT STYLE & FORMATTING RULES:
- IMPORTANT: Use highly visual and engaging Markdown.
- MUST USE proper markdown syntax for ALL headings (e.g. `# Heading 1`, `## Heading 2`, `### Heading 3`). Do NOT use plain text numbers like "1. Heading".
- Add relevant emojis to ALL headings and key bullet points.
- Structure daily routines and weekly plans using **Markdown Tables**.
- Use `> blockquotes` for crucial insights or warnings.
- Provide deep, extensive text and analysis. Do not summarize; go into granular detail for each subject.
- Use **bold** and *italic* text frequently to highlight important concepts and action items.
- Segment clearly by subject (e.g. `### 🧮 Mathematics`, `### ⚛️ Physics`, `### 🧪 Chemistry`) with specific actionable advice for each.
"""
        else:
            prompt = f"""
You are an AI academic mentor inside an LMS system.

Your role is NOT to decide admissions or calculate scores. 
The system already provides:
- Student exam score (already calculated externally)
- Subject-wise performance breakdown
- Weak and strong topics
- Target college selected by student
- Current class level

Your job is to act as a:
1. Performance analyst
2. Weakness detector
3. Study planner
4. Motivational academic coach

DO NOT:
- Do not calculate marks or ranks
- Do not decide admission eligibility
- Do not override system rules
- Do not guarantee admission outcomes

ONLY:
- Analyze given data
- Explain performance in simple language
- Suggest improvements
- Create structured study plans

---

INPUT DATA:

Student Profile:
- Class Level: {class_level}
- Target College: {target_college}
- Target Career/Field: {target_career}
- Exam Type: {exam_name}

CURRENT EXAM PERFORMANCE:
- Total Score: {total_score}/100
- Subject-wise scores:
  Math: {math_score}
  Physics: {physics_score}
  Chemistry: {chemistry_score}
- Weak Topics: {weak_topics}
- Strong Topics: {strong_topics}

Time Available per day:
{daily_time} hours
"""

            if is_update_request and previous_plan:
                prompt += f"""
---
PREVIOUS STRATEGY CONTEXT:
The student has taken a new exam. You must act as a mentor evaluating their progress since their last assessment.
Compare their current performance to their past goals, acknowledge the new exam context, and provide a highly updated, refined strategy. Note changes in their weak topics or overall score conceptually.
---
"""

            prompt += f"""
TASKS YOU MUST PERFORM:

### 1. Performance Analysis {"& Progress Review" if is_update_request else ""}
Explain:
- Overall performance level (beginner / average / strong / advanced)
- Subject-wise strengths and weaknesses
- Key reasons for score loss
{"- How this performance compares to general expectations for a follow-up exam." if is_update_request else ""}

---

### 2. Gap Analysis
Compare current performance with target college ({target_college}):
- Identify skill gaps
- List missing concepts
- Highlight improvement areas

Do NOT say admission is possible or impossible.
Instead say:
- "Distance to target level is high / medium / low"

---

### 3. 📅 {"Updated 1-Month Study Plan" if is_update_request else "Next 1-Month Study Plan"}
Create a highly structured, day-by-day actionable plan strictly for the NEXT 30 DAYS:
- **Daily Schedule**: Week 1 to Week 4 breakdown with specific daily study tasks and topics.
- Subject priority order focusing on fixing weak areas.
- Revision strategy and mock test practice schedule.
Make it realistic based on available daily time ({daily_time} hours).
- **Progress Tracking**: Remind the student that after completing this 1-month plan, they should take a new assessment on the portal to update their plan for the following month.
{"Focus intensely on adapting the strategy to fix the weaknesses exposed in THIS latest exam." if is_update_request else ""}
---

### 4. Daily Routine Plan
Give:
- Morning study tasks
- Afternoon practice tasks
- Evening revision tasks
- Mock test frequency

---

### 5. Improvement Strategy
Give:
- Fastest ways to improve score
- High-impact topics to focus on first
- Study techniques (speed, accuracy, revision)

---

### 6. Motivation Section
Give short motivational guidance:
- Keep it practical, not emotional
- Focus on consistency and improvement

OUTPUT STYLE & FORMATTING RULES:
- IMPORTANT: Use highly visual and engaging Markdown.
- MUST USE proper markdown syntax for ALL headings (e.g. `# Heading 1`, `## Heading 2`, `### Heading 3`). Do NOT use plain text numbers like "1. Heading".
- Add relevant emojis to ALL headings and key bullet points.
- Structure daily routines and weekly plans using **Markdown Tables**.
- Use `> blockquotes` for crucial insights or warnings.
- Provide deep, extensive text and analysis. Do not summarize; go into granular detail for each subject.
- Use **bold** and *italic* text frequently to highlight important concepts and action items.
- Segment clearly by subject (e.g. `### ⚛️ Physics`, `### 🧪 Chemistry`) with specific actionable advice for each.
"""

        # For Class 10 with marksheet, content_parts is already built above.
        # For all other classes, build content_parts from the prompt string.
        if not is_class_10:
            content_parts = [prompt]

        json_schema_prompt = """
IMPORTANT: You MUST return your ENTIRE response as a strictly valid JSON object matching the exact structure below. Do NOT wrap it in markdown code blocks (e.g. no ```json ... ```), just output the raw JSON object.

{
  "metrics": {
    "planner_score": 70, 
    "academic_score_percentage": 84, 
    "mindset_score_percentage": 52, 
    "risk_level": "Medium", 
    "primary_gap": "Physics", 
    "plan_intensity": "Structured" 
  },
  "psychological_profile": {
    "focus": 50, 
    "discipline": 50,
    "confidence": 50,
    "stress_control": 50,
    "exam_temperament": 50,
    "digital_discipline": 50,
    "revision_habit": 50,
    "lifestyle": 75,
    "self_awareness": 75
  },
  "subject_performance": [
    {
      "subject": "Physics",
      "score": "67%",
      "diagnosis": "Moderate understanding. Accuracy and chapter revision needed.",
      "immediate_action": "Revise weak chapters + 3 timed quizzes/week."
    }
  ],
  "diagnoses": {
    "academic": ["Base Building: No critical base gap found.", "Accuracy Zone: Physics, Chemistry need timed quizzes and error log."],
    "behavioural": ["Phone/Distraction: High distraction risk.", "Routine Discipline: Routine is unstable."],
    "exam_pattern": ["Time Management: Student may get stuck in tests."]
  },
  "master_plan_markdown": "The detailed markdown strategy here... (All the markdown text for the daily routines, deep analysis, etc. goes here)",
  "strategy_blocks": {
    "daily_core_block": "2 focused blocks of 60 minutes + 20 minute revision.",
    "weekly_test_rhythm": "2 subject tests + 1 mixed test + 1 error-log correction session every week.",
    "psychology_habit": "5-minute breathing before study...",
    "mentor_review": "Mentor review once a week with test analysis."
  },
  "mentor_intervention_rules": [
    {"type": "red_flag", "text": "If weekly test score falls below 50% twice, assign teacher doubt class within 48 hours."},
    {"type": "growth", "text": "If any subject crosses 85% for 3 tests, move student to advanced problem set."}
  ],
  "parent_monitoring_dashboard": {
    "daily": "Check study block completion, not just hours studied.",
    "weekly": "Review test marks, mistakes, phone usage and sleep routine.",
    "monthly": "Compare target vs achievement subject-wise and attend mentor review.",
    "do_not": "Scold immediately after low marks."
  },
  "subject_wise_plan": [
    {"subject": "Physics", "plan": "Revise medium-risk chapters in Physics. Daily 25 questions or 2 answer-writing sets."}
  ],
  "psychology_behaviour_plan": [
    {"area": "Digital Control", "plan": "Phone discipline: app lock during study block, phone only after task completion."}
  ]
}

Ensure all metrics are tailored accurately to the student's actual performance data provided above. The `master_plan_markdown` should contain the comprehensive, long-form markdown version of the plan, while the other fields populate the structured dashboard.
"""
        content_parts.append(json_schema_prompt)
        
        response = model.generate_content(content_parts)
        ai_text = response.text

        # Persist plan — upsert by test_id so re-runs update rather than duplicate
        if test_id:
            try:
                plan_record, created = StudentMasterPlan.objects.get_or_create(
                    user=request.user,
                    test_id=test_id,
                    defaults={
                        'target_college': target_college_obj or {"name": target_college},
                        'master_plan': ai_text
                    }
                )
                if not created:
                    # Already exists — update with freshly generated content
                    plan_record.master_plan = ai_text
                    plan_record.target_college = target_college_obj or {"name": target_college}
                    plan_record.save()
                    logger.info(f"[AI MENTOR] Updated plan for user={request.user.pk}, test_id={test_id}")
                else:
                    logger.info(f"[AI MENTOR] Created new plan for user={request.user.pk}, test_id={test_id}")
            except Exception as save_err:
                logger.error(f"[AI MENTOR] Failed to save plan to DB: {save_err}")

        return Response({"ai_plan": ai_text, "is_update": is_update_request}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"[AI MENTOR] Error generating study plan: {str(e)}", exc_info=True)
        error_name = type(e).__name__
        # Check if it's a deadline exceeded exception (timeout)
        if 'DeadlineExceeded' in error_name:
            return Response({"error": "The AI is experiencing high traffic and timed out. Please try generating the plan again later."}, status=status.HTTP_504_GATEWAY_TIMEOUT)
        elif 'RetryError' in error_name or 'ServiceUnavailable' in error_name:
            return Response({"error": "Google's AI servers are currently experiencing extremely high demand. Please try again in a few minutes."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        return Response({"error": "Failed to generate AI study plan. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_college_intelligence(request):
    try:
        data = request.data
        college_name = data.get('college_name')
        exam_type = data.get('exam_type', 'JEE')

        if not college_name:
            return Response({"error": "College name is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize name for consistent caching
        normalized_name = college_name.lower().strip()

        # 1. Check Database Cache First
        cached_entry = CollegeIntelligence.objects.filter(
            college_name=normalized_name,
            exam_type=exam_type
        ).first()

        if cached_entry:
            logger.info(f"[AI COLLEGE] Cache hit for: {normalized_name} ({exam_type})")
            return Response(cached_entry.data, status=status.HTTP_200_OK)

        logger.info(f"[AI COLLEGE] Cache miss. Requesting AI intelligence for: {college_name} ({exam_type})")

        api_key = _get_gemini_api_key()
        if not api_key:
            logger.error("[AI COLLEGE] Gemini API key not found in settings.")
            return _gemini_not_configured_response()

        if genai is None:
            return Response({"error": "AI SDK not properly initialized"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest', generation_config={"response_mime_type": "application/json"})

        prompt = f"""
        Provide detailed intelligence for {college_name} for the {exam_type} exam.
        Return a JSON object with:
        - summary: 2-3 sentences about the college.
        - location: City, State.
        - cutoffs: Array of 5-8 years of historical closing ranks/marks ({{year, value}}).
        - branches: Array of top 10 branches with opening and closing ranks ({{branch, opening, closing}}).
        - required_percentage: An estimated percentage score (0-100) a student would need in a standard mock assessment to be competitive for the top branches at this college.
        - website: Official URL of the college (e.g. https://www.iitkgp.ac.in).
        - logo_url: A high-quality, direct URL to the college's official logo or crest. Must be a direct image link (PNG, SVG, or JPG). If you can't find a direct link, provide a reliable link to the logo from Wikipedia Commons.
        - is_compatible: Boolean. True if the college accepts {exam_type} for admissions to its primary programs, False otherwise.
        - compatibility_error: If is_compatible is False, provide a short explanation. If True, leave empty.
        
        Use realistic historical data based on your knowledge.
        """

        response = model.generate_content(prompt)
        
        # Clean response text
        text = response.text.strip()
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        text = text.strip()

        import re
        json_match = re.search(r'(\{.*\})', text, re.DOTALL)
        if json_match:
            text = json_match.group(1)

        try:
            result = json.loads(text)
            
            # 2. Store in Database Cache for future use
            try:
                CollegeIntelligence.objects.update_or_create(
                    college_name=normalized_name,
                    exam_type=exam_type,
                    defaults={'data': result}
                )
                logger.info(f"[AI COLLEGE] Cached new intelligence for: {normalized_name}")
            except Exception as cache_err:
                logger.error(f"[AI COLLEGE] Failed to save cache: {cache_err}")

            return Response(result, status=status.HTTP_200_OK)
        except json.JSONDecodeError as je:
            logger.error(f"[AI COLLEGE] JSON Decode Error: {je}. Raw text: {text}")
            return Response({"error": "Invalid response format from AI"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except google_exceptions.ResourceExhausted:
        logger.warning("[AI COLLEGE] Quota exceeded for Gemini API.")
        return Response({
            "error": "AI Quota Exceeded",
            "is_quota_error": True,
            "message": "The AI is currently at its processing limit. Basic validation is active."
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    except Exception as e:
        logger.error(f"[AI COLLEGE] General Error: {str(e)}", exc_info=True)
        return Response({"error": "Failed to fetch college intelligence"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_college_ai(request):
    try:
        data = request.data
        query = data.get('query', '').strip().lower()
        exam_type = data.get('exam_type', 'JEE')

        if not query or len(query) < 2:
            json_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'data', 'colleges.json')
            colleges = []
            if os.path.exists(json_path):
                with open(json_path, 'r', encoding='utf-8') as f:
                    all_colleges = json.load(f)
                    colleges = all_colleges[:50]
            return Response(colleges, status=status.HTTP_200_OK)

        # LOCAL SEARCH from verified list (Converted from Merged_Institution_Names.xlsx)
        json_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'data', 'colleges.json')
        
        colleges = []
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                all_colleges = json.load(f)
                
                # Filter by query (case insensitive)
                # Limit to top 50 results for performance
                count = 0
                for col in all_colleges:
                    if query in col.lower():
                        colleges.append(col)
                        count += 1
                    if count >= 50:
                        break
        
        return Response(colleges, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"[COLLEGE SEARCH] Local Search Error: {e}", exc_info=True)
        return Response([], status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_marksheet_data(request):
    try:
        file_id = request.data.get('file_id')
        if not file_id:
            return Response({"error": "file_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Fetch file
        from django.core.files.storage import default_storage
        import mimetypes
        import base64
        
        uploaded_obj = UploadedFile.objects.filter(pk=file_id).first()
        if not uploaded_obj or not uploaded_obj.file:
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)

        file_name = str(uploaded_obj.file.name)
        mime_type, _ = mimetypes.guess_type(file_name)
        if not mime_type:
            mime_type = 'image/jpeg'
            
        with default_storage.open(file_name, 'rb') as fh:
            file_bytes = fh.read()
            
        b64_data = base64.b64encode(file_bytes).decode('utf-8')
        image_part = {
            'inline_data': {
                'mime_type': mime_type,
                'data': b64_data
            }
        }

        # 2. Setup Gemini
        api_key = _get_gemini_api_key()
        if not api_key:
            return _gemini_not_configured_response()

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest', generation_config={"response_mime_type": "application/json"})

        prompt = """
        Extract the subjects and their marks from this Class 9 marksheet image.
        Return ONLY a JSON array of objects.
        Each object must have exactly two keys:
        - "name": The name of the subject (e.g. "English", "Mathematics", "Science")
        - "class9_marks": The marks obtained in that subject normalized out of 100. (e.g. if they got 45 out of 50, put 90). Return this as a number or string.
        Do not include anything else in your response.
        """

        response = model.generate_content([image_part, prompt])
        text = response.text.strip()
        
        # 3. Parse and return JSON
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        text = text.strip()

        import re
        json_match = re.search(r'(\[.*\])', text, re.DOTALL)
        if json_match:
            text = json_match.group(1)

        result = json.loads(text)
        return Response(result, status=status.HTTP_200_OK)

    except google_exceptions.ResourceExhausted:
        return Response({"error": "AI Quota Exceeded"}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    except json.JSONDecodeError as je:
        logger.error(f"[AI MARKSHEET] JSON Decode Error: {je}. Raw text: {text}")
        return Response({"error": "Could not parse marks from image"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"[AI MARKSHEET] General Error: {str(e)}", exc_info=True)
        return Response({"error": "Failed to extract data"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
