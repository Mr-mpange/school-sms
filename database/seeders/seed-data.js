'use strict';

const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Import models
const db = require('../database/models');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create default admin if it doesn't exist
    const existingAdmin = await db.Admin.findOne({
      where: { email: 'admin@school.com' }
    });

    let admin;
    if (!existingAdmin) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash('password123', saltRounds);

      admin = await db.Admin.create({
        id: crypto.randomUUID(),
        email: 'admin@school.com',
        password_hash: passwordHash,
        full_name: 'School Administrator',
        school_name: 'Demo School'
      });
      console.log('✅ Created default admin');
    } else {
      admin = existingAdmin;
    }

    // Generate sample parents
    const parents = [];
    const parentCount = 50;

    for (let i = 0; i < parentCount; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const phoneNumber = faker.phone.number('+1-###-###-####');

      parents.push({
        id: crypto.randomUUID(),
        admin_id: admin.id,
        name: `${firstName} ${lastName}`,
        phone: phoneNumber,
        email: faker.internet.email({ firstName, lastName }),
        student_name: faker.person.firstName(),
        grade: faker.helpers.arrayElement(['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']),
        relationship: faker.helpers.arrayElement(['parent', 'guardian', 'parent']),
        is_active: faker.datatype.boolean({ probability: 0.9 }),
        notes: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : null
      });
    }

    // Bulk insert parents
    await db.Parent.bulkCreate(parents, {
      ignoreDuplicates: true
    });
    console.log(`✅ Created ${parentCount} sample parents`);

    // Generate sample messages
    const messages = [];
    const messageCount = 200;

    for (let i = 0; i < messageCount; i++) {
      const createdAt = faker.date.recent({ days: 30 }); // Last 30 days
      const status = faker.helpers.arrayElement(['sent', 'delivered', 'failed', 'scheduled']);
      const messageType = faker.helpers.arrayElement(['individual', 'bulk', 'individual']);

      let sentAt = null;
      let deliveredAt = null;
      let scheduledAt = null;
      let sentCount = 0;
      let failedCount = 0;

      if (status === 'sent' || status === 'delivered') {
        sentAt = faker.date.between({ from: createdAt, to: new Date() });
        sentCount = 1;

        if (status === 'delivered') {
          deliveredAt = faker.date.between({ from: sentAt, to: new Date() });
        }
      } else if (status === 'failed') {
        sentAt = faker.date.between({ from: createdAt, to: new Date() });
        failedCount = 1;
      } else if (status === 'scheduled') {
        scheduledAt = faker.date.soon({ days: 7 });
      }

      messages.push({
        id: crypto.randomUUID(),
        admin_id: admin.id,
        parent_id: faker.helpers.arrayElement(parents).id,
        recipient: faker.phone.number('+1-###-###-####'),
        message: faker.lorem.sentence({ min: 10, max: 20 }),
        status,
        scheduled_at: scheduledAt,
        sent_at: sentAt,
        delivered_at: deliveredAt,
        sent_count: sentCount,
        failed_count: failedCount,
        message_type: messageType,
        priority: faker.helpers.arrayElement(['low', 'normal', 'normal', 'high']),
        provider: faker.helpers.arrayElement(['twilio', 'nexmo', 'aws-sns', null]),
        provider_message_id: faker.datatype.boolean({ probability: 0.8 }) ? faker.string.alphanumeric(20) : null,
        error_message: status === 'failed' ? faker.lorem.sentence() : null,
        retry_count: status === 'failed' ? faker.number.int({ min: 0, max: 3 }) : 0,
        created_at: createdAt,
        updated_at: createdAt
      });
    }

    // Bulk insert messages
    await db.Message.bulkCreate(messages, {
      ignoreDuplicates: true
    });
    console.log(`✅ Created ${messageCount} sample messages`);

    // Create some scheduled messages for the future
    const scheduledMessages = [];
    for (let i = 0; i < 12; i++) {
      scheduledMessages.push({
        id: crypto.randomUUID(),
        admin_id: admin.id,
        parent_id: faker.helpers.arrayElement(parents).id,
        recipient: faker.phone.number('+1-###-###-####'),
        message: faker.lorem.sentence({ min: 10, max: 20 }),
        status: 'scheduled',
        scheduled_at: faker.date.soon({ days: 7 }),
        sent_count: 0,
        failed_count: 0,
        message_type: 'individual',
        priority: 'normal',
        retry_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    await db.Message.bulkCreate(scheduledMessages, {
      ignoreDuplicates: true
    });
    console.log(`✅ Created ${scheduledMessages.length} scheduled messages`);

    console.log('🎉 Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - 1 Admin user`);
    console.log(`   - ${parentCount} Parents`);
    console.log(`   - ${messageCount + scheduledMessages.length} Messages`);
    console.log(`   - ${scheduledMessages.length} Scheduled messages`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
