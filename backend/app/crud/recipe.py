from models import Recipe, RecipeCreate, RecipeUpdate

def create_recipe(db, recipe: RecipeCreate):
    return db["recipe"].create(recipe)

def get_recipe(db, id: str):
    return db["recipe"].find_one(Recipe, {"id": id})

def update_recipe(db, id: str, recipe: RecipeUpdate):
    return db["recipe"].update(Recipe, {"id": id}, recipe)

def delete_recipe(db, id: str):
    return db["recipe"].delete(Recipe, {"id": id})
