# Xeno CRM - AI-Native Mini CRM

An AI-native CRM built for shopper marketing. Marketers can type natural language intents which are parsed by LLaMA 3 via Groq to dynamically query customer segments and send out SMS campaigns.

## Architecture

```text
┌──────────────┐      ┌───────────────┐      ┌────────────────┐
│              │      │               │      │                │
│  Next.js UI  ├─────►│  CRM Backend  ├─────►│Channel Service │
│ (Port 3000)  │      │ (Port 8000)   │      │  (Port 8001)   │
│              │◄─────┤               │◄─────┤                │
└──────────────┘      └───────┬───────┘      └────────────────┘
                              │
                              ▼
                      ┌───────────────┐
                      │  PostgreSQL   │
                      │  (Port 5432)  │
                      └───────────────┘
```

## Project Structure
- `/crm backend` - FastAPI service handling core CRM logic, Groq AI chat routing, and Supabase / PostgreSQL database connections.
- `/channel service` - FastAPI simulation service acting as an external vendor (like Twilio). It simulates delivery delays, failures, opens, and clicks, sending webhooks back to the CRM.
- `/frontend` - Next.js App Router application with Tailwind CSS, providing a dark-mode chat interface and live campaign statistics dashboard.

## Setup Instructions

### Environment Variables
Each service requires specific environment variables. Reference the `.env.example` file in each directory.

**CRM Backend (`/crm backend/.env`):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/crm
CHANNEL_SERVICE_URL=http://localhost:8001
GROQ_API_KEY=your_groq_api_key_here
```

**Frontend (`/frontend/.env.local`):**
```env
NEXT_PUBLIC_CRM_URL=http://localhost:8000
```

### Running Locally with Docker Compose

The easiest way to run the entire stack (including a local PostgreSQL database) is using Docker Compose.

1. Create an `.env` file in the root directory (where `docker-compose.yml` lives) or just export the variable:
   ```bash
   export GROQ_API_KEY=your_actual_key_here
   ```
2. Build and start the containers:
   ```bash
   docker-compose up --build
   ```
3. The services will be available at:
   - Frontend UI: `http://localhost:3000`
   - CRM Backend API: `http://localhost:8000/docs`
   - Channel Simulator API: `http://localhost:8001/docs`

> **Note**: If running locally with Docker Compose, the database will be completely empty. You will need to run the seed script locally.
> ```bash
> docker-compose exec crm-backend python seed.py
> ```

### Deployment
Deployment configuration is provided.
- Backend Services (`/crm backend` and `/channel service`) include `railway.toml` files perfectly configured for one-click deployment on [Railway](https://railway.app/).
- Frontend UI (`/frontend`) is a standard Next.js application, easily deployed to [Vercel](https://vercel.com/) out of the box (requires setting `NEXT_PUBLIC_CRM_URL`).

## Design Decisions

**Why a Chat-First UI?**
Traditional CRMs force marketers to click through a dozen disjointed menus (Audience Builder → Campaign Setup → Template Editor → Review). By utilizing a conversational interface, the marketer simply states their goal in natural language. The AI acts as an invisible orchestrator that dynamically translates intent into complex SQL segment filters and drafts the initial copy, drastically reducing friction and time-to-launch.

**Why Two Separate Services?**
The `channel service` was built as a standalone microservice to simulate a real-world third-party vendor (like Twilio or SendGrid). This enforces a robust, decoupled architecture where the primary CRM is stateless regarding delivery and relies purely on asynchronous webhooks. This prevents the CRM backend from blocking while waiting for delivery network latency.

**What to Do Differently at Scale**
If this were a production application sending millions of messages:
- **Message Queues**: I would replace `BackgroundTasks` with a durable queue like **Kafka** or **RabbitMQ**. This ensures that if the CRM crashes during a massive campaign, no messages are lost.
- **Batch Processing**: Instead of sending `POST` requests per individual customer, the CRM would send batched payloads to the channel service.
- **Retry Mechanisms**: Webhooks can fail. An exponential backoff and retry mechanism (e.g., using Celery or AWS SQS dead-letter queues) would be required to ensure delivery statuses are eventually consistent.
- **Connection Pooling**: Use `PgBouncer` or Supabase's direct connection pooling to handle high-concurrency database hits.
