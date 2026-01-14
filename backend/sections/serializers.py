from rest_framework import serializers
from .models import Section

class SectionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='_id', read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'code', 'name', 'created_at', 'updated_at']
