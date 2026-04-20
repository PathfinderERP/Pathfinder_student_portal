import os
import google.generativeai as genai
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_ai_study_plan(request):
    try:
        data = request.data
        target_college = data.get('target_college', 'Top National Engineering College')
        class_level = data.get('class', '12')
        total_score = data.get('total_score', '65')
        math_score = data.get('math_score', '60')
        physics_score = data.get('physics_score', '65')
        chemistry_score = data.get('chemistry_score', '70')
        weak_topics = data.get('weak_topics', 'Integration, Electromagnetism')
        strong_topics = data.get('strong_topics', 'Algebra, Optics')
        daily_time = data.get('daily_time_hours', '4')
        exam_name = data.get('exam_name', 'JEE Main')

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return Response({"error": "Gemini API key not configured. Please contact admin."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-pro-latest')

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
        return Response({"ai_plan": response.text}, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[AI MENTOR] Error generating study plan: {e}")
        return Response({"error": "Failed to generate AI study plan"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
