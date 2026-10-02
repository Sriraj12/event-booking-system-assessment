const express = require('express');
const { createBooking, getMyBookings, getBooking, cancelBooking } = require('../controllers/booking.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createBooking);
router.get('/', getMyBookings);
router.get('/:bookingId', getBooking);
router.post('/:bookingId/cancel', cancelBooking);

module.exports = router;
