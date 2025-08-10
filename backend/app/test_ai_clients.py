#!/usr/bin/env python3
"""
Test script for the AI client system

This script tests the new abstract AI client system with both OpenAI and Gemini implementations.
Run this script to verify that the implementation works correctly.
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from ai.clients import ClientManager, ChatMessage, ClientEnum, OpenAIClient, GeminiClient

# Load environment variables
load_dotenv()

async def test_basic_functionality():
    """Test basic functionality of the client system"""
    print("=== Testing Basic Functionality ===")
    
    try:
        # Test ClientManager
        manager = ClientManager()
        print(f"Available clients: {manager.get_available_clients()}")
        
        # Get default client
        client = manager.get_client()
        print(f"Default client model: {client.get_model_name()}")
        
        # Test simple chat
        messages = [
            ChatMessage(role="system", content="You are a helpful assistant."),
            ChatMessage(role="user", content="Say hello in one sentence.")
        ]
        
        response = await client.chat_completion(messages, max_tokens=50)
        print(f"Chat response: {response.content}")
        print(f"Model used: {response.model}")
        
        return True
        
    except Exception as e:
        print(f"Basic functionality test failed: {e}")
        return False

async def test_openai_client():
    """Test OpenAI client specifically"""
    print("\n=== Testing OpenAI Client ===")
    
    if not os.getenv("OPENAI_API_KEY"):
        print("OPENAI_API_KEY not found, skipping OpenAI tests")
        return False
    
    try:
        # Set environment to use OpenAI
        os.environ["CLIENT"] = ClientEnum.OPENAI
        
        # Test through ClientManager
        manager = ClientManager()
        client = manager.get_client()
        
        print(f"OpenAI model: {client.get_model_name()}")
        
        # Test chat completion
        messages = [
            ChatMessage(role="system", content="You are a cooking assistant."),
            ChatMessage(role="user", content="What's a quick pasta recipe?")
        ]
        
        response = await client.chat_completion(messages, temperature=0.5, max_tokens=100)
        print(f"OpenAI chat response: {response.content[:100]}...")
        
        # Test embedding generation
        embedding = await client.generate_embedding("Test text for embedding")
        print(f"OpenAI embedding generated: {len(embedding)} dimensions")
        
        return True
        
    except Exception as e:
        print(f"OpenAI client test failed: {e}")
        return False

async def test_gemini_client():
    """Test Gemini client specifically"""
    print("\n=== Testing Gemini Client ===")
    
    if not os.getenv("GEMINI_API_KEY"):
        print("GEMINI_API_KEY not found, skipping Gemini tests")
        return False
    
    try:
        # Set environment to use Gemini
        os.environ["CLIENT"] = ClientEnum.GEMINI
        
        # Test through ClientManager
        manager = ClientManager()
        client = manager.get_client()
        
        print(f"Gemini model: {client.get_model_name()}")
        
        # Test chat completion
        messages = [
            ChatMessage(role="system", content="You are a cooking assistant."),
            ChatMessage(role="user", content="What's a quick pasta recipe?")
        ]
        
        response = await client.chat_completion(messages, temperature=0.5, max_tokens=100)
        print(f"Gemini chat response: {response.content[:100]}...")
        
        # Test embedding generation
        embedding = await client.generate_embedding("Test text for embedding")
        print(f"Gemini embedding generated: {len(embedding)} dimensions")
        
        return True
        
    except Exception as e:
        print(f"Gemini client test failed: {e}")
        print("Note: Make sure you have 'google-genai' installed, not 'google-generativeai'")
        return False

async def test_ai_service_integration():
    """Test integration with the existing AI service"""
    print("\n=== Testing AI Service Integration ===")
    
    try:
        from ai.ai_service import RecipeAIService
        
        # Create AI service (it should use the new client system)
        ai_service = RecipeAIService()
        
        # Test chat functionality
        response = await ai_service.chat("Hello, can you help me with cooking?")
        print(f"AI Service response: {response[:100]}...")
        
        return True
        
    except Exception as e:
        print(f"AI Service integration test failed: {e}")
        return False

async def main():
    """Main test function"""
    print("AI Client System Test Suite")
    print("=" * 50)
    
    test_results = []
    
    # Run all tests
    test_results.append(await test_basic_functionality())
    test_results.append(await test_openai_client())
    test_results.append(await test_gemini_client())
    test_results.append(await test_ai_service_integration())
    
    # Print summary
    print("\n" + "=" * 50)
    print("Test Summary:")
    print(f"Tests passed: {sum(test_results)}/{len(test_results)}")
    
    if all(test_results):
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed. Check the output above for details.")
        
    return all(test_results)

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
