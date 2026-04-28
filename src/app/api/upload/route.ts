import { NextRequest, NextResponse } from "next/server";
import { parseExcelBuffer } from "@/lib/excel-parser";
import { calculateAll } from "@/lib/calculator";
import type { RateTableRow, TeacherRow } from "@/types";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const masterDataJson = formData.get("masterData") as string | null;

  if (!file) {
    return NextResponse.json({ error: "請上傳 Excel 文件" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const parsed = parseExcelBuffer(buffer);

  const hasMaster = parsed.rateTable.length > 0 || parsed.teachers.length > 0;
  const hasAssignments = parsed.assignments.length > 0;

  // Assignments-only upload: merge with master data from localStorage
  let rateTable = parsed.rateTable;
  let teachers = parsed.teachers;

  if (!hasMaster && masterDataJson) {
    try {
      const master = JSON.parse(masterDataJson) as {
        rateTable: RateTableRow[];
        teachers: TeacherRow[];
      };
      rateTable = master.rateTable ?? [];
      teachers = master.teachers ?? [];
    } catch {
      return NextResponse.json({ error: "Master Data 格式錯誤，請重新上傳 Master Data" }, { status: 400 });
    }
  }

  const results = hasAssignments
    ? calculateAll(parsed.assignments, teachers, rateTable)
    : [];

  return NextResponse.json({
    uploadType: hasMaster ? (hasAssignments ? "full" : "masterOnly") : "assignmentsOnly",
    parsed: {
      teacherCount: teachers.length,
      subjectCount: rateTable.length,
      assignmentCount: parsed.assignments.length,
    },
    // Return master data when uploaded so frontend can store it
    masterData: hasMaster ? { rateTable, teachers } : null,
    fullData: {
      rateTable,
      teachers,
      assignments: parsed.assignments,
      errors: parsed.errors,
    },
    results,
    parseErrors: parsed.errors,
  });
}
