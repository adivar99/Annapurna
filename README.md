# Annapurna

Annapurna is a modern web application that combines AI capabilities with a user-friendly interface. The project aims to provide intelligent services through a robust backend and an intuitive frontend.

![Landing Page Screenshot](docs/screenshots/landing.png)
![Home Page Screenshot](docs/screenshots/homePage.png)
![Recipe Chat Page Screenshot](docs/screenshots/recipeChat.png)

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB with Beanie ODM
- **AI Integration**: OpenAI API
- **Vector Database**: ChromaDB
- **Authentication**: JWT (JSON Web Tokens)
- **Other Dependencies**:
  - Uvicorn (ASGI server)
  - Python-dotenv (Environment management)
  - Pydantic (Data validation)

### Frontend
- **Framework**: Angular
- **Language**: TypeScript
- **Build Tool**: Angular CLI

## Project Structure
```
.
├── backend/           # FastAPI backend service
│   ├── core/         # Core functionality
│   ├── crud/         # Database operations
│   ├── models/       # Data models
│   ├── routers/      # API routes
│   ├── schemas/      # Pydantic schemas
│   └── scripts/      # Utility scripts
├── frontend/         # Angular frontend application
│   └── annapurna-app/
├── baseimgs/         # Base images for the project
├── scripts/          # Project-wide scripts
└── docker-compose.yml # Docker configuration
```

```mermaid
graph TB
    %% External Services
    subgraph "External Services"
        OpenAI[OpenAI API<br/>GPT-4 & Embeddings]
        Gemini[Google Gemini API<br/>Alternative AI Provider]
        MongoDB[(MongoDB Atlas<br/>Primary Database)]
    end

    %% User Layer
    User[👤 User<br/>Web Browser]

    %% Infrastructure Layer
    subgraph "Docker Infrastructure"
        subgraph "Nginx Proxy Container"
            Proxy[Nginx Reverse Proxy<br/>Port 80]
        end
        
        subgraph "Frontend Container"
            Frontend[Angular Frontend<br/>TypeScript<br/>Port 4200]
            AngularCLI[Angular CLI<br/>Development Server]
            NodeModules[Node.js Dependencies<br/>Material UI, etc.]
        end
        
        subgraph "Backend Container"
            Backend[FastAPI Backend<br/>Python 3.12<br/>Port 8080]
            Uvicorn[Uvicorn ASGI Server<br/>Auto-reload]
        end
    end

    %% Backend Components
    subgraph "Backend Services"
        subgraph "API Layer"
            AuthRouter[Auth Router<br/>JWT Authentication]
            RecipeRouter[Recipe Router<br/>CRUD Operations]
            AIRouter[AI Router<br/>AI Integration]
            ChatRouter[Chat Router<br/>Conversation Management]
        end
        
        subgraph "Data Layer"
            Beanie[Beanie ODM<br/>MongoDB Integration]
            Motor[Motor<br/>Async MongoDB Driver]
        end
        
        subgraph "AI Services"
            ClientManager[AI Client Manager<br/>Provider Abstraction]
            OpenAIClient[OpenAI Client<br/>GPT-4 Integration]
            GeminiClient[Gemini Client<br/>Alternative Provider]
            EmbeddingService[Embedding Service<br/>Vector Operations]
        end
        
        subgraph "Vector Database"
            ChromaDB[(ChromaDB<br/>Vector Storage<br/>Recipe Embeddings)]
            ChromaCollection[Recipe Collection<br/>Semantic Search]
        end
    end

    %% Data Models
    subgraph "Data Models"
        UserModel[User Model<br/>Authentication & Profiles]
        RecipeModel[Recipe Model<br/>Ingredients & Instructions]
        ChatModel[Chat Session Model<br/>Conversation History]
        IngredientModel[Ingredient Model<br/>Recipe Components]
    end

    %% Build & Deployment
    subgraph "Build System"
        DockerCompose[Docker Compose<br/>Orchestration]
        BaseImages[Base Images<br/>Pre-built Dependencies]
        BuildScript[Annapurna.sh<br/>Build & Deploy Script]
    end

    %% User Interactions
    User --> Proxy
    Proxy --> Frontend
    Proxy --> Backend

    %% Frontend to Backend
    Frontend --> Backend
    AngularCLI --> Frontend
    NodeModules --> Frontend

    %% Backend Internal Flow
    Backend --> AuthRouter
    Backend --> RecipeRouter
    Backend --> AIRouter
    Backend --> ChatRouter

    %% Database Connections
    AuthRouter --> Beanie
    RecipeRouter --> Beanie
    ChatRouter --> Beanie
    Beanie --> Motor
    Motor --> MongoDB

    %% AI Service Flow
    AIRouter --> ClientManager
    ClientManager --> OpenAIClient
    ClientManager --> GeminiClient
    OpenAIClient --> OpenAI
    GeminiClient --> Gemini

    %% Vector Database Flow
    RecipeRouter --> EmbeddingService
    EmbeddingService --> ChromaDB
    EmbeddingService --> ClientManager
    ChromaDB --> ChromaCollection

    %% Data Model Relationships
    Beanie --> UserModel
    Beanie --> RecipeModel
    Beanie --> ChatModel
    Beanie --> IngredientModel

    %% Build System
    DockerCompose --> Frontend
    DockerCompose --> Backend
    DockerCompose --> Proxy
    BaseImages --> Frontend
    BaseImages --> Backend
    BuildScript --> DockerCompose

    %% Container Runtime
    Uvicorn --> Backend

    %% Styling
    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef frontend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef backend fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef database fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef ai fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef infrastructure fill:#f1f8e9,stroke:#33691e,stroke-width:2px

    class OpenAI,Gemini,MongoDB external
    class Frontend,AngularCLI,NodeModules frontend
    class Backend,AuthRouter,RecipeRouter,AIRouter,ChatRouter,Beanie,Motor,Uvicorn backend
    class ChromaDB,ChromaCollection,UserModel,RecipeModel,ChatModel,IngredientModel database
    class ClientManager,OpenAIClient,GeminiClient,EmbeddingService ai
    class Proxy,DockerCompose,BaseImages,BuildScript infrastructure
```

## Setup and Installation

### Prerequisites
- Docker and Docker Compose
- Node.js (for frontend development)
- Python 3.8+ (for backend development)

### Environment Setup
1. Copy the environment file:
   ```bash
   cp .env.sample .env
   ```
2. Update the `.env` file with your configuration values

### Running with Docker (Recommended)
1. Build the baseimgs:
   ```bash
   ./annapurna.sh build baseimgs
   ```
2. Build the dev images
   ```bash
   ./annapurna.sh build dev
   ```
3. Run the Dev images
   ```bash
   ./annapurna.sh start dev
   ```
4. Finally, when you want to bring the images down and remove any orphan containers
   ```bash
   ./annapurna.sh stop
   ```

## Development
- The application will be loaded at: `http://localhost`
- API documentation (Swagger UI) will be available at: `http://localhost:8080/docs`

## Contributing
Please read our contributing guidelines before submitting pull requests.

## License
[Add your license information here]
