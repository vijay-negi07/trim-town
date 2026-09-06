import 'dotenv/config';
import { PrismaClient, AvailabilityStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TrimTown database...');

  // ─── ADMIN USER ──────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { phone: '+919999999999' },
    update: {},
    create: {
      phone: '+919999999999',
      name: 'TrimTown Admin',
      email: 'admin@trimtown.in',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created');

  // ─── SALONS ──────────────────────────────────────────────────────────────────
  const salonData = [
    {
      name: 'Raja Barber Shop',
      description: 'Traditional barbershop with 20+ years of experience. Specializes in classic cuts and beard grooming.',
      ownerName: 'Raja Kumar',
      phone: '+919876543210',
      address: 'Shop 12, Bhotiya Parao Market',
      area: 'Bhotiya Parao',
      lat: 29.2183,
      lng: 79.5130,
      openTime: '08:00',
      closeTime: '20:00',
      workingDays: [1, 2, 3, 4, 5, 6],
    },
    {
      name: 'Gents Galaxy Salon',
      description: 'Modern mens grooming salon with trained stylists. Hair, beard and skincare services.',
      ownerName: 'Gagan Sharma',
      phone: '+919876543211',
      address: 'Near Bus Stand, Rampur Road',
      area: 'Rampur Road',
      lat: 29.2201,
      lng: 79.5180,
      openTime: '09:00',
      closeTime: '21:00',
      workingDays: [1, 2, 3, 4, 5, 6, 0],
    },
    {
      name: 'Modern Look Studio',
      description: 'Premium unisex salon offering latest hairstyles, coloring and grooming packages.',
      ownerName: 'Mohan Verma',
      phone: '+919876543212',
      address: '3rd Floor, Mall Road Complex',
      area: 'Mall Road',
      lat: 29.2165,
      lng: 79.5095,
      openTime: '10:00',
      closeTime: '21:00',
      workingDays: [1, 2, 3, 4, 5, 6, 0],
    },
    {
      name: 'Smart Cuts',
      description: 'Quick service barbershop. In and out in under 20 minutes. No frills, great cuts.',
      ownerName: 'Suresh Jat',
      phone: '+919876543213',
      address: 'Opposite GGIC, Kathgodam Road',
      area: 'Kathgodam Road',
      lat: 29.2150,
      lng: 79.5210,
      openTime: '08:30',
      closeTime: '19:30',
      workingDays: [1, 2, 3, 4, 5, 6],
    },
    {
      name: 'Shahi Saloon',
      description: 'Family-run traditional salon. Trusted by three generations of Haldwani families.',
      ownerName: 'Shahid Raza',
      phone: '+919876543214',
      address: 'Haldwani Chowk, Near Clock Tower',
      area: 'Haldwani Chowk',
      lat: 29.2195,
      lng: 79.5155,
      openTime: '09:00',
      closeTime: '20:00',
      workingDays: [1, 2, 3, 4, 5, 6],
    },
  ];

  for (const sd of salonData) {
    const barberUser = await prisma.user.upsert({
      where: { phone: sd.phone },
      update: {},
      create: { phone: sd.phone, name: sd.ownerName, role: 'BARBER' },
    });

    const salon = await prisma.salon.upsert({
      where: { id: sd.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: sd.name.toLowerCase().replace(/\s+/g, '-'),
        ...sd,
        city: 'Haldwani',
        state: 'Uttarakhand',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    const barber = await prisma.barber.upsert({
      where: { userId: barberUser.id },
      update: {},
      create: {
        userId: barberUser.id,
        salonId: salon.id,
        name: sd.ownerName,
        experience: Math.floor(Math.random() * 15) + 2,
        specialties: ['Haircut', 'Beard trim', 'Head massage'],
        bio: `Expert barber at ${sd.name} with years of experience.`,
      },
    });

    // Services
    await prisma.service.createMany({
      data: [
        { barberId: barber.id, name: 'Haircut', price: 60, durationMins: 20 },
        { barberId: barber.id, name: 'Beard trim', price: 30, durationMins: 10 },
        { barberId: barber.id, name: 'Hair + Beard combo', price: 80, durationMins: 30 },
        { barberId: barber.id, name: 'Head massage', price: 50, durationMins: 15 },
        { barberId: barber.id, name: 'Shave', price: 40, durationMins: 15 },
        { barberId: barber.id, name: 'Hair wash', price: 30, durationMins: 10 },
      ],
      skipDuplicates: true,
    });

    // Availability
    const statuses: AvailabilityStatus[] = ['AVAILABLE', 'BUSY', 'AVAILABLE', 'BUSY', 'CLOSED'];
    const queueCounts = [0, 2, 0, 3, 0];
    const idx = salonData.indexOf(sd);

    await prisma.availability.upsert({
      where: { barberId: barber.id },
      update: {},
      create: {
        barberId: barber.id,
        status: statuses[idx],
        queueCount: queueCounts[idx],
        maxQueueSize: 8,
      },
    });

    console.log(`✅ ${sd.name} seeded`);
  }

  // ─── SAMPLE CUSTOMERS ────────────────────────────────────────────────────────
  const customerData = [
    { phone: '+919800000001', name: 'Rahul Sharma' },
    { phone: '+919800000002', name: 'Amit Singh' },
    { phone: '+919800000003', name: 'Priya Joshi' },
    { phone: '+919800000004', name: 'Deepak Mehra' },
    { phone: '+919800000005', name: 'Sunita Bisht' },
  ];

  for (const cd of customerData) {
    await prisma.user.upsert({
      where: { phone: cd.phone },
      update: {},
      create: { ...cd, role: 'CUSTOMER' },
    });
  }
  console.log('✅ Sample customers seeded');

  console.log('\n🎉 Seed complete! TrimTown is ready.');
  console.log('Admin phone: +919999999999');
  console.log('Test customer: +919800000001');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
