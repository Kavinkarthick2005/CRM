import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

from langgraph.graph import StateGraph, START, END
from langchain_groq import ChatGroq
from langchain_core.runnables import RunnableConfig

from agents.state import CampaignState
from agents.rag_fetcher import fetch_context
from agents.intent_node import intent_node
from agents.segment_node import segment_node
from agents.message_node import message_node
from agents.validator_node import validator_node
from agents.recovery_node import recovery_node
from agents.emergency_node import emergency_node

async def rag_node(state: CampaignState, config: RunnableConfig):
    db = config["configurable"]["db"]
    context = await fetch_context(db)
    # Logging is now handled inside fetch_context natively per Prompt 2
    return {"rag_context": context}

def should_recover(state: CampaignState) -> str:
    if len(state.get('failed_agents', [])) > 0:
        return 'recovery_node'
    return 'validator_node'

def recovery_result(state: CampaignState) -> str:
    if state.get('final_output'):
        return 'validator_node'
    return 'emergency_node'

class CampaignOrchestrator:
    def __init__(self):
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY not configured")
            
        self.llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2)
        self.graph = self._build_graph()
        
    def _build_graph(self):
        graph = StateGraph(CampaignState)
        
        graph.add_node("rag_node", rag_node)
        graph.add_node("intent_node", intent_node)
        graph.add_node("segment_node", segment_node)
        graph.add_node("message_node", message_node)
        graph.add_node("validator_node", validator_node)
        graph.add_node("recovery_node", recovery_node)
        graph.add_node("emergency_node", emergency_node)
        
        graph.add_edge(START, "rag_node")
        graph.add_edge("rag_node", "intent_node")
        graph.add_edge("intent_node", "segment_node")
        graph.add_edge("segment_node", "message_node")
        
        graph.add_conditional_edges(
            "message_node",
            should_recover,
            {
                "recovery_node": "recovery_node",
                "validator_node": "validator_node"
            }
        )
        
        graph.add_conditional_edges(
            "recovery_node",
            recovery_result,
            {
                "validator_node": "validator_node",
                "emergency_node": "emergency_node"
            }
        )
        
        graph.add_edge("emergency_node", "validator_node")
        graph.add_edge("validator_node", END)
        
        return graph.compile()

    async def run(self, user_message: str, db) -> dict:
        initial_state = CampaignState(
            user_message=user_message,
            rag_context={},
            intent=None,
            segment_query=None,
            message_draft=None,
            campaign_name=None,
            channel=None,
            confidence_score=None,
            retry_count=0,
            fallback_used=False,
            failed_agents=[],
            error_log=[],
            final_output=None,
            status='running'
        )
        
        config = {"configurable": {"db": db, "llm": self.llm}}
        result = await self.graph.ainvoke(initial_state, config)
        
        print(f"\n{'='*50}")
        print(f"[📊 PIPELINE COMPLETE]")
        print(f"Status: {result.get('status')}")
        print(f"Confidence: {result.get('confidence_score')}%")
        print(f"Failed agents: {result.get('failed_agents')}")
        print(f"{'='*50}\n")
        
        return {
            "segment_query": result.get('segment_query'),
            "message_draft": result.get('message_draft'),
            "campaign_name": result.get('campaign_name'),
            "channel": result.get('channel'),
            "confidence_score": result.get('confidence_score'),
            "status": result.get('status'),
            "fallback_used": result.get('fallback_used'),
            "failed_agents": result.get('failed_agents')
        }
