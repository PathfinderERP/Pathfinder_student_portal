from django.core.management.base import BaseCommand
from master_data.models import Session, ClassLevel, TargetExam, ExamType, ExamDetail


class Command(BaseCommand):
    help = 'Recreate Exam Details from ERP export data'

    def handle(self, *args, **options):
        # ── Fetch existing master data objects by ID (from DB) ────────────────
        sess = (
            Session.objects.filter(name__icontains='2026-2027').first()
            or Session.objects.order_by('name').first()
        )
        if not sess:
            self.stdout.write(self.style.ERROR('No session found. Please sync sessions first.'))
            return

        # ClassLevel: name → DB id (from real DB data)
        # IDs: 5→13, 6→14, 7→15, 8→16, 9→17, 10→18, REPEATER→21
        CLASS_MAP = {
            '5': 13, '6': 14, '7': 15, '8': 16,
            '9': 17, '10': 18, '11': 19, '12': 20,
            'REPEATER': 21, 'ALL CLASSES': 24,
        }
        # Roman numerals used in exam names
        ROMAN_TO_DIGIT = {
            'VIII': '8', 'VII': '7', 'IX': '9',
            'VI': '6', 'X': '10', 'XI': '11', 'XII': '12',
        }

        # TargetExam: name → DB id (from real DB data)
        # IDs: FOUNDATION CLASS 10 → 36, FOUNDATION CLASS 9 → 35, etc.
        # For general "FOUNDATION" fallback exams, use "FOUNDATION CLASS X" where X is found in name
        TARGET_MAP = {
            'FOUNDATION CLASS 5': 15,
            'FOUNDATION CLASS 6': 32,
            'FOUNDATION CLASS 7': 33,
            'FOUNDATION CLASS 8': 34,
            'FOUNDATION CLASS 9': 35,
            'FOUNDATION CLASS 10': 36,
            'DEMO': 39,
            'REPEATER': 29,
        }

        def get_class(exam_name):
            upper = exam_name.upper()
            # Try "CLASS 10", "CLASS 9", etc.
            for digit in ['10', '12', '11', '9', '8', '7', '6', '5']:
                if f'CLASS {digit}' in upper or f'CLASS{digit}' in upper:
                    cid = CLASS_MAP.get(digit)
                    if cid:
                        return ClassLevel.objects.filter(id=cid).first()
            # Roman numerals
            for roman, digit in ROMAN_TO_DIGIT.items():
                if roman in upper:
                    cid = CLASS_MAP.get(digit)
                    if cid:
                        return ClassLevel.objects.filter(id=cid).first()
            # Explicit keyword
            for key, cid in CLASS_MAP.items():
                if key.upper() in upper:
                    return ClassLevel.objects.filter(id=cid).first()
            return None

        def get_target(exam_name, target_key=None):
            if target_key:
                tid = TARGET_MAP.get(target_key)
                if tid:
                    return TargetExam.objects.filter(id=tid).first()
            upper = exam_name.upper()
            # Check digit in name to pick correct Foundation target
            for digit in ['10', '12', '11', '9', '8', '7', '6', '5']:
                if f'CLASS {digit}' in upper or f'CLASS{digit}' in upper:
                    key = f'FOUNDATION CLASS {digit}'
                    tid = TARGET_MAP.get(key)
                    if tid:
                        return TargetExam.objects.filter(id=tid).first()
            # Roman numerals
            for roman, digit in ROMAN_TO_DIGIT.items():
                if roman in upper:
                    key = f'FOUNDATION CLASS {digit}'
                    tid = TARGET_MAP.get(key)
                    if tid:
                        return TargetExam.objects.filter(id=tid).first()
            if 'DEMO' in upper:
                return TargetExam.objects.filter(id=39).first()
            return None

        def get_type(name):
            # Use existing exam types, don't create new ones with erp_id=None issues
            et = ExamType.objects.filter(name__iexact=name).first()
            if not et:
                et = ExamType.objects.filter(name__icontains=name).first()
            if not et:
                et = ExamType.objects.first()
            return et

        # ── ERP source data ───────────────────────────────────────────────────
        erp_exams = [
            # From ERP export (21 records)
            {'name': 'Foundation PT2 Class VIII',          'code': 'FPT2_CL8',           'dur': 180, 'marks': 0},
            {'name': 'Foundation PT2 Class IX',            'code': 'FPT2_CL9',           'dur': 180, 'marks': 0},
            {'name': 'Foundation PT2 ClassVII',            'code': 'FPT2_CL7',           'dur': 180, 'marks': 0},
            {'name': 'FOUNDATION CLASS 7 CLAP TEST 1',     'code': 'CLASS_7_CLAPTEST_1',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 7 CLAP TEST 2',     'code': 'CLASS_7_CLAPTEST_2',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 7 CLAP TEST 3',     'code': 'CLASS_7_CLAPTEST_3',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 7 CLAP TEST 4',     'code': 'CLASS_7_CLAPTEST_4',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 7 CLAP TEST 5',     'code': 'CLASS_7_CLAPTEST_5',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 8 CLAP TEST 2',     'code': 'CLASS_8_CLAPTEST_2',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 8 CLAP TEST 3',     'code': 'CLASS_8_CLAPTEST_3',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 8 CLAP TEST 4',     'code': 'CLASS_8_CLAPTEST_4',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 8 CLAP TEST 5',     'code': 'CLASS_8_CLAPTEST_5',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 9 CLAP TEST 1',     'code': 'CLASS_9_CLAPTEST_1',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 9 CLAP TEST 2',     'code': 'CLASS_9_CLAPTEST_2',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 9 CLAP TEST 3',     'code': 'CLASS_9_CLAPTEST_3',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 9 CLAP TEST 4',     'code': 'CLASS_9_CLAPTEST_4',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 9 CLAP TEST 5',     'code': 'CLASS_9_CLAPTEST_5',  'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 10 CLAP TEST 2',    'code': 'CLASS_10_CLAPTEST_2', 'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 10 CLAP TEST 3',    'code': 'CLASS_10_CLAPTEST_3', 'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 10 CLAP TEST 4',    'code': 'CLASS_10_CLAPTEST_4', 'dur': 35,  'marks': 0},
            {'name': 'FOUNDATION CLASS 10 CLAP TEST 5',    'code': 'CLASS_10_CLAPTEST_5', 'dur': 35,  'marks': 0},
            # Original demo exams
            {'name': 'tests2',                             'code': 'SDFSDF',              'dur': 180, 'marks': 85, 'target_key': 'DEMO',    'class_id': 21},
            {'name': 'DEMO CLAP EXAM',                     'code': 'DEMO_EXAM',           'dur': 35,  'marks': 40, 'target_key': 'DEMO',    'class_id': 18},
            {'name': 'FOUNDATION CLASS 10 CLAP TEST 6',   'code': 'CLASS_10_CLAPTEST_6',  'dur': 35,  'marks': 40},
            {'name': 'FOUNDATION CLASS 10 CLAP TEST 7',   'code': 'CLASS_10_CLAPTEST_7',  'dur': 35,  'marks': 40},
            {'name': 'FOUNDATION CLASS 10 CLAP TEST 8',   'code': 'CLASS_10_CLAPTEST_8',  'dur': 35,  'marks': 40},
            {'name': 'FOUNDATION CLASS 10 CLAP TEST 9',   'code': 'CLASS_10_CLAPTEST_9',  'dur': 35,  'marks': 40},
            {'name': 'FOUNDATION CLASS 10 CLAP TEST 10',  'code': 'CLASS_10_CLAPTEST_10', 'dur': 35,  'marks': 40},
        ]

        etype = get_type('FOUNDATION')
        demo_etype = get_type('DEMO EXAM') or etype
        created_count = 0
        skipped_count = 0

        for exam in erp_exams:
            # Class
            if exam.get('class_id'):
                cl = ClassLevel.objects.filter(id=exam['class_id']).first()
            else:
                cl = get_class(exam['name'])

            if not cl:
                self.stdout.write(f"  [!] No class match: {exam['name']}")
                skipped_count += 1
                continue

            # Target
            target = get_target(exam['name'], exam.get('target_key'))
            if not target:
                self.stdout.write(f"  [!] No target match: {exam['name']}")
                skipped_count += 1
                continue

            et = demo_etype if exam.get('target_key') == 'DEMO' else etype

            obj, created = ExamDetail.objects.get_or_create(
                code=exam['code'],
                defaults={
                    'name': exam['name'],
                    'session': sess,
                    'class_level': cl,
                    'target_exam': target,
                    'exam_type': et,
                    'total_marks': exam['marks'],
                    'duration': exam['dur'],
                    'is_active': True,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f"  [+] Created: {exam['name']} [{cl.name} / {target.name}]")
            else:
                self.stdout.write(f"  [-] Exists:  {exam['name']}")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. Created: {created_count} | Skipped: {skipped_count} | "
            f"Total ExamDetails: {ExamDetail.objects.count()}"
        ))
