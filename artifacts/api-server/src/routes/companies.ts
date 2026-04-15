import { Router, type IRouter } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/companies — return all companies
router.get("/companies", async (_req, res) => {
  try {
    const companies = await db.select().from(companiesTable).orderBy(companiesTable.id);
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// GET /api/companies/:ticker — return one company
router.get("/companies/:ticker", async (req, res) => {
  try {
    const { ticker } = req.params;
    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.ticker, ticker.toUpperCase()));

    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

export default router;
