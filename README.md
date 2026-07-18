# DocVoice-Agent

DocVoice-Agent is an intelligent document and voice assistant that lets users upload documents, ask questions about them, and interact through voice-based workflows. The system combines a modern React frontend, a Node.js backend, and a Python ML service to provide a complete experience for document understanding, retrieval-augmented generation (RAG), and speech analysis.

![Project UI Placeholder]

## Why this project?

Many people need a private and practical way to interact with their own documents and voice notes. DocVoice-Agent brings together:

- Secure document upload and storage
- AI-powered question answering based on uploaded content
- Voice-to-text and emotion-aware interaction
- A full-stack experience with authentication and API integration

The goal is to make document-based AI assistance more useful, accessible, and personalized.

## Key Features

- Upload and manage documents
- Extract text from supported files
- Build searchable document embeddings
- Ask questions and receive grounded answers
- Process voice input and analyze emotional cues
- Secure authentication and protected routes
- Perform built-in productivity actions through tools, including PDF generation, email sending, and Google Meet scheduling

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Firebase Authentication

### Backend
- Node.js
- Express.js
- MongoDB
- Firebase Admin SDK

### ML Service
- Python
- FastAPI
- FAISS
- OpenAI embeddings / language models
- Whisper-based speech processing

## Project Structure

- frontend/ - React web application
- backend/ - Node.js API gateway and business logic
- python_ml_service/ - Python service for document processing, indexing, and query handling

## Demo Flow

1. User logs in to the application
2. User uploads a document
3. The system processes and indexes the content
4. User asks questions about the uploaded material
5. The app returns context-aware answers
6. Voice input can also be analyzed for transcription and emotion
7. The assistant can trigger built-in tools such as generating a PDF, sending an email, or scheduling a Google Meet

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3.10+
- MongoDB instance
- Firebase project credentials
- OpenAI API key

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Python ML Service Setup

```bash
cd python_ml_service
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Environment Variables

### Backend

Set the following environment variables in the backend environment:

- FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_SERVICE_ACCOUNT_PATH
- PORT (optional)
- MongoDB connection variables as required by your setup

### Python ML Service

Set the following variables:

- OPENAI_API_KEY
- PORT (optional)
- PYTHON_FAISS_DIR (optional)

## API Overview

### Backend Endpoints
- GET /api/health
- POST /api/documents/upload
- GET /api/documents/list
- DELETE /api/documents/:docId
- POST /api/query/ask

### ML Service Endpoints
- POST /process-document
- POST /delete-document
- POST /voice-to-text-emotion
- POST /query-rag

## Tools & Actions

DocVoice-Agent includes a tool-based workflow layer that allows the assistant to perform practical actions beyond answering questions:

- PDF Generation: create documents or reports from chat context
- Email Sending: send messages directly through the integrated workflow
- Google Meet Scheduling: create meeting links and schedule appointments

These actions make the assistant more useful for real productivity tasks, not just conversational Q&A.

## Screenshots

- Login / authentication flow
- Dashboard and document management
- Chat interaction panel
- Voice input experience
- Tool-based actions such as PDF generation, email sending, and meeting scheduling

## Future Improvements

- Better authentication and role-based access
- Support for more document formats
- Improved chunking and retrieval accuracy
- Better UI/UX and analytics
- Deployment to cloud platforms


## Contact

If you want to connect or discuss the project, feel free to reach out.
