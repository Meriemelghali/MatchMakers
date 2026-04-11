import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY")
print(f"Key: {key[:5]}...{key[-5:]}" if key else "No key found")

try:
    genai.configure(api_key=key)
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content("Hello")
    print("Response: ", response.text)
except Exception as e:
    print(f"Error: {e}")
