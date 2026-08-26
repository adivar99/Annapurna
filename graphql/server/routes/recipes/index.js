const express = require('express');
const Resolvers = require('../auth/resolvers');
const { authenticateToken } = require('../auth/shared/jwt');

const router = express.Router();

function formatRecipe(r) {
  if (!r) return null;
  return {
    ...r,
    imageUrl: r.image_url || r.imageUrl,
    instructions: r.instructions || r.steps || []
  };
}

// GET /api/v1/recipes/ or /api/recipes/
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.skip) || parseInt(req.query.offset) || 0;
    const query = req.query.query || req.query.search;

    let recipes = [];
    if (query) {
      recipes = await Resolvers.searchRecipes(query, limit, offset);
    } else {
      recipes = await Resolvers.getAllRecipes(limit, offset);
    }

    res.json(recipes.map(formatRecipe));
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch recipes' });
  }
});

// GET /api/v1/recipes/latest
router.get('/latest', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const recipes = await Resolvers.getAllRecipes(limit, 0);
    res.json(recipes.map(formatRecipe));
  } catch (error) {
    console.error('Get latest recipes error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch latest recipes' });
  }
});

// GET /api/v1/recipes/:id
router.get('/:id', async (req, res) => {
  try {
    const recipe = await Resolvers.getRecipeById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.json(formatRecipe(recipe));
  } catch (error) {
    console.error('Get recipe by id error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch recipe' });
  }
});

// POST /api/v1/recipes/
router.post('/', authenticateToken, async (req, res) => {
  try {
    const body = req.body;
    const recipeData = {
      title: body.title,
      description: body.description || '',
      ingredients: body.ingredients || [],
      instructions: body.instructions || body.steps || [],
      prep_time: parseInt(body.prep_time) || 0,
      cook_time: parseInt(body.cook_time) || 0,
      servings: parseInt(body.servings) || 1,
      difficulty: (body.difficulty || 'easy').toLowerCase(),
      cuisine: (body.cuisine || 'other').toLowerCase(),
      tags: body.tags || [],
      image_url: body.imageUrl || body.image_url || '',
      author_id: req.user.id
    };

    const created = await Resolvers.createRecipe(recipeData);
    res.status(201).json(formatRecipe(created));
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(500).json({ message: error.message || 'Failed to create recipe' });
  }
});

// PUT /api/v1/recipes/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const body = req.body;
    const recipeData = {
      title: body.title,
      description: body.description,
      ingredients: body.ingredients,
      instructions: body.instructions || body.steps,
      prep_time: parseInt(body.prep_time) || undefined,
      cook_time: parseInt(body.cook_time) || undefined,
      servings: parseInt(body.servings) || undefined,
      difficulty: body.difficulty ? body.difficulty.toLowerCase() : undefined,
      cuisine: body.cuisine ? body.cuisine.toLowerCase() : undefined,
      tags: body.tags,
      image_url: body.imageUrl || body.image_url
    };

    // Remove undefined keys
    Object.keys(recipeData).forEach(k => recipeData[k] === undefined && delete recipeData[k]);

    const updated = await Resolvers.updateRecipe(req.params.id, recipeData);
    res.json(formatRecipe(updated));
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ message: error.message || 'Failed to update recipe' });
  }
});

// DELETE /api/v1/recipes/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await Resolvers.deleteRecipe(req.params.id);
    res.json({ success: true, message: 'Recipe deleted' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ message: error.message || 'Failed to delete recipe' });
  }
});

module.exports = router;
