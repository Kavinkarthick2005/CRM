from agents.state import CampaignState

def confidence_node(state: CampaignState) -> dict:
    score = 100
    
    if state.get("fallback_used"):
        score -= 25
        
    failed_agents = state.get("failed_agents", [])
    if failed_agents:
        score -= 20 * len(failed_agents)
        
    status = state.get("status", "")
    if status == 'recovered':
        score -= 30
    elif status == 'emergency':
        score = 15
        
    segment_query = state.get("segment_query", {})
    if segment_query and isinstance(segment_query, dict) and len(segment_query.keys()) >= 2:
        score += 10
        
    final_score = max(min(score, 100), 10)
    print(f"[📊 Confidence] Calculated score: {final_score}")
    
    return {"confidence_score": final_score}
