from agents.state import CampaignState
from datetime import date

def emergency_node(state: CampaignState) -> dict:
    print("[🚨 Emergency] using safe defaults")
    return {
        "segment_query": {"last_order_days_ago": {"gte": 30}},
        "message_draft": "Hi {name}, we have a special offer for you!",
        "campaign_name": "Campaign - " + date.today().strftime("%d %b %Y"),
        "channel": "sms",
        "confidence_score": 15,
        "status": "emergency_fallback"
    }
