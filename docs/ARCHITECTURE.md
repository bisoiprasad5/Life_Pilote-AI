# LifePilot AI Architecture Documentation

Please refer to the complete system architecture blueprint in [ARCHITECTURE.md](file:///C:/Users/BISHNU%20PRASAD%20BISOI/.gemini/antigravity-ide/brain/04e4e99d-6c2d-4bc7-b179-837ce9f77719/lifepilot_architecture.md).

## Key Systems Architecture

1. **Product Architecture**: User flow, Eisenhower priority system, Smart Assistant integration.
2. **Frontend Architecture**: Next.js App Router + React Query + Zustand + Tailwind CSS + shadcn/ui.
3. **Backend Gateway**: NestJS modular architecture with Prisma ORM, Socket.IO WebSockets, and BullMQ queues.
4. **AI Microservice**: FastAPI Python service isolating LLM orchestration, Whisper audio processing, and context recommendation algorithms.
5. **Database**: PostgreSQL data models covering Users, Tasks, Timeblocks, Habits, Goals, Exams, Diet/Water logs, Focus sessions, Notes, and Notifications.
