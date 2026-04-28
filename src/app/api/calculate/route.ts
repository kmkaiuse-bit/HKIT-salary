import { NextRequest, NextResponse } from "next/server";
import { calculateAll } from "@/lib/calculator";
import type { AssignmentRow, RateTableRow, TeacherRow } from "@/types";

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    assignments: AssignmentRow[];
    masterData: { rateTable: RateTableRow[]; teachers: TeacherRow[] };
  };

  const { assignments, masterData } = body;

  if (!assignments?.length) {
    return NextResponse.json({ error: "請至少填寫一行課程安排" }, { status: 400 });
  }
  if (!masterData?.rateTable?.length || !masterData?.teachers?.length) {
    return NextResponse.json({ error: "請先上傳 Master Data（費率表 + 老師名單）" }, { status: 400 });
  }

  const results = calculateAll(assignments, masterData.teachers, masterData.rateTable);

  return NextResponse.json({
    results,
    fullData: {
      rateTable: masterData.rateTable,
      teachers: masterData.teachers,
      assignments,
      errors: [],
    },
    parsed: {
      teacherCount: masterData.teachers.length,
      subjectCount: masterData.rateTable.length,
      assignmentCount: assignments.length,
    },
  });
}
