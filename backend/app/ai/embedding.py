import os
from dotenv import load_dotenv
from typing import List, Dict, Optional

from langchain_mongodb.vectorstores import MongoDBAtlasVectorSearch
from langchain_openai.embeddings import OpenAIEmbeddings
from langchain_google_genai.embeddings import GoogleGenerativeAIEmbeddings

from models.recipe import Recipe

# Import the new client system
from .clients import ClientManager

RECIPE_VECTOR_INDEX = "recipe_vector_index"

load_dotenv()

class EmbeddingService:
    def __init__(self):
        # Initialize the AI client using the new client system
        self.client_manager = ClientManager()
        self.ai_client = self.client_manager.get_client()
        self.__embedding_function = self.ai_client.get_embedding_function()
        print(f"Embedding function: {self.__embedding_function}")

    def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding using the configured AI embedding function"""
        return self.__embedding_function.embed_query(query, output_dimensionality=1536)
    
    def __get_vector_search(self) -> MongoDBAtlasVectorSearch:
        """
        Get the vector search pipeline for MongoDB
        ref: https://www.mongodb.com/developer/products/atlas/leveraging-mongodb-atlas-vector-search-langchain/
        """
        MONGO_USER = os.getenv("MONGO_USER")
        MONGO_PASSWORD = os.getenv("MONGO_PASSWORD")
        MONGO_CLUSTER = os.getenv("MONGO_CLUSTER")
        MONGO_URI = f"mongodb+srv://{MONGO_USER}:{MONGO_PASSWORD}@{MONGO_CLUSTER}"

        DB_NAME = os.getenv("DB_NAME", "annapurna")
        COLLECTION_NAME = "recipe"

        return MongoDBAtlasVectorSearch.from_connection_string(
            MONGO_URI,
            f"{DB_NAME}.{COLLECTION_NAME}",
            self.__embedding_function,
            index_name=RECIPE_VECTOR_INDEX,
        )
    
    def __query_db_embeddings(
        self,
        query: str,
        limit: int = 5,
        filters: Optional[Dict] = None
    ):
        """
        Accepts a text query, generates an embedding for it, and performs
        a vector search to find the most similar recipes.
        """
        query_vector = self.generate_query_embedding(query)
        # 1. Get the instance of the vector search pipeline
        vector_search = self.__get_vector_search()
        # 2. Execute the aggregation pipeline
        return (
            vector_search
            # .max_marginal_relevance_search_by_vector(query_vector, k=limit)
            .similarity_search(query, k=limit)
        )
        
    def find_recipe_by_semantic_search(self, query: str, limit: int = 5) -> List[Recipe]:
        """Find recipes by semantic search"""
        return self.__query_db_embeddings(query, limit)
    
    
    