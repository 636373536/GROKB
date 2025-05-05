const express = require('express');
const router = express.Router();
const db = require('../database');
const Joi = require('joi');
const authMiddleware = require('../middleware/auth');

// Validation schema
const teamSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().required(),
  location: Joi.string().required(),
  price: Joi.number().min(0).required(),
  leader: Joi.string().required(),
  members: Joi.array().items(Joi.string()),
  description: Joi.string().required()
});

// Get all teams (public)
router.get('/', (req, res) => {
  try {
    res.json(db.teams);
  } catch (err) {
    console.error('Get teams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get team by ID (public)
router.get('/:id', (req, res) => {
  try {
    const team = db.teams.find(t => t.id === parseInt(req.params.id));
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(team);
  } catch (err) {
    console.error('Get team error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create team (admin only)
router.post('/', authMiddleware, (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate input
    const { error } = teamSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Create new team
    const newTeam = {
      id: db.getNextId('teams'),
      ...req.body,
      rating: req.body.rating || 3,
      bookingsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.teams.push(newTeam);
    res.status(201).json(newTeam);

  } catch (err) {
    console.error('Create team error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update team (admin only)
router.put('/:id', authMiddleware, (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate input
    const { error } = teamSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Find team
    const team = db.teams.find(t => t.id === parseInt(req.params.id));
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Update team
    Object.assign(team, {
      ...req.body,
      updatedAt: new Date().toISOString()
    });

    res.json(team);

  } catch (err) {
    console.error('Update team error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;