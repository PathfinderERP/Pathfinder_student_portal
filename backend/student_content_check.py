import traceback
import ast
import json
from api.models import CustomUser
from tests.models import Test
from master_data.models import LibraryItem, Video, PenPaperTest, Homework

def parse_section(sec_string):
    if not sec_string:
        return []
    sec_string = sec_string.strip()
    try:
        if sec_string.startswith('['):
            # Try to safely parse a string representation of a list
            parsed = ast.literal_eval(sec_string)
            if isinstance(parsed, list):
                return [str(p).strip() for p in parsed]
    except Exception:
        pass
    
    return [sec_string]

def check_erp_students_content():
    try:
        erp_students = CustomUser.objects.filter(user_type='student')
        
        has_both_sections = erp_students.filter(
            exam_section__isnull=False, study_section__isnull=False
        ).exclude(exam_section='').exclude(study_section='')
        
        results = []
        results.append(f"ERP Students with BOTH exam_section and study_section defined: {has_both_sections.count()}\n")

        any_matches_found = False

        for student in list(has_both_sections[:30]):
            exam_sections = parse_section(student.exam_section)
            study_sections = parse_section(student.study_section)
            
            allowed_names = []
            allowed_names.extend(exam_sections)
            allowed_names.extend(study_sections)
            allowed_names = list(set([n for n in allowed_names if n]))
            
            # Check tests safely without distinct
            tests_qs = Test.objects.filter(allotted_sections__name__in=allowed_names)
            tests_count = len(set([t.id for t in tests_qs]))
            
            lib_qs = LibraryItem.objects.filter(section__name__in=allowed_names)
            library_items = len(set([i.id for i in lib_qs]))
            
            ppt_qs = PenPaperTest.objects.filter(sections__name__in=allowed_names)
            pen_paper_count = len(set([p.id for p in ppt_qs]))
            
            hw_qs = Homework.objects.filter(sections__name__in=allowed_names)
            hw_count = len(set([h.id for h in hw_qs]))
            
            vid_qs = Video.objects.filter(section__name__in=allowed_names)
            videos = len(set([v.id for v in vid_qs]))

            student_total = tests_count + library_items + pen_paper_count + hw_count + videos
            
            if student_total > 0:
                any_matches_found = True
                results.append(f"Student: {student.username} | Exam Sec: {exam_sections} | Study Sec: {study_sections}")
                results.append(f" - Tests available: {tests_count}")
                results.append(f" - Library items: {library_items}")
                results.append(f" - PenPaperTests: {pen_paper_count}")
                results.append(f" - Homeworks: {hw_count}")
                results.append(f" - Videos: {videos}\n")
                
                # We stop after finding at least 3 students with content to avoid long output
                if len(results) > 20: 
                    break

        if not any_matches_found:
            results.append("Checked top 30 students. NONE of them had matching content for their assigned sections.")
            
        with open('check_output.txt', 'w', encoding='utf-8') as f:
            f.write('\n'.join(results))

    except Exception as e:
        with open('check_output.txt', 'w', encoding='utf-8') as f:
            f.write(str(e))
            f.write('\\n')
            f.write(traceback.format_exc())

check_erp_students_content()
