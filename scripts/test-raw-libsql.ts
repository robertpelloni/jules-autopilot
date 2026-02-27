import { createClient } from '@libsql/client';

async function main() {
    console.log('Testing raw LibSQL Vector support...');
    try {
        const libsql = createClient({
            url: 'file:./prisma/dev.db'
        });
        const result = await libsql.execute(`SELECT vector('[1.0, 2.0]') as vec`);
        console.log('✅ Result:', result);
    } catch (e) {
        console.error('❌ Error:', e);
    }
}

main();
