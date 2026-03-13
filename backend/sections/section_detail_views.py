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
        # Master sections = sections where test is null (created in Master Section registry)
        sections = Section.objects.filter(test__isnull=True).order_by('priority', 'name')

        # If user is a student, filter by their ERP assigned sections
        if hasattr(user, 'user_type') and user.user_type == 'student':
            allowed_names = []
            if getattr(user, 'exam_section', None):
                allowed_names.append(user.exam_section)
            if getattr(user, 'study_section', None):
                allowed_names.append(user.study_section)
            
            if allowed_names:
                sections = sections.filter(name__in=allowed_names)
            else:
                # If student has no sections assigned in ERP, they don't see any sections
                sections = sections.none()

        result = []
        for section in sections:
            # 1. Get tests assigned to this section
            tests = Test.objects.filter(allotted_sections=section).select_related('exam_type')
            allotments = TestCentreAllotment.objects.filter(test__in=tests).select_related('centre', 'test', 'test__exam_type')
            
            # Map of unique centres allotted to this section via any test (for fallback)
            section_centres_map = {}
            for a in allotments:
                cid = str(a.centre._id)
                if cid not in section_centres_map:
                    section_centres_map[cid] = {
                        'id': cid,
                        'name': a.centre.name,
                        'code': a.centre.code,
                        'location': a.centre.location,
                    }
            all_centres = list(section_centres_map.values())

            # 2. Check for content assignments
            from master_data.models import LibraryItem, PenPaperTest, Homework, Video
            
            # Category filters
            online_exam_list = []
            offline_exam_list = []
            study_material_list = []

            is_student = hasattr(user, 'user_type') and user.user_type == 'student'
            exam_sec = getattr(user, 'exam_section', None)
            study_sec = getattr(user, 'study_section', None)
            omr_sec = getattr(user, 'omr_code', None)

            # A. Online & Offline Tests (Exam Section check)
            if not is_student or section.name == exam_sec or section.name == omr_sec:
                for test in tests:
                    t_type_name = (test.exam_type.name or "").lower() if test.exam_type else ""
                    is_omr = "omr" in t_type_name or "offline" in t_type_name
                    
                    # Get centres for THIS specific test
                    t_centres = [
                        {
                            'id': str(a.centre._id),
                            'name': a.centre.name,
                            'code': a.centre.code,
                            'location': a.centre.location
                        }
                        for a in allotments if a.test_id == test.id
                    ]
                    
                    if t_centres:
                        item_data = {
                            'id': str(test.id),
                            'name': test.name,
                            'type': 'Online Test' if not is_omr else 'Offline Test',
                            'centres': t_centres
                        }
                        if is_omr:
                            offline_exam_list.append(item_data)
                        else:
                            online_exam_list.append(item_data)

                # PenPaperTests (Always Offline)
                pp_tests = PenPaperTest.objects.filter(sections=section)
                for ppt in pp_tests:
                    offline_exam_list.append({
                        'id': str(ppt.id),
                        'name': ppt.name,
                        'type': 'Pen Paper Test',
                        'centres': all_centres # Fallback to all section centres
                    })

            # B. Study Materials (Study Section check)
            if not is_student or section.name == study_sec:
                # Library Items
                lib_items = LibraryItem.objects.filter(section=section)
                for item in lib_items:
                    study_material_list.append({
                        'id': str(item.id),
                        'name': item.name,
                        'type': 'Library Item',
                        'centres': all_centres
                    })
                
                # Homework
                hw_items = Homework.objects.filter(sections=section)
                for item in hw_items:
                    study_material_list.append({
                        'id': str(item.id),
                        'name': item.name,
                        'type': 'Homework',
                        'centres': all_centres
                    })

                # Videos
                vid_items = Video.objects.filter(section=section)
                for item in vid_items:
                    study_material_list.append({
                        'id': str(item.id),
                        'name': item.title,
                        'type': 'Video',
                        'centres': all_centres
                    })

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

        return Response({
            'count': len(result),
            'sections': result
        }, status=status.HTTP_200_OK)

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
