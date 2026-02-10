from rest_framework import serializers
from .models import Session, TargetExam, ExamType, ClassLevel, ExamDetail, Subject, Topic, Chapter, SubTopic, Teacher, LibraryItem, SolutionItem, Notice, LiveClass, Video, PenPaperTest, Homework, Banner, Seminar, Guide, Community
from sections.models import Section
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

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'

class TargetExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = TargetExam
        fields = '__all__'

class ExamTypeSerializer(serializers.ModelSerializer):
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)
    class Meta:
        model = ExamType
        fields = '__all__'

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
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)

    class Meta:
        model = ExamDetail
        fields = '__all__'

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

class LibraryItemSerializer(serializers.ModelSerializer):
    session_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    exam_type_name = serializers.SerializerMethodField()
    target_exam_name = serializers.SerializerMethodField()
    section_name = serializers.SerializerMethodField()
    section = ObjectIdRelatedField(queryset=Section.objects.all(), required=False, allow_null=True)

    class Meta:
        model = LibraryItem
        fields = '__all__'

    def get_session_name(self, obj):
        return obj.session.name if obj.session else None

    def get_class_name(self, obj):
        return obj.class_level.name if obj.class_level else None

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_exam_type_name(self, obj):
        return obj.exam_type.name if obj.exam_type else None

    def get_target_exam_name(self, obj):
        return obj.target_exam.name if obj.target_exam else None

    def get_section_name(self, obj):
        return obj.section.name if obj.section else None

class SolutionItemSerializer(serializers.ModelSerializer):
    sections = ObjectIdRelatedField(many=True, queryset=Section.objects.all(), required=False)
    section_names = serializers.SerializerMethodField()
    session_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    exam_type_name = serializers.SerializerMethodField()
    target_exam_name = serializers.SerializerMethodField()

    class Meta:
        model = SolutionItem
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Explicitly ensure sections are returned as ID strings
        # This fixes Djongo's tendency to return __str__ values for ManyToMany fields
        if 'sections' in ret:
            ret['sections'] = [str(s.pk) for s in instance.sections.all()]
        return ret

    def get_section_names(self, obj):
        try:
            return [section.name for section in obj.sections.all()]
        except:
            return []

    def get_session_name(self, obj):
        return obj.session.name if obj.session else None

    def get_class_name(self, obj):
        return obj.class_level.name if obj.class_level else None

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_exam_type_name(self, obj):
        return obj.exam_type.name if obj.exam_type else None

    def get_target_exam_name(self, obj):
        return obj.target_exam.name if obj.target_exam else None

class NoticeSerializer(serializers.ModelSerializer):
    session_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    exam_type_name = serializers.SerializerMethodField()
    target_exam_name = serializers.SerializerMethodField()
    section_name = serializers.SerializerMethodField()
    section = ObjectIdRelatedField(queryset=Section.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Notice
        fields = '__all__'

    def get_session_name(self, obj):
        return obj.session.name if obj.session else None

    def get_class_name(self, obj):
        return obj.class_level.name if obj.class_level else None

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_exam_type_name(self, obj):
        return obj.exam_type.name if obj.exam_type else None

    def get_target_exam_name(self, obj):
        return obj.target_exam.name if obj.target_exam else None

    def get_section_name(self, obj):
        return obj.section.name if obj.section else None

class LiveClassSerializer(serializers.ModelSerializer):
    session_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    exam_type_name = serializers.SerializerMethodField()
    target_exam_name = serializers.SerializerMethodField()
    section_name = serializers.SerializerMethodField()
    section = ObjectIdRelatedField(queryset=Section.objects.all(), required=False, allow_null=True)
    
    packages = ObjectIdRelatedField(many=True, queryset=Package.objects.all(), required=False)
    package_names = serializers.SerializerMethodField()

    class Meta:
        model = LiveClass
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Explicitly ensure packages are returned as ID strings
        if 'packages' in ret:
             ret['packages'] = [str(p.pk) for p in instance.packages.all()]
        return ret

    def get_package_names(self, obj):
        try:
            return [p.name for p in obj.packages.all()]
        except:
            return []

    def get_session_name(self, obj):
        return obj.session.name if obj.session else None

    def get_class_name(self, obj):
        return obj.class_level.name if obj.class_level else None

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_exam_type_name(self, obj):
        return obj.exam_type.name if obj.exam_type else None

    def get_target_exam_name(self, obj):
        return obj.target_exam.name if obj.target_exam else None

    def get_section_name(self, obj):
        return obj.section.name if obj.section else None

class VideoSerializer(serializers.ModelSerializer):
    session_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    exam_type_name = serializers.SerializerMethodField()
    target_exam_name = serializers.SerializerMethodField()
    section_name = serializers.SerializerMethodField()
    section = ObjectIdRelatedField(queryset=Section.objects.all(), required=False, allow_null=True)
    
    packages = ObjectIdRelatedField(many=True, queryset=Package.objects.all(), required=False)
    package_names = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Explicitly ensure packages are returned as ID strings
        if 'packages' in ret:
             ret['packages'] = [str(p.pk) for p in instance.packages.all()]
        return ret

    def get_package_names(self, obj):
        try:
            return [p.name for p in obj.packages.all()]
        except:
            return []

    def get_session_name(self, obj):
        return obj.session.name if obj.session else None

    def get_class_name(self, obj):
        return obj.class_level.name if obj.class_level else None

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_exam_type_name(self, obj):
        return obj.exam_type.name if obj.exam_type else None

    def get_target_exam_name(self, obj):
        return obj.target_exam.name if obj.target_exam else None

class PenPaperTestSerializer(serializers.ModelSerializer):
    session_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    exam_type_name = serializers.SerializerMethodField()
    target_exam_name = serializers.SerializerMethodField()
    section_names = serializers.SerializerMethodField()
    sections = ObjectIdRelatedField(many=True, queryset=Section.objects.all(), required=False)
    
    packages = ObjectIdRelatedField(many=True, queryset=Package.objects.all(), required=False)
    package_names = serializers.SerializerMethodField()

    class Meta:
        model = PenPaperTest
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Explicitly ensure packages and sections are returned as ID strings
        if 'packages' in ret:
             ret['packages'] = [str(p.pk) for p in instance.packages.all()]
        if 'sections' in ret:
             ret['sections'] = [str(s.pk) for s in instance.sections.all()]
        return ret

    def get_package_names(self, obj):
        try:
            return [p.name for p in obj.packages.all()]
        except:
            return []

    def get_section_names(self, obj):
        try:
            return [section.name for section in obj.sections.all()]
        except:
            return []

    def get_session_name(self, obj):
        return obj.session.name if obj.session else None

    def get_class_name(self, obj):
        return obj.class_level.name if obj.class_level else None

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_exam_type_name(self, obj):
        return obj.exam_type.name if obj.exam_type else None

    def get_target_exam_name(self, obj):
        return obj.target_exam.name if obj.target_exam else None

    def update(self, instance, validated_data):
        # Handle manual removal of thumbnail
        request = self.context.get('request')
        if request and request.data.get('remove_thumbnail') == 'true':
            instance.thumbnail = None
        
        return super().update(instance, validated_data)

class HomeworkSerializer(serializers.ModelSerializer):
    sections = ObjectIdRelatedField(many=True, queryset=Section.objects.all(), required=False)
    section_names = serializers.SerializerMethodField()
    session_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    exam_type_name = serializers.SerializerMethodField()
    target_exam_name = serializers.SerializerMethodField()
    packages = ObjectIdRelatedField(many=True, queryset=Package.objects.all(), required=False)
    package_names = serializers.SerializerMethodField()

    class Meta:
        model = Homework
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if 'sections' in ret:
            ret['sections'] = [str(s.pk) for s in instance.sections.all()]
        if 'packages' in ret:
            ret['packages'] = [str(p.pk) for p in instance.packages.all()]
        return ret

    def get_section_names(self, obj):
        try:
            return [section.name for section in obj.sections.all()]
        except:
            return []

    def get_session_name(self, obj):
        return obj.session.name if obj.session else None

    def get_class_name(self, obj):
        return obj.class_level.name if obj.class_level else None

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_exam_type_name(self, obj):
        return obj.exam_type.name if obj.exam_type else None

    def get_target_exam_name(self, obj):
        return obj.target_exam.name if obj.target_exam else None

    def get_package_names(self, obj):
        try:
            return [p.name for p in obj.packages.all()]
        except:
            return []

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
