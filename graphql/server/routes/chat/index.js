const express = require('express');
const Resolvers = require('../auth/resolvers');
const { authenticateToken } = require('../auth/shared/jwt');

const router = express.Router();

// GET /api/v1/chat/sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await Resolvers.getUserChatSessions(req.user.id);
    res.json(sessions);
  } catch (error) {
    console.error('Get chat sessions error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch chat sessions' });
  }
});

// GET /api/v1/chat/sessions/:id
router.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Resolvers.getChatSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Get chat session by id error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch chat session' });
  }
});

// GET /api/v1/chat/recipe?recipe_id=...
router.get('/recipe', authenticateToken, async (req, res) => {
  try {
    const recipeId = req.query.recipe_id || req.query.recipeId;
    if (!recipeId) {
      return res.status(400).json({ message: 'recipe_id parameter is required' });
    }

    const session = await Resolvers.getChatSessionByRecipe(req.user.id, recipeId);
    res.json(session);
  } catch (error) {
    console.error('Get chat session by recipe error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch chat session' });
  }
});

// POST /api/v1/chat/sessions
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { recipe_id, recipeId } = req.body;
    const targetRecipeId = recipe_id || recipeId || null;

    const session = await Resolvers.createChatSession(req.user.id, targetRecipeId);
    res.status(201).json({ session_id: session.id, ...session });
  } catch (error) {
    console.error('Create chat session error:', error);
    res.status(500).json({ message: error.message || 'Failed to create chat session' });
  }
});

// POST /api/v1/chat/sessions/:id/messages
router.post('/sessions/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { message, text, sender } = req.body;
    const messageText = message || text;
    const messageSender = sender || 'user';

    if (!messageText) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const created = await Resolvers.addChatMessage(req.params.id, messageSender, messageText);
    res.status(201).json(created);
  } catch (error) {
    console.error('Add chat message error:', error);
    res.status(500).json({ message: error.message || 'Failed to add chat message' });
  }
});

// DELETE /api/v1/chat/sessions/:id
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    await Resolvers.deleteChatSession(req.params.id);
    res.json({ success: true, message: 'Chat session deleted' });
  } catch (error) {
    console.error('Delete chat session error:', error);
    res.status(500).json({ message: error.message || 'Failed to delete chat session' });
  }
});

module.exports = router;
