import { NextResponse } from "next/server";
import { complianceBand, complianceStatusLabel } from "@/lib/db/compliance";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { demoCompliance, demoFines, demoIncidents } from "@/lib/uctracking/demo-data";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      source: "mock",
      data: {
        stats: {
          expired: 7,
          expiring30d: 18,
          openIncidents: 3,
          complianceRate: 94,
        },
        documents: demoCompliance,
        incidents: demoIncidents,
        fines: demoFines,
      },
    });
  }

  try {
    const documents = await getPrisma().complianceDocument.findMany({
      orderBy: { expiresOn: "asc" },
      take: 100,
    });

    const now = new Date();
    const expired = documents.filter((d) => d.expiresOn < now).length;
    const expiring30d = documents.filter((d) => {
      const days = Math.ceil((d.expiresOn.getTime() - now.getTime()) / 86_400_000);
      return days >= 0 && days <= 30;
    }).length;
    const compliant = documents.length - expired;
    const complianceRate =
      documents.length === 0 ? 100 : Math.round((compliant / documents.length) * 100);

    return NextResponse.json({
      source: "database",
      data: {
        stats: {
          expired,
          expiring30d,
          openIncidents: demoIncidents.length,
          complianceRate,
        },
        documents: documents.map((d) => ({
          subjectId: d.subjectId,
          docType: d.docType,
          expiresOn: d.expiresOn.toISOString().slice(0, 10),
          band: complianceBand(d.expiresOn, now),
          statusLabel: complianceStatusLabel(d.expiresOn, now),
        })),
        incidents: demoIncidents,
        fines: demoFines,
      },
    });
  } catch (err) {
    console.error("[compliance] database error", err);
    return NextResponse.json({
      source: "mock",
      data: {
        stats: {
          expired: 7,
          expiring30d: 18,
          openIncidents: 3,
          complianceRate: 94,
        },
        documents: demoCompliance,
        incidents: demoIncidents,
        fines: demoFines,
      },
    });
  }
}
