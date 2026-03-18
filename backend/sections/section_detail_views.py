from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Section
from tests.models import Test, TestCentreAllotment


def _serialize_section_summary(section):
    """Minimal section info for list views."""
    return {
        'id': str(section._id),
        'name': section.name,
        'subject_code': section.subject_code,
        'priority': section.priority,
        'total_questions': section.total_questions,
        'allowed_questions': section.allowed_questions,
        'correct_marks': section.correct_marks,
        'negative_marks': section.negative_marks,
        'partial_type': section.partial_type,
        'partial_marks': section.partial_marks,
        'shuffle': section.shuffle,
        'question_count': section.questions.count(),
        'created_at': section.created_at.isoformat() if section.created_at else None,
        'updated_at': section.updated_at.isoformat() if section.updated_at else None,
    }


def _serialize_centre_allotment(allotment):
    """Full centre allotment info."""
    c = allotment.centre
    return {
        'allotment_id': allotment.id,
        'centre_id': str(c._id),
        'centre_name': c.name,
        'centre_code': c.code,
        'centre_location': c.location,
        'centre_email': c.email,
        'centre_phone': c.phone_number,
        'start_time': allotment.start_time.isoformat() if allotment.start_time else None,
        'end_time': allotment.end_time.isoformat() if allotment.end_time else None,
        'is_active': allotment.is_active,
        'access_code': allotment.access_code,
        'is_code_sent': allotment.is_code_sent,
    }


def _serialize_test_full(test):
    """Full test info including all centres and their allotment details."""
    allotments = list(TestCentreAllotment.objects.filter(test=test).select_related('centre'))
    centre_list = [_serialize_centre_allotment(a) for a in allotments]

    # Also include direct centres not yet in allotments
    allotted_centre_ids = {str(a.centre._id) for a in allotments}
    for centre in test.centres.all():
        if str(centre._id) not in allotted_centre_ids:
            centre_list.append({
                'allotment_id': None,
                'centre_id': str(centre._id),
                'centre_name': centre.name,
                'centre_code': centre.code,
                'centre_location': centre.location,
                'centre_email': centre.email,
                'centre_phone': centre.phone_number,
                'start_time': None,
                'end_time': None,
                'is_active': False,
                'access_code': None,
                'is_code_sent': False,
            })

    return {
        'id': test.id,
        'name': test.name,
        'code': test.code,
        'duration': test.duration,
        'total_marks': test.total_marks,
        'is_completed': test.is_completed,
        'has_calculator': test.has_calculator,
        'option_type_numeric': test.option_type_numeric,
        'description': test.description,
        'instructions': test.instructions,
        'session': test.session.name if test.session else None,
        'target_exam': test.target_exam.name if test.target_exam else None,
        'exam_type': test.exam_type.name if test.exam_type else None,
        'class_level': test.class_level.name if test.class_level else None,
        'package': test.package.name if test.package else None,
        'centres': centre_list,
        'centres_count': len(centre_list),
        'created_at': test.created_at.isoformat() if test.created_at else None,
        'updated_at': test.updated_at.isoformat() if test.updated_at else None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def section_stats(request):
    # Total Sections (Master Sections only)
    total = Section.objects.filter(test__isnull=True).count()
    
    # This Month (Master Sections only)
    from django.utils import timezone
    now = timezone.now()
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month_count = Section.objects.filter(test__isnull=True, created_at__gte=first_day_of_month).count()
    
    return Response({
        "total": total,
        "thisMonth": this_month_count
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_master_sections(request):
    """
    GET /api/sections/master/
    Returns all master sections, filtered by the student's ERP sections.
    Each section only contains its ID, name, and the list of unique centres
    assigned through tests that include this section.
    """
    try:
        user = request.user
        from django.core.cache import cache
        
        # 0. Check Cache First
        # Key depends on user ID since students see different filtered sections
        cache_key = f"master_sections_v2_{user.pk}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        from master_data.models import LibraryItem, PenPaperTest, Homework, Video
        from collections import defaultdict

        # 1. Fetch Master Sections
        sections_query = Section.objects.filter(test__isnull=True).order_by('priority', 'name')
        
        # Student specific filtering
        allowed_names = []
        is_student = hasattr(user, 'user_type') and user.user_type == 'student'
        if is_student:
            if getattr(user, 'exam_section', None): allowed_names.append(user.exam_section)
            if getattr(user, 'study_section', None): allowed_names.append(user.study_section)
            if allowed_names:
                sections_query = sections_query.filter(name__in=allowed_names)
            else:
                return Response({'count': 0, 'sections': []}, status=status.HTTP_200_OK)

        sections = list(sections_query)
        section_ids = [s.pk for s in sections]

        # 2. Bulk Fetch All Related Content
        # We fetch ALL tests that belong to these sections
        all_tests = list(Test.objects.filter(allotted_sections__in=section_ids).select_related('exam_type').prefetch_related('allotted_sections'))
        test_ids = [t.pk for t in all_tests]
        
        # Allotments for these tests
        all_allotments = list(TestCentreAllotment.objects.filter(test_id__in=test_ids).select_related('centre'))
        
        # Materials
        all_pp_tests = list(PenPaperTest.objects.filter(sections__in=section_ids).prefetch_related('sections'))
        all_lib_items = list(LibraryItem.objects.filter(section_id__in=section_ids))
        all_hw_items = list(Homework.objects.filter(sections__in=section_ids).prefetch_related('sections'))
        all_vid_items = list(Video.objects.filter(section_id__in=section_ids))

        # 3. Grouping in Python Memory
        test_allotments_map = defaultdict(list)
        for a in all_allotments:
            test_allotments_map[a.test_id].append(a)

        tests_by_section = defaultdict(list)
        for t in all_tests:
            for s in t.allotted_sections.all():
                tests_by_section[str(s.pk)].append(t)

        pp_by_section = defaultdict(list)
        for ppt in all_pp_tests:
            for s in ppt.sections.all():
                pp_by_section[str(s.pk)].append(ppt)

        lib_by_section = defaultdict(list)
        for item in all_lib_items:
            lib_by_section[str(item.section_id)].append(item)

        hw_by_section = defaultdict(list)
        for item in all_hw_items:
            for s in item.sections.all():
                hw_by_section[str(s.pk)].append(item)

        vid_by_section = defaultdict(list)
        for item in all_vid_items:
            vid_by_section[str(item.section_id)].append(item)

        # 4. Final Result Construction
        result = []
        exam_sec = getattr(user, 'exam_section', None)
        study_sec = getattr(user, 'study_section', None)
        omr_sec = getattr(user, 'omr_code', None)

        for section in sections:
            s_id = str(section.pk)
            
            # Find all unique centres for this section across all its tests
            section_centres_map = {}
            s_tests = tests_by_section[s_id]
            
            online_exam_list = []
            offline_exam_list = []
            
            # Process Tests
            # For Admins, we should always allow seeing tests even if they don't have centre allotments
            if not is_student or section.name == exam_sec or section.name == omr_sec:
                for test in s_tests:
                    t_type_name = (test.exam_type.name or "").lower() if test.exam_type else ""
                    is_omr = "omr" in t_type_name or "offline" in t_type_name
                    
                    t_allotments = test_allotments_map[test.id]
                    t_centres = []
                    for a in t_allotments:
                        cid = str(a.centre._id)
                        c_data = {
                            'id': cid,
                            'name': a.centre.name,
                            'code': a.centre.code,
                            'location': a.centre.location
                        }
                        t_centres.append(c_data)
                        if cid not in section_centres_map:
                            section_centres_map[cid] = c_data

                    # ADDITION: For ADMINS, showing tests even if 0 centres are allotted
                    if not is_student or t_centres:
                        item_data = {
                            'id': str(test.id),
                            'name': test.name,
                            'type': 'Online Test' if not is_omr else 'Offline Test',
                            'centres': t_centres
                        }
                        if is_omr: offline_exam_list.append(item_data)
                        else: online_exam_list.append(item_data)

            # Process PenPaperTests
            s_pp = pp_by_section[s_id]
            for ppt in s_pp:
                offline_exam_list.append({
                    'id': str(ppt.id),
                    'name': ppt.name,
                    'type': 'Pen Paper Test',
                    'centres': [] 
                })

            # Study Materials
            study_material_list = []
            if not is_student or section.name == study_sec:
                # Lib
                for item in lib_by_section[s_id]:
                    study_material_list.append({'id': str(item.id), 'name': item.name, 'type': 'Library Item', 'centres': []})
                # HW
                for item in hw_by_section[s_id]:
                    study_material_list.append({'id': str(item.id), 'name': item.name, 'type': 'Homework', 'centres': []})
                # Vid
                for item in vid_by_section[s_id]:
                    study_material_list.append({'id': str(item.id), 'name': item.title, 'type': 'Video', 'centres': []})

            all_centres = list(section_centres_map.values())
            # Add centres to those that don't have them
            for item in offline_exam_list:
                if not item['centres']: item['centres'] = all_centres
            for item in study_material_list:
                item['centres'] = all_centres

            result.append({
                'id': str(section._id),
                'name': section.name,
                'subject_code': section.subject_code,
                'priority': section.priority,
                'online_exam_centres': online_exam_list,
                'offline_exam_centres': offline_exam_list,
                'study_material_centres': study_material_list,
                'centres_count': len(all_centres)
            })

        # 5. Save to Cache
        response_data = {
            'count': len(result),
            'sections': result
        }
        # Reducing cache timeout for better Admin reactivity
        cache.set(cache_key, response_data, timeout=60) 

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def section_full_detail(request, section_id):
    """
    GET /api/sections/<section_id>/full-detail/
    Returns complete details for one section:
      - Section marking schema & settings
      - All tests assigned to this section (with full test details)
      - All centres assigned to each test (with schedule, access code)
    """
    try:
        try:
            from bson import ObjectId
            section = Section.objects.get(_id=ObjectId(section_id))
        except Exception:
            return Response({'error': 'Section not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get all tests that have this section assigned
        assigned_tests = Test.objects.filter(allotted_sections=section).order_by('-created_at')

        tests_data = []
        total_centres = 0
        for test in assigned_tests:
            test_data = _serialize_test_full(test)
            tests_data.append(test_data)
            total_centres += test_data['centres_count']

        section_data = _serialize_section_summary(section)
        section_data.update({
            'assigned_tests': tests_data,
            'assigned_tests_count': len(tests_data),
            'total_centres_across_tests': total_centres,
        })

        return Response(section_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def section_tests(request, section_id):
    """
    GET /api/sections/<section_id>/tests/
    Returns only the tests assigned to this section (lightweight).
    """
    try:
        from bson import ObjectId
        try:
            section = Section.objects.get(_id=ObjectId(section_id))
        except Exception:
            return Response({'error': 'Section not found'}, status=status.HTTP_404_NOT_FOUND)

        assigned_tests = Test.objects.filter(allotted_sections=section).order_by('-created_at')
        tests_data = [_serialize_test_full(t) for t in assigned_tests]

        return Response({
            'section_id': section_id,
            'section_name': section.name,
            'tests_count': len(tests_data),
            'tests': tests_data,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def section_centres(request, section_id):
    """
    GET /api/sections/<section_id>/centres/
    Returns all centres that are assigned to tests that include this section.
    Deduplicates by centre so each centre appears only once.
    """
    try:
        from bson import ObjectId
        try:
            section = Section.objects.get(_id=ObjectId(section_id))
        except Exception:
            return Response({'error': 'Section not found'}, status=status.HTTP_404_NOT_FOUND)

        assigned_tests = Test.objects.filter(allotted_sections=section)

        seen_centres = {}
        for test in assigned_tests:
            allotments = TestCentreAllotment.objects.filter(test=test).select_related('centre')
            for allotment in allotments:
                cid = str(allotment.centre._id)
                if cid not in seen_centres:
                    seen_centres[cid] = {
                        'centre_id': cid,
                        'centre_name': allotment.centre.name,
                        'centre_code': allotment.centre.code,
                        'centre_location': allotment.centre.location,
                        'centre_email': allotment.centre.email,
                        'centre_phone': allotment.centre.phone_number,
                        'tests': []
                    }
                seen_centres[cid]['tests'].append({
                    'test_id': test.id,
                    'test_name': test.name,
                    'test_code': test.code,
                    'start_time': allotment.start_time.isoformat() if allotment.start_time else None,
                    'end_time': allotment.end_time.isoformat() if allotment.end_time else None,
                    'access_code': allotment.access_code,
                    'is_code_sent': allotment.is_code_sent,
                })

        centres_list = list(seen_centres.values())

        return Response({
            'section_id': section_id,
            'section_name': section.name,
            'centres_count': len(centres_list),
            'centres': centres_list,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
