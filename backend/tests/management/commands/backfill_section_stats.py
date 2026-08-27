"""
Management command: backfill_section_stats
One-time script that reads all finalized submissions from MongoDB that lack
section_stats, computes them using the stored responses and test sections,
and writes them back. Processes in batches of 50 to avoid memory spikes.

Run once: python manage.py backfill_section_stats
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Backfills precomputed section_stats for existing test submissions in MongoDB"

    def handle(self, *args, **options):
        from api.db_utils import get_db
        from tests.models import Test

        db = get_db()
        if db is None:
            self.stderr.write(self.style.ERROR("MongoDB unavailable."))
            return

        col = db["tests_testsubmission"]

        # Only process docs that don't have section_stats yet
        cursor = col.find(
            {"is_finalized": True, "section_stats": {"$exists": False}},
            {"_id": 1, "test_id": 1, "student_id": 1, "responses": 1}
        )

        batch = []
        total_updated = 0
        total_skipped = 0

        for doc in cursor:
            batch.append(doc)
            if len(batch) >= 50:
                total_updated, total_skipped = self._process_batch(batch, col, total_updated, total_skipped)
                batch = []

        if batch:
            total_updated, total_skipped = self._process_batch(batch, col, total_updated, total_skipped)

        self.stdout.write(self.style.SUCCESS(
            f"\nBackfill complete: {total_updated} updated, {total_skipped} skipped (no test/sections found)."
        ))

    def _process_batch(self, batch, col, total_updated, total_skipped):
        from tests.models import Test
        import json

        # Gather all unique test IDs in this batch
        test_ids = list(set(doc.get("test_id") for doc in batch if doc.get("test_id")))

        # Load tests with sections & questions prefetched
        int_ids = []
        for tid in test_ids:
            try: int_ids.append(int(tid))
            except: pass

        tests_qs = Test.objects.filter(pk__in=int_ids).prefetch_related("sections", "sections__questions")
        tests_by_id = {str(t.pk): t for t in tests_qs}

        keys = ["a", "b", "c", "d", "e", "f"]

        for doc in batch:
            tid = str(doc.get("test_id"))
            test = tests_by_id.get(tid)
            if not test:
                total_skipped += 1
                continue

            responses = doc.get("responses") or {}
            if isinstance(responses, str):
                try: responses = json.loads(responses)
                except: responses = {}

            section_stats = []
            try:
                for sec in test.sections.all():
                    sec_score = 0.0
                    sec_total = 0.0
                    for q in sec.questions.all():
                        c_marks = float(sec.correct_marks or 0)
                        n_marks = float(sec.negative_marks or 0)
                        sec_total += c_marks
                        qid = str(q.pk)
                        res_item = responses.get(qid)
                        if res_item is None:
                            try: res_item = responses.get(int(qid))
                            except: pass
                        if res_item is not None:
                            ans = res_item.get("answer") if isinstance(res_item, dict) else res_item
                            if ans is not None:
                                is_correct = False
                                q_type = q.question_type or "SINGLE_CHOICE"
                                if q_type == "SINGLE_CHOICE":
                                    ans_str = str(ans).strip().lower()
                                    for oi, opt in enumerate(q.question_options or []):
                                        opt_id = str(opt.get("id", ""))
                                        opt_label = keys[oi] if oi < len(keys) else None
                                        if ans_str == opt_id or (opt_label and ans_str == opt_label):
                                            if opt.get("isCorrect"): is_correct = True
                                            break
                                elif q_type == "MULTI_CHOICE":
                                    correct_set = set(str(opt["id"]) for opt in (q.question_options or []) if opt.get("isCorrect"))
                                    is_correct = set(map(str, ans if isinstance(ans, list) else [])) == correct_set
                                elif q_type in ("NUMERICAL", "INTEGER_TYPE"):
                                    try:
                                        val = float(ans)
                                        is_correct = float(q.answer_from) <= val <= float(q.answer_to)
                                    except: pass
                                if is_correct: sec_score += c_marks
                                else: sec_score -= n_marks
                    section_stats.append({
                        "name": sec.name,
                        "marks": round(sec_score, 2),
                        "total": round(sec_total, 2)
                    })

                col.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"section_stats": section_stats}}
                )
                total_updated += 1
                self.stdout.write(f"  Updated submission for test={tid}, student={doc.get('student_id')}")

            except Exception as e:
                self.stderr.write(self.style.WARNING(f"  Error for doc {doc['_id']}: {e}"))
                total_skipped += 1

        return total_updated, total_skipped
