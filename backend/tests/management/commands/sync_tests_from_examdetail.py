from django.core.management.base import BaseCommand
from tests.models import Test
from master_data.models import ExamDetail


class Command(BaseCommand):
    help = 'Sync session, class_level, target_exam, exam_type on Tests from matching ExamDetail by code'

    def handle(self, *args, **options):
        tests = list(Test.objects.all())
        details = {d.code: d for d in ExamDetail.objects.all()}
        updated = 0
        skipped = 0

        for t in tests:
            detail = details.get(t.code)
            if detail:
                t.session = detail.session
                t.class_level = detail.class_level
                t.target_exam = detail.target_exam
                t.exam_type = detail.exam_type
                t.save()
                updated += 1
                self.stdout.write(f'  [+] Updated: {t.name} -> class={detail.class_level}, target={detail.target_exam}')
            else:
                skipped += 1
                self.stdout.write(f'  [-] No ExamDetail match: {t.name} (code={t.code})')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. Updated: {updated} | Skipped: {skipped}'
        ))
