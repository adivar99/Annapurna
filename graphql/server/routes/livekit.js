const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const { authenticateToken } = require('./auth/shared/jwt');
const router = express.Router();

/**
 * Generate LiveKit access token for a patient
 * POST /api/livekit/token
 * Body: { roomName: string }
 */
router.post('/token', authenticateToken, async (req, res) => {
  try {
    const { roomName } = req.body;
    const userId = req.user.id;
    const userName = req.user.name || `user-${userId}`;

    if (!roomName) {
      return res.status(400).json({ 
        success: false, 
        error: 'roomName is required' 
      });
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
    });

    // Grant permissions
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Set token expiration (1 hour)
    at.ttl = '1h';

    const token = await at.toJwt();
    
    console.log('🎫 [LiveKit] Token generated:', {
      userId,
      userName,
      roomName,
      tokenLength: token.length,
      apiKey: apiKey.substring(0, 10) + '...',
    });

    res.json({
      success: true,
      token,
      roomName,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate LiveKit token',
      message: error.message,
    });
  }
});

module.exports = router;

