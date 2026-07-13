import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'password123';

async function upsertUser(email: string, firstName: string, lastName: string, role: 'super_admin' | 'admin' | 'applicant') {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
      firstName,
      lastName,
      role: role as any,
      emailVerified: true
    }
  });
}

async function main() {
  const superAdmin = await upsertUser('superadmin@example.com', 'Super', 'Admin', 'super_admin');
  const admin = await upsertUser('admin@example.com', 'John', 'Admin', 'admin');
  const student = await upsertUser('applicant@example.com', 'Jane', 'Applicant', 'applicant');

  const program = await prisma.scholarshipProgram.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Merit Scholarship 2024-2025',
      description: 'For outstanding academic performers',
      sponsor: 'Department of Education',
      benefits: 'Full tuition + Php 10,000/month',
      numberOfSlots: 50,
      maxApplicants: 500,
      eligibilityRequirements: 'GPA >= 3.0',
      openingDate: new Date('2024-06-01'),
      closingDate: new Date('2026-12-31'),
      academicYear: '2024-2025',
      status: 'active',
      createdBy: admin.id
    }
  });

  console.log('Seeded users:', { superAdmin: superAdmin.email, admin: admin.email, student: student.email });
  console.log('Seeded scholarship program:', program.name);
  console.log(`All demo accounts use password: ${DEMO_PASSWORD}`);

  // The scholarship program above uses an explicit id so re-running the
  // seed is idempotent, but that bypasses Postgres's serial sequence —
  // resync it so the next real INSERT doesn't collide with id 1.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('scholarship_programs', 'id'), COALESCE((SELECT MAX(id) FROM scholarship_programs), 1))`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
