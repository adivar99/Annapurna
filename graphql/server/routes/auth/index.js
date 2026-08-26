const express = require('express');
const signupRouter = require('./signup');
const loginRouter = require('./login');
const { authenticateToken } = require('./shared/jwt');
const Resolvers = require('./resolvers');

const router = express.Router();

// Mount basic auth routes
router.use('/signup', signupRouter);
router.use('/login', loginRouter);
router.use('/register', signupRouter); // alias for register

// GET /api/auth/me or /api/v1/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await Resolvers.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const savedRecipeIds = await Resolvers.getUserSavedRecipeIds(req.user.id);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      imageUrl: user.image_url,
      created_at: user.created_at,
      updated_at: user.updated_at,
      saved_recipes: savedRecipeIds
    });
  } catch (error) {
    console.error('Get user me error:', error);
    res.status(500).json({ message: error.message || 'Failed to get user profile' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/v1/auth/me/save-recipe -> List of saved recipe IDs
router.get('/me/save-recipe', authenticateToken, async (req, res) => {
  try {
    const savedRecipeIds = await Resolvers.getUserSavedRecipeIds(req.user.id);
    res.json(savedRecipeIds);
  } catch (error) {
    console.error('Get saved recipe IDs error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch saved recipe IDs' });
  }
});

// GET /api/v1/auth/me/saved-recipes -> List of full saved Recipe objects
router.get('/me/saved-recipes', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.skip) || parseInt(req.query.offset) || 0;
    const recipes = await Resolvers.getUserSavedRecipes(req.user.id, limit, offset);

    // Format recipes for frontend consistency
    const formatted = recipes.map(r => ({
      ...r,
      imageUrl: r.image_url || r.imageUrl,
      isFavorite: true
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get saved recipes error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch saved recipes' });
  }
});

// POST /api/v1/auth/me/save-recipe/:recipeId
router.post('/me/save-recipe/:recipeId', authenticateToken, async (req, res) => {
  try {
    const recipeId = req.params.recipeId;
    const result = await Resolvers.saveRecipe(req.user.id, recipeId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Save recipe error:', error);
    res.status(500).json({ message: error.message || 'Failed to save recipe' });
  }
});

// DELETE /api/v1/auth/me/save-recipe/:recipeId
router.delete('/me/save-recipe/:recipeId', authenticateToken, async (req, res) => {
  try {
    const recipeId = req.params.recipeId;
    await Resolvers.unsaveRecipe(req.user.id, recipeId);
    res.json({ success: true, message: 'Recipe removed from favorites' });
  } catch (error) {
    console.error('Unsave recipe error:', error);
    res.status(500).json({ message: error.message || 'Failed to unsave recipe' });
  }
});

module.exports = router;
