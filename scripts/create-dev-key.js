const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

async function run() {
  const prisma = new PrismaClient();
  const rawKey = 'jk_' + crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  
  try {
    const key = await prisma.apiKey.create({
      data: {
        name: 'Dev Local Key',
        keyHash: keyHash,
        keyPrefix: rawKey.substring(0, 11),
        scopes: 'read,write',
        isActive: true
      }
    });
    console.log('--- SUCCESS ---');
    console.log('API_KEY_ID:', key.id);
    console.log('YOUR_NEW_API_KEY:', rawKey);
    console.log('--- COPY THE KEY ABOVE ---');
  } catch (error) {
    console.error('Error creating API key:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
