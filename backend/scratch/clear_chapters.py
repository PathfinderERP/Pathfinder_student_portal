import os
import sys
import django

# Add the project directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import Chapter, Topic, SubTopic
from django.core.cache import cache

def clear_all_master_data():
    try:
        # Clear in reverse order of dependencies
        st_count = SubTopic.objects.all().count()
        SubTopic.objects.all().delete()
        
        t_count = Topic.objects.all().count()
        Topic.objects.all().delete()
        
        c_count = Chapter.objects.all().count()
        Chapter.objects.all().delete()
        
        # Clear caches for all three
        for viewset in ['ChapterViewSet', 'TopicViewSet', 'SubTopicViewSet']:
            v_key = f"v_v2_{viewset}"
            v = cache.get(v_key, 1)
            cache.set(v_key, v + 1, 86400 * 30)
            
        print(f"SUCCESS: Deleted {c_count} Chapters, {t_count} Topics, and {st_count} SubTopics.")
        print("Invalidated caches for Chapter, Topic, and SubTopic ViewSets.")
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    clear_all_master_data()
