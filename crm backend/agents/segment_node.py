from agents.state import CampaignState
from langchain_core.runnables import RunnableConfig
from agents.segment_agent import run_segment_primary, run_segment_fallback

async def segment_node(state: CampaignState, config: RunnableConfig) -> dict:
    llm = config["configurable"]["llm"]
    intent_output = state.get("intent", {})
    rag_context = state.get("rag_context", {})
    
    # If intent failed entirely, we might not have it. The orchestrator conditional edge 
    # should ideally catch failed agents, but just in case, we still try.
    try:
        result = await run_segment_primary(llm, intent_output, rag_context)
        print("[🧩 Segment] Primary segment built successfully")
        return {"segment_query": result.get("segment_query")}
    except Exception as e:
        print(f"[🧩 Segment] Primary failed: {e}")
        try:
            result = await run_segment_fallback(llm, intent_output, rag_context)
            print("[🧩 Segment] Fallback segment built successfully")
            return {
                "segment_query": result.get("segment_query"),
                "fallback_used": True,
                "error_log": state.get("error_log", []) + [f"Segment primary error: {e}"]
            }
        except Exception as e2:
            print(f"[🧩 Segment] Both primary and fallback failed: {e2}")
            return {
                "failed_agents": state.get("failed_agents", []) + ["segment"],
                "error_log": state.get("error_log", []) + [f"Segment fallback error: {e2}"]
            }
