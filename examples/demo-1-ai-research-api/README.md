# Demo 1: AI Research API

**Premium research data API protected by Z402 micropayments**

This demo showcases how AI agents can autonomously pay for premium API access using Z402, with built-in budget management and real-time analytics.

## 🎯 What This Demo Shows

- **Z402 Payment Protection**: Express API with `z402Middleware` protecting premium endpoints
- **Autonomous AI Agent**: Python agent that decides what data to buy within budget limits
- **Budget Management**: Daily/hourly spending limits with transaction tracking
- **Real-time Analytics**: Dashboard showing revenue, payments, and endpoint statistics
- **Multiple Price Tiers**: Different endpoints at different price points

## 🏗️ Architecture

```
┌─────────────────┐
│  React Dashboard│  ← Real-time analytics
│  (Port 5173)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Express API    │  ← Z402-protected endpoints
│  (Port 3000)    │     • Market Trends (0.01 ZEC)
└────────┬────────┘     • Sentiment Analysis (0.01 ZEC)
         │              • Competitor Analysis (0.01 ZEC)
         │              • Predictions (0.015 ZEC)
         ↓
┌─────────────────┐
│  Z402 Platform  │  ← Payment verification
└─────────────────┘
         ↑
         │ Pays for data
         │
┌─────────────────┐
│  Python AI Agent│  ← Autonomous research bot
│                 │     with budget limits
└─────────────────┘
```

## 🚀 Quick Start

### Option 1: One-Command Deploy (Docker)

```bash
# Clone and navigate to demo
cd examples/demo-1-ai-research-api

# Set up environment
cp .env.example .env
# Edit .env and add your Z402_API_KEY

# Start everything with Docker Compose
docker-compose up

# In another terminal, run the AI agent
cd ai-agent
python agent.py
```

Visit:
- Dashboard: http://localhost:5173
- API: http://localhost:3000
- API Info: http://localhost:3000/api/info

### Option 2: Manual Setup

#### Backend (Express API)

```bash
cd backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your Z402_API_KEY to .env

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`

#### Frontend (React Dashboard)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

#### AI Agent (Python)

```bash
cd ai-agent

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Add your Z402_API_KEY to .env

# Run the agent
python agent.py
```

## 📋 Prerequisites

- **Node.js 18+** for backend and frontend
- **Python 3.8+** for AI agent
- **Z402 API Key** (sign up at [dashboard.z402.io](https://dashboard.z402.io))
- **Docker** (optional, for one-command deploy)

## 🔑 Environment Variables

Create `.env` files in each directory:

### Backend `.env`

```env
Z402_API_KEY=z402_test_your_key_here
PORT=3000
NODE_ENV=development
```

### AI Agent `.env`

```env
Z402_API_KEY=z402_test_your_key_here
API_URL=http://localhost:3000
```

## 📡 API Endpoints

### Public Endpoints (No Payment Required)

- `GET /api/health` - Health check
- `GET /api/info` - Information about paid endpoints
- `GET /api/analytics` - Revenue and payment analytics

### Protected Endpoints (Requires Z402 Payment)

- `GET /api/research/market-trends` - **0.01 ZEC** - Market trend analysis
- `GET /api/research/sentiment-analysis` - **0.01 ZEC** - Social media sentiment
- `GET /api/research/competitor-analysis` - **0.01 ZEC** - Competitive intelligence
- `GET /api/research/predictions` - **0.015 ZEC** - AI predictions (premium)

## 🤖 AI Agent Features

The Python agent demonstrates:

### 1. Budget Management

```python
budget = BudgetManager(
    daily_limit="0.1",      # 0.1 ZEC per day
    hourly_limit="0.05",    # 0.05 ZEC per hour
    transaction_limit="0.02" # Max 0.02 ZEC per transaction
)
```

### 2. Autonomous Decision-Making

The agent evaluates each endpoint:

- Is the cost within max willing to pay?
- Do we have budget remaining?
- What's the research priority?

### 3. Automatic Payment

When approved, the agent:

1. Creates payment intent via Z402
2. Records spending in budget
3. Retries request with payment proof
4. Stores research results

### 4. Transaction Tracking

Full audit trail of all payments:

- Endpoint accessed
- Amount paid
- Timestamp
- Data received

## 📊 Dashboard Features

The React dashboard shows:

### Revenue Analytics

- **Total Revenue** - Lifetime earnings in ZEC
- **Total Payments** - Number of successful payments
- **24h Revenue** - Last 24 hours earnings
- **24h Payments** - Recent payment count

### Endpoint Statistics

For each endpoint:
- Request count
- Total revenue
- Popular

ity ranking

### Recent Payments

Real-time feed of:
- Timestamp
- Endpoint
- Amount
- Payment ID

### Revenue Chart

Interactive chart showing:
- Payment volume over time
- Revenue trends
- Peak usage times

## 💡 How It Works

### 1. Agent Requests Data

```python
# Agent tries to access protected endpoint
response = await session.get("/api/research/market-trends")
```

### 2. API Returns 402 Payment Required

```json
{
  "error": {
    "code": "payment_required",
    "message": "Payment required to access this resource"
  },
  "payment": {
    "amount": "0.01",
    "currency": "ZEC",
    "resource": "/api/research/market-trends"
  }
}
```

### 3. Agent Decides to Pay

```python
# Check budget
if await budget.can_spend("0.01"):
    # Create payment intent
    intent = await z402.payments.create(...)

    # Record spending
    await budget.record_spend("0.01", intent.id)
```

### 4. Agent Retries with Payment

```python
# Retry with payment proof
headers = {"z402-payment-intent": intent.id}
response = await session.get(url, headers=headers)
# Returns 200 OK with data
```

### 5. Dashboard Updates

The analytics endpoint is polled and dashboard shows:
- New payment recorded
- Revenue increased
- Endpoint stats updated

## 🎬 Video Walkthrough Script

### Scene 1: Introduction (30 seconds)

```
"Welcome to Z402 Demo 1: AI Research API.

In this demo, we'll show how AI agents can autonomously pay for
premium research data using Zcash micropayments.

The system includes:
- An Express API protected by Z402
- A Python AI agent with budget management
- A real-time analytics dashboard

Let's see it in action."
```

### Scene 2: Starting the System (45 seconds)

```
"First, we'll start the backend API with Z402 protection enabled.

[Show terminal]
cd backend && npm run dev

The API starts on port 3000 with four premium endpoints:
- Market trends
- Sentiment analysis
- Competitor analysis
- AI predictions

Each endpoint requires a small Zcash payment to access.

Now let's start the dashboard.

[Show terminal]
cd frontend && npm run dev

The dashboard shows real-time analytics at localhost:5173."
```

### Scene 3: Running the AI Agent (90 seconds)

```
"Now comes the interesting part - the autonomous AI agent.

[Show terminal]
cd ai-agent && python agent.py

Watch as the agent:

1. Checks its budget - 0.1 ZEC daily limit
2. Gets available endpoints from the API
3. Prioritizes which data to fetch

[Agent output shows]

The agent requests market trends...
API responds: Payment required - 0.01 ZEC

Agent evaluates:
- Cost: 0.01 ZEC ✓ Within budget
- Max willing to pay: 0.015 ZEC ✓ Acceptable
- Budget remaining: 0.1 ZEC ✓ Sufficient

Decision: APPROVED

Agent creates payment intent via Z402...
Payment recorded in budget...
Retrying request with payment proof...
✓ Data received!

[Agent continues with other endpoints]

The agent successfully fetches:
- Market trends
- Sentiment analysis
- Competitor analysis

But skips predictions (0.015 ZEC) to stay within hourly limit.

Final budget: 0.03 ZEC spent of 0.1 ZEC daily limit."
```

### Scene 4: Dashboard Analytics (60 seconds)

```
"Let's look at the dashboard.

[Show dashboard]

Revenue Analytics shows:
- Total Revenue: 0.03 ZEC
- Total Payments: 3
- Last 24h Revenue: 0.03 ZEC

Endpoint Statistics:
- Market Trends: 1 request, 0.01 ZEC
- Sentiment Analysis: 1 request, 0.01 ZEC
- Competitor Analysis: 1 request, 0.01 ZEC
- Predictions: 0 requests (agent chose not to buy)

Recent Payments feed shows all three transactions with:
- Timestamps
- Endpoints
- Amounts
- Payment IDs

The revenue chart visualizes payment volume over time."
```

### Scene 5: Key Features (45 seconds)

```
"Key features demonstrated:

1. Z402 Payment Protection
   - Express middleware protecting endpoints
   - Automatic verification
   - 402 responses for unpaid access

2. AI Agent Autonomy
   - Budget management
   - Cost-benefit analysis
   - Autonomous payments
   - Transaction tracking

3. Real-time Analytics
   - Revenue monitoring
   - Endpoint statistics
   - Payment feed
   - Visual charts

This is perfect for:
- AI agents buying data
- Micropayment APIs
- Usage-based pricing
- Privacy-preserving payments"
```

### Scene 6: Conclusion (30 seconds)

```
"That's Z402 Demo 1: AI Research API.

We've shown:
✓ Payment-protected API endpoints
✓ Autonomous AI agent with budget control
✓ Real-time analytics dashboard

The complete code is open source at github.com/z402/examples

Try it yourself:
docker-compose up

Thank you for watching!"
```

## 🔧 Customization

### Change Pricing

Edit `backend/src/index.ts`:

```typescript
z402Middleware({
  amount: '0.005',  // Change from 0.01 to 0.005 ZEC
  resource: '/api/research/market-trends',
  apiKey: process.env.Z402_API_KEY,
})
```

### Add New Endpoints

1. Add Z402 middleware:

```typescript
app.use('/api/research/new-endpoint',
  z402Middleware({ amount: '0.01', resource: '/api/research/new-endpoint' })
);
```

2. Add handler:

```typescript
app.get('/api/research/new-endpoint', (req, res) => {
  // Record payment
  if (req.z402Payment) {
    payments.push({ /* ... */ });
  }

  // Return data
  res.json({ /* your data */ });
});
```

### Adjust Agent Budget

Edit `ai-agent/agent.py`:

```python
agent = AIResearchAgent(
    daily_budget="0.2",    # Increase to 0.2 ZEC
    hourly_budget="0.1",   # Increase to 0.1 ZEC
)
```

## 📈 Production Deployment

### Deploy Backend

```bash
# Build Docker image
cd backend
docker build -t ai-research-api .

# Deploy to cloud (example: Railway, Fly.io, or AWS)
railway up
# or
flyctl deploy
```

### Deploy Frontend

```bash
# Build for production
cd frontend
npm run build

# Deploy to Vercel, Netlify, or any static hosting
vercel deploy
# or
netlify deploy
```

### Environment Variables for Production

```env
Z402_API_KEY=z402_live_your_production_key
NODE_ENV=production
FRONTEND_URL=https://your-dashboard.com
API_URL=https://your-api.com
```

## 🐛 Troubleshooting

### "Payment verification failed"

- Check Z402_API_KEY is set correctly
- Verify you're using testnet keys in testnet mode
- Check Z402 dashboard for API key status

### "Budget exceeded"

- Agent's budget limits have been reached
- Increase `daily_limit` or `hourly_limit`
- Wait for time window to reset
- Check budget stats with `agent.budget.get_statistics()`

### "Connection refused"

- Ensure backend is running on port 3000
- Check firewall settings
- Verify API_URL in agent .env

### Dashboard not updating

- Check API is accessible at /api/analytics
- Verify CORS is enabled in backend
- Check browser console for errors

## 📚 Learn More

- [Z402 Documentation](../../docs/README.md)
- [TypeScript SDK](../../packages/sdk/README.md)
- [Python SDK](../../packages/python-sdk/README.md)
- [API Reference](../../docs/api-reference/README.md)

## 📄 License

MIT

---

**Built with Z402** - Privacy-preserving micropayments for the AI age
