from agents.orchestrator import CampaignOrchestrator

# Initialize the orchestrator globally so it can be reused
orchestrator = CampaignOrchestrator()

async def process_chat(user_message: str, conversation_history: list, db) -> dict:
    """
    Main entry point for processing chat messages via the multi-agent pipeline.
    """
    return await orchestrator.run(user_message, db)
