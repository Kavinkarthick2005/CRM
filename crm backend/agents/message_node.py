from agents.state import CampaignState
from langchain_core.runnables import RunnableConfig
from agents.message_agent import run_message_primary, run_message_fallback
from agents.logger import log_agent_start, log_agent_complete

async def message_node(state: CampaignState, config: RunnableConfig) -> dict:
    llm = config["configurable"]["llm"]
    intent_output = state.get("intent", {})
    
    log_id = log_agent_start(state["execution_group_id"], "Message Agent", state.get("campaign_id"))
    try:
        result = await run_message_primary(llm, intent_output)
        print("[✍️ Message] Primary message crafted successfully")
        log_agent_complete(log_id, "completed", fallback_used=False)
        return {
            "message_draft": result.get("message_draft"),
            "campaign_name": result.get("campaign_name")
        }
    except Exception as e:
        print(f"[✍️ Message] Primary failed: {e}")
        try:
            result = await run_message_fallback(llm, intent_output)
            print("[✍️ Message] Fallback message crafted successfully")
            log_agent_complete(log_id, "completed", fallback_used=True, notes=str(e))
            return {
                "message_draft": result.get("message_draft"),
                "campaign_name": result.get("campaign_name"),
                "fallback_used": True,
                "error_log": state.get("error_log", []) + [f"Message primary error: {e}"]
            }
        except Exception as e2:
            print(f"[✍️ Message] Both primary and fallback failed: {e2}")
            log_agent_complete(log_id, "failed", fallback_used=True, notes=str(e2))
            return {
                "failed_agents": state.get("failed_agents", []) + ["message"],
                "error_log": state.get("error_log", []) + [f"Message fallback error: {e2}"]
            }
