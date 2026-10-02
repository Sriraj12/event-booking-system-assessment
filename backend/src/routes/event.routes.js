const express = require('express');
const { getEvents, getEvent, getEventSeats } = require('../controllers/event.controller');

const router = express.Router();

router.get('/', getEvents);
router.get('/:eventId', getEvent);
router.get('/:eventId/seats', getEventSeats);

module.exports = router;
