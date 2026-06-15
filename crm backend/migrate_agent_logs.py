import os
import sys

# Ensure the correct path so models and db are importable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import engine, Base
from models.models import AgentExecutionLog

def migrate():
    print("Creating AgentExecutionLog table if it does not exist...")
    AgentExecutionLog.__table__.create(bind=engine, checkfirst=True)
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
