import os
from dotenv import load_dotenv
from typing import List, Dict, Optional

from langchain_mongodb.vectorstores import MongoDBAtlasVectorSearch
from langchain_openai.embeddings import OpenAIEmbeddings

from models.recipe import Recipe

# Import the new client system
from .clients import ClientManager

load_dotenv()

class EmbeddingService:
    def __init__(self):
        # Initialize the AI client using the new client system
        self.client_manager = ClientManager()
        self.ai_client = self.client_manager.get_client()

        # Create or get the recipe collection
        # Note: For now, we'll still use OpenAI embedding function for ChromaDB compatibility
        # In the future, this could be made more flexible to support different embedding providers
        self.__embedding_function = OpenAIEmbeddings(
            api_key=os.getenv("OPENAI_API_KEY"),
            model="text-embedding-ada-002"
        )

    def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding using the configured AI embedding function"""
        return self.__embedding_function.embed_query(query)
    
    def __get_vector_search(self) -> MongoDBAtlasVectorSearch:
        """
        Get the vector search pipeline for MongoDB
        """
        ATLAS_CONNECTION_STRING = os.getenv("MONGO_URI")
        DB_NAME = os.getenv("DB_NAME", "annapurna")
        COLLECTION_NAME = "recipes"
        return MongoDBAtlasVectorSearch.from_connection_string(
            ATLAS_CONNECTION_STRING,
            f"{DB_NAME}.{COLLECTION_NAME}",
            OpenAIEmbeddings(),
            index_name="default"
        )
    
    async def __query_db_embeddings(
        self,
        query: str,
        limit: int = 5,
        filters: Optional[Dict] = None
    ) -> List[Recipe]:
        """
        Accepts a text query, generates an embedding for it, and performs
        a vector search to find the most similar recipes.
        """
        # 1. Generate an embedding for the user's search query
        query_vector = await self.generate_query_embedding(query)

        # 2. Perform a vector search using the embedding
        vector_search = self.__get_vector_search()

        # 3. Execute the aggregation pipeline
        results = await (
            vector_search
            .as_retriever()
            .get_relevant_documents(query_vector, k=limit)
        )
        
        return results
    
    async def find_recipe_by_semantic_search(self, query: str, limit: int = 5) -> List[Recipe]:
        """Find recipes by semantic search"""
        return await self.__query_db_embeddings(query, limit)
    
    
    