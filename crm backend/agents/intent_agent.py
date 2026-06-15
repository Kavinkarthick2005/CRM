from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_groq import ChatGroq
import json

class IntentOutput(BaseModel):
    target_group: str = Field(description="Description of who to reach")
    goal: str = Field(description="What offer or action to take")
    channel: str = Field(description="Channel: whatsapp, sms, or email")

async def run_intent_primary(llm: ChatGroq, user_message: str, rag_context: dict) -> dict:
    parser = PydanticOutputParser(pydantic_object=IntentOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert marketing intent parser.\n"
                   "Extract from the marketer's message:\n"
                   "- target_group: who to reach (description)\n"
                   "- goal: what offer or action\n"
                   "- channel: whatsapp | sms | email (infer if not stated)\n\n"
                   "Customer base context: {rag_context}\n\n"
                   "Return ONLY valid JSON matching this schema:\n"
                   "{{ \"target_group\": \"str\", \"goal\": \"str\", \"channel\": \"str\" }}\n"
                   "{format_instructions}"),
        ("user", "{user_message}")
    ])
    
    chain = prompt | llm | parser
    
    rag_str = rag_context.to_prompt_string() if hasattr(rag_context, "to_prompt_string") else json.dumps(rag_context)
    result = await chain.ainvoke({
        "user_message": user_message,
        "rag_context": rag_str,
        "format_instructions": parser.get_format_instructions()
    })
    
    return result.model_dump()

async def run_intent_fallback(llm: ChatGroq, user_message: str, rag_context: dict) -> dict:
    parser = PydanticOutputParser(pydantic_object=IntentOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Extract these three things from this marketing message as JSON: target_group, goal, channel.\n"
                   "If channel not mentioned, use 'sms'.\n"
                   "{format_instructions}"),
        ("user", "{user_message}")
    ])
    
    # We can use a faster/cheaper model here if we want, or lower temperature
    llm_fallback = ChatGroq(model="llama-3.1-8b-instant", temperature=0.1)
    
    chain = prompt | llm_fallback | parser
    
    result = await chain.ainvoke({
        "user_message": user_message,
        "format_instructions": parser.get_format_instructions()
    })
    
    return result.model_dump()
