"""
Management command: sync_centre_contacts

Patches all local Centre records that are missing email or phone_number
by looking up the matching centre from the ERP API.

Matching strategy (in order):
  1. Exact code match  (local.code == erp.enterCode)
  2. Name fuzzy match  (local.name contained in erp.centreName or vice-versa)

Usage:
    py manage.py sync_centre_contacts           # normal run
    py manage.py sync_centre_contacts --dry-run # show what would change, don't save
    py manage.py sync_centre_contacts --diag    # show all local centres + their ERP match status
"""
from django.core.management.base import BaseCommand
from centres.models import Centre


def _safe(s):
    return str(s or '').encode('ascii', 'replace').decode('ascii')


class Command(BaseCommand):
    help = "Backfill missing email/phone for Centre records from the ERP (code + name fuzzy match)"

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Show changes without saving")
        parser.add_argument('--diag', action='store_true', help="Full diagnostic: show all centres and match status")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        diag = options['diag']

        self.stdout.write("[sync_centre_contacts] Fetching ERP centre data...")

        # ── Fetch ERP centres ──────────────────────────────────────────────
        try:
            from api.erp_views import _get_erp_admin_token, _get_erp_url
            import requests as http_requests

            erp_url = _get_erp_url()
            erp_token = _get_erp_admin_token()

            if not erp_token:
                self.stderr.write("Could not obtain ERP admin token. Aborting.")
                return

            resp = http_requests.get(
                f"{erp_url}/api/centre",
                headers={"Authorization": f"Bearer {erp_token}"},
                timeout=30
            )

            if resp.status_code != 200:
                self.stderr.write(f"ERP /api/centre returned HTTP {resp.status_code}. Aborting.")
                return

            raw = resp.json()
            if isinstance(raw, dict):
                raw = raw.get('data') or raw.get('centres') or []
            erp_centres = [c for c in (raw if isinstance(raw, list) else []) if isinstance(c, dict)]

        except Exception as e:
            self.stderr.write(f"Error fetching ERP centres: {e}")
            return

        self.stdout.write(f"  Fetched {len(erp_centres)} ERP centre records.")

        if diag:
            self.stdout.write("\n=== ERP Centre Field Sample (first 3 records) ===")
            for i, c in enumerate(erp_centres[:3]):
                self.stdout.write(f"  Record {i+1}: {_safe(str(c))[:300]}")
            self.stdout.write("")

        # ── Build lookup maps ──────────────────────────────────────────────
        # code map: enterCode.upper() -> record
        code_map = {}
        # name map: centreName.upper().strip() -> record
        name_map = {}

        for c in erp_centres:
            code = str(c.get('enterCode') or c.get('code') or '').strip().upper()
            name = str(c.get('centreName') or c.get('name') or '').strip().upper()
            if code:
                code_map[code] = c
            if name:
                name_map[name] = c

        def find_erp_match(local_centre):
            """Returns (erp_record, match_type) or (None, None)."""
            code_key = str(local_centre.code or '').strip().upper()
            name_key = str(local_centre.name or '').strip().upper()

            # 1. Exact code match
            if code_key and code_key in code_map:
                return code_map[code_key], 'code'

            # 2. Exact name match
            if name_key and name_key in name_map:
                return name_map[name_key], 'name-exact'

            # 3. Fuzzy name: local name contained in ERP name or vice-versa
            if name_key and len(name_key) >= 4:
                for erp_name, erp_rec in name_map.items():
                    if name_key in erp_name or erp_name in name_key:
                        return erp_rec, 'name-fuzzy'

            return None, None

        # ── Process local centres ──────────────────────────────────────────
        local_centres = list(Centre.objects.all())
        patched = 0
        skipped_ok = 0      # already had data
        skipped_no_erp = 0  # no ERP match found
        skipped_no_data = 0 # ERP matched but has no email/phone either
        errors = 0

        self.stdout.write(f"\n  Processing {len(local_centres)} local centre(s)...\n")

        for centre in local_centres:
            safe_name = _safe(centre.name)
            code_key = str(centre.code or '').strip().upper()

            has_email = bool(centre.email and centre.email.strip())
            has_phone = bool(centre.phone_number and centre.phone_number.strip())

            if has_email and has_phone:
                if diag:
                    self.stdout.write(f"  [HAVE] {safe_name} ({code_key}) - email={centre.email}, phone={centre.phone_number}")
                skipped_ok += 1
                continue

            erp, match_type = find_erp_match(centre)

            if not erp:
                msg = f"  [NO-ERP] {safe_name} ({code_key}) - no ERP match found"
                if diag:
                    self.stdout.write(msg)
                else:
                    self.stdout.write(msg)
                skipped_no_erp += 1
                continue

            erp_code = str(erp.get('enterCode') or erp.get('code') or '').strip()
            erp_name = _safe(erp.get('centreName') or erp.get('name') or '')

            # Try multiple field names for email and phone
            erp_email = str(
                erp.get('email') or erp.get('contactEmail') or
                erp.get('centreEmail') or erp.get('adminEmail') or ''
            ).strip()
            erp_phone = str(
                erp.get('phoneNumber') or erp.get('phone') or
                erp.get('mobile') or erp.get('contactNumber') or
                erp.get('centrePhone') or erp.get('mobileNum') or ''
            ).strip()

            if diag:
                self.stdout.write(
                    f"  [MATCH:{match_type}] {safe_name} ({code_key}) -> ERP: {erp_name} ({erp_code})"
                    f" | ERP email={erp_email or 'NONE'}, phone={erp_phone or 'NONE'}"
                )

            changed = False
            if not has_email and erp_email:
                centre.email = erp_email[:254]
                changed = True
            if not has_phone and erp_phone:
                centre.phone_number = erp_phone[:20]
                changed = True

            if not changed:
                self.stdout.write(
                    f"  [ERP-EMPTY] {safe_name} ({code_key}) - matched ERP but ERP has no email/phone"
                )
                skipped_no_data += 1
                continue

            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f"  [DRY-RUN] Would patch {safe_name} ({code_key})"
                        f" -> email={centre.email}, phone={centre.phone_number}"
                    )
                )
                patched += 1
                continue

            try:
                centre.save(update_fields=['email', 'phone_number'])
                patched += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [OK] {safe_name} ({code_key}) [{match_type}]"
                        f" -> email={centre.email}, phone={centre.phone_number}"
                    )
                )
            except Exception as e:
                errors += 1
                self.stderr.write(f"  [ERR] {safe_name} ({code_key}): {e}")

        # ── Summary ────────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"[sync_centre_contacts] Complete."
        ))
        self.stdout.write(f"  Patched      : {patched}")
        self.stdout.write(f"  Already OK   : {skipped_ok}")
        self.stdout.write(f"  No ERP match : {skipped_no_erp}")
        self.stdout.write(f"  ERP no data  : {skipped_no_data}")
        self.stdout.write(f"  Errors       : {errors}")
        if dry_run:
            self.stdout.write(self.style.WARNING("  (Dry-run: no changes were saved)"))
