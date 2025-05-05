const express = require('express');
const router = express.Router();
const db = require('../database');
const Joi = require('joi');
const authMiddleware = require('../middleware/auth');

// Validation schema
const messageSchema = Joi.object({
  userId: Joi.number().required(),
  content: Joi.string().required().max(500),
  to: Joi.string().required()
});

// Get messages for a user
router.get('/', authMiddleware, (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const messages = db.messages.filter(m => 
      m.userId === parseInt(userId) || m.to === userId
    );
    
    res.json(messages);

  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message
router.post('/', authMiddleware, (req, res) => {
  try {
    // Validate input
    const { error } = messageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { userId, content, to } = req.body;
    const user = db.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create message
    const message = {
      id: db.getNextId('messages'),
      userId,
      content,
      to,
      sender: user.role === 'admin' ? 'admin' : 'user',
      timestamp: new Date().toISOString(),
      status: 'delivered'
    };

    db.messages.push(message);
    res.status(201).json(message);

  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;