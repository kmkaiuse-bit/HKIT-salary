import type {
  AssignmentRow,
  TeacherRow,
  RateTableRow,
  CalculatedAssignment,
} from "@/types";
import { buildInstalmentSchedule, extractTermStartYear } from "./instalment";

export function calculateAssignment(
  assignment: AssignmentRow,
  teacher: TeacherRow,
  rateRow: RateTableRow
): CalculatedAssignment {
  const errors: string[] = [];

  const hourlyRate = assignment.isCombined
    ? (assignment.comHourlyRate ?? 0)
    : rateRow.hourlyRate;

  const hours = assignment.isCombined
    ? (assignment.comTeachingHours ?? 0)
    : assignment.teachingHours;

  if (assignment.isCombined) {
    if (!assignment.comHourlyRate) errors.push("合并科目缺少 ComHourlyRate");
    if (!assignment.comTeachingHours) errors.push("合并科目缺少 ComTeachingHours");
  }

  if (assignment.instalmentPattern === "LUMP_SUM" && !assignment.lumpSumMonth) {
    errors.push("一筆過付款需填寫 LumpSumMonth（格式：YYYY-MM）");
  }

  const totalSalary = Math.round((hours * hourlyRate + assignment.incentive) * 100) / 100;

  let instalments = [] as CalculatedAssignment["instalments"];
  if (errors.length === 0) {
    try {
      const termYear = extractTermStartYear(assignment.term);
      instalments = buildInstalmentSchedule(
        assignment.instalmentPattern,
        totalSalary,
        termYear,
        assignment.lumpSumMonth
      );
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  const instalmentSum = instalments.reduce((s, x) => s + x.amount, 0);
  if (instalments.length > 0) {
    const diff = Math.abs(instalmentSum - totalSalary);
    if (diff > 0.01) {
      errors.push(
        `分期總和 HK$${instalmentSum.toFixed(2)} ≠ 總薪金 HK$${totalSalary.toFixed(2)}`
      );
    }
  }

  return {
    assignment,
    teacher,
    rateRow,
    hourlyRate,
    totalSalary,
    instalments,
    validationErrors: errors,
  };
}

export function calculateAll(
  assignments: AssignmentRow[],
  teachers: TeacherRow[],
  rateTable: RateTableRow[]
): CalculatedAssignment[] {
  const teacherMap = new Map(teachers.map((t) => [t.displayName, t]));
  const rateMap = new Map(rateTable.map((r) => [r.subjectCode, r]));

  return assignments.map((a) => {
    const teacher = teacherMap.get(a.teacherDisplayName);
    const rateRow = rateMap.get(a.subjectCode);

    if (!teacher) {
      return {
        assignment: a,
        teacher: { displayName: a.teacherDisplayName, fullName: "", payTo: "", employmentType: "PT" },
        rateRow: { subjectCode: a.subjectCode, subjectName: "", category: "", hourlyRate: 0 },
        hourlyRate: 0,
        totalSalary: 0,
        instalments: [],
        validationErrors: [`找不到老師資料：${a.teacherDisplayName}`],
      };
    }

    if (!rateRow) {
      return {
        assignment: a,
        teacher,
        rateRow: { subjectCode: a.subjectCode, subjectName: "", category: "", hourlyRate: 0 },
        hourlyRate: 0,
        totalSalary: 0,
        instalments: [],
        validationErrors: [`找不到科目費率：${a.subjectCode}`],
      };
    }

    return calculateAssignment(a, teacher, rateRow);
  });
}
