const prisma = require('../utils/prisma');
const z = require('zod');

const createBookingSchema = z.object({
  eventId: z.number().int().positive(),
  seatIds: z.array(z.number().int().positive()).min(1)
});

const createBooking = async (req, res, next) => {
  try {
    const { eventId, seatIds } = createBookingSchema.parse(req.body);
    const userId = req.user.id;

    const uniqueSeatIds = new Set(seatIds);
    if (uniqueSeatIds.size !== seatIds.length) {
      return res.status(400).json({ success: false, message: 'Duplicate seat IDs are not allowed', error: 'INVALID_INPUT' });
    }
    const uniqueSeatIdArr = [...uniqueSeatIds];

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found', error: 'INVALID_EVENT' });
    }

    try {
      const booking = await prisma.$transaction(async (tx) => {
        const seats = await tx.seat.findMany({
          where: {
            id: { in: uniqueSeatIdArr },
            eventId: eventId
          }
        });

        if (seats.length !== uniqueSeatIdArr.length) {
          throw new Error('INVALID_SEATS');
        }

        const updatedSeats = await tx.seat.updateMany({
          where: {
            id: { in: uniqueSeatIdArr },
            status: 'AVAILABLE'
          },
          data: { status: 'BOOKED' }
        });

        if (updatedSeats.count !== uniqueSeatIdArr.length) {
          throw new Error('SEAT_ALREADY_BOOKED');
        }

        const newBooking = await tx.booking.create({
          data: {
            userId,
            eventId,
            status: 'ACTIVE'
          }
        });

        const bookingSeatsData = seats.map(seat => ({
          bookingId: newBooking.id,
          seatId: seat.id,
          seatNumber: seat.seatNumber
        }));

        await tx.bookingSeat.createMany({
          data: bookingSeatsData
        });

        return newBooking;
      });

      res.status(201).json({ success: true, booking });
    } catch (err) {
      if (err.message === 'INVALID_SEATS') {
        return res.status(400).json({ success: false, message: 'One or more seats are invalid or do not belong to the event', error: 'INVALID_SEATS' });
      }
      if (err.message === 'SEAT_ALREADY_BOOKED' || err.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'One or more selected seats are already booked.', error: 'SEAT_ALREADY_BOOKED' });
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        event: true,
        bookingSeats: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, bookings });
  } catch (error) {
    next(error);
  }
};

const getBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const bookingId = parseInt(req.params.bookingId, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID', error: 'INVALID_INPUT' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        bookingSeats: true
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found', error: 'NOT_FOUND' });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden', error: 'FORBIDDEN' });
    }

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const bookingId = parseInt(req.params.bookingId, 10);

    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID', error: 'INVALID_INPUT' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { bookingSeats: true }
        });

        if (!booking) {
          throw new Error('NOT_FOUND');
        }

        if (booking.userId !== userId) {
          throw new Error('FORBIDDEN');
        }

        if (booking.status === 'CANCELLED') {
          throw new Error('ALREADY_CANCELLED');
        }

        const seatIds = booking.bookingSeats.map(bs => bs.seatId);

        const updatedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date()
          }
        });

        await tx.seat.updateMany({
          where: { id: { in: seatIds } },
          data: { status: 'AVAILABLE' }
        });

        return updatedBooking;
      });

      res.json({ success: true, message: 'Booking cancelled successfully', booking: result });
    } catch (err) {
      if (err.message === 'NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'Booking not found', error: 'NOT_FOUND' });
      }
      if (err.message === 'FORBIDDEN') {
        return res.status(403).json({ success: false, message: 'Forbidden', error: 'FORBIDDEN' });
      }
      if (err.message === 'ALREADY_CANCELLED') {
        return res.status(400).json({ success: false, message: 'Booking is already cancelled', error: 'ALREADY_CANCELLED' });
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getMyBookings, getBooking, cancelBooking };
