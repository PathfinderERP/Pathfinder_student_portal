import os
import google.generativeai as genai
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import json
import logging
from google.api_core import exceptions as google_exceptions
from .models import UploadedFile, CustomUser, StudentMasterPlan

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_ai_study_plan(request):
    try:
        data = request.data
        test_id = data.get('test_id')
        target_college = data.get('target_college', 'Top National Engineering College')
        target_college_obj = data.get('target_college_obj', {})
        
        # Check for existing plan to avoid redundant AI calls
        if test_id:
            existing_plan = StudentMasterPlan.objects.filter(user=request.user, test_id=test_id).first()
            if existing_plan:
                return Response({
                    "ai_plan": existing_plan.master_plan, 
                    "cached": True,
                    "target_college": existing_plan.target_college
                }, status=status.HTTP_200_OK)

        class_level = data.get('class', '12')
        total_score = data.get('total_score', '65')
        math_score = data.get('math_score', '60')
        physics_score = data.get('physics_score', '65')
        chemistry_score = data.get('chemistry_score', '70')
        weak_topics = data.get('weak_topics', 'Integration, Electromagnetism')
        strong_topics = data.get('strong_topics', 'Algebra, Optics')
        daily_time = data.get('daily_time_hours', '4')
        exam_name = data.get('exam_name', 'JEE Main')

        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return Response({"error": "Gemini API key not configured. Please contact admin."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')

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
- Exam Type: {exam_name}
- Total Score: {total_score}/100
- Subject-wise scores:
  Math: {math_score}
  Physics: {physics_score}
  Chemistry: {chemistry_score}

Weak Topics:
{weak_topics}

Strong Topics:
{strong_topics}

Time Available per day:
{daily_time} hours

---

TASKS YOU MUST PERFORM:

### 1. Performance Analysis
Explain:
- Overall performance level (beginner / average / strong / advanced)
- Subject-wise strengths and weaknesses
- Key reasons for score loss

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

### 3. Master Study Plan (1-Month & 1-Year Strategy)
Create a highly structured plan including:
- **Immediate 1-Month Plan**: Weekly breakdown (Week 1, 2, 3, 4) with daily schedules
- **Long-Term 1-Year Strategy**: Monthly milestones and phase-wise goals leading to the exam
- Subject priority order
- Revision strategy
- Mock test schedule
Make it realistic based on available daily time ({daily_time} hours).

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

---

OUTPUT STYLE:
- Use clear headings
- Use bullet points
- Keep it structured and student-friendly
- Avoid overly long paragraphs
"""

        response = model.generate_content(prompt)
        ai_text = response.text

        # Save the generated plan persistently
        if test_id:
            try:
                StudentMasterPlan.objects.create(
                    user=request.user,
                    test_id=test_id,
                    target_college=target_college_obj or {"name": target_college},
                    master_plan=ai_text
                )
            except Exception as save_err:
                logger.error(f"[AI MENTOR] Failed to save plan to DB: {save_err}")

        return Response({"ai_plan": ai_text}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"[AI MENTOR] Error generating study plan: {str(e)}", exc_info=True)
        return Response({"error": "Failed to generate AI study plan"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_college_intelligence(request):
    try:
        data = request.data
        college_name = data.get('college_name')
        exam_type = data.get('exam_type', 'JEE')

        logger.info(f"[AI COLLEGE] Requesting intelligence for: {college_name} ({exam_type})")

        if not college_name:
            return Response({"error": "College name is required"}, status=status.HTTP_400_BAD_REQUEST)

        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.error("[AI COLLEGE] Gemini API key not found in settings.")
            return Response({"error": "Gemini API key not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest', generation_config={"response_mime_type": "application/json"})

        prompt = f"""
        Provide detailed intelligence for {college_name} for the {exam_type} exam.
        Return a JSON object with:
        - summary: 2-3 sentences about the college.
        - location: City, State.
        - cutoffs: Array of 5-8 years of historical closing ranks/marks ({{year, value}}).
        - branches: Array of top 10 branches with opening and closing ranks ({{branch, opening, closing}}).
        - required_percentage: An estimated percentage score (0-100) a student would need in a standard mock assessment (like the one in this portal) to be competitive for the top branches at this college.
        - website: Official URL.
        - is_compatible: Boolean. True if the college accepts {exam_type} for admissions to its primary programs, False otherwise.
        - compatibility_error: If is_compatible is False, provide a short explanation (e.g., "AIIMS is a medical institution and does not accept JEE scores"). If True, leave empty.
        
        Use realistic historical data based on your knowledge.
        """

        response = model.generate_content(prompt)
        
        # Clean response text in case markdown backticks are included despite JSON mode
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        import re
        json_match = re.search(r'(\{.*\})', text, re.DOTALL)
        if json_match:
            text = json_match.group(1)

        try:
            result = json.loads(text)
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

        if len(query) < 2:
            return Response([], status=status.HTTP_200_OK)

        # LOCAL SEARCH ONLY (as requested by user to remove AI dependency for dropdown)
        json_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'data', 'colleges.json')
        
        colleges = []
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                all_colleges = json.load(f)
                
                # Filter by query (case insensitive)
                # Limit to top 100 results for performance
                count = 0
                for col in all_colleges:
                    clean_col = col.strip().strip('"').strip("'")
                    if query in clean_col.lower():
                        colleges.append(clean_col)
                        count += 1
                    if count >= 100:
                        break
        
        return Response(colleges, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"[COLLEGE SEARCH] Local Search Error: {e}", exc_info=True)
        return Response([], status=status.HTTP_200_OK)



