const prisma = require('../utils/prisma');

const getEvents = async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: 'asc' }
    });
    res.json({ success: true, events });
  } catch (error) {
    next(error);
  }
};

const getEvent = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID', error: 'INVALID_INPUT' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found', error: 'NOT_FOUND' });
    }

    res.json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

const getEventSeats = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID', error: 'INVALID_INPUT' });
    }

    const seats = await prisma.seat.findMany({
      where: { eventId }
    });

    seats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' }));

    res.json({ success: true, seats });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEvents, getEvent, getEventSeats };
