import os
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from enum import Enum

# Import LangChain components
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

class ClientEnum(str, Enum):
    OPENAI = "openai"
    GEMINI = "gemini"

class ChatMessage(BaseModel):
    role: str  # "system", "user", "assistant"
    content: str

class ChatResponse(BaseModel):
    content: str
    model: str
    usage: Optional[Dict[str, Any]] = None

class AbstractAIClient(ABC):
    """Abstract base class for AI clients"""

    def __init__(self):
        self.model_name: str = ""
        self.api_key: str = ""
        self._setup_client()

    @abstractmethod
    def _setup_client(self) -> None:
        """Setup the client with API key and configuration"""
        pass

    @abstractmethod
    async def chat_completion(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.7,
        max_tokens: int = 500,
        **kwargs
    ) -> ChatResponse:
        """Generate a chat completion response"""
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        """Get the current model name"""
        pass

class OpenAIClient(AbstractAIClient):
    """OpenAI client implementation using LangChain"""

    def _setup_client(self) -> None:
        """Setup OpenAI client using LangChain"""
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")

        self.model_name = os.getenv("OPENAI_MODEL", "gpt-4")
        self.embedding_model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

        # Initialize LangChain ChatOpenAI client
        self.client = ChatOpenAI(
            api_key=self.api_key,
            model=self.model_name,
            temperature=0.7,
            max_tokens=500
        )

    async def chat_completion(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.7,
        max_tokens: int = 500,
        **kwargs
    ) -> ChatResponse:
        """Generate a chat completion using LangChain OpenAI"""
        try:
            # Convert ChatMessage objects to LangChain message format
            langchain_messages = []
            for msg in messages:
                if msg.role == "system":
                    langchain_messages.append(SystemMessage(content=msg.content))
                elif msg.role == "user":
                    langchain_messages.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    langchain_messages.append(AIMessage(content=msg.content))

            # Create a new client instance with updated parameters
            client = ChatOpenAI(
                api_key=self.api_key,
                model=self.model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )

            # Use LangChain's async invoke method
            response = await client.ainvoke(langchain_messages)

            # Extract usage metadata if available
            usage_data = None
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                usage_data = {
                    "prompt_tokens": response.usage_metadata.get("input_tokens", 0),
                    "completion_tokens": response.usage_metadata.get("output_tokens", 0),
                    "total_tokens": response.usage_metadata.get("total_tokens", 0)
                }

            return ChatResponse(
                content=response.content,
                model=self.model_name,
                usage=usage_data
            )

        except Exception as e:
            raise Exception(f"OpenAI chat completion failed: {str(e)}")

    def get_model_name(self) -> str:
        """Get the current OpenAI model name"""
        return self.model_name

class GeminiClient(AbstractAIClient):
    """Google Gemini client implementation using LangChain"""

    def _setup_client(self) -> None:
        """Setup Gemini client using LangChain"""
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")

        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        self.embedding_model = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")

        # Initialize LangChain ChatGoogleGenerativeAI client
        self.client = ChatGoogleGenerativeAI(
            google_api_key=self.api_key,
            model=self.model_name,
            temperature=0.7,
            max_output_tokens=500
        )

    async def chat_completion(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.7,
        max_tokens: int = 500,
        **kwargs
    ) -> ChatResponse:
        """Generate a chat completion using LangChain Gemini"""
        try:
            # Convert ChatMessage objects to LangChain message format
            langchain_messages = []
            for msg in messages:
                if msg.role == "system":
                    langchain_messages.append(SystemMessage(content=msg.content))
                elif msg.role == "user":
                    langchain_messages.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    langchain_messages.append(AIMessage(content=msg.content))

            # Create a new client instance with updated parameters
            client = ChatGoogleGenerativeAI(
                google_api_key=self.api_key,
                model=self.model_name,
                temperature=temperature,
                max_output_tokens=max_tokens,
                **kwargs
            )

            # Use LangChain's async invoke method
            response = await client.ainvoke(langchain_messages)

            # Extract usage metadata if available
            usage_data = None
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                usage_data = {
                    "prompt_tokens": response.usage_metadata.get("input_tokens", 0),
                    "completion_tokens": response.usage_metadata.get("output_tokens", 0),
                    "total_tokens": response.usage_metadata.get("total_tokens", 0)
                }

            return ChatResponse(
                content=response.content,
                model=self.model_name,
                usage=usage_data
            )

        except Exception as e:
            raise Exception(f"Gemini chat completion failed: {str(e)}")

    def get_model_name(self) -> str:
        """Get the current Gemini model name"""
        return self.model_name

class ClientManager:
    """Manager class to handle different AI clients"""

    def __init__(self):
        self.client_env = os.getenv("AI_CLIENT", ClientEnum.OPENAI)

    def get_client(self) -> AbstractAIClient:
        """Get the appropriate AI client based on environment configuration"""
        if self.client_env == ClientEnum.OPENAI:
            return OpenAIClient()
        elif self.client_env == ClientEnum.GEMINI:
            return GeminiClient()
        else:
            raise ValueError(f"Invalid client: {self.client_env}")

    def get_available_clients(self) -> List[str]:
        """Get list of available client types"""
        available = [ClientEnum.OPENAI, ClientEnum.GEMINI]
        return available

