import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load .env file
load_dotenv('f:/student portal/backend/.env')

def test_gemini_v7():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return

    try:
        genai.configure(api_key=api_key)
        
        # Try the model I just put in the code
        target_model = 'gemini-1.5-flash' 
        print(f"\nTesting with {target_model}...")
        model = genai.GenerativeModel(target_model)
        
        response = model.generate_content("Hello, this is a test. Please reply with 'AI is working' if you can read this.")
        
        print("Response from Gemini:")
        print(response.text)
        
        if "AI is working" in response.text:
            print("\nRESULT: Gemini AI is WORKING correctly with " + target_model)
        else:
            print("\nRESULT: Gemini AI responded, but unexpected content.")
            
    except Exception as e:
        print(f"\nRESULT: Gemini AI is NOT working. Error: {e}")

if __name__ == "__main__":
    test_gemini_v7()
