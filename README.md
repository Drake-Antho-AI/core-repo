# Reddit Sentiment Analyzer

AI-powered social listening platform that transforms Reddit discussions into actionable business intelligence.

![Reddit Sentiment Analyzer](https://img.shields.io/badge/Status-MVP-green)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **Smart Reddit Scraping**: Search multiple subreddits for specific keywords with rate limiting
- **AI-Powered Analysis**: Local LLM sentiment analysis via Ollama (no API costs)
- **Pain Point Extraction**: Automatically identify customer complaints and issues
- **Feature Request Detection**: Discover what users want from products
- **Action Items Generation**: AI-generated prioritized recommendations
- **AI Chat Assistant**: Interactive chat to ask questions about your analysis
- **Job Queue Management**: Queue, pause, and monitor multiple analysis jobs
- **Beautiful UI**: Modern React dashboard with filtering and search

## Tech Stack

### Backend

- **FastAPI** - High-performance Python web framework
- **SQLite** - Lightweight database (easy setup, no Docker required)
- **SQLAlchemy 2.0** - Async ORM with aiosqlite
- **Ollama** - Local LLM for sentiment analysis (qwen2:0.5b for speed)

### Frontend

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **TanStack Query** - Server state management
- **React Markdown** - Formatted AI chat responses

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Ollama (for AI analysis)

### 1. Install Ollama

Download and install from: https://ollama.ai

```bash
# Pull the fast model for analysis
ollama pull qwen2:0.5b
```

### 2. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the API server (database auto-creates)
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/api/health

## Project Structure

```
core-repo/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/      # API endpoints
│   │   ├── core/            # Config, database
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic (LLM, scraper)
│   │   └── main.py          # FastAPI app
│   ├── alembic/             # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── lib/             # API client, utilities
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## Pages

### 1. Configure Search

- Enter target subreddits (e.g., Landscaping, Construction)
- Add keywords/brands to search for
- Select date range and sorting preferences
- Click "Start Analysis"

### 2. Jobs Queue

- Monitor all analysis jobs
- See progress, ETA, and posts found
- Pause/resume jobs to prioritize
- Delete completed or failed jobs
- Click to view results

### 3. Browse Posts

- Filter by sentiment, subreddit, or content type
- Search within post titles and content
- Export to CSV
- Click through to original Reddit posts

### 4. Insights & Action Items

- View AI-generated prioritized recommendations
- Filter by category (Product, Service, Marketing)
- See impact scores and effort levels
- Explore supporting evidence posts
- **Chat with AI** about your analysis results

## API Endpoints

### Jobs

- `POST /api/jobs` - Create analysis job
- `GET /api/jobs/{id}` - Get job status
- `GET /api/jobs` - List all jobs
- `POST /api/jobs/{id}/pause` - Pause job
- `POST /api/jobs/{id}/resume` - Resume job
- `DELETE /api/jobs/{id}` - Delete job

### Posts

- `GET /api/posts` - List analyzed posts (with filters)
- `GET /api/posts/stats` - Get sentiment statistics
- `GET /api/posts/subreddits` - Get subreddit breakdown

### Insights

- `GET /api/insights` - List action items
- `GET /api/insights/summary/{job_id}` - Executive summary
- `POST /api/insights/chat` - Chat with AI about analysis
- `GET /api/insights/{id}/related-posts` - Supporting evidence

## Configuration

### Environment Variables (backend/.env)

```env
# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2:0.5b

# Reddit
REDDIT_USER_AGENT=RedditSentimentAnalyzer/1.0

# Application
DEBUG=true
```

## Development

### Backend Development

```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm run dev
```

## Troubleshooting

### Ollama Connection Issues

```bash
# Ensure Ollama is running
ollama serve

# Verify model is available
ollama list

# Test model
ollama run qwen2:0.5b "Hello"
```

### Slow Analysis

The default `qwen2:0.5b` model is optimized for speed on CPU. For better quality (but slower):

```bash
# Edit backend/app/core/config.py
ollama_model: str = "llama3.2:3b"

# Pull the model
ollama pull llama3.2:3b
```

### Database Reset

```bash
cd backend
# Delete the SQLite database
del sqlitedb.db  # Windows
# rm sqlitedb.db  # macOS/Linux

# Restart the server (auto-creates new DB)
python -m uvicorn app.main:app --reload
```

## Deployment

### Frontend: Cloudflare Pages

1. **Connect to Cloudflare Pages**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your GitHub repository

2. **Configure Build Settings**:
   - **Framework preset**: Vite
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/` (leave empty)

3. **Set Environment Variables**:
   - Add `VITE_API_URL` = `https://your-backend-url.com/api`

4. **Custom Domain**:
   - In Pages settings → Custom domains
   - Add your subdomain (e.g., `sentiment.yourdomain.com`)
   - Cloudflare handles SSL automatically

### Backend: Railway (Recommended)

The backend needs a Python server. [Railway](https://railway.app) offers easy deployment:

1. **Create Railway Project**:
   - Connect your GitHub repo
   - Select the `backend` directory

2. **Configure Service**:
   ```
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

3. **Add Environment Variables**:
   ```
   OLLAMA_BASE_URL=https://your-ollama-instance
   OLLAMA_MODEL=qwen2:0.5b
   ```

4. **LLM Options**:
   - **Option A**: Use [Ollama Cloud](https://ollama.com/cloud) or self-hosted Ollama on a GPU VM
   - **Option B**: Switch to OpenAI API (modify `ollama_analyzer.py`)

### Alternative Backend Hosts

| Service | Pros | Cons |
|---------|------|------|
| [Railway](https://railway.app) | Easy, $5 free credit | Limited free tier |
| [Render](https://render.com) | Good free tier | Sleeps after 15min |
| [Fly.io](https://fly.io) | Global edge | More complex setup |
| [DigitalOcean](https://digitalocean.com) | Full VPS control | $6+/month |

## License

MIT License - see LICENSE file for details.

---

**Note**: This is an MVP. For production use, consider adding authentication, rate limiting, and security hardening.
