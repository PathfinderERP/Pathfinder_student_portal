from django.apps import AppConfig


class QuestionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'questions'

    def ready(self):
        import os
        import sys
        import threading
        import time

        if any(cmd in sys.argv for cmd in ['runserver', 'run_all', 'gunicorn']):
            if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') != 'true':
                return

            def _warm():
                time.sleep(12)
                try:
                    from django.core.cache import cache
                    cache_key = "question_bank_all_v1"
                    if not cache.get(cache_key):
                        print("[STARTUP] Warming Question Bank cache in background...")
                        from questions.models import Question
                        from questions.serializers import QuestionSerializer
                        qs = list(Question.objects.all().order_by('-created_at'))
                        data = QuestionSerializer(qs, many=True).data
                        cache.set(cache_key, data, 86400 * 7)
                        print(f"[STARTUP] Question Bank cache warmed successfully ({len(data)} questions).")
                    else:
                        print("[STARTUP] Question Bank cache already warm.")
                except Exception as e:
                    print(f"[STARTUP] Question Bank warm-up error: {e}")

            t = threading.Thread(target=_warm, daemon=True)
            t.start()

