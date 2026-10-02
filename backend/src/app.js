const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());


const authRoutes = require('./routes/auth.routes');
const eventRoutes = require('./routes/event.routes');
const bookingRoutes = require('./routes/booking.routes');
const { errorHandler } = require('./middleware/error.middleware');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);


app.use(errorHandler);

module.exports = app;
