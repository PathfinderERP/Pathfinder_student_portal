import json
import os
import django
from datetime import datetime
from bson import ObjectId

import sys
# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from questions.models import Question
from master_data.models import ClassLevel, Subject, Chapter, Topic, ExamType, TargetExam, ExamDetail

def parse_date(date_dict):
    if not date_dict or '$date' not in date_dict:
        return None
    date_str = date_dict['$date']
    # Removing 'Z' and parsing
    if date_str.endswith('Z'):
        date_str = date_str[:-1]
    try:
        return datetime.fromisoformat(date_str)
    except ValueError:
        return None

def import_questions(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    count = 0
    errors = 0
    for item in data:
        try:
            # Map IDs
            q_id = item.get('_id', {}).get('$oid')
            
            # Prepare options
            options_raw = item.get('question_options', '[]')
            if isinstance(options_raw, str):
                try:
                    options = json.loads(options_raw)
                except:
                    options = []
            else:
                options = options_raw

            # Create question object
            question = Question(
                _id=ObjectId(q_id) if q_id else None,
                class_level_id=item.get('class_level_id'),
                subject_id=item.get('subject_id'),
                topic_id=item.get('topic_id'),
                exam_type_id=item.get('exam_type_id'),
                target_exam_id=item.get('target_exam_id'),
                test_name_id=item.get('test_name_id'),
                chapter_id=item.get('chapter_id'),
                question_type=item.get('question_type', 'SINGLE_CHOICE'),
                difficulty_level=str(item.get('difficulty_level', '1')),
                content=item.get('content', ''),
                image_1=item.get('image_1', ''),
                image_2=item.get('image_2', ''),
                solution=item.get('solution', ''),
                question_options=options,
                answer_from=item.get('answer_from'),
                answer_to=item.get('answer_to'),
                has_calculator=item.get('has_calculator', False),
                use_numeric_options=item.get('use_numeric_options', False),
                is_wrong=item.get('is_wrong', False),
                solve_time=item.get('solve_time', 60)
            )

            # Handle dates
            created_at = parse_date(item.get('created_at'))
            if created_at:
                question.created_at = created_at
            
            updated_at = parse_date(item.get('updated_at'))
            if updated_at:
                question.updated_at = updated_at

            # Save (using update_or_create to avoid duplicates if ID exists)
            # Question.objects.update_or_create defaults to using _id as lookup if provided
            question.save()
            count += 1
            if count % 100 == 0:
                print(f"Imported {count} questions...")

        except Exception as e:
            print(f"Error importing question: {e}")
            errors += 1

    print(f"Successfully imported {count} questions.")
    if errors > 0:
        print(f"Skipped {errors} questions due to errors.")

if __name__ == "__main__":
    JSON_FILE = r"f:\student portal\studentportal.questions_question_2804.json"
    import_questions(JSON_FILE)
