import os
import django
import sys

# Add the backend directory to sys.path
sys.path.append(r'f:\student portal\backend')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from questions.models import Question
from tests.models import Test
from sections.models import Section

def fix_metadata(dry_run=True):
    print(f"{'DRY RUN' if dry_run else 'LIVE RUN'}: Updating question metadata based on allotted tests...\n")
    
    total_updated = 0
    unique_questions_to_update = {} # q_id -> {class_level, exam_type, target_exam}

    # Iterate through all tests
    tests = Test.objects.all().select_related('class_level', 'exam_type').prefetch_related('sections', 'sections__questions', 'target_exams')
    
    for test in tests:
        class_level = test.class_level
        exam_type = test.exam_type
        target_exam = test.target_exams.first()

        print(f"Checking Test: {test.name} (Class: {class_level}, Exam: {exam_type})")

        sections = test.sections.all()
        print(f"  Found {len(sections)} sections.")
        for section in sections:
            qs = section.questions.all()
            print(f"    Section {section.name} has {len(qs)} questions.")
            for q in qs:
                q_id = str(q.pk)
                if q_id not in unique_questions_to_update:
                    if len(unique_questions_to_update) < 5:
                        print(f"      - Debug: Found Q {q_id}, current class_level_id: {getattr(q, 'class_level_id', 'N/A')}")
                    unique_questions_to_update[q_id] = {
                        'class_level': class_level,
                        'exam_type': exam_type,
                        'target_exam': target_exam,
                        'test_name': test.name
                    }

    print(f"Found {len(unique_questions_to_update)} unique questions allotted to tests.")

    # Bulk fetch all relevant questions
    from bson import ObjectId
    q_ids = [ObjectId(qid) if isinstance(qid, str) and len(qid) == 24 else qid for qid in unique_questions_to_update.keys()]
    
    questions_map = {str(q.pk): q for q in Question.objects.filter(pk__in=q_ids)}
    print(f"Successfully fetched {len(questions_map)} questions from database for metadata update.")

    for q_id, metadata in unique_questions_to_update.items():
        q = questions_map.get(q_id)
        if not q:
            continue

        changed = False
        
        # Check class_level
        # Comparing IDs is safer in Djongo
        q_class_id = getattr(q, 'class_level_id', None)
        target_class_id = metadata['class_level'].pk if metadata['class_level'] else None
        
        if target_class_id and q_class_id != target_class_id:
            q.class_level = metadata['class_level']
            changed = True
        
        # Check exam_type
        q_exam_id = getattr(q, 'exam_type_id', None)
        target_exam_id = metadata['exam_type'].pk if metadata['exam_type'] else None
        
        if target_exam_id and q_exam_id != target_exam_id:
            q.exam_type = metadata['exam_type']
            changed = True
            
        # Check target_exam
        q_target_exam_id = getattr(q, 'target_exam_id', None)
        target_target_exam_id = metadata['target_exam'].pk if metadata['target_exam'] else None
        
        if target_target_exam_id and q_target_exam_id != target_target_exam_id:
            q.target_exam = metadata['target_exam']
            changed = True

        if changed:
            total_updated += 1
            if not dry_run:
                q.save()
            if total_updated <= 10:
                print(f"  - [{total_updated}] Updated Q {q_id}: Class={metadata['class_level']} ({target_class_id}), Exam={metadata['exam_type']} ({target_exam_id})")

    print(f"\nSummary: {total_updated} questions {'updated' if not dry_run else 'need updating'}.")
    if dry_run:
        print("This was a DRY RUN. No changes were made to the database.")
    else:
        print(f"Successfully updated {total_updated} questions in the database.")

if __name__ == "__main__":
    # Perform live run
    fix_metadata(dry_run=False)
