import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser
from tests.models import Test
from api.db_utils import parse_section, get_db
from django.core.cache import cache
from django.db.models import Q

def check_discrepancy(test_id, centre_code):
    test = Test.objects.get(pk=test_id)
    cent_obj = Centre.objects.filter(code__iexact=centre_code).first()
    cent_name = cent_obj.name if cent_obj else None
    
    # 1. Logic from Submissions action
    rooster_students = list(CustomUser.objects.filter(user_type='student').filter(
        Q(centre_code__iexact=centre_code) | Q(centre_name__iexact=cent_name)
    ))
    
    allowed_sections_list = [s.name.strip().lower() for s in test.allotted_sections.all()]
    
    all_subs_list = []
    # (Simplified for script)
    db = get_db()
    sub_docs = list(db['tests_testsubmission'].find({'test_id': test.pk}))
    sub_map = {str(d['student_id']): d for d in sub_docs}
    
    seen_ids = set()
    roster_count_sub = 0
    for s in rooster_students:
        uid = (s.username or str(s.pk)).upper().strip()
        has_sub = str(s.pk) in sub_map
        if not has_sub and allowed_sections_list:
            s_exams = [sec.lower() for sec in parse_section(s.exam_section)]
            s_studies = [sec.lower() for sec in parse_section(s.study_section)]
            if not any(sec in allowed_sections_list for sec in (s_exams + s_studies)):
                continue
        roster_count_sub += 1
        seen_ids.add(uid)
        if s.admission_number: seen_ids.add(s.admission_number.upper().strip())
        if s.email: seen_ids.add(s.email.lower().strip())
    
    erp_pool = cache.get('erp_all_students_v1') or []
    for erp in erp_pool:
        e_centre = str(erp.get('centre') or '').upper().strip()
        e_adm = str(erp.get('admissionNumber') or '').upper().strip()
        e_email = str(erp.get('student', {}).get('studentsDetails', [{}])[0].get('studentEmail') or "").lower().strip()
        
        if (e_adm and e_adm in seen_ids) or (e_email and e_email in seen_ids):
            continue
            
        match = False
        c_name_up = str(cent_name or '').upper()
        c_code_up = str(centre_code or '').upper()
        if (c_name_up and (c_name_up in e_centre or e_centre in c_name_up)) or (c_code_up and e_centre == c_code_up):
            match = True
        
        if match:
            if allowed_sections_list:
                sec_allot = erp.get('sectionAllotment', {})
                e_exams = [sec.lower() for sec in parse_section(sec_allot.get('examSection'))]
                e_studies = [sec.lower() for sec in parse_section(sec_allot.get('studySection'))]
                if not any(sec in allowed_sections_list for sec in (e_exams + e_studies)):
                    continue
            roster_count_sub += 1
            seen_ids.add(e_adm)
            if e_email: seen_ids.add(e_email)

    print(f"Submissions Logic count for {centre_code}: {roster_count_sub}")

    # 2. Logic from Centres action (Exclusive)
    # (Simplified: assumes only DUMDUM and HAZRA for comparison)
    all_allotments = list(test.centre_allotments.all().select_related('centre'))
    global_seen = set()
    centre_res = {}
    
    # Pre-add submissions to global seen (Step A in centres logic)
    # (Simplified: assuming no submissions in DUMDUM for now as per user ss showing 0 attempted)
    
    for allot in all_allotments:
        c = allot.centre
        count = 0
        c_code = c.code.lower().strip()
        c_name = c.name.lower().strip()
        
        pool = CustomUser.objects.filter(user_type='student').filter(
            Q(centre_code__iexact=c_code) | Q(centre_name__iexact=c_name)
        )
        for s in pool:
            uid = (s.username or str(s.pk)).upper().strip()
            if uid in global_seen: continue
            if allowed_sections_list:
                s_exams = [sec.lower() for sec in parse_section(s.exam_section)]
                if not any(sec in allowed_sections_list for sec in s_exams): continue
            count += 1
            global_seen.add(uid)
            if s.admission_number: global_seen.add(s.admission_number.upper().strip())
            
        for erp in erp_pool:
            e_adm = str(erp.get('admissionNumber') or '').upper().strip()
            if e_adm in global_seen: continue
            e_centre = str(erp.get('centre') or '').upper().strip()
            if c_name.upper() in e_centre or e_centre in c_name.upper() or c.code.upper() == e_centre:
                if allowed_sections_list:
                    sec_allot = erp.get('sectionAllotment', {})
                    if not any(sec.lower() in allowed_sections_list for sec in parse_section(sec_allot.get('examSection'))):
                        continue
                count += 1
                global_seen.add(e_adm)
        centre_res[c.code] = count

    print(f"Centres Logic counts: {centre_res}")

if __name__ == "__main__":
    from centres.models import Centre
    check_discrepancy(18, "DM")
