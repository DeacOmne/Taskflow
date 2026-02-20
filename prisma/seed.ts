import { PrismaClient, TaskStatus, Priority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const passwordHash = await bcrypt.hash("password123", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@taskflow.app" },
    update: {},
    create: {
      email: "demo@taskflow.app",
      name: "Demo User",
      passwordHash,
      timezone: "America/Los_Angeles",
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create projects
  const project1 = await prisma.project.upsert({
    where: { id: "project-demo-1" },
    update: {},
    create: {
      id: "project-demo-1",
      userId: user.id,
      name: "Website Redesign",
      description: "Full redesign of the company website with new branding",
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: "project-demo-2" },
    update: {},
    create: {
      id: "project-demo-2",
      userId: user.id,
      name: "Mobile App MVP",
      description: "Build the first version of the mobile app",
    },
  });

  console.log(`Created projects: ${project1.name}, ${project2.name}`);

  // Create tasks for project 1
  const tasks1 = [
    {
      title: "Audit current site and gather feedback",
      status: TaskStatus.DONE,
      priority: Priority.P1,
      dueDate: new Date("2024-01-15"),
      completedAt: new Date("2024-01-14"),
    },
    {
      title: "Create new wireframes for homepage",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.P0,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    },
    {
      title: "Design system — colors, typography, spacing",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.P1,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Write new copy for About page",
      status: TaskStatus.BACKLOG,
      priority: Priority.P2,
      dueDate: null,
    },
    {
      title: "Set up staging environment",
      status: TaskStatus.BLOCKED,
      priority: Priority.P0,
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue
      description: "Blocked on DevOps access. Need credentials from IT.",
    },
  ];

  for (const taskData of tasks1) {
    await prisma.task.create({
      data: {
        userId: user.id,
        projectId: project1.id,
        ...taskData,
      },
    });
  }

  // Create tasks for project 2
  const tasks2 = [
    {
      title: "Define MVP feature set",
      status: TaskStatus.DONE,
      priority: Priority.P0,
      completedAt: new Date("2024-01-10"),
      dueDate: new Date("2024-01-10"),
    },
    {
      title: "Set up React Native project",
      status: TaskStatus.DONE,
      priority: Priority.P1,
      completedAt: new Date("2024-01-12"),
      dueDate: new Date("2024-01-12"),
    },
    {
      title: "Implement user authentication",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.P0,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      description: "Using Auth0 for mobile OAuth flows",
    },
    {
      title: "Build home feed screen",
      status: TaskStatus.BACKLOG,
      priority: Priority.P1,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Push notification setup",
      status: TaskStatus.BACKLOG,
      priority: Priority.P2,
      dueDate: null,
    },
  ];

  for (const taskData of tasks2) {
    await prisma.task.create({
      data: {
        userId: user.id,
        projectId: project2.id,
        ...taskData,
      },
    });
  }

  console.log(`Created ${tasks1.length + tasks2.length} tasks`);

  // Create default email schedule
  await prisma.emailSchedule.upsert({
    where: { id: "schedule-demo-1" },
    update: {},
    create: {
      id: "schedule-demo-1",
      userId: user.id,
      enabled: true,
      cadence: "DAILY",
      timeOfDay: "08:00",
      timezone: "America/Los_Angeles",
      includeProjectIds: [],
      outstandingStatuses: ["BACKLOG", "IN_PROGRESS", "BLOCKED"],
    },
  });

  console.log("Created default email schedule");
  console.log("\nSeed complete!");
  console.log("\nDemo credentials:");
  console.log("  Email: demo@taskflow.app");
  console.log("  Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
