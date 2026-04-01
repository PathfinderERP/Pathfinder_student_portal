import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser
from tests.models import Test
from api.db_utils import parse_section, get_db
from django.core.cache import cache
from django.db.models import Q
from centres.models import Centre

def debug_discrepancy(test_id, centre_code):
    test = Test.objects.get(pk=test_id)
    c = Centre.objects.get(code__iexact=centre_code)
    c_name = c.name
    
    allowed_sections_list = [s.name.strip().lower() for s in test.allotted_sections.all()]
    erp_pool = cache.get('erp_all_students_v1') or []
    
    # Logic in CENTRES (Exclusive logic loop-C)
    # We simulate being the FIRST centre
    already_seen = set() # Assuming 0 submissions for simplicity
    count_centres = 0
    id_centres = []
    
    # 1. Local match for DUMDUM
    pool_local = list(CustomUser.objects.filter(user_type='student').filter(
        Q(centre_code__iexact=centre_code) | Q(centre_name__iexact=c_name)
    ))
    for s in pool_local:
        uid = (s.username or str(s.pk)).upper().strip()
        is_sec = True
        if allowed_sections_list:
            s_exams = [sec.lower() for sec in parse_section(s.exam_section)]
            s_studies = [sec.lower() for sec in parse_section(s.study_section)]
            if not any(sec in allowed_sections_list for sec in (s_exams + s_studies)):
                is_sec = False
        if is_sec:
            id_centres.append(uid)
            already_seen.add(uid)
            
    # 2. ERP match for DUMDUM
    for erp in erp_pool:
        e_adm = str(erp.get('admissionNumber') or '').upper().strip()
        if e_adm in already_seen: continue
        
        e_centre = str(erp.get('centre') or '').upper().strip()
        match = False
        if c.name.upper() in e_centre or e_centre in c.name.upper() or c.code.upper() == e_centre:
            match = True
            
        if match:
            is_sec = True
            if allowed_sections_list:
                sec_allot = erp.get('sectionAllotment', {})
                e_exams = [sec.lower() for sec in parse_section(sec_allot.get('examSection'))]
                e_studies = [sec.lower() for sec in parse_section(sec_allot.get('studySection'))]
                if not any(sec in allowed_sections_list for sec in (e_exams + e_studies)):
                    is_sec = False
            if is_sec:
                id_centres.append(e_adm)
                already_seen.add(e_adm)
                
    id_centres = set(id_centres)
    print(f"Centres count: {len(id_centres)}")

    # Logic in SUBMISSIONS
    seen_subs = set()
    id_subs = []
    
    for s in pool_local:
        uid = (s.username or str(s.pk)).upper().strip()
        is_sec = True
        if allowed_sections_list and not str(s.pk) in []: # assuming no subs
            s_exams = [sec.lower() for sec in parse_section(s.exam_section)]
            s_studies = [sec.lower() for sec in parse_section(s.study_section)]
            if not any(sec in allowed_sections_list for sec in (s_exams + s_studies)):
                is_sec = False
        if is_sec:
            id_subs.append(uid)
            seen_subs.add(uid)
            if s.admission_number: seen_subs.add(s.admission_number.upper().strip())
            
    for erp in erp_pool:
        e_adm = str(erp.get('admissionNumber') or '').upper().strip()
        if e_adm in seen_subs: continue
        
        e_centre = str(erp.get('centre') or '').upper().strip()
        match = False
        c_name_up = str(c_name or '').upper()
        c_code_up = str(centre_code or '').upper()
        if (c_name_up and (c_name_up in e_centre or e_centre in c_name_up)) or (c_code_up and e_centre == c_code_up):
            match = True
            
        if match:
            is_sec = True
            if allowed_sections_list:
                sec_allot = erp.get('sectionAllotment', {})
                e_exams = [sec.lower() for sec in parse_section(sec_allot.get('examSection'))]
                e_studies = [sec.lower() for sec in parse_section(sec_allot.get('studySection'))]
                if not any(sec in allowed_sections_list for sec in (e_exams + e_studies)):
                    is_sec = False
            if is_sec:
                id_subs.append(e_adm)
                seen_subs.add(e_adm)
                
    id_subs = set(id_subs)
    print(f"Submissions count: {len(id_subs)}")
    
    diff = id_centres - id_subs
    print(f"Extra in Centres: {diff}")
    
    diff2 = id_subs - id_centres
    print(f"Extra in Submissions: {diff2}")

if __name__ == "__main__":
    debug_discrepancy(18, "DM")
