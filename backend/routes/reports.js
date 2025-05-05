const express = require('express');
const router = express.Router();
const db = require('../database');
const Joi = require('joi');
const authMiddleware = require('../middleware/auth');

// Validation schema
const reportSchema = Joi.object({
  bookingId: Joi.number().required(),
  userId: Joi.number().required(),
  incidentType: Joi.string().required(),
  details: Joi.string().required()
});

// Get all reports (admin only)
router.get('/', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(db.reports);
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create report
router.post('/', authMiddleware, (req, res) => {
  try {
    // Validate input
    const { error } = reportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { bookingId, userId, incidentType, details } = req.body;
    
    // Check booking exists
    const booking = db.bookings.find(b => b.id === bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check user exists
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create report
    const report = {
      id: db.getNextId('reports'),
      bookingId,
      userId,
      incidentType,
      details,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    db.reports.push(report);
    res.status(201).json(report);

  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update report status (admin only)
router.patch('/:id/status', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const report = db.reports.find(r => r.id === parseInt(id));
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = status;
    res.json(report);

  } catch (err) {
    console.error('Update report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;