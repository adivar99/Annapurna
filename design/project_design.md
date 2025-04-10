# Project Design

## Objectives
1. Store different recipes
    - filter recipes based on cuisine, ingredients, tags(veg, nonveg, dairy)
2. Walk the user through the recipe
    - list the ingredients needed for recipe
    - what ingredients have to be cut, chopped, baked, etc. beforehand.
    - give steps of when to add what ingredient
3. Answer any other questions that might be relevant to cooking of the recipe

## Technologies
1. DB should be NoSQL, because the ingredients are going to be large json files. Mongo most likely
2. Frontend will be node with Angular, obviously
3. Backend will be python both for APIs and interacting with ChatGPT API.
4. 