from tests.models import Test, TestCentreAllotment
from centres.models import Centre

target_centre_name = 'BEHALA'
centre = Centre.objects.filter(name__iexact=target_centre_name).first()

if not centre:
    print(f"Centre {target_centre_name} not found!")
else:
    print(f"Found Centre: {centre.name} (ID: {centre.pk})")
    
    planners = Test.objects.filter(exam_type__name='STUDY PLANNER')
    for test in planners:
        print(f"\nChecking Test: {test.name}")
        allotment = TestCentreAllotment.objects.filter(test=test, centre=centre).first()
        if allotment:
            print(f"  Allotment found: Active={allotment.is_active}, Start={allotment.start_time}, End={allotment.end_time}")
            # Ensure it is active if it's not
            if not allotment.is_active:
                allotment.is_active = True
                allotment.save()
                print("  -> Updated allotment to ACTIVE")
        else:
            print("  No allotment found for BEHALA. Adding now...")
            TestCentreAllotment.objects.create(test=test, centre=centre, is_active=True)
            print("  -> Created ACTIVE allotment for BEHALA")
