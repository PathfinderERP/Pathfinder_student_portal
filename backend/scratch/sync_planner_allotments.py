from tests.models import Test, TestCentreAllotment
from centres.models import Centre

planners = Test.objects.filter(exam_type__name='STUDY PLANNER')
all_centres = list(Centre.objects.all())

for test in planners:
    print(f"Syncing allotments for: {test.name}")
    # Ensure centres are added to M2M
    test.centres.add(*all_centres)
    
    # Create missing allotments
    existing_allotment_centres = set(test.centre_allotments.values_list('centre_id', flat=True))
    new_allotments = []
    for centre in all_centres:
        if centre.pk not in existing_allotment_centres:
            new_allotments.append(TestCentreAllotment(test=test, centre=centre, is_active=True))
    
    if new_allotments:
        TestCentreAllotment.objects.bulk_create(new_allotments)
        print(f"  -> Created {len(new_allotments)} new allotments")
    else:
        print("  -> All centres already allotted")
