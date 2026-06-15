from agents.state import CampaignState
from langchain_core.runnables import RunnableConfig
from agents.intent_agent import run_intent_primary, run_intent_fallback
from agents.logger import log_agent_start, log_agent_complete

async def intent_node(state: CampaignState, config: RunnableConfig) -> dict:
    llm = config["configurable"]["llm"]
    user_message = state["user_message"]
    rag_context = state["rag_context"]
    
    log_id = log_agent_start(state["execution_group_id"], "Intent Agent", state.get("campaign_id"))
    try:
        result = await run_intent_primary(llm, user_message, rag_context)
        print("[🤖 Intent] Primary parsed successfully")
        log_agent_complete(log_id, "completed", fallback_used=False)
        return {"intent": result, "channel": result.get("channel")}
    except Exception as e:
        print(f"[🤖 Intent] Primary failed: {e}")
        try:
            result = await run_intent_fallback(llm, user_message, rag_context)
            print("[🤖 Intent] Fallback parsed successfully")
            log_agent_complete(log_id, "completed", fallback_used=True, notes=str(e))
            return {
                "intent": result, 
                "channel": result.get("channel"), 
                "fallback_used": True,
                "error_log": state.get("error_log", []) + [f"Intent primary error: {e}"]
            }
        except Exception as e2:
            print(f"[🤖 Intent] Both primary and fallback failed: {e2}")
            log_agent_complete(log_id, "failed", fallback_used=True, notes=str(e2))
            return {
                "failed_agents": state.get("failed_agents", []) + ["intent"],
                "error_log": state.get("error_log", []) + [f"Intent fallback error: {e2}"]
            }
