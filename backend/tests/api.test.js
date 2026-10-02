const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const bcrypt = require('bcryptjs');

let user1Token, user2Token;
let eventId;

beforeAll(async () => {
  
  await prisma.bookingSeat.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  
  const user1 = await prisma.user.create({
    data: { email: 'user1@test.com', passwordHash: await bcrypt.hash('password123', 10) }
  });
  const user2 = await prisma.user.create({
    data: { email: 'user2@test.com', passwordHash: await bcrypt.hash('password123', 10) }
  });

  
  const event = await prisma.event.create({
    data: {
      name: 'Test Event',
      date: new Date(),
      time: '10:00 AM',
      location: 'Test Location',
      description: 'Test Description'
    }
  });
  eventId = event.id;

  const seatsData = [];
  for (let i = 1; i <= 100; i++) {
    seatsData.push({ eventId, seatNumber: `S${i}`, status: 'AVAILABLE' });
  }
  await prisma.seat.createMany({ data: seatsData });

  
  const res1 = await request(app).post('/api/auth/login').send({ email: 'user1@test.com', password: 'password123' });
  user1Token = res1.body.token;

  const res2 = await request(app).post('/api/auth/login').send({ email: 'user2@test.com', password: 'password123' });
  user2Token = res2.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('API Tests', () => {
  
  test('User Registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'newuser@test.com', password: 'password123' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('Invalid Login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.com', password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });

  test('Event Retrieval', async () => {
    const res = await request(app).get(`/api/events/${eventId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.event.id).toBe(eventId);
  });

  test('Seat Retrieval', async () => {
    const res = await request(app).get(`/api/events/${eventId}/seats`);
    expect(res.statusCode).toBe(200);
    expect(res.body.seats.length).toBe(100);
  });

  test('Unauthorized booking', async () => {
    const seats = await prisma.seat.findMany({ where: { eventId }, take: 1 });
    const res = await request(app)
      .post('/api/bookings')
      .send({ eventId, seatIds: [seats[0].id] });
    expect(res.statusCode).toBe(401);
  });

  test('Successful booking', async () => {
    const seats = await prisma.seat.findMany({ where: { eventId, status: 'AVAILABLE' }, take: 2 });
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ eventId, seatIds: [seats[0].id, seats[1].id] });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

    const checkSeats = await prisma.seat.findMany({ where: { id: { in: [seats[0].id, seats[1].id] } } });
    expect(checkSeats[0].status).toBe('BOOKED');
  });

  test('Booking unavailable seat', async () => {
    const bookedSeat = await prisma.seat.findFirst({ where: { status: 'BOOKED' } });
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ eventId, seatIds: [bookedSeat.id] });
    
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('SEAT_ALREADY_BOOKED');
  });

  test('User can retrieve own booking', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.bookings.length).toBeGreaterThan(0);
    
    const bookingId = res.body.bookings[0].id;
    const singleRes = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(singleRes.statusCode).toBe(200);
    expect(singleRes.body.booking.id).toBe(bookingId);
  });

  test('User cannot retrieve another user\'s booking', async () => {
    const user1Bookings = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`);
    const bookingId = user1Bookings.body.bookings[0].id;

    const res = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    
    expect(res.statusCode).toBe(403);
  });

  test('User can cancel own booking and seats become available', async () => {
    const user1Bookings = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`);
    const booking = user1Bookings.body.bookings[0];
    const seatId = booking.bookingSeats[0].seatId;

    const cancelRes = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.success).toBe(true);

    const seat = await prisma.seat.findUnique({ where: { id: seatId } });
    expect(seat.status).toBe('AVAILABLE');
  });

  test('Concurrency: Prevent double booking of the same seat', async () => {
    const seat = await prisma.seat.findFirst({ where: { eventId, status: 'AVAILABLE' } });
    
    
    const req1 = request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ eventId, seatIds: [seat.id] });
      
    const req2 = request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ eventId, seatIds: [seat.id] });

    const [res1, res2] = await Promise.all([req1, req2]);
    
    const statuses = [res1.statusCode, res2.statusCode];
    expect(statuses).toContain(201); 
    expect(statuses).toContain(409); 
    
    const dbSeat = await prisma.seat.findUnique({ where: { id: seat.id } });
    expect(dbSeat.status).toBe('BOOKED');
    
    const activeBookingsForSeat = await prisma.bookingSeat.findMany({ 
      where: { 
        seatId: seat.id,
        booking: { status: 'ACTIVE' }
      } 
    });
    
    expect(activeBookingsForSeat.length).toBe(1);
  });
  test('Cancelled booking cannot be cancelled again', async () => {
    const user1Bookings = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`);
    const booking = user1Bookings.body.bookings.find(b => b.status === 'CANCELLED');
    
    const cancelRes = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(cancelRes.statusCode).toBe(400);
    expect(cancelRes.body.error).toBe('ALREADY_CANCELLED');
  });

  test('User cannot cancel another user\'s booking', async () => {
    const seat = await prisma.seat.findFirst({ where: { eventId, status: 'AVAILABLE' } });
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ eventId, seatIds: [seat.id] });
    
    const bookingId = createRes.body.booking.id;

    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(cancelRes.statusCode).toBe(403);
  });

  test('Cancelled seats can be booked by another user', async () => {
    const seatToBook = await prisma.seat.findFirst({ where: { eventId, status: 'AVAILABLE' } });
    
    
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ eventId, seatIds: [seatToBook.id] });
      
    const bookingId = createRes.body.booking.id;

    
    await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${user1Token}`);

    
    const createRes2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ eventId, seatIds: [seatToBook.id] });
    
    expect(createRes2.statusCode).toBe(201);
  });

  test('Invalid seat rejected', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ eventId, seatIds: [999999] });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('INVALID_SEATS');
  });

  test('Duplicate seat IDs rejected', async () => {
    const seat = await prisma.seat.findFirst({ where: { eventId, status: 'AVAILABLE' } });
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ eventId, seatIds: [seat.id, seat.id] });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Duplicate seat IDs are not allowed');
  });

  test('Multi-seat booking is atomic (partial failure)', async () => {
    const availableSeats = await prisma.seat.findMany({ where: { eventId, status: 'AVAILABLE' }, take: 2 });
    const bookedSeat = await prisma.seat.findFirst({ where: { eventId, status: 'BOOKED' } });
    
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ eventId, seatIds: [availableSeats[0].id, availableSeats[1].id, bookedSeat.id] });
    
    expect(res.statusCode).toBe(409);
    
    const checkSeats = await prisma.seat.findMany({ where: { id: { in: [availableSeats[0].id, availableSeats[1].id] } } });
    expect(checkSeats[0].status).toBe('AVAILABLE');
    expect(checkSeats[1].status).toBe('AVAILABLE');
  });
});
