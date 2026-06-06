from rest_framework import serializers
from .models import Session, TargetExam, ExamType, ClassLevel, ExamDetail, Subject, Topic, Chapter, SubTopic, Teacher, LibraryItem, LibraryPDF, LibraryVideo, LibraryDPP, SolutionItem, Notice, LiveClass, Video, PenPaperTest, Homework, Banner, Seminar, Guide, Community, MasterSection, PartialMarkRule
from packages.models import Package
from bson import ObjectId

class ObjectIdRelatedField(serializers.PrimaryKeyRelatedField):
    """
    Custom field to handle MongoDB ObjectIds in PrimaryKeyRelatedFields.
    Djongo often requires strings to be converted to ObjectIds explicitly for lookups.
    """
    def to_internal_value(self, data):
        try:
            if isinstance(data, str) and ObjectId.is_valid(data):
                data = ObjectId(data)
        except Exception:
            pass
        return super().to_internal_value(data)

    def to_representation(self, value):
        return str(value.pk)

class PartialMarkRuleSerializer(serializers.ModelSerializer):
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    
    class Meta:
        model = PartialMarkRule
        fields = '__all__'

class MasterSectionSerializer(serializers.ModelSerializer):
    partial_mark_rule_name = serializers.CharField(source='partial_mark_rule.name', read_only=True)
    partial_mark_rule_id = serializers.PrimaryKeyRelatedField(source='partial_mark_rule', queryset=PartialMarkRule.objects.all(), required=False, allow_null=True)

    class Meta:
        model = MasterSection
        fields = ['id', 'name', 'subject_code', 'total_questions', 'allowed_questions',
                  'shuffle', 'correct_marks', 'negative_marks', 'partial_type',
                  'partial_marks', 'partial_mark_rule', 'partial_mark_rule_name', 'partial_mark_rule_id', 'priority', 'is_active', 'created_at', 'updated_at']

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'

class TargetExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = TargetExam
        fields = '__all__'

class ExamTypeSerializer(serializers.ModelSerializer):
    target_exam_names = serializers.SerializerMethodField()
    target_exams = ObjectIdRelatedField(many=True, queryset=TargetExam.objects.all(), required=False)
    
    class Meta:
        model = ExamType
        fields = '__all__'

    def get_target_exam_names(self, obj):
        try:
            return [te.name for te in obj.target_exams.all()]
        except:
            return []

class ClassLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassLevel
        fields = '__all__'

class ChapterSerializer(serializers.ModelSerializer):
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    order = serializers.IntegerField(source='sort_order', required=False)

    class Meta:
        model = Chapter
        fields = ['id', 'class_level', 'subject', 'name', 'code', 'order', 'is_active', 'created_at', 'updated_at', 'class_level_name', 'subject_name']

class ExamDetailSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.name', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    target_exam_names = serializers.SerializerMethodField()
    target_exams = ObjectIdRelatedField(many=True, queryset=TargetExam.objects.all(), required=False)
    session_names = serializers.SerializerMethodField()
    sessions = ObjectIdRelatedField(many=True, queryset=Session.objects.all(), required=False)
    class_level_names = serializers.SerializerMethodField()
    class_levels = ObjectIdRelatedField(many=True, queryset=ClassLevel.objects.all(), required=False)

    class Meta:
        model = ExamDetail
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if 'sessions' in ret:
            ret['sessions'] = [str(s.pk) for s in instance.sessions.all()]
        if 'target_exams' in ret:
            ret['target_exams'] = [str(te.pk) for te in instance.target_exams.all()]
        if 'class_levels' in ret:
            ret['class_levels'] = [str(c.pk) for c in instance.class_levels.all()]
        return ret

    def get_session_names(self, obj):
        try:
            return [s.name for s in obj.sessions.all()]
        except:
            return []

    def get_target_exam_names(self, obj):
        try:
            return [te.name for te in obj.target_exams.all()]
        except:
            return []

    def get_class_level_names(self, obj):
        try:
            return [c.name for c in obj.class_levels.all()]
        except:
            return []

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'

class TopicSerializer(serializers.ModelSerializer):
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    chapter_name = serializers.CharField(source='chapter.name', read_only=True)
    order = serializers.IntegerField(source='sort_order', required=False)

    class Meta:
        model = Topic
        fields = ['id', 'chapter', 'class_level', 'subject', 'name', 'code', 'order', 'is_active', 'created_at', 'updated_at', 'chapter_name', 'class_level_name', 'subject_name']

class SubTopicSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    order = serializers.IntegerField(source='sort_order', required=False)

    class Meta:
        model = SubTopic
        fields = ['id', 'topic', 'name', 'code', 'order', 'is_active', 'created_at', 'updated_at', 'topic_name']

class TeacherSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class Meta:
        model = Teacher
        fields = '__all__'

class LibraryPDFSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryPDF
        fields = ['id', 'title', 'description', 'file', 'thumbnail', 'created_at']

class LibraryVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryVideo
        fields = ['id', 'title', 'description', 'video_link', 'video_file', 'thumbnail', 'created_at']

class LibraryDPPSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryDPP
        fields = ['id', 'title', 'description', 'file', 'thumbnail', 'created_at']

class LibraryItemSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.name', read_only=True)
    class_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    chapter_name = serializers.CharField(source='chapter.name', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    session_names = serializers.SerializerMethodField()
    target_exams = ObjectIdRelatedField(many=True, queryset=TargetExam.objects.all(), required=False)
    target_exam_names = serializers.SerializerMethodField()
    pdfs = LibraryPDFSerializer(many=True, read_only=True)
    videos = LibraryVideoSerializer(many=True, read_only=True)
    dpps = LibraryDPPSerializer(many=True, read_only=True)

    class Meta:
        model = LibraryItem
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if 'sessions' in ret:
            ret['sessions'] = [str(s.pk) for s in instance.sessions.all()]
        if 'target_exams' in ret:
            ret['target_exams'] = [str(te.pk) for te in instance.target_exams.all()]
            
        # Explicitly deduplicate resources to fix potential DB/Serialization duplication issues
        for resource_key in ['videos', 'pdfs', 'dpps']:
            if resource_key in ret and isinstance(ret[resource_key], list):
                seen_ids = set()
                unique_resources = []
                for res in ret[resource_key]:
                    res_id = res.get('id')
                    if res_id not in seen_ids:
                        unique_resources.append(res)
                        seen_ids.add(res_id)
                ret[resource_key] = unique_resources
                
        return ret

    def get_session_names(self, obj):
        try: return [s.name for s in obj.sessions.all()]
        except: return []

    def get_target_exam_names(self, obj):
        try: return [te.name for te in obj.target_exams.all()]
        except: return []

    def get_questions_count(self, obj):
        try:
            return obj.questions.count()
        except:
            return 0

class SolutionItemSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.name', read_only=True)
    class_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)
    sections = serializers.PrimaryKeyRelatedField(many=True, queryset=MasterSection.objects.all(), required=False)
    sessions = ObjectIdRelatedField(many=True, queryset=Session.objects.all(), required=False)
    target_exams = ObjectIdRelatedField(many=True, queryset=TargetExam.objects.all(), required=False)
    section_names = serializers.SerializerMethodField()
    session_names = serializers.SerializerMethodField()
    target_exam_names = serializers.SerializerMethodField()

    class Meta:
        model = SolutionItem
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if 'sections' in ret:
            ret['sections'] = [s.pk for s in instance.sections.all()]
        if 'sessions' in ret:
            ret['sessions'] = [str(s.pk) for s in instance.sessions.all()]
        if 'target_exams' in ret:
            ret['target_exams'] = [str(te.pk) for te in instance.target_exams.all()]
        return ret

    def get_session_names(self, obj):
        try: return [s.name for s in obj.sessions.all()]
        except: return []

    def get_target_exam_names(self, obj):
        try: return [te.name for te in obj.target_exams.all()]
        except: return []

    def get_section_names(self, obj):
        try: return [section.name for section in obj.sections.all()]
        except: return []

class NoticeSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.name', read_only=True)
    class_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    section = serializers.PrimaryKeyRelatedField(queryset=MasterSection.objects.all(), required=False, allow_null=True)
    sessions = ObjectIdRelatedField(many=True, queryset=Session.objects.all(), required=False)
    target_exams = ObjectIdRelatedField(many=True, queryset=TargetExam.objects.all(), required=False)
    session_names = serializers.SerializerMethodField()
    target_exam_names = serializers.SerializerMethodField()

    class Meta:
        model = Notice
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if 'sessions' in ret:
            ret['sessions'] = [str(s.pk) for s in instance.sessions.all()]
        if 'target_exams' in ret:
            ret['target_exams'] = [str(te.pk) for te in instance.target_exams.all()]
        return ret

    def get_session_names(self, obj):
        try: return [s.name for s in obj.sessions.all()]
        except: return []

    def get_target_exam_names(self, obj):
        try: return [te.name for te in obj.target_exams.all()]
        except: return []

class LiveClassSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.name', read_only=True)
    class_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    section = serializers.PrimaryKeyRelatedField(queryset=MasterSection.objects.all(), required=False, allow_null=True)
    sessions = ObjectIdRelatedField(many=True, queryset=Session.objects.all(), required=False)
    target_exams = ObjectIdRelatedField(many=True, queryset=TargetExam.objects.all(), required=False)
    session_names = serializers.SerializerMethodField()
    target_exam_names = serializers.SerializerMethodField()
    packages = ObjectIdRelatedField(many=True, queryset=Package.objects.all(), required=False)
    package_names = serializers.SerializerMethodField()

    class Meta:
        model = LiveClass
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if 'packages' in ret:
             ret['packages'] = [str(p.pk) for p in instance.packages.all()]
        if 'sessions' in ret:
             ret['sessions'] = [str(s.pk) for s in instance.sessions.all()]
        if 'target_exams' in ret:
             ret['target_exams'] = [str(te.pk) for te in instance.target_exams.all()]
        return ret

    def get_session_names(self, obj):
        try: return [s.name for s in obj.sessions.all()]
        except: return []

    def get_target_exam_names(self, obj):
        try: return [te.name for te in obj.target_exams.all()]
        except: return []

    def get_package_names(self, obj):
        try: return [p.name for p in obj.packages.all()]
        except: return []

class VideoSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.name', read_only=True)
    class_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    section = serializers.PrimaryKeyRelatedField(queryset=MasterSection.objects.all(), required=False, allow_null=True)
    sessions = ObjectIdRelatedField(many=True, queryset=Session.objects.all(), required=False)
    target_exams = ObjectIdRelatedField(many=True, queryset=TargetExam.objects.all(), required=False)
    session_names = serializers.SerializerMethodField()
    target_exam_names = serializers.SerializerMethodField()
    packages = ObjectIdRelatedField(many=True, queryset=Package.objects.all(), required=False)
    package_names = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if 'packages' in ret:
             ret['packages'] = [str(p.pk) for p in instance.packages.all()]
        if 'sessions' in ret:
             ret['sessions'] = [str(s.pk) for s in instance.sessions.all()]
        if 'target_exams' in ret:
             ret['target_exams'] = [str(te.pk) for te in instance.target_exams.all()]
        return ret

    def get_session_names(self, obj):
        try: return [s.name for s in obj.sessions.all()]
        except: return []

    def get_target_exam_names(self, obj):
        try: return [te.name for te in obj.target_exams.all()]
        except: return []

    def get_package_names(self, obj):
        try: return [p.name for p in obj.packages.all()]
        except: return []

class PenPaperTestSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.name', read_only=True)
    class_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)
    section_names = serializers.SerializerMethodField()
    sections = serializers.PrimaryKeyRelatedField(many=True, queryset=MasterSection.objects.all(), required=False)
    sessions = ObjectIdRelatedField(many=True, queryset=Session.objects.all(), required=False)
    target_exams = ObjectIdRelatedField(many=True, queryset=TargetExam.objects.all(), required=False)
    section_names = serializers.SerializerMethodField()
    session_names = serializers.SerializerMethodField()
    target_exam_names = serializers.SerializerMethodField()
    packages = ObjectIdRelatedField(many=True, queryset=Package.objects.all(), required=False)
    package_names = serializers.SerializerMethodField()

    class Meta:
        model = PenPaperTest
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if 'packages' in ret:
             ret['packages'] = [str(p.pk) for p in instance.packages.all()]
        if 'sections' in ret:
             ret['sections'] = [s.pk for s in instance.sections.all()]
        if 'sessions' in ret:
             ret['sessions'] = [str(s.pk) for s in instance.sessions.all()]
        if 'target_exams' in ret:
             ret['target_exams'] = [str(te.pk) for te in instance.target_exams.all()]
        return ret

    def get_session_names(self, obj):
        try: return [s.name for s in obj.sessions.all()]
        except: return []

    def get_target_exam_names(self, obj):
        try: return [te.name for te in obj.target_exams.all()]
        except: return []

    def get_package_names(self, obj):
        try: return [p.name for p in obj.packages.all()]
        except: return []

    def get_section_names(self, obj):
        try: return [section.name for section in obj.sections.all()]
        except: return []

class HomeworkSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.name', read_only=True)
    class_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)
    sections = serializers.PrimaryKeyRelatedField(many=True, queryset=MasterSection.objects.all(), required=False)
    sessions = ObjectIdRelatedField(many=True, queryset=Session.objects.all(), required=False)
    target_exams = ObjectIdRelatedField(many=True, queryset=TargetExam.objects.all(), required=False)
    section_names = serializers.SerializerMethodField()
    session_names = serializers.SerializerMethodField()
    target_exam_names = serializers.SerializerMethodField()
    packages = ObjectIdRelatedField(many=True, queryset=Package.objects.all(), required=False)
    package_names = serializers.SerializerMethodField()

    class Meta:
        model = Homework
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if 'sections' in ret:
            ret['sections'] = [s.pk for s in instance.sections.all()]
        if 'packages' in ret:
            ret['packages'] = [str(p.pk) for p in instance.packages.all()]
        if 'sessions' in ret:
            ret['sessions'] = [str(s.pk) for s in instance.sessions.all()]
        if 'target_exams' in ret:
            ret['target_exams'] = [str(te.pk) for te in instance.target_exams.all()]
        return ret

    def get_session_names(self, obj):
        try: return [s.name for s in obj.sessions.all()]
        except: return []

    def get_target_exam_names(self, obj):
        try: return [te.name for te in obj.target_exams.all()]
        except: return []

    def get_section_names(self, obj):
        try: return [section.name for section in obj.sections.all()]
        except: return []

    def get_package_names(self, obj):
        try: return [p.name for p in obj.packages.all()]
        except: return []

class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = '__all__'

class SeminarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seminar
        fields = '__all__'

class GuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guide
        fields = '__all__'

class CommunitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Community
        fields = '__all__'
