import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Redirect to first project or projects list
  const firstProject = await prisma.project.findFirst({
    where: { userId: session.user.id, archived: false },
    orderBy: { createdAt: "asc" },
  });

  if (firstProject) {
    redirect(`/projects/${firstProject.id}`);
  } else {
    redirect("/projects");
  }
}
