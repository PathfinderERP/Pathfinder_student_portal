from django.apps import AppConfig


class TestsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tests'

    def ready(self):
        """Warm the roster + admin test list cache shortly after server start.

        A short delay lets Django finish booting (DB connections, migrations
        checks) before the background thread runs. This ensures the first admin
        page load hits a warm cache instead of waiting minutes for a cold
        Djongo/MongoDB serialization pass.
        """
        import threading
        import time

        def _warm():
            time.sleep(10)  # Let the server fully boot before hitting the DB
            try:
                from django.core.cache import cache
                # Invalidate any cached list built with the old (heavy) serializer
                # so it rebuilds fresh with TestListSerializer on the next request.
                cache.delete("admin_test_list")
                from tests.views import _trigger_roster_refresh, _build_admin_test_cache
                # 1. Kick off roster recompute in its own thread (lightweight start)
                _trigger_roster_refresh()
                # 2. Build the admin test list cache synchronously in this thread
                #    so the very first admin page load gets a cache hit.
                _build_admin_test_cache()
                print("[STARTUP] Cache invalidated & background roster warm-up triggered.")
            except Exception as e:
                print(f"[STARTUP] Roster warm-up failed: {e}")

        t = threading.Thread(target=_warm, daemon=True)
        t.start()
