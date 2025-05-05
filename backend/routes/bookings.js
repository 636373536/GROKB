const express = require('express');
const router = express.Router();
const db = require('../database');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const authMiddleware = require('../middleware/auth');

// Validation schema
const bookingSchema = Joi.object({
  teamId: Joi.number().required(),
  userId: Joi.number().required(),
  eventType: Joi.string().required(),
  date: Joi.date().min('now').required(),
  guests: Joi.number().min(1).required(),
  location: Joi.string().required()
});

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get user bookings
router.get('/', authMiddleware, (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const bookings = db.bookings.filter(b => b.userId === parseInt(userId));
    res.json(bookings);

  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Validate input
    const { error } = bookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { teamId, userId, eventType, date, guests, location } = req.body;

    // --- Debug log for token/userId mismatch ---
    if (req.user.id !== userId) {
      console.error('User ID mismatch:', { tokenUserId: req.user.id, bodyUserId: userId });
      return res.status(401).json({ error: 'Invalid token: user mismatch' });
    }

    // Check team exists
    const team = db.teams.find(t => t.id === teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check user exists
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create booking
    const booking = {
      id: db.getNextId('bookings'),
      teamId,
      userId,
      eventType,
      date,
      guests,
      location,
      amount: team.price,
      status: 'confirmed',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    db.bookings.push(booking);
    team.bookingsCount = (team.bookingsCount || 0) + 1;

    // Send confirmation email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Booking Confirmation',
        html: `
          <h2>Your Booking Details</h2>
          <p>Booking ID: ${booking.id}</p>
          <p>Team: ${team.name}</p>
          <p>Event Type: ${eventType}</p>
          <p>Date: ${new Date(date).toLocaleDateString()}</p>
          <p>Location: ${location}</p>
          <p>Guests: ${guests}</p>
          <p>Amount: K${team.price}</p>
        `
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    res.status(201).json(booking);

  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;