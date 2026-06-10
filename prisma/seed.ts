import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "Ayudante", dailyRate: 38808, retroWeekly: 25150 },
  { name: "Medio oficial", dailyRate: 42000, retroWeekly: 27000 },
  { name: "Oficial", dailyRate: 45624, retroWeekly: 29150 },
  { name: "Oficial especializado", dailyRate: 50000, retroWeekly: 32000 },
];

const EMPLOYEES = [
  { firstName: "Luciano", lastName: "Carballo", category: "Oficial", debt: 60000 },
  { firstName: "Dario", lastName: "Carballo", category: "Oficial", debt: 0 },
  { firstName: "Alejandro", lastName: "Romero", category: "Oficial", debt: 160000 },
  { firstName: "Hernan", lastName: "Gonzalez", category: "Oficial", debt: 269000 },
  { firstName: "Claudio", lastName: "Torres", category: "Oficial", debt: 40000 },
  { firstName: "Daniel", lastName: "Cerdan", category: "Oficial", debt: 117300 },
  { firstName: "Javier", lastName: "Miño", category: "Ayudante", debt: 30000 },
  { firstName: "Hector", lastName: "Alderete", category: "Ayudante", debt: 0 },
];

const SITES = ["Obra Centro", "Obra Norte", "Obra Sur"];

async function main() {
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`Categorías: ${CATEGORIES.length}`);

  for (const name of SITES) {
    await prisma.site.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Obras: ${SITES.length}`);

  const categories = await prisma.category.findMany();
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

  for (const emp of EMPLOYEES) {
    const categoryId = categoryByName.get(emp.category);
    if (!categoryId) throw new Error(`Categoría no encontrada: ${emp.category}`);

    const existing = await prisma.employee.findFirst({
      where: { firstName: emp.firstName, lastName: emp.lastName },
    });

    if (existing) continue;

    const employee = await prisma.employee.create({
      data: {
        firstName: emp.firstName,
        lastName: emp.lastName,
        categoryId,
      },
    });

    if (emp.debt > 0) {
      await prisma.debtMovement.create({
        data: {
          employeeId: employee.id,
          amount: emp.debt,
          note: "Deuda inicial (migración desde Excel)",
        },
      });
    }
  }
  console.log(`Empleados: ${EMPLOYEES.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completado.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
