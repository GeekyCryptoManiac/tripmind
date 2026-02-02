from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os

load_dotenv()

print("Testing OpenAI initialization...")
print(f"API Key present: {'Yes' if os.getenv('OPENAI_API_KEY') else 'No'}")

try:
    llm = ChatOpenAI(
        model="gpt-4-0125-preview",
        temperature=0.7,
        openai_api_key=os.getenv('OPENAI_API_KEY')
    )
    print("✅ ChatOpenAI initialized successfully!")
    print(f"Model: {llm.model_name}")
except Exception as e:
    print(f"❌ Error: {e}")
