from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Section
from .serializers import SectionSerializer

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    # Adjust permissions as needed, e.g. AllowAny for testing or IsAuthenticated
    permission_classes = [permissions.IsAuthenticated]

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
        serializer = QuestionSerializer(section.questions.all(), many=True)
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
                
        questions = Question.objects.filter(pk__in=valid_ids)
        section.questions.add(*questions)
        return Response({'status': 'questions assigned', 'count': questions.count()})

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
        
        # This is a bit hacky for ManyToMany but let's try to clear and add in sequence
        section.questions.clear()
        for vid in valid_ids:
            try:
                q = Question.objects.get(pk=vid)
                section.questions.add(q)
            except Question.DoesNotExist:
                continue
                
        return Response({'status': 'questions reordered'})

    def perform_create(self, serializer):
        serializer.save()
