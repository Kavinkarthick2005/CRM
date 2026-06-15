from typing import TypedDict, Optional

class CampaignState(TypedDict):
    # Input
    user_message: str
    rag_context: dict
    
    # Agent outputs
    intent: Optional[dict]
    segment_query: Optional[dict]
    message_draft: Optional[str]
    campaign_name: Optional[str]
    channel: Optional[str]
    confidence_score: Optional[int]
    
    # Control flow
    retry_count: int
    fallback_used: bool
    failed_agents: list
    error_log: list
    final_output: Optional[dict]
    status: str  # 'running' | 'success' | 'recovered' | 'failed' | 'emergency_fallback'
