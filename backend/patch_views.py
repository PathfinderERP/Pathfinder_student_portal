import os
import re

file_path = r'a:\Pathfinder_student_portal\backend\tests\views.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("    @action(detail=True, methods=['post'], url_path='upload_omr_excel')\n    def upload_omr_excel(self, request, pk=None):")
end_idx = content.find("    @action(detail=True, methods=['get'], url_path='question_analysis')\n    def question_analysis(self, request, pk=None):")

if start_idx == -1 or end_idx == -1:
    print(f"Could not find method boundaries! start: {start_idx}, end: {end_idx}")
    exit(1)

old_method = content[start_idx:end_idx]

new_method = """    @action(detail=True, methods=['post'], url_path='upload_omr_excel')
    def upload_omr_excel(self, request, pk=None):
        try:
            import pandas as pd
            from django.db.models import Q
            from .models import TestSubmission
            from api.models import CustomUser
            from api.erp_views import get_student_lookup_index

            test = self.get_object()
            file = request.FILES.get('file')
            replace_existing = request.POST.get('replace_existing') == 'true'
            if not file:
                return Response({'error': 'No file uploaded'}, status=400)

            if file.name.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
            
            original_columns = list(df.columns)
            df.columns = [str(c).strip().lower() for c in df.columns]
            
            # --- HIGH PERFORMANCE PREFETCHING ---
            enroll_col = next((c for c in ['frmid', 'enrollment number', 'enrollment', 'admission number', 'admission', 'student id', 'id', 'username'] if c in df.columns), None)
            if not enroll_col:
                return Response({'error': f'Could not find enrollment column in sheet. Found: {original_columns}'}, status=400)

            raw_enrolls = []
            for val in df[enroll_col]:
                if pd.isna(val): continue
                enroll = str(val).strip().upper()
                if enroll.endswith('.0'): enroll = enroll[:-2]
                if enroll.isdigit(): enroll = f"PATH{enroll}"
                if enroll: raw_enrolls.append(enroll)

            existing_users_qs = CustomUser.objects.filter(Q(admission_number__in=raw_enrolls) | Q(username__in=raw_enrolls))
            existing_user_map = {}
            for u in existing_users_qs:
                if u.admission_number: existing_user_map[u.admission_number.upper()] = u
                if u.username: existing_user_map[u.username.upper()] = u
                
            erp_idx = get_student_lookup_index(force_refresh=False, block=False) or {}
            
            existing_subs_qs = TestSubmission.objects.filter(test=test, student__in=existing_users_qs)
            existing_sub_map = {s.student_id: s for s in existing_subs_qs}
            # -------------------------------------

            is_omr_raw = 'frmid' in df.columns or 'f001' in df.columns
            errors = []
            seen_enrollments = set()
            validated_rows = []

            if is_omr_raw:
                questions = []
                for section in test.sections.all().order_by('priority'):
                    seen = set()
                    order_list = section.question_order or []
                    order_map = {str(oid): i for i, oid in enumerate(order_list)}
                    
                    sec_qs = []
                    for q in section.questions.all():
                        if str(q.pk) not in seen:
                            seen.add(str(q.pk))
                            sec_qs.append(q)
                    sec_qs.sort(key=lambda q: order_map.get(str(q.pk), 999999))
                    questions.extend(sec_qs)

                for index, row in df.iterrows():
                    row_num = index + 2
                    if pd.isna(row[enroll_col]): continue
                        
                    enroll_raw = str(row[enroll_col]).strip().upper()
                    if enroll_raw.endswith('.0'): enroll_raw = enroll_raw[:-2]
                    if enroll_raw.isdigit(): enroll_raw = f"PATH{enroll_raw}"
                        
                    if enroll_raw in seen_enrollments:
                        errors.append(f"Row {row_num}: Duplicate student record '{enroll_raw}' found in sheet.")
                        continue
                    seen_enrollments.add(enroll_raw)

                    student = existing_user_map.get(enroll_raw)
                    if not student:
                        erp_record = erp_idx.get(f"adm_{enroll_raw}")
                        if erp_record:
                            try:
                                student_obj = erp_record.get('student') or {}
                                details_list = student_obj.get('studentsDetails', [])
                                email = ""
                                first_name = "Student"
                                last_name = ""
                                if details_list and isinstance(details_list, list) and len(details_list) > 0:
                                    email = details_list[0].get('studentEmail', '')
                                    name = details_list[0].get('studentName', '')
                                    if name:
                                        parts = name.strip().split(' ')
                                        first_name = parts[0]
                                        last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
                                
                                username = email if email else enroll_raw
                                student = existing_user_map.get(username.upper())
                                if not student:
                                    student = CustomUser.objects.create(
                                        username=username, email=email, admission_number=enroll_raw, user_type='student',
                                        first_name=first_name, last_name=last_name
                                    )
                                    existing_user_map[enroll_raw] = student
                                    existing_user_map[username.upper()] = student
                            except Exception as e:
                                print(f"Auto-sync failed for {enroll_raw}: {e}")
                                student = None

                    if not student:
                        errors.append(f"Row {row_num}: Student not found with enrollment '{enroll_raw}'.")
                        continue
                        
                    responses = {}
                    for i, q in enumerate(questions):
                        col_name = f"f{i+1:03d}"
                        if col_name in df.columns:
                            ans_val = row[col_name]
                            if pd.isna(ans_val): continue
                            ans_str = str(ans_val).strip().upper()
                            if ans_str in ('NAN', 'NONE', '', 'NULL'): continue
                                
                            options = q.question_options or []
                            ans_list = []
                            for char in ans_str:
                                if 'A' <= char <= 'Z':
                                    idx = ord(char) - ord('A')
                                    if 0 <= idx < len(options): ans_list.append(str(options[idx].get('id', '')))
                                elif '1' <= char <= '9':
                                    idx = int(char) - 1
                                    if 0 <= idx < len(options): ans_list.append(str(options[idx].get('id', '')))
                            
                            if ans_list:
                                if q.question_type == 'SINGLE_CHOICE':
                                    responses[str(q.pk)] = {'answer': ans_list[0]}
                                else:
                                    responses[str(q.pk)] = {'answer': ans_list}
                    
                    validated_rows.append({'student': student, 'responses': responses})

                if errors:
                    err_msg = "Validation failed. No data was saved. Errors:\\n" + "\\n".join(errors[:10])
                    if len(errors) > 10: err_msg += f"\\n... and {len(errors) - 10} more errors."
                    return Response({'error': err_msg}, status=400)

                if replace_existing:
                    TestSubmission.objects.filter(test=test, submission_type='OMR_EXCEL').delete()
                    existing_sub_map.clear()
                
                success_count = 0
                for data in validated_rows:
                    student = data['student']
                    responses = data['responses']
                    sub = existing_sub_map.get(student._id)
                    if sub:
                        sub.responses = responses
                        sub.is_finalized = True
                        sub.submission_type = 'OMR_EXCEL'
                        sub.save()
                    else:
                        TestSubmission.objects.create(test=test, student=student, responses=responses, is_finalized=True, submission_type='OMR_EXCEL')
                    success_count += 1

            else:
                score_col = next((c for c in ['score', 'total score', 'marks', 'total marks', 'total'] if c in df.columns), None)
                if not score_col:
                    return Response({'error': f'Could not identify score columns. Found: {original_columns}'}, status=400)

                for index, row in df.iterrows():
                    row_num = index + 2
                    if pd.isna(row[enroll_col]): continue
                        
                    enroll_num = str(row[enroll_col]).strip().upper()
                    if enroll_num.endswith('.0'): enroll_num = enroll_num[:-2]
                    if enroll_num.isdigit(): enroll_num = f"PATH{enroll_num}"
                        
                    try:
                        score = float(row[score_col])
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid score format.")
                        continue

                    if enroll_num in seen_enrollments:
                        errors.append(f"Row {row_num}: Duplicate student record '{enroll_num}' found in sheet.")
                        continue
                    seen_enrollments.add(enroll_num)

                    student = existing_user_map.get(enroll_num)
                    if not student:
                        erp_record = erp_idx.get(f"adm_{enroll_num}")
                        if erp_record:
                            try:
                                student_obj = erp_record.get('student') or {}
                                details_list = student_obj.get('studentsDetails', [])
                                email = ""
                                first_name = "Student"
                                last_name = ""
                                if details_list and isinstance(details_list, list) and len(details_list) > 0:
                                    email = details_list[0].get('studentEmail', '')
                                    name = details_list[0].get('studentName', '')
                                    if name:
                                        parts = name.strip().split(' ')
                                        first_name = parts[0]
                                        last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
                                
                                username = email if email else enroll_num
                                student = existing_user_map.get(username.upper())
                                if not student:
                                    student = CustomUser.objects.create(
                                        username=username, email=email, admission_number=enroll_num, user_type='student',
                                        first_name=first_name, last_name=last_name
                                    )
                                    existing_user_map[enroll_num] = student
                                    existing_user_map[username.upper()] = student
                            except Exception as e:
                                print(f"Auto-sync failed for {enroll_num}: {e}")
                                student = None

                    if not student:
                        errors.append(f"Row {row_num}: Student not found with enrollment '{enroll_num}'.")
                        continue

                    validated_rows.append({'student': student, 'score': score})

                if errors:
                    err_msg = "Validation failed. No data was saved. Errors:\\n" + "\\n".join(errors[:10])
                    if len(errors) > 10: err_msg += f"\\n... and {len(errors) - 10} more errors."
                    return Response({'error': err_msg}, status=400)

                if replace_existing:
                    TestSubmission.objects.filter(test=test, submission_type='OMR_EXCEL').delete()
                    existing_sub_map.clear()
                    
                success_count = 0
                for data in validated_rows:
                    student = data['student']
                    score = data['score']
                    sub = existing_sub_map.get(student._id)
                    if sub:
                        sub.score = score
                        sub.is_finalized = True
                        sub.submission_type = 'OMR_EXCEL'
                        sub.save()
                    else:
                        TestSubmission.objects.create(test=test, student=student, score=score, is_finalized=True, submission_type='OMR_EXCEL')
                    success_count += 1

            return Response({'message': f'Successfully uploaded records for {success_count} students.', 'errors': []})
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)

"""

new_content = content[:start_idx] + new_method + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Patch applied successfully.")
