import pandas as pd
import json
import os

excel_path = r'f:\student portal\frontend\public\Merged_Institution_Names.xlsx'
json_output_path = r'f:\student portal\frontend\src\data\colleges.json'

if not os.path.exists(os.path.dirname(json_output_path)):
    os.makedirs(os.path.dirname(json_output_path))

try:
    # Read Excel
    df = pd.read_excel(excel_path)
    
    # Print columns for debugging
    print(f"Columns: {df.columns.tolist()}")
    
    # Assume the institution names are in the first column or a column named 'Institution' or 'Name'
    # Let's try to find it
    target_col = None
    for col in df.columns:
        if 'institution' in col.lower() or 'name' in col.lower() or 'college' in col.lower():
            target_col = col
            break
    
    if not target_col:
        target_col = df.columns[0]
        
    print(f"Using column: {target_col}")
    
    # Extract unique names, drop NaNs, and strip literal quotes
    colleges = [str(x).strip().strip('"').strip("'") for x in df[target_col].dropna().unique().tolist()]
    
    # Deduplicate after stripping
    colleges = list(set(colleges))
    
    # Sort them
    colleges.sort()
    
    # Save to JSON
    with open(json_output_path, 'w', encoding='utf-8') as f:
        json.dump(colleges, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully converted {len(colleges)} colleges to {json_output_path}")

except Exception as e:
    print(f"Error: {e}")
