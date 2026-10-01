# LifePilot AI

> **Tagline:** "Plan your day. Stay on track. Live better."

LifePilot AI is an enterprise-grade AI Personal Life & Productivity Assistant designed to optimize daily routines, task prioritization, habits, study plans, diet, and focus sessions.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS, TypeScript, Prisma ORM, Socket.IO
- **Database**: PostgreSQL
- **Background Jobs & Cache**: Redis, BullMQ
- **AI Microservice**: Python, FastAPI, Uvicorn, LLM Provider Abstraction
- **DevOps**: Docker, Docker Compose

---

## 📁 Repository Structure

```
lifepilot-ai/
├── frontend/        # Next.js 14 Web Application
├── backend/         # NestJS Core Gateway & Business Logic API
├── ai-service/      # Python FastAPI AI Engine Microservice
├── docs/            # Architecture & System Design Documentation
├── docker/          # Container Dockerfiles
├── .env.example     # Environment Variables Template
├── .gitignore       # Git Ignored Patterns
├── docker-compose.yml # Container Orchestration Config
└── README.md        # Project Overview
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites

- Node.js >= 18
- Python >= 3.10
- Docker & Docker Compose (Optional for containerized run)

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Frontend Development

```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:3000
```

### 3. Backend Development

```bash
cd backend
npm install
npx prisma generate
npm run start:dev
# Running on http://localhost:4000
```

### 4. AI Service Development

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Running on http://localhost:8000
```

---

## 🚢 Docker Compose Setup

Run the full system stack (PostgreSQL, Redis, NestJS Backend, FastAPI AI Engine, Next.js Frontend) using single command:

```bash
docker-compose up --build
```
