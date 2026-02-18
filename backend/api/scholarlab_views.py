import os
import re
import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from urllib.parse import quote


def _get_scholarlab_auth(scholarlab_url, client_key):
    """GET session token from Scholarlab API."""
    token_url = f"{scholarlab_url.strip('/')}/ClientSimulations/GetToken"
    params = {"client_Key": client_key}
    headers = {"client_Key": client_key, "Content-Type": "application/json"}

    try:
        resp = requests.get(token_url, params=params, headers=headers, timeout=12)

        # Failover to sapi subdomain
        if resp.status_code != 200 and "api.scholarlab.in" in token_url:
            alt_base = "https://sapi.scholarlab.in"
            resp = requests.get(
                f"{alt_base}/ClientSimulations/GetToken",
                params=params, headers=headers, timeout=12
            )
            if resp.status_code == 200:
                token = resp.json().get('token')
                if token:
                    return token, alt_base

        if resp.status_code == 200:
            token = resp.json().get('token')
            if token:
                return token, scholarlab_url

        return None, scholarlab_url
    except Exception as e:
        print(f"[SCHOLARLAB] Auth error: {str(e)}")
        return None, scholarlab_url


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_scholarlab_simulations(request):
    """Fetch simulation library for the student."""
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

        # Cache key — bump version to invalidate old caches (v420 for new key)
        cache_key = f"scholarlab_sim_v420_{access_token[:20]}"
        cached_data = cache.get(cache_key)
        if cached_data and not request.GET.get('refresh'):
            return Response(cached_data, status=status.HTTP_200_OK)

        # Register user for all grades so all simulations are unlocked
        all_grades = ["8", "9", "10", "11", "12"]
        grade_uploads = [
            {"UserName": user_name, "EmailId": user_email, "Subject": "All", "Grades": g}
            for g in all_grades
        ]
        try:
            requests.post(
                f"{active_url}/ClientSimulations/UsersGradeMapping",
                json={"token": access_token, "SchoolUserUploads": grade_uploads},
                headers={"Content-Type": "application/json"},
                timeout=15
            )
        except Exception as e:
            print(f"[SCHOLARLAB] Grade mapping warning: {e}")

        # Fetch simulation catalog
        sim_resp = requests.post(
            f"{active_url}/ClientSimulations/GetSimulationsWithGrades",
            json={"token": access_token, "userName": user_email},
            headers={"Content-Type": "application/json"},
            timeout=25
        )

        if sim_resp.status_code != 200:
            return Response({"error": "Failed to fetch simulation library"}, status=status.HTTP_502_BAD_GATEWAY)

        raw_data = sim_resp.json()
        sim_list = raw_data if isinstance(raw_data, list) else (
            raw_data.get('data') or raw_data.get('simulations') or []
        )

        formatted = []
        seen = set()
        for s in sim_list:
            if not isinstance(s, dict):
                continue
            sid = str(s.get("CustomUseCaseId") or "").strip()
            if not sid or sid in seen:
                continue
            seen.add(sid)

            # Clean module name — strip "Class X" / "Grade X" prefix
            raw_name = s.get("Module") or s.get("name") or "Science Lab"
            clean_name = re.sub(r'(?i)(?:Class|Grade|Standard)\s+\d+\s*[-:]?\s*', '', raw_name).strip()
            if not clean_name:
                clean_name = raw_name

            # IconUrl confirmed from API docs screenshot
            icon_url = s.get("IconUrl") or s.get("iconUrl") or None

            # WebGLUrl is a CloudFront .html URL (confirmed from docs)
            webgl_url = s.get("WebGLUrl") or ""

            formatted.append({
                "id": sid,
                "name": clean_name,
                "raw_name": raw_name,
                "topics": s.get("Topics"),
                "description": s.get("Description"),
                "webgl_url": webgl_url,
                "grade": str(s.get("Standard") or "All"),
                "subject": str(s.get("Subject") or "General Science"),
                "icon_url": icon_url,
            })

            # Debug first item
            if len(formatted) == 1:
                print(f"[SCHOLARLAB] First sim keys: {list(s.keys())}")
                print(f"[SCHOLARLAB] First sim WebGLUrl: {webgl_url}")
                print(f"[SCHOLARLAB] First sim IconUrl: {icon_url}")

        data = {"simulations": formatted}
        cache.set(cache_key, data, 1800)
        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[SCHOLARLAB] get_simulations error: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initialize_scholarlab_simulation(request):
    """
    Build the authenticated simulation URL per Scholarlab docs:

    Option A (with GetInitKey):
        ?userName=<InitUser>&uID=<InitKey>

    Option B (without GetInitKey — docs explicitly allow this):
        ?userName=<user_email>&uID=<client_key>

    We try Option A first, fall back to Option B if GetInitKey fails.
    """
    try:
        webgl_url = (request.data.get('webgl_url') or '').strip()
        sim_id = (request.data.get('sim_id') or '').strip()

        if not webgl_url:
            return Response({"error": "Simulation URL not provided"}, status=status.HTTP_400_BAD_REQUEST)

        print(f"[SCHOLARLAB] Launch - webgl_url: {webgl_url}, sim_id: {sim_id}")

        base_api = os.getenv('SCHOLARLAB_API_URL', 'https://api.scholarlab.in').strip()
        client_key = os.getenv('SCHOLARLAB_CLIENT_KEY', '').strip()

        # Step 1: Get session token
        token, active_url = _get_scholarlab_auth(base_api, client_key)
        if not token:
            return Response({"error": "Session auth failed"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        user_email = (request.user.email or f"{request.user.username}@pathfinder.com").strip().lower()

        # Step 2: Try GetInitKey (Option A)
        # Docs: InitKey → use as uID, InitUser → use as userName
        init_user = user_email      # fallback per docs Option B
        init_key = client_key       # fallback per docs Option B

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
            print(f"[SCHOLARLAB] GetInitKey status: {init_resp.status_code}")
            print(f"[SCHOLARLAB] GetInitKey response: {init_resp.text[:500]}")

            if init_resp.status_code == 200:
                resp_data = init_resp.json()
                # Handle both list and dict responses
                if isinstance(resp_data, list) and len(resp_data) > 0:
                    resp_data = resp_data[0]
                if isinstance(resp_data, dict):
                    got_user = resp_data.get('InitUser') or resp_data.get('initUser')
                    got_key = resp_data.get('InitKey') or resp_data.get('initKey')
                    if got_user and got_key:
                        init_user = got_user
                        init_key = got_key
                        print(f"[SCHOLARLAB] Using GetInitKey values (Option A)")
                    else:
                        print(f"[SCHOLARLAB] GetInitKey returned empty fields, using Option B fallback")
            else:
                print(f"[SCHOLARLAB] GetInitKey failed ({init_resp.status_code}), using Option B fallback")

        except Exception as e:
            print(f"[SCHOLARLAB] GetInitKey error: {str(e)}, using Option B fallback")

        # Step 3: Build final URL
        # IMPORTANT: If webgl_url is a directory (doesn't end in .html/etc)
        # and doesn't have a trailing slash, CloudFront redirects to folder/.
        # That redirect will STRIP our query params. So we must ensure a slash.
        final_base = webgl_url
        if not '?' in final_base:
            if not any(ext in final_base.lower() for ext in ['.html', '.php', '.asp', '.aspx', '.jsp']):
                if not final_base.endswith('/'):
                    final_base += '/'

        def q(v):
            return quote(str(v).strip(), safe='')

        separator = '&' if '?' in final_base else '?'
        final_url = f"{final_base}{separator}userName={q(init_user)}&uID={q(init_key)}"

        print(f"[SCHOLARLAB] Final URL: {final_url}")
        return Response({"simulation_url": final_url}, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[SCHOLARLAB] initialize error: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
