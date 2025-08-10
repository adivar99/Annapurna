# AI Client System

This module provides an abstract AI client system that supports multiple AI providers including OpenAI's ChatGPT and Google's Gemini.

## Architecture

The system is built around an abstract base class `AbstractAIClient` that defines the interface for all AI clients. Concrete implementations are provided for:

- **OpenAI Client**: Uses OpenAI's GPT models (ChatGPT)
- **Gemini Client**: Uses Google's Gemini models

## Installation

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Note: The system uses the new `google-genai` library (not the deprecated `google-generativeai`). The system will automatically detect which AI providers are available based on installed packages and API keys.

## Configuration

Set up your environment variables:

```bash
# Choose your AI client (openai or gemini)
CLIENT=openai

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4  # Optional, defaults to gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Optional

# Gemini Configuration  
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash  # Optional, defaults to gemini-1.5-flash
GEMINI_EMBEDDING_MODEL=models/text-embedding-004  # Optional
```

## Usage

### Basic Usage

```python
from ai.clients import ClientManager, ChatMessage

# Create client manager
manager = ClientManager()
client = manager.get_client()

# Create chat messages
messages = [
    ChatMessage(role="system", content="You are a helpful assistant."),
    ChatMessage(role="user", content="Hello, how are you?")
]

# Get chat completion
response = await client.chat_completion(messages)
print(response.content)

# Generate embeddings
embedding = await client.generate_embedding("Some text to embed")
print(f"Embedding dimensions: {len(embedding)}")
```

### Switching Between Clients

```python
import os
from ai.clients import ClientManager, ClientEnum

# Use OpenAI
os.environ["CLIENT"] = ClientEnum.OPENAI
openai_client = ClientManager().get_client()

# Use Gemini
os.environ["CLIENT"] = ClientEnum.GEMINI
gemini_client = ClientManager().get_client()
```

### Direct Client Usage

```python
from ai.clients import OpenAIClient, GeminiClient, ChatMessage

# Use OpenAI directly
openai_client = OpenAIClient()
response = await openai_client.chat_completion([
    ChatMessage(role="user", content="Hello!")
])

# Use Gemini directly
gemini_client = GeminiClient()
response = await gemini_client.chat_completion([
    ChatMessage(role="user", content="Hello!")
])
```

## API Reference

### AbstractAIClient

Base abstract class for all AI clients.

#### Methods

- `chat_completion(messages, temperature=0.7, max_tokens=500, **kwargs)`: Generate chat completion
- `generate_embedding(text, **kwargs)`: Generate text embeddings
- `get_model_name()`: Get current model name

### ChatMessage

Data class for chat messages.

#### Fields

- `role`: Message role ("system", "user", "assistant")
- `content`: Message content

### ChatResponse

Data class for chat responses.

#### Fields

- `content`: Response content
- `model`: Model used for generation
- `usage`: Token usage information (optional)

### ClientManager

Manager class for handling different AI clients.

#### Methods

- `get_client()`: Get configured AI client
- `get_available_clients()`: List available client types

## Error Handling

The system includes comprehensive error handling:

- Missing API keys raise `ValueError`
- Missing dependencies raise `ImportError`
- API errors are wrapped with descriptive messages

## Testing

Run the example script to test the system:

```bash
cd backend/app/ai
python example_usage.py
```

## Extending the System

To add a new AI provider:

1. Create a new client class inheriting from `AbstractAIClient`
2. Implement all abstract methods
3. Add the new client type to `ClientEnum`
4. Update `ClientManager.get_client()` method

Example:

```python
class NewAIClient(AbstractAIClient):
    def _setup_client(self):
        # Setup your client
        pass
    
    async def chat_completion(self, messages, **kwargs):
        # Implement chat completion
        pass
    
    async def generate_embedding(self, text, **kwargs):
        # Implement embedding generation
        pass
    
    def get_model_name(self):
        return "your-model-name"
```
