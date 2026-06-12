import { db } from './src/db/client';
import { sql, eq } from 'drizzle-orm';
import { employees, profiles, branches } from './src/db/schema';

async function run() {
  const rawRows = await db
    .select({
      employeeId: employees.id,
      userId: profiles.id,
      firstName: employees.first_name,
      lastName: employees.last_name,
      email: employees.email,
      role: employees.designation,
      branchId: employees.branch_id,
      branchName: branches.name,
    })
    .from(employees)
    .leftJoin(profiles, eq(employees.id, profiles.employee_id))
    .leftJoin(branches, eq(employees.branch_id, branches.id))
    .where(eq(employees.status, 'active'))
    .orderBy(employees.first_name);

  console.log('Result length:', rawRows.length);
  console.log(rawRows);
  process.exit(0);
}
run();
