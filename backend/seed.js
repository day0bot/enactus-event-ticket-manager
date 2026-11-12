import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import User from './models/UserModel.js';
import EventModel from './models/EventModel.js';
import Booking from './models/BookingModel.js';
import Ticket from './models/TicketModel.js';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB Atlas. Seeding database for Enactus Event Ticket Manager...');

    // Clear existing collections to ensure fresh, clean data
    await Booking.deleteMany({});
    await Ticket.deleteMany({});
    await EventModel.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing users, events, and bookings.');

    // Passwords for demo accounts
    const hashedPasswordAdmin = await bcrypt.hash('AdminPassword123!', 10);
    const hashedPasswordOrganizer = await bcrypt.hash('OrganizerPassword123!', 10);
    const hashedPasswordUser = await bcrypt.hash('UserPassword123!', 10);

    // 1. Seed Users
    const users = await User.insertMany([
      {
        name: 'Enactus System Admin',
        email: 'admin@enactus.org',
        password: hashedPasswordAdmin,
        role: 'System Admin',
        profilePicture: null,
      },
      {
        name: 'Enactus Project Lead',
        email: 'organizer@enactus.org',
        password: hashedPasswordOrganizer,
        role: 'Organizer',
        profilePicture: null,
      },
      {
        name: 'Sarah Chen (National Events Lead)',
        email: 'sarah.chen@enactus.org',
        password: hashedPasswordOrganizer,
        role: 'Organizer',
        profilePicture: null,
      },
      {
        name: 'Alex Johnson',
        email: 'alex.johnson@enactus.org',
        password: hashedPasswordUser,
        role: 'Standard User',
        profilePicture: null,
      },
      {
        name: 'Maya Patel',
        email: 'maya.patel@enactus.org',
        password: hashedPasswordUser,
        role: 'Standard User',
        profilePicture: null,
      },
    ]);

    const adminUser = users[0];
    const organizer1 = users[1];
    const organizer2 = users[2];
    const standardUser1 = users[3];
    const standardUser2 = users[4];

    console.log(`Created ${users.length} users with roles (Admin, Organizers, Standard Users).`);

    // 2. Seed Events
    const events = await EventModel.insertMany([
      {
        title: 'Enactus National Exposition 2026',
        description: 'The premier social entrepreneurship competition where student teams present high-impact projects that transform lives and foster sustainable business solutions.',
        date: new Date('2026-11-20T09:00:00Z'),
        location: 'Grand Convention Center, Main Auditorium',
        category: 'Competition',
        status: 'approved',
        ticketPricing: 25,
        totalTickets: 300,
        remainingTickets: 240,
        organizer: organizer1._id,
      },
      {
        title: 'Social Innovation Hackathon: Tech for Good',
        description: 'A 48-hour collaborative hackathon addressing community sustainability, zero-waste logistics, and renewable energy empowerment.',
        date: new Date('2026-11-28T10:00:00Z'),
        location: 'Innovation Hub, Tech Park',
        category: 'Hackathon',
        status: 'approved',
        ticketPricing: 15,
        totalTickets: 150,
        remainingTickets: 110,
        organizer: organizer1._id,
      },
      {
        title: 'Enactus World Cup Preparatory Camp',
        description: 'Intensive pitching masterclass, business model validation, and impact metrics boot camp for national finalist teams.',
        date: new Date('2026-12-05T13:00:00Z'),
        location: 'Business School Executive Hall',
        category: 'Workshop',
        status: 'approved',
        ticketPricing: 0,
        totalTickets: 100,
        remainingTickets: 75,
        organizer: organizer2._id,
      },
      {
        title: 'Sustainable Business & Circular Economy Workshop',
        description: 'Interactive session exploring circular business strategies, ESG compliance, and eco-friendly consumer product commercialization.',
        date: new Date('2026-12-12T14:30:00Z'),
        location: 'Green Science Center, Lecture Hall B',
        category: 'Workshop',
        status: 'approved',
        ticketPricing: 10,
        totalTickets: 80,
        remainingTickets: 65,
        organizer: organizer2._id,
      },
      {
        title: 'Leadership & Pitching Masterclass',
        description: 'Executive presence, storytelling for impact, and investor negotiation skills workshop for upcoming Enactus team leaders.',
        date: new Date('2026-12-18T11:00:00Z'),
        location: 'Student Union Conference Suite',
        category: 'Training',
        status: 'approved',
        ticketPricing: 12,
        totalTickets: 60,
        remainingTickets: 48,
        organizer: organizer1._id,
      },
      {
        title: 'Regional Entrepreneurship Summit 2027',
        description: 'Upcoming cross-university summit connecting collegiate founders with venture mentors and sustainability angel investors.',
        date: new Date('2027-01-15T09:30:00Z'),
        location: 'Metropolitan Expo Center',
        category: 'Conference',
        status: 'pending', // Pending approval for Admin to review and test approval workflow
        ticketPricing: 30,
        totalTickets: 200,
        remainingTickets: 200,
        organizer: organizer2._id,
      },
    ]);

    console.log(`Created ${events.length} Enactus events.`);

    // 3. Seed Sample Bookings
    const bookings = await Booking.insertMany([
      {
        numberOfTicketsBooked: 2,
        totalPrice: 50,
        status: 'confirmed',
        timestamp: new Date('2026-11-10T14:20:00Z'),
        user: standardUser1._id,
        event: events[0]._id, // National Exposition
      },
      {
        numberOfTicketsBooked: 1,
        totalPrice: 15,
        status: 'confirmed',
        timestamp: new Date('2026-11-11T16:45:00Z'),
        user: standardUser1._id,
        event: events[1]._id, // Hackathon
      },
      {
        numberOfTicketsBooked: 1,
        totalPrice: 25,
        status: 'confirmed',
        timestamp: new Date('2026-11-12T08:15:00Z'),
        user: standardUser2._id,
        event: events[0]._id, // National Exposition
      },
      {
        numberOfTicketsBooked: 2,
        totalPrice: 20,
        status: 'confirmed',
        timestamp: new Date('2026-11-12T11:30:00Z'),
        user: standardUser2._id,
        event: events[3]._id, // Sustainable Business
      },
    ]);

    console.log(`Created ${bookings.length} sample bookings for analytics and ticket management.`);

    // 4. Seed Generated Tickets
    const tickets = await Ticket.insertMany([
      {
        ticketCode: 'ENACTUS-EXP-001',
        event: events[0]._id,
        recipientName: 'Alex Johnson',
        recipientEmail: 'alex.johnson@enactus.org',
        ticketType: 'Delegate',
        status: 'Valid',
        issuedBy: organizer1._id,
      },
      {
        ticketCode: 'ENACTUS-EXP-002',
        event: events[0]._id,
        recipientName: 'Maya Patel',
        recipientEmail: 'maya.patel@enactus.org',
        ticketType: 'VIP',
        status: 'Valid',
        issuedBy: organizer1._id,
      },
      {
        ticketCode: 'ENACTUS-HACK-010',
        event: events[1]._id,
        recipientName: 'Lucas Dubois',
        recipientEmail: 'lucas.d@enactus.org',
        ticketType: 'General Admission',
        status: 'Valid',
        issuedBy: organizer1._id,
      },
      {
        ticketCode: 'ENACTUS-CAMP-025',
        event: events[2]._id,
        recipientName: 'Team Tunisia National Finalist',
        recipientEmail: 'team.tunisia@enactus.org',
        ticketType: 'Speaker',
        status: 'Valid',
        issuedBy: organizer2._id,
      },
    ]);
    console.log(`Created ${tickets.length} sample generated tickets.`);
    console.log('\n--- SEEDING COMPLETED SUCCESSFULLY ---');
    console.log('You can now log in with the following accounts:');
    console.log('1. System Admin:');
    console.log('   Email:    admin@enactus.org');
    console.log('   Password: AdminPassword123!');
    console.log('2. Organizer:');
    console.log('   Email:    organizer@enactus.org');
    console.log('   Password: OrganizerPassword123!');
    console.log('3. Standard User:');
    console.log('   Email:    alex.johnson@enactus.org');
    console.log('   Password: UserPassword123!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
