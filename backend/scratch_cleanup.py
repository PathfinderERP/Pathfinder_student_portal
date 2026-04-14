from tests.models import Test
from sections.models import Section

def run():
    count = 0
    t_list = list(Test.objects.all())
    for t in t_list:
        to_remove = []
        for s in t.allotted_sections.all():
            if s.test_id is not None:
                to_remove.append(s)
        if to_remove:
            t.allotted_sections.remove(*to_remove)
            count += len(to_remove)
    print(f'Removed {count} incorrect question sections from allotted_sections.')

run()
