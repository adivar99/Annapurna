# Advanced Search Page Design Document

## Overview
The advanced search page is a page that will enable users to search for recipes in the DB or through the Spoonacular API. We will first query the users, and if we don't find anything promising, we look at results from the Spoonacular API. We will use openAI's agents to utilize the information in chromaDB and in the Spoonacular API to find the best results. This will also converse with the user to understand their preferences and find the best results. 

## Functional Requirements
 - We need a way to search through all recipes in the database
 - We need to search through recipes in spoonacular API
 - It should also be able to filter the recipes once they are listed. 
 - We should be able to filter by Cuisine, Difficulty, Tags, Prep Time, Cook Time, Servings
 - If the user is not happy with the results, we should keep searching for additional results from both sources.
 - The inputs for the search would be natural language, handling queries like "I'm thinking of making pasta. the long ones" or very specific queries like "Recipe for Penne Agli e Olio"
 - We should be able to switch between text chat and voice chat.
 - Either chat should still show thumbnails in the conversation of which recipes are being considered.
 - Recipes should keep allergies, dietary preferences, etc. in mind when searching.

## Non-Functional Requirements
 - The search should be fast and responsive. [performance]
 - 