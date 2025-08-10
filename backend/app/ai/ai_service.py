import os
from dotenv import load_dotenv
from typing import List, Dict, Optional

from models.recipe import Recipe
from models.user import User
from ai.clients import ClientManager, ChatMessage

load_dotenv()

class RecipeAIService:
    def __init__(self):
        self.system_prompt = """You are a helpful cooking assistant. You have access to a database of recipes and can help users with:
        1. Finding recipes based on ingredients or preferences
        2. Explaining cooking techniques
        3. Suggesting recipe modifications
        4. Answering cooking-related questions
        Be friendly, informative, and precise in your responses."""

        # Initialize the AI client using the new client system
        self.client_manager = ClientManager()
        self.ai_client = self.client_manager.get_client()

    async def chat(self, message: str, context: str = None):
        messages = [
            ChatMessage(role="system", content=self.system_prompt)
        ]

        if context:
            messages.append(ChatMessage(role="system", content=f"Context: {context}"))

        messages.append(ChatMessage(role="user", content=message))

        response = await self.ai_client.chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )

        return response.content

    