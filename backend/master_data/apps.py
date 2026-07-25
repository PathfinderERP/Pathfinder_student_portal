from django.apps import AppConfig


class MasterDataConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'master_data'

    def ready(self):
        try:
            from .models import ensure_default_programmes
            ensure_default_programmes()
        except Exception:
            pass
