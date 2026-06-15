from agents.state import CampaignState
from datetime import date
from agents.logger import log_agent_start, log_agent_complete

def emergency_node(state: CampaignState) -> dict:
    log_id = log_agent_start(state["execution_group_id"], "Emergency Agent", state.get("campaign_id"))
    print("[🚨 Emergency] using safe defaults")
    log_agent_complete(log_id, "completed", fallback_used=True, notes="Emergency fallback triggered", confidence_score=15)
    return {
        "segment_query": {"last_order_days_ago": {"gte": 30}},
        "message_draft": "Hi {name}, we have a special offer for you!",
        "campaign_name": "Campaign - " + date.today().strftime("%d %b %Y"),
        "channel": "sms",
        "confidence_score": 15,
        "status": "emergency_fallback"
    }
