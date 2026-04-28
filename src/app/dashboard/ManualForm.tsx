"use client";

import { useState } from "react";
import type { InstalmentPattern, AssignmentStatus, RateTableRow, TeacherRow, CalculatedAssignment } from "@/types";
import { INSTALMENT_PATTERN_LABELS, INSTALMENT_PATTERN_DESCRIPTIONS } from "@/types";
import type { ParsedExcelData } from "@/types";

interface FormRow {
  id: string;
  teacherDisplayName: string;
  subjectCode: string;
  teachingHours: number | "";
  isCombined: boolean;
  comHourlyRate: number | "";
  comTeachingHours: number | "";
  instalmentPattern: InstalmentPattern;
  lumpSumMonth: string;
  incentive: number | "";
  status: AssignmentStatus;
}

function newRow(): FormRow {
  return {
    id: crypto.randomUUID(),
    teacherDisplayName: "",
    subjectCode: "",
    teachingHours: 60,
    isCombined: false,
    comHourlyRate: "",
    comTeachingHours: "",
    instalmentPattern: "T1_STD",
    lumpSumMonth: "",
    incentive: "",
    status: "DRAFT",
  };
}

interface Props {
  masterData: { rateTable: RateTableRow[]; teachers: TeacherRow[] } | null;
  term: string;
  onTermChange: (t: string) => void;
  onResults: (results: CalculatedAssignment[], fullData: ParsedExcelData) => void;
}

export default function ManualForm({ masterData, term, onTermChange, onResults }: Props) {
  const [rows, setRows] = useState<FormRow[]>([newRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const teachers = masterData?.teachers ?? [];
  const rateTable = masterData?.rateTable ?? [];
  const rateMap = new Map(rateTable.map((r) => [r.subjectCode, r]));

  function updateRow(id: string, patch: Partial<FormRow>) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function deleteRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function duplicateRow(id: string) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      const copy = { ...prev[idx], id: crypto.randomUUID() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  async function handleCalculate() {
    if (!masterData) { setError("請先上傳 Master Data"); return; }
    setSubmitting(true);
    setError("");

    const assignments = rows
      .filter((r) => r.teacherDisplayName && r.subjectCode)
      .map((r) => ({
        teacherDisplayName: r.teacherDisplayName,
        subjectCode: r.subjectCode,
        teachingHours: Number(r.teachingHours) || 0,
        isCombined: r.isCombined,
        comHourlyRate: r.isCombined ? Number(r.comHourlyRate) || undefined : undefined,
        comTeachingHours: r.isCombined ? Number(r.comTeachingHours) || undefined : undefined,
        instalmentPattern: r.instalmentPattern,
        lumpSumMonth: r.lumpSumMonth || undefined,
        incentive: Number(r.incentive) || 0,
        term,
        status: r.status,
      }));

    const res = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments, masterData }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) { setError(data.error); return; }
    onResults(data.results, data.fullData);
  }

  return (
    <div className="space-y-4">
      {!masterData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          請先上傳 Master Data（費率表 + 老師名單），才能使用手動填寫功能。
        </div>
      )}

      {/* Term */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">學期代號</label>
        <input
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">（所有行共用）</span>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {rows.map((row, idx) => {
          const rateInfo = rateMap.get(row.subjectCode);
          return (
            <div
              key={row.id}
              className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative"
            >
              {/* Row number + actions */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => duplicateRow(row.id)}
                    className="text-xs text-gray-400 hover:text-blue-500"
                    title="複製此行"
                  >
                    複製
                  </button>
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="text-xs text-gray-400 hover:text-red-500"
                    title="刪除此行"
                  >
                    刪除
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {/* Teacher */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">老師</label>
                  {teachers.length > 0 ? (
                    <select
                      value={row.teacherDisplayName}
                      onChange={(e) => updateRow(row.id, { teacherDisplayName: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">— 選擇老師 —</option>
                      {teachers.map((t) => (
                        <option key={t.displayName} value={t.displayName}>
                          {t.displayName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={row.teacherDisplayName}
                      onChange={(e) => updateRow(row.id, { teacherDisplayName: e.target.value })}
                      placeholder="老師名稱"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">科目</label>
                  {rateTable.length > 0 ? (
                    <select
                      value={row.subjectCode}
                      onChange={(e) => updateRow(row.id, { subjectCode: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">— 選擇科目 —</option>
                      {rateTable.map((r) => (
                        <option key={r.subjectCode} value={r.subjectCode}>
                          {r.subjectCode} {r.subjectName ? `— ${r.subjectName}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={row.subjectCode}
                      onChange={(e) => updateRow(row.id, { subjectCode: e.target.value })}
                      placeholder="如 DAE201"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {rateInfo && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      時薪：HK${rateInfo.hourlyRate.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Hours */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">教學時數</label>
                  <input
                    type="number"
                    min={0}
                    value={row.teachingHours}
                    onChange={(e) => updateRow(row.id, { teachingHours: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Instalment Pattern */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">分期模式</label>
                  <select
                    value={row.instalmentPattern}
                    onChange={(e) => updateRow(row.id, { instalmentPattern: e.target.value as InstalmentPattern })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    title={INSTALMENT_PATTERN_DESCRIPTIONS[row.instalmentPattern]}
                  >
                    {Object.entries(INSTALMENT_PATTERN_LABELS).map(([code, label]) => (
                      <option key={code} value={code} title={INSTALMENT_PATTERN_DESCRIPTIONS[code as InstalmentPattern]}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                    {INSTALMENT_PATTERN_DESCRIPTIONS[row.instalmentPattern]}
                  </p>
                </div>

                {/* Lump Sum Month — only for LUMP_SUM */}
                {row.instalmentPattern === "LUMP_SUM" && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">一筆過月份</label>
                    <input
                      value={row.lumpSumMonth}
                      onChange={(e) => updateRow(row.id, { lumpSumMonth: e.target.value })}
                      placeholder="YYYY-MM，如 2026-01"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Incentive */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">獎勵金（選填）</label>
                  <input
                    type="number"
                    min={0}
                    value={row.incentive}
                    onChange={(e) => updateRow(row.id, { incentive: e.target.value === "" ? "" : Number(e.target.value) })}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">狀態</label>
                  <select
                    value={row.status}
                    onChange={(e) => updateRow(row.id, { status: e.target.value as AssignmentStatus })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="DRAFT">DRAFT（草稿）</option>
                    <option value="FINAL">FINAL（已確認）</option>
                  </select>
                </div>

                {/* Combined subject toggle */}
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.isCombined}
                      onChange={(e) => updateRow(row.id, { isCombined: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">合并科目</span>
                  </label>
                </div>
              </div>

              {/* Combined fields */}
              {row.isCombined && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">合并科目時薪</label>
                    <input
                      type="number"
                      min={0}
                      value={row.comHourlyRate}
                      onChange={(e) => updateRow(row.id, { comHourlyRate: e.target.value === "" ? "" : Number(e.target.value) })}
                      placeholder="HK$/hr"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">合并科目教學時數</label>
                    <input
                      type="number"
                      min={0}
                      value={row.comTeachingHours}
                      onChange={(e) => updateRow(row.id, { comTeachingHours: e.target.value === "" ? "" : Number(e.target.value) })}
                      placeholder="小時"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add row */}
      <button
        onClick={addRow}
        className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-400 hover:text-blue-500 rounded-xl py-3 text-sm transition"
      >
        + 新增一行
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Calculate */}
      <div className="flex justify-end">
        <button
          onClick={handleCalculate}
          disabled={submitting || !masterData || rows.every((r) => !r.teacherDisplayName)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {submitting ? "計算中…" : "計算並預覽結果 →"}
        </button>
      </div>
    </div>
  );
}
