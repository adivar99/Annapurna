"""
Example usage of the AI client system

This script demonstrates how to use the abstract AI client system
with both OpenAI and Gemini implementations.
"""

import asyncio
import os
from dotenv import load_dotenv
from clients import ClientManager, ChatMessage, ClientEnum

# Load environment variables
load_dotenv()

async def test_openai_client():
    """Test OpenAI client functionality"""
    print("=== Testing OpenAI Client ===")
    
    # Set client to OpenAI
    os.environ["CLIENT"] = ClientEnum.OPENAI
    
    try:
        # Get client
        manager = ClientManager()
        client = manager.get_client()
        
        print(f"Using model: {client.get_model_name()}")
        
        # Test chat completion
        messages = [
            ChatMessage(role="system", content="You are a helpful cooking assistant."),
            ChatMessage(role="user", content="What's a simple recipe for pasta?")
        ]
        
        response = await client.chat_completion(messages, temperature=0.7, max_tokens=200)
        print(f"Chat Response: {response.content[:100]}...")
        print(f"Model used: {response.model}")
        
        # Test embedding generation
        embedding = await client.generate_embedding("This is a test text for embedding")
        print(f"Embedding generated with {len(embedding)} dimensions")
        
    except Exception as e:
        print(f"OpenAI client error: {e}")

async def test_gemini_client():
    """Test Gemini client functionality"""
    print("\n=== Testing Gemini Client ===")
    
    # Set client to Gemini
    os.environ["CLIENT"] = ClientEnum.GEMINI
    
    try:
        # Get client
        manager = ClientManager()
        client = manager.get_client()
        
        print(f"Using model: {client.get_model_name()}")
        
        # Test chat completion
        messages = [
            ChatMessage(role="system", content="You are a helpful cooking assistant."),
            ChatMessage(role="user", content="What's a simple recipe for pasta?")
        ]
        
        response = await client.chat_completion(messages, temperature=0.7, max_tokens=200)
        print(f"Chat Response: {response.content[:100]}...")
        print(f"Model used: {response.model}")
        
        # Test embedding generation
        embedding = await client.generate_embedding("This is a test text for embedding")
        print(f"Embedding generated with {len(embedding)} dimensions")
        
    except Exception as e:
        print(f"Gemini client error: {e}")
        print("Note: Make sure you have 'google-genai' installed, not 'google-generativeai'")

async def test_client_manager():
    """Test ClientManager functionality"""
    print("\n=== Testing ClientManager ===")
    
    manager = ClientManager()
    available_clients = manager.get_available_clients()
    print(f"Available clients: {available_clients}")
    
    # Test switching between clients
    for client_type in available_clients:
        print(f"\nTesting {client_type} client:")
        os.environ["CLIENT"] = client_type
        
        try:
            client = manager.get_client()
            print(f"Successfully created {client_type} client")
            print(f"Model: {client.get_model_name()}")
        except Exception as e:
            print(f"Failed to create {client_type} client: {e}")

async def main():
    """Main function to run all tests"""
    print("AI Client System Test")
    print("=" * 50)
    
    # Test OpenAI client (if API key is available)
    if os.getenv("OPENAI_API_KEY"):
        await test_openai_client()
    else:
        print("OPENAI_API_KEY not found, skipping OpenAI tests")
    
    # Test Gemini client (if API key is available)
    if os.getenv("GEMINI_API_KEY"):
        await test_gemini_client()
    else:
        print("GEMINI_API_KEY not found, skipping Gemini tests")
    
    # Test client manager
    await test_client_manager()

if __name__ == "__main__":
    asyncio.run(main())
