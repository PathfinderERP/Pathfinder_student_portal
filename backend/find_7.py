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

def find_7_discrepancy(test_id, centre_code):
    test = Test.objects.get(pk=test_id)
    target_c = Centre.objects.get(code__iexact=centre_code)
    
    allowed = [s.name.strip().lower() for s in test.allotted_sections.all()]
    erp_pool = cache.get('erp_all_students_v1') or []
    db = get_db()
    
    # Simulate Centres Logic (Exclusive)
    all_allotments = list(test.centre_allotments.all().select_related('centre'))
    target_centres = [a.centre for a in all_allotments]
    
    counts_c = {str(c.pk): 0 for c in target_centres}
    global_seen = set()
    
    # Loop B Logic
    for c in target_centres:
        pool = CustomUser.objects.filter(user_type='student').filter(
            Q(centre_code__iexact=c.code) | Q(centre_name__iexact=c.name)
        )
        for s in pool:
            uid = (s.username or str(s.pk)).upper().strip()
            if uid in global_seen: continue
            if allowed and not any(sec in allowed for sec in (parse_section(s.exam_section) + parse_section(s.study_section))):
                continue
            counts_c[str(c.pk)] += 1
            global_seen.add(uid)
            if s.admission_number: global_seen.add(s.admission_number.upper().strip())
            
    # Loop C Logic
    for erp in erp_pool:
        e_adm = str(erp.get('admissionNumber') or '').upper().strip()
        if e_adm in global_seen: continue
        e_centre = str(erp.get('centre') or '').upper().strip()
        for c in target_centres:
            if c.name.upper() in e_centre or e_centre in c.name.upper() or c.code.upper() == e_centre:
                if allowed and not any(sec.lower() in allowed for sec in (parse_section(erp.get('sectionAllotment', {}).get('examSection')) + parse_section(erp.get('sectionAllotment', {}).get('studySection')))):
                    continue
                counts_c[str(c.pk)] += 1
                global_seen.add(e_adm)
                break
                
    print(f"Centres count for {centre_code}: {counts_c[str(target_c.pk)]}")
    
    # Simulate Submissions Logic
    # (Matches what's in views.py)
    cent_name = target_c.name
    roster_subs = list(CustomUser.objects.filter(user_type='student').filter(
        Q(centre_code__iexact=centre_code) | Q(centre_name__iexact=cent_name)
    ))
    all_students_s = []
    seen_s = set()
    for s in roster_subs:
        uid = (s.username or str(s.pk)).upper().strip()
        if allowed and not any(sec in allowed for sec in (parse_section(s.exam_section) + parse_section(s.study_section))):
            continue
        all_students_s.append(s)
        seen_s.add(uid)
        if s.admission_number: seen_s.add(s.admission_number.upper().strip())
        
    for erp in erp_pool:
        e_centre = str(erp.get('centre') or '').upper().strip()
        match = False
        if (cent_name.upper() in e_centre or e_centre in cent_name.upper()) or (centre_code.upper() == e_centre):
            match = True
        if not match: continue
        if allowed and not any(sec.lower() in allowed for sec in (parse_section(erp.get('sectionAllotment', {}).get('examSection')) + parse_section(erp.get('sectionAllotment', {}).get('studySection')))):
            continue
        e_adm = str(erp.get('admissionNumber') or '').upper().strip()
        if e_adm in seen_s: continue
        all_students_s.append(erp)
        seen_s.add(e_adm)
    
    print(f"Submissions count: {len(all_students_s)}")

if __name__ == "__main__":
    find_7_discrepancy(18, "DM")
