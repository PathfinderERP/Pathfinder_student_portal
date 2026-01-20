import os
import boto3
from django.conf import settings
import django
from botocore.exceptions import ClientError

# Setup Django standalone
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def check_r2_access():
    print("--- Checking R2 Access ---")
    
    # Get credentials from settings (or directly from env)
    try:
        session = boto3.session.Session()
        s3 = session.client(
            service_name='s3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        print("✅ S3 Client initialized")
    except Exception as e:
        print(f"❌ Failed to initialize S3 client: {e}")
        return

    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    print(f"Target Bucket: {bucket_name}")

    # 1. List Objects
    print("\n1. Listing first 5 objects in 'question_images/':")
    try:
        response = s3.list_objects_v2(Bucket=bucket_name, Prefix='question_images/', MaxKeys=5)
        if 'Contents' in response:
            for obj in response['Contents']:
                print(f"   - {obj['Key']} (Size: {obj['Size']})")
                
                # Check one object
                test_key = obj['Key']
                
                # 2. Generate Presigned URL
                print(f"\n2. Generating Presigned URL for {test_key}:")
                url = s3.generate_presigned_url(
                    ClientMethod='get_object',
                    Params={'Bucket': bucket_name, 'Key': test_key},
                    ExpiresIn=3600
                )
                print(f"   URL: {url}")
                print("   (Try opening this URL in browser to verify file exists and is accessible via signing)")
                
                # 3. Check Public URL
                public_domain = os.getenv('R2_PUBLIC_DOMAIN')
                if public_domain:
                    clean_domain = public_domain.rstrip('/')
                    public_url = f"{clean_domain}/{test_key}"
                    print(f"\n3. Constructed Public URL: {public_url}")
                    # We can't curl from python easily without requests, but the user can check.
                
                break # Just check one
        else:
            print("   (No objects found with prefix 'question_images/')")
    except ClientError as e:
        print(f"❌ AWS ClientError: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_r2_access()
