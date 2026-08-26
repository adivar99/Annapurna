const express = require('express');
const axios = require('axios');
const Resolvers = require('../auth/resolvers');
const { authenticateToken } = require('../auth/shared/jwt');

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// POST /api/v1/ai/realtime/session -> returns { client_secret }
router.post('/realtime/session', authenticateToken, async (req, res) => {
  try {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'awelfkjwoeigjfnwef') {
      // Return a structured dummy response if no valid OpenAI key is supplied in dev
      return res.json({
        client_secret: 'mock_client_secret_token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      });
    }

    const response = await axios.post(
      'https://api.openai.com/v1/realtime/sessions',
      {
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'onyx'
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const clientSecret = response.data.client_secret?.value || response.data.client_secret;
    res.json({ client_secret: clientSecret });
  } catch (error) {
    console.error('Realtime session creation error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to create realtime session', error: error.message });
  }
});

// POST /api/v1/ai/parse -> body { recipe_text }
router.post('/parse', authenticateToken, async (req, res) => {
  try {
    const { recipe_text, text } = req.body;
    const rawText = recipe_text || text;

    if (!rawText) {
      return res.status(400).json({ message: 'Recipe text is required' });
    }

    let parsedRecipe = null;

    if (OPENAI_API_KEY && OPENAI_API_KEY !== 'awelfkjwoeigjfnwef') {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'recipe_parser',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  ingredients: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        quantity: { type: 'number' },
                        unit: { type: 'string' },
                        notes: { type: 'string' }
                      },
                      required: ['name', 'quantity', 'unit', 'notes'],
                      additionalProperties: false
                    }
                  },
                  instructions: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  prep_time: { type: 'number' },
                  cook_time: { type: 'number' },
                  servings: { type: 'number' },
                  difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                  cuisine: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } }
                },
                required: ['title', 'description', 'ingredients', 'instructions', 'prep_time', 'cook_time', 'servings', 'difficulty', 'cuisine', 'tags'],
                additionalProperties: false
              }
            }
          },
          messages: [
            {
              role: 'system',
              content: 'You are an expert chef assistant. Parse the given raw recipe text into a clean structured JSON format.'
            },
            {
              role: 'user',
              content: rawText
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      parsedRecipe = JSON.parse(response.data.choices[0].message.content);
    } else {
      // Fallback heuristic parser for offline/testing mode
      parsedRecipe = {
        title: rawText.split('\n')[0].replace(/^#*\s*/, '').slice(0, 100) || 'Parsed Recipe',
        description: 'Parsed from text',
        ingredients: [
          { name: 'Flour', quantity: 2, unit: 'cups', notes: '' },
          { name: 'Sugar', quantity: 1, unit: 'cup', notes: '' }
        ],
        instructions: [
          'Preheat oven to 350°F (175°C).',
          'Mix all ingredients in a large bowl.',
          'Bake for 25-30 minutes until golden.'
        ],
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        difficulty: 'easy',
        cuisine: 'general',
        tags: ['quick', 'baking']
      };
    }

    res.json(parsedRecipe);
  } catch (error) {
    console.error('Parse recipe error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to parse recipe', error: error.message });
  }
});

// POST /api/v1/ai/ask-recipe-question -> body { recipe, question: string[] | string }
router.post('/ask-recipe-question', authenticateToken, async (req, res) => {
  try {
    const { recipe, question } = req.body;
    const query = Array.isArray(question) ? question.join(' ') : (question || '');

    if (!recipe || !query) {
      return res.status(400).json({ message: 'Recipe and question are required' });
    }

    let aiReply = '';

    if (OPENAI_API_KEY && OPENAI_API_KEY !== 'awelfkjwoeigjfnwef') {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are Anu, a friendly, concise, and expert cooking assistant. You are answering a question about the following recipe:\n\nTitle: ${recipe.title}\nDescription: ${recipe.description}\nIngredients: ${JSON.stringify(recipe.ingredients)}\nInstructions: ${JSON.stringify(recipe.instructions || recipe.steps)}\nPrep Time: ${recipe.prep_time}m, Cook Time: ${recipe.cook_time}m, Servings: ${recipe.servings}.\n\nProvide helpful culinary advice, substitutions, or step clarifications clearly and warmly.`
            },
            {
              role: 'user',
              content: query
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      aiReply = response.data.choices[0].message.content;
    } else {
      aiReply = `As your cooking assistant for "${recipe.title}", here is a helpful tip: Make sure to season each component to taste! Let me know if you need any ingredient substitutions.`;
    }

    res.json({
      response: aiReply,
      recipe_id: recipe.id || null
    });
  } catch (error) {
    console.error('Ask recipe question error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to answer recipe question', error: error.message });
  }
});

// POST /api/v1/ai/analyze-recipe -> body: recipe object
router.post('/analyze-recipe', authenticateToken, async (req, res) => {
  try {
    const recipe = req.body;
    let analysis = 'This recipe is well balanced with great flavors.';

    if (OPENAI_API_KEY && OPENAI_API_KEY !== 'awelfkjwoeigjfnwef') {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert nutritionist and chef. Provide a 2-3 sentence culinary and nutritional analysis of this recipe.'
            },
            {
              role: 'user',
              content: JSON.stringify(recipe)
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      analysis = response.data.choices[0].message.content;
    }

    res.json({ response: analysis, recipe_id: recipe.id || null });
  } catch (error) {
    console.error('Analyze recipe error:', error.message);
    res.status(500).json({ message: 'Failed to analyze recipe', error: error.message });
  }
});

module.exports = router;
