import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

# Load .env file
load_dotenv('f:/student portal/backend/.env')

def test_gemini_json_mode():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return

    try:
        genai.configure(api_key=api_key)
        # Using the model that worked before
        model = genai.GenerativeModel('gemini-flash-latest', generation_config={"response_mime_type": "application/json"})
        
        prompt = """
        Return a JSON object with a single key 'status' and value 'working'.
        """
        
        print("Testing Gemini JSON mode...")
        response = model.generate_content(prompt)
        
        print("Response text:")
        print(response.text)
        
        data = json.loads(response.text)
        print("\nParsed Data:", data)
        
        if data.get('status') == 'working':
            print("\nRESULT: JSON mode is WORKING.")
        else:
            print("\nRESULT: JSON mode returned unexpected data.")
            
    except Exception as e:
        print(f"\nRESULT: JSON mode FAILED. Error: {e}")

if __name__ == "__main__":
    test_gemini_json_mode()
