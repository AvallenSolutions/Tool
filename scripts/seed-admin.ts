import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Script to create or update admin users in the database
 * Run with: npx tsx scripts/seed-admin.ts
 */

const ADMIN_USERS = [
  {
    id: "dev-user",
    email: "demo@avallen.com",
    firstName: "Demo",
    lastName: "Admin",
    role: "admin"
  },
  // Add more admin users as needed
];

async function seedAdminUsers() {
  console.log("🔧 Seeding admin users...");

  for (const adminUser of ADMIN_USERS) {
    try {
      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, adminUser.id))
        .limit(1);

      if (existingUser) {
        // Update existing user to admin
        await db
          .update(users)
          .set({ 
            role: "admin",
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            email: adminUser.email,
            updatedAt: new Date()
          })
          .where(eq(users.id, adminUser.id));
        
        console.log(`✅ Updated existing user ${adminUser.email} to admin role`);
      } else {
        // Create new admin user
        await db
          .insert(users)
          .values({
            id: adminUser.id,
            email: adminUser.email,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            role: "admin",
            createdAt: new Date(),
            updatedAt: new Date()
          });
        
        console.log(`✅ Created new admin user ${adminUser.email}`);
      }
    } catch (error) {
      console.error(`❌ Error processing user ${adminUser.email}:`, error);
    }
  }

  console.log("🎉 Admin user seeding completed!");
}

// Run the seeding
seedAdminUsers()
  .then(() => {
    console.log("Admin seeding finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Admin seeding failed:", error);
    process.exit(1);
  });