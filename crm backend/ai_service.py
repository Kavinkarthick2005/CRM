from agents.orchestrator import CampaignOrchestrator
from langchain_groq import ChatGroq
import os

def get_llm():
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY not configured")
    return ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2)

# Initialize the orchestrator globally so it can be reused
orchestrator = CampaignOrchestrator()

async def process_chat(user_message: str, conversation_history: list, db) -> dict:
    """
    Main entry point for processing chat messages via the multi-agent pipeline.
    """
    return await orchestrator.run(user_message, db)
