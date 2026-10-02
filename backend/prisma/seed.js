const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  
  const event = await prisma.event.create({
    data: {
      name: 'Tech Conference 2026',
      date: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), 
      time: '10:00 AM',
      location: 'Grand Convention Center',
      description: 'A premium coding assessment event with exactly 100 seats.',
    }
  });

  console.log(`Created event: ${event.name}`);

  
  const seatsData = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const seatsPerRow = 10;

  for (let r = 0; r < rows.length; r++) {
    for (let s = 1; s <= seatsPerRow; s++) {
      seatsData.push({
        eventId: event.id,
        seatNumber: `${rows[r]}${s}`,
        status: 'AVAILABLE'
      });
    }
  }

  await prisma.seat.createMany({
    data: seatsData
  });

  console.log(`Created exactly 100 seats for the event.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
