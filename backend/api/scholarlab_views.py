import os
import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from urllib.parse import quote


def _get_scholarlab_auth(scholarlab_url, client_key):
    """Officially documented GET protocol for session tokens."""
    token_url = f"{scholarlab_url.strip('/')}/ClientSimulations/GetToken"
    params = {"client_Key": client_key}
    headers = {"client_Key": client_key, "Content-Type": "application/json"}
    
    try:
        # Standard Documented GET fetch
        resp = requests.get(token_url, params=params, headers=headers, timeout=12)
        
        # Secondary Failover logic
        if resp.status_code != 200 and "api.scholarlab.in" in token_url:
            alt_base = "https://sapi.scholarlab.in"
            resp = requests.get(f"{alt_base}/ClientSimulations/GetToken", params=params, headers=headers, timeout=12)
            if resp.status_code == 200:
                return resp.json().get('token'), alt_base
        
        if resp.status_code == 200:
            token = resp.json().get('token')
            if token:
                return token, scholarlab_url
            
        return None, scholarlab_url
    except Exception as e:
        print(f"[ERROR] Scholarlab Auth Failed: {str(e)}")
        return None, scholarlab_url

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_scholarlab_simulations(request):
    """Fetch library with v380 canonical synchronization."""
    try:
        if request.user.user_type != 'student':
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        base_api = os.getenv('SCHOLARLAB_API_URL', 'https://api.scholarlab.in').strip()
        client_key = os.getenv('SCHOLARLAB_CLIENT_KEY', '').strip()
        
        access_token, active_url = _get_scholarlab_auth(base_api, client_key)
        if not access_token:
            return Response({"error": "Portal authentication service offline"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        user_email = (request.user.email or f"{request.user.username}@pathfinder.com").strip().lower()
        user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username

        # Fresh purge (v380) for Canonical URL migration
        cache_key = f"scholarlab_sim_v380_{access_token[:20]}"
        cached_data = cache.get(cache_key)
        if cached_data and not request.GET.get('refresh'):
            return Response(cached_data, status=status.HTTP_200_OK)

        # Step 2: Protocol Handshake (Mapping)
        requests.post(
            f"{active_url}/ClientSimulations/UsersGradeMapping",
            json={
                "token": access_token,
                "SchoolUserUploads": [{
                    "UserName": user_name,
                    "EmailId": user_email,
                    "Subject": "All",
                    "Grades": "9"
                }]
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        # Step 3: Fetch unique catalog
        sim_resp = requests.post(
            f"{active_url}/ClientSimulations/GetSimulationsWithGrades",
            json={"token": access_token, "userName": user_email},
            headers={"Content-Type": "application/json"},
            timeout=25
        )
        
        if sim_resp.status_code != 200:
            return Response({"error": "Failed to sync science laboratory library"}, status=status.HTTP_502_BAD_GATEWAY)
            
        formatted = []
        seen = set()
        for s in (sim_resp.json() if isinstance(sim_resp.json(), list) else []):
            sid = str(s.get("CustomUseCaseId") or "").strip()
            if not sid or sid in seen: continue
            seen.add(sid)
            formatted.append({
                "id": sid,
                "name": s.get("Module") or s.get("name") or "Science Lab",
                "topics": s.get("Topics"),
                "description": s.get("Description"),
                "webgl_url": s.get("WebGLUrl"),
                "grade": str(s.get("Standard") or ""),
                "subject": str(s.get("Subject") or "")
            })
        
        data = {"simulations": formatted}
        cache.set(cache_key, data, 1800)
        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[ERROR] simulations_get_v380: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initialize_scholarlab_simulation(request):
    """Canonical Doc-Strict Initialization."""
    try:
        webgl_url = (request.data.get('webgl_url') or '').strip()
        if not webgl_url:
            return Response({"error": "Laboratory URL not provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        base_api = os.getenv('SCHOLARLAB_API_URL', 'https://api.scholarlab.in').strip()
        client_key = os.getenv('SCHOLARLAB_CLIENT_KEY', '').strip()
        
        # 1. Fetch Handshake Token (GET)
        token, active_url = _get_scholarlab_auth(base_api, client_key)
        if not token:
            return Response({"error": "Session auth failed"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        user_email = (request.user.email or f"{request.user.username}@pathfinder.com").strip().lower()
        
        # 2. Dynamic key handshake (GetInitKey)
        init_user, init_key = user_email, client_key
        try:
            init_resp = requests.post(
                f"{active_url}/ClientSimulations/GetInitKey",
                json={
                    "token": token,
                    "clientKey": client_key,
                    "userName": user_email
                },
                headers={"Content-Type": "application/json"},
                timeout=12
            )
            if init_resp.status_code == 200:
                data = init_resp.json()
                init_user = data.get('InitUser') or data.get('initUser') or data.get('uName') or user_email
                init_key = data.get('InitKey') or data.get('initKey') or data.get('uID') or client_key
        except Exception as e:
            print(f"[WARNING] Key Handshake error: {str(e)}")

        # 3. Parameters Assembly (Canonical Version)
        def q(v): return quote(str(v).strip(), safe='')
        
        e_user = q(init_user)
        e_key = q(init_key)
        
        # Strictly using the authorized encrypted keys from documentation standard
        params = [
            f"userName={e_user}",           # Encrypted ID
            f"uID={e_key}"                  # Encrypted Key (Strict Uppercase uID)
        ]
        
        # Zero-Modification Pathing: Preserving original URL structure exactly
        separator = '&' if '?' in webgl_url else '?'
        final_url = f"{webgl_url}{separator}{'&'.join(params)}"
        
        print(f"[DEBUG] Launching Canonical Restored Lab: {final_url}")
        return Response({"simulation_url": final_url}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"[ERROR] initialize_lab_v380: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
