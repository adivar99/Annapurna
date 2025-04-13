from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from dotenv import load_dotenv

from routers import recipes, auth, ai_router as ai
from database import init_db

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Recipe AI Assistant",
    description="""
    An AI-powered recipe management and conversation system.
    
    ## Features
    
    * 🍳 Recipe Management
    * 🤖 AI-Powered Cooking Assistant
    * 🔍 Smart Recipe Search
    * 📱 Modern API Interface
    * 👤 User Authentication
    * 💾 Recipe Saving
    
    ## Authentication
    
    The API uses JWT tokens for authentication. To use protected endpoints:
    1. Register a new user at `/api/v1/auth/register`
    2. Login at `/api/v1/auth/login` to get a token
    3. Use the token in the Authorization header: `Bearer <token>`
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Recipe AI Assistant Team",
        "url": "http://github.com/amvardha/Annapurna",
        "email": "support@recipe-ai.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Angular default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(recipes.router, prefix="/api/v1", tags=["recipes"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint that returns a welcome message.
    
    Returns:
        dict: A welcome message
    """
    return {
        "message": "Welcome to Recipe AI Assistant API",
        "docs": "/docs",
        "redoc": "/redoc"
    }

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Recipe AI Assistant API",
        version="1.0.0",
        description="""
        This API provides endpoints for managing recipes and interacting with an AI cooking assistant.
        
        ## Authentication
        
        The API uses JWT tokens for authentication. To use protected endpoints:
        1. Register a new user at `/api/v1/auth/register`
        2. Login at `/api/v1/auth/login` to get a token
        3. Use the token in the Authorization header: `Bearer <token>`
        
        ## Rate Limiting
        
        The API is rate-limited to 100 requests per minute per IP address.
        """,
        routes=app.routes,
    )
    
    # Add security schemes
    # openapi_schema["components"]["securitySchemes"] = {
    #     "BearerAuth": {
    #         "type": "http",
    #         "scheme": "bearer",
    #         "bearerFormat": "JWT",
    #         "description": "Enter your JWT token in the format: Bearer <token>"
    #     }
    # }
    
    # Add security requirements
    openapi_schema["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 