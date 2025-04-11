from openai import OpenAI
import os
from dotenv import load_dotenv
from typing import List, Dict, Optional
from models.recipe import Recipe
from models.user import User
import numpy as np
from scipy.spatial.distance import cosine
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class RecipeAIService:
    def __init__(self):
        self.system_prompt = """You are a helpful cooking assistant. You have access to a database of recipes and can help users with:
        1. Finding recipes based on ingredients or preferences
        2. Explaining cooking techniques
        3. Suggesting recipe modifications
        4. Answering cooking-related questions
        Be friendly, informative, and precise in your responses."""
        
        # Initialize ChromaDB
        self.chroma_client = chromadb.Client(Settings(
            persist_directory="data/chroma",
            anonymized_telemetry=False
        ))
        
        # Create or get the recipe collection
        self.openai_ef = embedding_functions.OpenAIEmbeddingFunction(
            api_key=os.getenv("OPENAI_API_KEY"),
            model_name="text-embedding-3-small"
        )
        
        self.recipe_collection = self.chroma_client.get_or_create_collection(
            name="recipes",
            embedding_function=self.openai_ef,
            metadata={"hnsw:space": "cosine"}
        )

    async def chat(self, message: str, context: str = None):
        messages = [
            {"role": "system", "content": self.system_prompt}
        ]
        
        if context:
            messages.append({"role": "system", "content": f"Context: {context}"})
            
        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )

        return response.choices[0].message.content

    async def generate_recipe_suggestions(self, ingredients: list, preferences: dict = None):
        prompt = f"""Based on these ingredients: {', '.join(ingredients)}"""
        if preferences:
            prompt += f""" and preferences: {preferences}"""
        prompt += """, suggest a recipe. Include:
        1. Recipe name
        2. List of ingredients with quantities
        3. Step-by-step instructions
        4. Estimated cooking time
        5. Difficulty level"""

        return await self.chat(prompt)

    async def analyze_recipe(self, recipe: Recipe) -> Dict[str, str]:
        """Analyze a recipe and provide detailed insights"""
        prompt = f"""Analyze this recipe and provide insights:
        Title: {recipe.title}
        Description: {recipe.description}
        Ingredients: {[f"{i.name} ({i.quantity} {i.unit})" for i in recipe.ingredients]}
        Instructions: {recipe.instructions}
        
        Please provide:
        1. Nutritional highlights
        2. Key cooking techniques used
        3. Potential substitutions for common allergens
        4. Tips for success
        5. Common mistakes to avoid"""

        analysis = await self.chat(prompt)
        return {
            "analysis": analysis,
            "recipe_id": str(recipe.id)
        }

    async def personalize_recipe(self, recipe: Recipe, user: User, dietary_restrictions: List[str] = None) -> Dict[str, str]:
        """Personalize a recipe for a specific user"""
        prompt = f"""Personalize this recipe for a user with the following preferences:
        Recipe: {recipe.title}
        Original Ingredients: {[f"{i.name} ({i.quantity} {i.unit})" for i in recipe.ingredients]}
        Original Instructions: {recipe.instructions}
        
        User Preferences:
        - Username: {user.username}
        - Dietary Restrictions: {dietary_restrictions if dietary_restrictions else 'None specified'}
        
        Please provide:
        1. Modified recipe with substitutions
        2. Alternative cooking methods if needed
        3. Tips specific to the user's preferences
        4. Portion adjustments if necessary"""

        personalized = await self.chat(prompt)
        return {
            "personalized_recipe": personalized,
            "recipe_id": str(recipe.id),
            "user_id": str(user.id)
        }

    async def generate_shopping_list(self, recipe: Recipe, servings: Optional[int] = None) -> Dict[str, str]:
        """Generate a detailed shopping list for a recipe"""
        prompt = f"""Create a detailed shopping list for this recipe:
        Recipe: {recipe.title}
        Original Servings: {recipe.servings}
        Requested Servings: {servings if servings else recipe.servings}
        Ingredients: {[f"{i.name} ({i.quantity} {i.unit})" for i in recipe.ingredients]}
        
        Please provide:
        1. Scaled ingredient quantities
        2. Organized by grocery store sections
        3. Notes on ingredient quality
        4. Alternative brands or options
        5. Estimated cost range"""

        shopping_list = await self.chat(prompt)
        return {
            "shopping_list": shopping_list,
            "recipe_id": str(recipe.id),
            "servings": servings if servings else recipe.servings
        }

    async def suggest_recipe_modifications(self, recipe: Recipe, modification_type: str) -> Dict[str, str]:
        """Suggest modifications to a recipe based on specific criteria"""
        prompt = f"""Suggest modifications for this recipe:
        Recipe: {recipe.title}
        Modification Type: {modification_type}
        Original Recipe: {recipe.description}
        Ingredients: {[f"{i.name} ({i.quantity} {i.unit})" for i in recipe.ingredients]}
        Instructions: {recipe.instructions}
        
        Please provide:
        1. Specific modifications based on the requested type
        2. Alternative ingredients or techniques
        3. Impact on cooking time and difficulty
        4. Tips for successful modification"""

        modifications = await self.chat(prompt)
        return {
            "modifications": modifications,
            "recipe_id": str(recipe.id),
            "modification_type": modification_type
        }

    async def generate_recipe_timeline(self, recipe: Recipe) -> Dict[str, str]:
        """Generate a detailed cooking timeline for a recipe"""
        prompt = f"""Create a detailed cooking timeline for this recipe:
        Recipe: {recipe.title}
        Prep Time: {recipe.prep_time} minutes
        Cook Time: {recipe.cook_time} minutes
        Instructions: {recipe.instructions}
        
        Please provide:
        1. Minute-by-minute breakdown
        2. Parallel tasks that can be done
        3. Critical timing points
        4. Make-ahead suggestions
        5. Last-minute tasks"""

        timeline = await self.chat(prompt)
        return {
            "timeline": timeline,
            "recipe_id": str(recipe.id)
        }

    async def analyze_user_preferences(self, user: User, saved_recipes: List[Recipe]) -> Dict[str, str]:
        """Analyze a user's recipe preferences based on their saved recipes"""
        prompt = f"""Analyze this user's cooking preferences:
        Username: {user.username}
        Saved Recipes: {[r.title for r in saved_recipes]}
        
        Please provide:
        1. Identified cooking style preferences
        2. Common ingredients used
        3. Preferred difficulty levels
        4. Suggested recipe categories to explore
        5. Personalized cooking tips"""

        analysis = await self.chat(prompt)
        return {
            "preference_analysis": analysis,
            "user_id": str(user.id)
        }

    async def generate_recipe_embedding(self, recipe: Recipe) -> List[float]:
        """Generate embedding for a recipe"""
        recipe_text = f"""
        Title: {recipe.title}
        Description: {recipe.description}
        Ingredients: {[f"{i.name} ({i.quantity} {i.unit})" for i in recipe.ingredients]}
        Instructions: {recipe.instructions}
        Cuisine: {recipe.cuisine}
        Tags: {recipe.tags}
        Difficulty: {recipe.difficulty}
        """
        
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=recipe_text
        )
        
        return response.data[0].embedding

    async def update_recipe_embedding(self, recipe: Recipe) -> Recipe:
        """Update the embedding for a recipe in both MongoDB and ChromaDB"""
        # Generate embedding
        embedding = await self.generate_recipe_embedding(recipe)
        recipe.embedding = embedding
        
        # Update MongoDB
        await recipe.save()
        
        # Update ChromaDB
        metadata = {
            "title": recipe.title,
            "cuisine": recipe.cuisine,
            "difficulty": recipe.difficulty,
            "prep_time": recipe.prep_time,
            "cook_time": recipe.cook_time,
            "servings": recipe.servings,
            "tags": ', '.join(recipe.tags)
        }
        
        self.recipe_collection.upsert(
            ids=[str(recipe.id)],
            embeddings=[embedding],
            metadatas=[metadata],
            documents=[recipe.description or ""]
        )
        
        return recipe

    async def find_similar_recipes(self, recipe: Recipe, limit: int = 5, filters: Optional[Dict] = None) -> List[Recipe]:
        """Find similar recipes based on embeddings using ChromaDB"""
        if not recipe.embedding:
            recipe = await self.update_recipe_embedding(recipe)
        
        # Query ChromaDB
        results = self.recipe_collection.query(
            query_embeddings=[recipe.embedding],
            n_results=limit + 1,  # +1 to exclude the recipe itself
            where=filters
        )
        
        # Get recipe IDs from results
        recipe_ids = [id for id in results['ids'][0] if id != str(recipe.id)][:limit]
        
        # Fetch recipes from MongoDB
        recipes = []
        for recipe_id in recipe_ids:
            recipe = await Recipe.get(recipe_id)
            if recipe:
                recipes.append(recipe)
        
        return recipes

    async def find_recipes_by_semantic_search(self, query: str, limit: int = 5, filters: Optional[Dict] = None) -> List[Recipe]:
        """Find recipes using semantic search with ChromaDB"""
        # Query ChromaDB
        results = self.recipe_collection.query(
            query_texts=[query],
            n_results=limit,
            where=filters
        )
        
        # Get recipe IDs from results
        recipe_ids = results['ids'][0]
        
        # Fetch recipes from MongoDB
        recipes = []
        for recipe_id in recipe_ids:
            recipe = await Recipe.get(recipe_id)
            if recipe:
                recipes.append(recipe)
        
        return recipes

    async def find_recipes_by_ingredients_semantic(self, ingredients: List[str], limit: int = 5, filters: Optional[Dict] = None) -> List[Recipe]:
        """Find recipes using semantic search on ingredients with ChromaDB"""
        ingredients_text = ", ".join(ingredients)
        
        # Query ChromaDB
        results = self.recipe_collection.query(
            query_texts=[ingredients_text],
            n_results=limit,
            where=filters
        )
        
        # Get recipe IDs from results
        recipe_ids = results['ids'][0]
        
        # Fetch recipes from MongoDB
        recipes = []
        for recipe_id in recipe_ids:
            recipe = await Recipe.get(recipe_id)
            if recipe:
                recipes.append(recipe)
        
        return recipes

    async def find_recipes_by_filters(self, filters: Dict, limit: int = 5) -> List[Recipe]:
        """Find recipes using metadata filters in ChromaDB"""
        results = self.recipe_collection.query(
            n_results=limit,
            where=filters
        )
        
        # Get recipe IDs from results
        recipe_ids = results['ids'][0]
        
        # Fetch recipes from MongoDB
        recipes = []
        for recipe_id in recipe_ids:
            recipe = await Recipe.get(recipe_id)
            if recipe:
                recipes.append(recipe)
        
        return recipes
    
    