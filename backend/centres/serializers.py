from rest_framework import serializers
from .models import Centre

class CentreSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='_id', read_only=True)

    class Meta:
        model = Centre
        fields = ['id', 'code', 'name', 'location', 'email', 'phone_number', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        # Re-apply fix: Explicitly update fields to avoid Djongo 'location' bug
        update_fields = []
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            update_fields.append(attr)
        
        if update_fields:
            instance.save(update_fields=update_fields)
        return instance
