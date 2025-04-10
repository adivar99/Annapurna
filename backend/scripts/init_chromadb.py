import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
import os
from dotenv import load_dotenv

load_dotenv()

def init_chromadb():
    # Create the data directory if it doesn't exist
    os.makedirs("data/chroma", exist_ok=True)
    
    # Initialize ChromaDB client
    client = chromadb.Client(Settings(
        persist_directory="data/chroma",
        anonymized_telemetry=False
    ))
    
    # Create or get the recipe collection
    openai_ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key=os.getenv("OPENAI_API_KEY"),
        model_name="text-embedding-3-small"
    )
    
    collection = client.get_or_create_collection(
        name="recipes",
        embedding_function=openai_ef,
        metadata={"hnsw:space": "cosine"}
    )
    
    # Test the collection
    test_documents = ["This is a test document"]
    test_metadatas = [{"test": "metadata"}]
    test_ids = ["test1"]
    
    collection.add(
        documents=test_documents,
        metadatas=test_metadatas,
        ids=test_ids
    )
    
    # Query the collection
    results = collection.query(
        query_texts=["test"],
        n_results=1
    )
    
    print("ChromaDB initialized successfully!")
    print("Test query results:", results)
    
    return client

if __name__ == "__main__":
    init_chromadb() 