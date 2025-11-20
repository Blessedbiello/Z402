# {{PROJECT_NAME}}

A Z402-integrated FastAPI application built with Python.

## Features

- ✅ Z402 payment integration
- ✅ FastAPI framework
- ✅ Webhook support
- ✅ Python 3.8+
- 📚 Auto-generated API documentation
- ⚡ Async/await support
- 🌐 Network: {{NETWORK}}

## Getting Started

### Prerequisites

- Python 3.8+ installed
- Z402 account and API key

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Z402 API credentials.

### Development

Start the development server:

```bash
python main.py
```

Or use uvicorn directly:

```bash
uvicorn main:app --reload --port 3000
```

The server will start on http://localhost:3000

### API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:3000/docs
- **ReDoc**: http://localhost:3000/redoc

### Testing the Payment Flow

1. **Access the public endpoint:**
```bash
curl http://localhost:3000/
```

2. **Try the protected endpoint (requires payment):**
```bash
curl http://localhost:3000/api/premium
```

You'll receive a 402 Payment Required response with a payment URL.

3. **Make a payment and access the content:**
Follow the payment URL, complete the payment, then use the authorization token:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/premium
```

### Production Deployment

For production, use a production-ready ASGI server like Gunicorn with Uvicorn workers:

```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:3000
```

## Project Structure

```
.
├── main.py                # Main application file
├── requirements.txt       # Python dependencies
├── .env                  # Environment variables (not in git)
├── .env.example          # Environment template
└── README.md            # This file
```

## API Endpoints

### Public Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `GET /docs` - Swagger UI documentation
- `GET /redoc` - ReDoc documentation

### Protected Endpoints (require payment)

- `GET /api/premium` - Premium content (0.01 ZEC)

### Webhook Endpoints

- `POST /webhooks/z402` - Z402 webhook events

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `Z402_API_KEY` | Your Z402 API key | required |
| `Z402_MERCHANT_ID` | Your merchant ID | required |
| `Z402_NETWORK` | Network (testnet/mainnet) | testnet |
| `NODE_ENV` | Environment | development |
| `PORT` | Server port | 3000 |

## Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
```

Build and run:

```bash
docker build -t {{PROJECT_NAME}} .
docker run -p 3000:3000 --env-file .env {{PROJECT_NAME}}
```

## Documentation

- [Z402 Documentation](https://docs.z402.io)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Python Z402 SDK](https://docs.z402.io/sdk/python)

## Support

- [GitHub Issues](https://github.com/z402/z402/issues)
- [Discord Community](https://discord.gg/z402)

## License

MIT
