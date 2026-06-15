from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_groq import ChatGroq
from datetime import datetime

class MessageOutput(BaseModel):
    message_draft: str = Field(description="The marketing message text")
    campaign_name: str = Field(description="A short name for the campaign")

async def run_message_primary(llm: ChatGroq, intent_output: dict) -> dict:
    parser = PydanticOutputParser(pydantic_object=MessageOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a D2C fashion brand copywriter.\n"
                   "Write a short personalized marketing message.\n\n"
                   "Rules:\n"
                   "- Under 160 characters\n"
                   "- Include {{name}} placeholder\n"
                   "- Match the channel tone:\n"
                   "  SMS: direct and clear\n"
                   "  WhatsApp: friendly, can use 1-2 emojis\n"
                   "  Email: slightly more formal\n\n"
                   "{format_instructions}"),
        ("user", "Goal: {goal}\nChannel: {channel}\nAudience: {target_group}")
    ])
    
    chain = prompt | llm | parser
    
    result = await chain.ainvoke({
        "goal": intent_output.get("goal", ""),
        "channel": intent_output.get("channel", "sms"),
        "target_group": intent_output.get("target_group", ""),
        "format_instructions": parser.get_format_instructions()
    })
    
    return result.model_dump()

async def run_message_fallback(llm: ChatGroq, intent_output: dict) -> dict:
    channel = intent_output.get("channel", "sms").lower()
    goal = intent_output.get("goal", "We have a special offer for you.")
    
    channel_templates = {
        'sms': 'Hi {name}, ' + goal[:100] + ' Shop now!',
        'whatsapp': 'Hey {name}! 👋 ' + goal[:90] + ' Check it out!',
        'email': 'Dear {name}, ' + goal[:100] + ' Visit us today.'
    }
    
    template = channel_templates.get(channel, channel_templates['sms'])
    campaign_name = f"Campaign - {datetime.now().strftime('%d %b %Y')}"
    
    return {
        "message_draft": template,
        "campaign_name": campaign_name
    }
