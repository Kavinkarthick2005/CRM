def validate_and_fix(segment_query: dict, message_draft: str, campaign_name: str, channel: str) -> dict:
    """
    Final sanity check on the output without using an LLM.
    Fixes minor issues directly.
    """
    # Fix message length
    if message_draft and len(message_draft) > 160:
        message_draft = message_draft[:157] + '...'
    elif not message_draft:
        message_draft = "Hi {name}, we have a special offer for you!"
        
    # Ensure {name} placeholder exists
    if '{name}' not in message_draft:
        message_draft = 'Hi {name}, ' + message_draft[:148]
        
    # Fix invalid channel
    channel = channel.lower() if channel else "sms"
    if channel not in ['whatsapp', 'sms', 'email']:
        channel = 'sms'
        
    # Validate segment_query has at least one field
    if not segment_query or not isinstance(segment_query, dict):
        segment_query = {'last_order_days_ago': {'gte': 30}}
        
    # Set default campaign name if missing
    if not campaign_name:
        from datetime import datetime
        campaign_name = f"Campaign - {datetime.now().strftime('%d %b %Y')}"
        
    # Return clean validated output
    return {
        'segment_query': segment_query,
        'message_draft': message_draft,
        'campaign_name': campaign_name,
        'channel': channel,
        'is_fallback_used': False  # Will be set to True by orchestrator if needed
    }
