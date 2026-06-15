from db import engine, Base
from models.models import AgentExecutionLog

print("Creating new tables...")
Base.metadata.create_all(bind=engine)
print("Done.")
