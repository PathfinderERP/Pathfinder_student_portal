from rest_framework import serializers
from .models import Centre

class CentreSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='_id', read_only=True)

    class Meta:
        model = Centre
        fields = ['id', 'code', 'name', 'location', 'email', 'phone_number', 'created_at', 'updated_at']
