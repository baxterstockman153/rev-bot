import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function seed() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);
  console.log('Schema applied.');

  const hash = await bcrypt.hash('nrg-admin-2026', 12);
  await pool.query(
    `INSERT INTO admin_users (email, name, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    ['admin@getnrg.com', 'Admin', hash]
  );
  console.log('Admin user seeded: admin@getnrg.com / nrg-admin-2026');

  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
