from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.cache import cache
from .models import Section
from .serializers import SectionSerializer

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    # Adjust permissions as needed, e.g. AllowAny for testing or IsAuthenticated
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        from .section_detail_views import list_master_sections
        return list_master_sections.__wrapped__(request._request)

    def get_object(self):
        """
        Override get_object to handle MongoDB ObjectId lookups properly with Djongo.
        The default lookup by pk doesn't always automatically convert hex strings to ObjectIds.
        """
        from bson import ObjectId
        pk = self.kwargs.get('pk')
        try:
            if isinstance(pk, str) and len(pk) == 24:
                return Section.objects.get(_id=ObjectId(pk))
        except Exception:
            pass
        return super().get_object()

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        section = self.get_object()
        from questions.serializers import QuestionSerializer
        # Deduplicate objects by PK to prevent ghost copies
        seen_pks = set()
        unique_qs_list = []
        for q in section.questions.all():
            if str(q.pk) not in seen_pks:
                seen_pks.add(str(q.pk))
                unique_qs_list.append(q)

        order_list = section.question_order or []
        order_map = {str(oid): index for index, oid in enumerate(order_list)}
        
        def sort_key(q):
            return order_map.get(str(q.pk), 999999)
            
        unique_qs_list.sort(key=sort_key)
        
        serializer = QuestionSerializer(unique_qs_list, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assign_questions(self, request, pk=None):
        section = self.get_object()
        question_ids = request.data.get('question_ids', [])
        from questions.models import Question
        from bson import ObjectId
        
        # Clean IDs and handle MongoDB ObjectIds
        valid_ids = []
        for qid in question_ids:
            if ObjectId.is_valid(qid):
                valid_ids.append(ObjectId(qid))
            else:
                valid_ids.append(qid)
                
        # To preserve order from the selection, we add them one by one or 
        # use a loop that respects the question_ids sequence.
        for vid in valid_ids:
            try:
                q = Question.objects.get(pk=vid)
                if not section.questions.filter(pk=vid).exists():
                    section.questions.add(q)
                
                # Update our explicit order Array
                vid_str = str(vid)
                if not isinstance(section.question_order, list):
                    section.question_order = []
                if vid_str not in section.question_order:
                    section.question_order.append(vid_str)
                    
            except Question.DoesNotExist:
                continue
                
        section.save()
        
        return Response({'status': 'questions assigned'})

    @action(detail=True, methods=['post'])
    def remove_questions(self, request, pk=None):
        section = self.get_object()
        question_ids = request.data.get('question_ids', [])
        from questions.models import Question
        from bson import ObjectId
        
        valid_ids = []
        for qid in question_ids:
            if ObjectId.is_valid(qid):
                valid_ids.append(ObjectId(qid))
            else:
                valid_ids.append(qid)

        questions = Question.objects.filter(pk__in=valid_ids)
        section.questions.remove(*questions)
        
        if isinstance(section.question_order, list):
            for qid in [str(vid) for vid in valid_ids]:
                if qid in section.question_order:
                    section.question_order.remove(qid)
            section.save()
        return Response({'status': 'questions removed'})

    @action(detail=True, methods=['post'])
    def reorder_questions(self, request, pk=None):
        section = self.get_object()
        ordered_ids = request.data.get('ordered_ids', [])
        
        # We need to preserve order. Django ManyToMany doesn't support order directly.
        # But we can clear and re-add in order, though some DBs might not preserve this.
        # Better approach for Djongo: just return them in order in the next fetch.
        # For now, we will store this order if needed, or simply assume the client
        # will handle the display order and we just provide a shuffle toggle.
        
        # However, to properly support "Positioning", we should clear and add.
        from questions.models import Question
        from bson import ObjectId
        
        valid_ids = []
        for qid in ordered_ids:
            if ObjectId.is_valid(qid):
                valid_ids.append(ObjectId(qid))
            else:
                valid_ids.append(qid)
        
        if not isinstance(section.question_order, list):
            section.question_order = []
        
        section.question_order = [str(vid) for vid in valid_ids]
        section.save()
                
        return Response({'status': 'questions reordered'})

    def perform_create(self, serializer):
        section = serializer.save()
        cache.clear()

    def perform_update(self, serializer):
        serializer.save()
        cache.clear()

    def perform_destroy(self, instance):
        instance.delete()
        cache.clear()
