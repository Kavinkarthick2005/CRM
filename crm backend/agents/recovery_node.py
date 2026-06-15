from agents.state import CampaignState
from langchain_core.runnables import RunnableConfig
from agents.logger import log_agent_start, log_agent_complete
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
import json

class RecoveryOutput(BaseModel):
    segment_query: dict = Field(description="Segment query dictionary")
    message_draft: str = Field(description="String under 100 chars with {name}")
    campaign_name: str = Field(description="String 4-6 words")
    channel: str = Field(description="sms, email, or whatsapp")

async def recovery_node(state: CampaignState, config: RunnableConfig) -> dict:
    log_id = log_agent_start(state["execution_group_id"], "Recovery Agent", state.get("campaign_id"))
    print("[🔧 Recovery] attempting...")
    llm = config["configurable"]["llm"]
    user_message = state.get("user_message", "")
    
    parser = PydanticOutputParser(pydantic_object=RecoveryOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Given this marketing goal: {user_message}\n"
                   "Generate a simple campaign with:\n"
                   "- segment: customers inactive > 30 days\n"
                   "- message under 100 chars mentioning the offer\n"
                   "Return JSON ONLY.\n"
                   "{format_instructions}"),
    ])
    
    chain = prompt | llm | parser
    
    try:
        result = await chain.ainvoke({
            "user_message": user_message,
            "format_instructions": parser.get_format_instructions()
        })
        
        print("[🔧 Recovery] succeeded")
        log_agent_complete(log_id, "completed", fallback_used=False)
        return {
            "segment_query": result.segment_query,
            "message_draft": result.message_draft,
            "campaign_name": result.campaign_name,
            "channel": result.channel,
            "status": "recovered",
            "final_output": result.model_dump() # Used for routing check
        }
    except Exception as e:
        print(f"[🔧 Recovery] Failed: {e}")
        log_agent_complete(log_id, "failed", fallback_used=False, notes=str(e))
        return {
            "error_log": state.get("error_log", []) + [f"Recovery error: {e}"]
        }
