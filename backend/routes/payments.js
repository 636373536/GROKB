const express = require('express');
const router = express.Router();
const db = require('../database');
const Joi = require('joi');
const authMiddleware = require('../middleware/auth');

// Validation schema
const paymentSchema = Joi.object({
  bookingId: Joi.number().required(),
  amount: Joi.number().min(0).required(),
  method: Joi.string().required(),
  transactionId: Joi.string().required()
});

// Process payment
router.post('/', authMiddleware, (req, res) => {
  try {
    // Validate input
    const { error } = paymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { bookingId, amount, method, transactionId } = req.body;
    
    // Check booking exists
    const booking = db.bookings.find(b => b.id === bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check payment amount
    if (amount < booking.amount) {
      return res.status(400).json({ error: 'Payment amount is less than required' });
    }

    // Create payment
    const payment = {
      id: db.getNextId('payments'),
      bookingId,
      amount,
      method,
      transactionId,
      status: 'completed',
      date: new Date().toISOString()
    };

    db.payments.push(payment);
    booking.paymentStatus = 'paid';
    booking.paymentDate = payment.date;

    res.status(201).json(payment);

  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;