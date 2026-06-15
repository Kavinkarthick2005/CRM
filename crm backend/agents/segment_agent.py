from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_groq import ChatGroq
from typing import Dict, Any
import json

class SegmentOutput(BaseModel):
    segment_query: Dict[str, Any] = Field(description="The JSON query for database filtering")
    reasoning: str = Field(description="Short explanation of why these filters were chosen")

async def run_segment_primary(llm: ChatGroq, intent_output: dict, rag_context: dict) -> dict:
    parser = PydanticOutputParser(pydantic_object=SegmentOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a customer segmentation engine.\n"
                   "Convert this target group into a segment_query JSON.\n\n"
                   "ONLY use these fields:\n"
                   "- total_spend: {{gte: float, lte: float}}\n"
                   "- total_orders: {{gte: int, lte: int}}\n"
                   "- last_order_days_ago: {{gte: int, lte: int}}\n"
                   "- channel_preference: {{eq: str}}\n"
                   "- tags: {{contains: str}}\n\n"
                   "Use these REAL customer statistics to set thresholds:\n"
                   "{rag_context}\n\n"
                   "Return ONLY the segment_query JSON. No explanation.\n"
                   "{format_instructions}"),
        ("user", "Target group: {target_group}")
    ])
    
    chain = prompt | llm | parser
    
    rag_str = rag_context.to_prompt_string() if hasattr(rag_context, "to_prompt_string") else json.dumps(rag_context)
    result = await chain.ainvoke({
        "target_group": intent_output.get("target_group", ""),
        "rag_context": rag_str,
        "format_instructions": parser.get_format_instructions()
    })
    
    return result.model_dump()

async def run_segment_fallback(llm: ChatGroq, intent_output: dict, rag_context: dict) -> dict:
    target_group = intent_output.get("target_group", "").lower()
    
    segment_query = {"last_order_days_ago": {"gte": 30}}  # Default
    
    if "inactive" in target_group or "haven't ordered" in target_group or "have not ordered" in target_group:
        segment_query = {"last_order_days_ago": {"gte": 30}}
    elif "vip" in target_group or "best" in target_group:
        segment_query = {"tags": {"contains": "vip"}}
    elif "new" in target_group:
        segment_query = {"tags": {"contains": "new"}}
        
    return {
        "segment_query": segment_query,
        "reasoning": "Fallback used based on keyword matching."
    }
