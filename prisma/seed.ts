/* Demo data. Run with: npm run db:seed */
try {
  process.loadEnvFile(".env");
} catch {
  // Rely on variables already present in the environment (e.g. CI).
}

const PASSWORD = "password123";

async function main() {
  // Imported after env is loaded.
  const { hash } = await import("bcryptjs");
  const { db } = await import("../src/lib/db");
  const { randomId } = await import("../src/lib/crypto");
  const { createOrg, addMember } = await import("../src/server/org.service");
  const { createTemplate } = await import("../src/server/template.service");
  const { issueCredentials } = await import("../src/server/credential.service");

  if (await db.user.findUnique({ where: { email: "priya@demo.dev" } })) {
    console.log("Seed data already present — skipping.");
    return;
  }

  const passwordHash = await hash(PASSWORD, 12);
  const select = {
    id: true,
    handle: true,
    email: true,
    name: true,
    bio: true,
    emailVerifiedAt: true,
    profileVisibility: true,
  } as const;
  const mkUser = (name: string, email: string, bio?: string) =>
    db.user.create({
      data: { name, email, bio, passwordHash, handle: randomId(8), emailVerifiedAt: new Date() },
      select,
    });

  const priya = await mkUser("Priya Sharma", "priya@demo.dev");
  const ravi = await mkUser("Ravi Kumar", "ravi@demo.dev");
  const meera = await mkUser("Meera Iyer", "meera@demo.dev");
  const asha = await mkUser("Asha Rao", "asha@demo.dev", "Final-year CSE student. Loves distributed systems.");

  const institute = await createOrg(priya, {
    name: "Demo Institute of Technology",
    slug: "demo-institute",
    description: "A sample university used to demonstrate Credora.",
    website: "https://example.edu",
  });
  await db.organization.update({
    where: { id: institute.id },
    data: { domain: "example.edu", domainStatus: "VERIFIED", domainVerifiedAt: new Date() },
  });
  await createOrg(priya, { name: "Department of CSE", slug: "demo-cse", parentSlug: "demo-institute", website: null });
  await createOrg(priya, { name: "Coding Club", slug: "demo-coding-club", parentSlug: "demo-cse", website: null });
  const ravisMembership = await addMember(priya, "demo-coding-club", {
    identifier: ravi.email,
    roles: ["ISSUER", "SIGNATORY"],
    title: "Club President",
  });
  const priyaClub = await db.membership.findFirstOrThrow({ where: { userId: priya.id, org: { slug: "demo-coding-club" } } });
  await db.membership.update({ where: { id: priyaClub.id }, data: { title: "Faculty Advisor" } });

  const hackNight = await createTemplate(ravi, "demo-coding-club", {
    name: "Winner – HackNight 2026",
    type: "EVENT",
    description: "Awarded for building the best project at the 24-hour HackNight hackathon.",
    accentColor: "#7c3aed",
    fields: [
      { key: "position", label: "Position", required: true },
      { key: "project", label: "Project", required: false },
    ],
    signatoryIds: [ravisMembership.id, priyaClub.id],
  });
  await issueCredentials(ravi, "demo-coding-club", {
    templateId: hackNight.id,
    recipients: [{ name: asha.name, email: asha.email, fields: { position: "1st", project: "OpenTrace" } }],
  });

  await createOrg(meera, {
    name: "Acme Labs",
    slug: "acme-labs",
    description: "Fictional product company.",
    website: "https://example.com",
  });
  const meeraAcme = await db.membership.findFirstOrThrow({ where: { userId: meera.id, org: { slug: "acme-labs" } } });
  await db.membership.update({ where: { id: meeraAcme.id }, data: { title: "Head of People" } });
  const internship = await createTemplate(meera, "acme-labs", {
    name: "Internship Completion",
    type: "INTERNSHIP",
    description: "Successfully completed an internship with the platform engineering team.",
    accentColor: "#0f766e",
    fields: [
      { key: "role", label: "Role", required: true },
      { key: "duration", label: "Duration", required: true },
    ],
    signatoryIds: [meeraAcme.id],
  });
  await issueCredentials(meera, "acme-labs", {
    templateId: internship.id,
    recipients: [
      { name: asha.name, email: asha.email, fields: { role: "Backend Engineering Intern", duration: "May – Jul 2026" } },
      { name: "Karan Mehta", email: "karan@example.com", fields: { role: "Data Intern", duration: "Jun – Aug 2026" } },
    ],
  });

  console.log("\nSeeded. Log in with any of these (password: %s):", PASSWORD);
  for (const u of [priya, ravi, meera, asha]) console.log(`  ${u.email.padEnd(18)} ${u.name} · /u/${u.handle}`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
