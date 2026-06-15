from agents.state import CampaignState

def calculate_confidence(state: CampaignState) -> int:
    score = 100
    
    if state.get('fallback_used'):
        score -= 25
    
    failed_agents = state.get('failed_agents', [])
    if 'intent' in failed_agents:
        score -= 20
        
    if 'segment' in failed_agents:
        score -= 20
        
    if 'message' in failed_agents:
        score -= 15
        
    if state.get('status') == 'recovered':
        score -= 30
        
    if state.get('status') == 'emergency_fallback':
        score = 15
    
    # Bonus for rich segment
    segment_query = state.get('segment_query')
    if segment_query and isinstance(segment_query, dict) and len(segment_query) >= 2:
        score += 10
        
    return max(min(score, 100), 10)

def validator_node(state: CampaignState) -> dict:
    message_draft = state.get("message_draft", "")
    segment_query = state.get("segment_query", {})
    channel = state.get("channel", "sms")
    
    # Trim message to 157 chars + "..." if over 160
    if message_draft and len(message_draft) > 160:
        message_draft = message_draft[:157] + '...'
    elif not message_draft:
        message_draft = "Hi {name}, we have a special offer for you!"
        
    # Add "Hi {name}, " prefix if {name} missing
    if '{name}' not in message_draft:
        message_draft = 'Hi {name}, ' + message_draft[:148]
        
    # Default channel to "sms" if invalid
    channel = channel.lower() if channel else "sms"
    if channel not in ['whatsapp', 'sms', 'email']:
        channel = 'sms'
        
    # Ensure segment_query is a non-empty dict
    if not segment_query or not isinstance(segment_query, dict):
        segment_query = {'last_order_days_ago': {'gte': 30}}
        
    confidence_score = calculate_confidence(state)
    
    print(f"[✅ Validator] passed | confidence: {confidence_score}%")
    
    return {
        "message_draft": message_draft,
        "segment_query": segment_query,
        "channel": channel,
        "confidence_score": confidence_score,
        "status": "success" if state.get("status") == "running" else state.get("status", "success")
    }
