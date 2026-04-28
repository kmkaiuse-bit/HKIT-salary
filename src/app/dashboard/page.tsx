"use client";

import { useState, useEffect } from "react";
import type { CalculatedAssignment, RateTableRow, TeacherRow } from "@/types";
import { INSTALMENT_PATTERN_LABELS, INSTALMENT_PATTERN_DESCRIPTIONS } from "@/types";
import type { ParsedExcelData } from "@/types";
import { generateAssignmentsTemplate } from "@/lib/template-generator";

const MASTER_STORAGE_KEY = "dae_master_data";

interface MasterData {
  rateTable: RateTableRow[];
  teachers: TeacherRow[];
  savedAt: string;
}

interface UploadStats {
  teacherCount: number;
  subjectCount: number;
  assignmentCount: number;
}

type UploadState = "idle" | "uploading" | "done" | "error";
type GenerateState = "idle" | "generating" | "error";

export default function DashboardPage() {
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [masterUploadState, setMasterUploadState] = useState<UploadState>("idle");

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [parsed, setParsed] = useState<ParsedExcelData | null>(null);
  const [results, setResults] = useState<CalculatedAssignment[]>([]);

  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [generateError, setGenerateError] = useState<string[]>([]);
  const [term, setTerm] = useState("T2025C");
  const [showBudget, setShowBudget] = useState(false);

  // Load master data from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(MASTER_STORAGE_KEY);
    if (raw) {
      try { setMasterData(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  // ── Master Data upload ────────────────────────────────────────────
  async function handleMasterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMasterUploadState("uploading");

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok || !data.masterData) {
      setMasterUploadState("error");
      return;
    }

    const master: MasterData = {
      rateTable: data.masterData.rateTable,
      teachers: data.masterData.teachers,
      savedAt: new Date().toLocaleString("zh-HK"),
    };
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(master));
    setMasterData(master);
    setMasterUploadState("done");
  }

  // ── Assignments upload ────────────────────────────────────────────
  async function handleAssignmentsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState("uploading");
    setParseErrors([]);
    setUploadStats(null);
    setParsed(null);
    setResults([]);

    const form = new FormData();
    form.append("file", file);
    if (masterData) {
      form.append("masterData", JSON.stringify({
        rateTable: masterData.rateTable,
        teachers: masterData.teachers,
      }));
    }

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      setUploadState("error");
      setParseErrors([data.error]);
      return;
    }

    // If the uploaded file also contained master data, save it
    if (data.masterData) {
      const master: MasterData = {
        rateTable: data.masterData.rateTable,
        teachers: data.masterData.teachers,
        savedAt: new Date().toLocaleString("zh-HK"),
      };
      localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(master));
      setMasterData(master);
    }

    setUploadState("done");
    setParseErrors(data.parseErrors ?? []);
    setUploadStats(data.parsed ?? null);
    setParsed(data.fullData ?? null);
    setResults(data.results ?? []);
    if (data.results?.[0]?.assignment?.term) {
      setTerm(data.results[0].assignment.term);
    }
  }

  // ── Download Assignments template ─────────────────────────────────
  function handleDownloadTemplate() {
    const buf = generateAssignmentsTemplate(
      masterData?.teachers ?? [],
      masterData?.rateTable ?? [],
      term,
    );
    const blob = new Blob([buf as unknown as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Assignments_${term}_Template.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Generate outputs ──────────────────────────────────────────────
  async function handleGenerate(outputType: "budget" | "full") {
    if (!parsed) return;
    setGenerateState("generating");
    setGenerateError([]);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsed, outputType, term }),
    });

    if (!res.ok) {
      const data = await res.json();
      setGenerateState("error");
      setGenerateError(data.details ?? [data.error]);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cd = res.headers.get("Content-Disposition") ?? "";
    const match = cd.match(/filename="([^"]+)"/);
    a.download = match?.[1] ?? `output_${term}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setGenerateState("idle");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const hasErrors = results.some((r) => r.validationErrors.length > 0);
  const finalCount = results.filter((r) => r.assignment.status === "FINAL").length;
  const grandTotal = results.reduce((s, r) => s + r.totalSalary, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">DAE 薪金自動化系統</h1>
          <p className="text-xs text-gray-500">DAE Program — Salary Calculation</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700 underline">
          登出
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Master Data ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                費率表 &amp; 老師名單
                <span className="text-xs font-normal text-gray-400">（每年更新一次）</span>
              </h2>

              {masterData ? (
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                    ✓ 已儲存：{masterData.teachers.length} 位老師 · {masterData.rateTable.length} 個科目
                  </span>
                  <span className="text-xs text-gray-400">更新於 {masterData.savedAt}</span>
                </div>
              ) : (
                <p className="mt-1 text-sm text-amber-600">尚未上傳，請先上傳含 RateTable + Teachers 的 Excel</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {masterUploadState === "uploading" && (
                <span className="text-sm text-gray-400">上傳中…</span>
              )}
              {masterUploadState === "error" && (
                <span className="text-sm text-red-500">上傳失敗，請確認文件含 RateTable + Teachers sheet</span>
              )}
              <label className="cursor-pointer text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition">
                {masterData ? "重新上傳" : "上傳 Master Data"}
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleMasterUpload} />
              </label>
            </div>
          </div>
        </section>

        {/* ── Step 1: Assignments upload ────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Step 1 — 上傳本學期課程安排
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            只需填 <code className="bg-gray-100 px-1 rounded">Assignments</code> sheet（時薪由系統從費率表自動查找）
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {masterData && (
              <button
                onClick={handleDownloadTemplate}
                className="text-sm border border-blue-200 text-blue-600 hover:bg-blue-50 font-medium px-4 py-2 rounded-lg transition"
              >
                ⬇ 下載空白模板（含老師 &amp; 科目參考）
              </button>
            )}

            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              上傳 Assignments Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleAssignmentsUpload} />
            </label>

            {uploadState === "uploading" && (
              <span className="text-sm text-gray-400">解析中…</span>
            )}
            {uploadState === "done" && uploadStats && (
              <span className="text-sm text-green-600">
                ✓ {uploadStats.assignmentCount} 行課程安排，
                使用 {uploadStats.teacherCount} 位老師 · {uploadStats.subjectCount} 個科目費率
              </span>
            )}
          </div>

          {!masterData && uploadState === "idle" && (
            <p className="mt-3 text-xs text-amber-600">
              ⚠ 尚未儲存 Master Data。如上傳完整 Excel（含 RateTable + Teachers + Assignments），系統會自動儲存。
            </p>
          )}

          {parseErrors.length > 0 && (
            <div className="mt-4 bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-red-700 mb-2">解析警告 / 錯誤：</p>
              <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
                {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </section>

        {/* ── Step 2: Results Table ─────────────────────────────────── */}
        {results.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Step 2 — 預覽計算結果
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-left">
                    <th className="px-3 py-2 font-medium">老師</th>
                    <th className="px-3 py-2 font-medium">科目</th>
                    <th className="px-3 py-2 font-medium">時數</th>
                    <th className="px-3 py-2 font-medium">時薪</th>
                    <th className="px-3 py-2 font-medium">總薪金</th>
                    <th className="px-3 py-2 font-medium">分期安排</th>
                    <th className="px-3 py-2 font-medium">狀態</th>
                    <th className="px-3 py-2 font-medium">驗證</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const hours = r.assignment.isCombined
                      ? r.assignment.comTeachingHours
                      : r.assignment.teachingHours;
                    const hasError = r.validationErrors.length > 0;
                    const rowBg = hasError ? "bg-red-50" : i % 2 === 1 ? "bg-gray-50/50" : "";
                    return (
                      <>
                        <tr key={`row-${i}`} className={rowBg}>
                          <td className="px-3 py-2 align-top">{r.teacher.displayName}</td>
                          <td className="px-3 py-2 align-top">
                            <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                              {r.assignment.subjectCode}
                            </span>
                            {r.rateRow.subjectName && (
                              <span className="ml-1 text-gray-500 text-xs">{r.rateRow.subjectName}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">{hours}</td>
                          <td className="px-3 py-2 align-top">
                            {r.hourlyRate > 0 ? `HK$${r.hourlyRate.toFixed(0)}` : "—"}
                          </td>
                          <td className="px-3 py-2 align-top font-semibold">
                            HK${r.totalSalary.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="text-xs text-gray-500 mb-1.5">
                              {INSTALMENT_PATTERN_LABELS[r.assignment.instalmentPattern]}
                            </div>
                            {r.instalments.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {r.instalments.map((inst, j) => (
                                  <div key={j} className="bg-blue-50 border border-blue-100 rounded px-2 py-1 text-xs text-center min-w-[72px]">
                                    <div className="text-blue-500 font-medium leading-tight">
                                      {inst.monthLabel.split(" ")[0].slice(0, 3)}{" "}{inst.monthLabel.split(" ")[1]}
                                    </div>
                                    <div className="text-gray-700 font-semibold leading-tight">
                                      HK${inst.amount.toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              r.assignment.status === "FINAL"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {r.assignment.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top">
                            {hasError ? (
                              <div className="text-red-600 text-xs space-y-0.5">
                                {r.validationErrors.map((e, j) => <div key={j}>✗ {e}</div>)}
                              </div>
                            ) : (
                              <span className="text-green-600 text-xs">✓</span>
                            )}
                          </td>
                        </tr>
                        {i < results.length - 1 && (
                          <tr key={`divider-${i}`}>
                            <td colSpan={8} className="h-px bg-gray-100 p-0" />
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Budget Preview ────────────────────────────────────────── */}
        {results.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">預算預覽</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  總預算：
                  <span className="font-semibold text-gray-800 ml-1">HK${grandTotal.toLocaleString()}</span>
                  <span className="ml-2 text-gray-400">（{results.length} 行）</span>
                </p>
              </div>
              <button
                onClick={() => setShowBudget((v) => !v)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showBudget ? "收起" : "展開明細"}
              </button>
            </div>

            {showBudget && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-50 text-gray-600 text-left text-xs">
                      <th className="px-3 py-2 font-medium">科目代碼</th>
                      <th className="px-3 py-2 font-medium">科目名稱</th>
                      <th className="px-3 py-2 font-medium">類別</th>
                      <th className="px-3 py-2 font-medium">老師</th>
                      <th className="px-3 py-2 font-medium">FT/PT</th>
                      <th className="px-3 py-2 font-medium text-right">時數</th>
                      <th className="px-3 py-2 font-medium text-right">時薪</th>
                      <th className="px-3 py-2 font-medium text-right">預算</th>
                      <th className="px-3 py-2 font-medium text-right">獎勵金</th>
                      <th className="px-3 py-2 font-medium text-right">總薪金</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((r, i) => {
                      const hours = r.assignment.isCombined ? (r.assignment.comTeachingHours ?? 0) : r.assignment.teachingHours;
                      const budget = hours * r.hourlyRate;
                      return (
                        <tr key={i} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                          <td className="px-3 py-2 font-mono text-xs text-blue-700">{r.assignment.subjectCode}</td>
                          <td className="px-3 py-2 text-gray-700">{r.rateRow.subjectName || "—"}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{r.rateRow.category || "—"}</td>
                          <td className="px-3 py-2">{r.teacher.displayName}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${r.teacher.employmentType === "FT" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                              {r.teacher.employmentType}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{hours}</td>
                          <td className="px-3 py-2 text-right">{r.hourlyRate > 0 ? `HK$${r.hourlyRate.toFixed(0)}` : "—"}</td>
                          <td className="px-3 py-2 text-right">HK${budget.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{r.assignment.incentive > 0 ? `HK$${r.assignment.incentive.toLocaleString()}` : "—"}</td>
                          <td className="px-3 py-2 text-right font-medium">HK${r.totalSalary.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50 font-semibold text-gray-800 border-t-2 border-amber-200">
                      <td colSpan={7} className="px-3 py-2 text-right text-sm">合計</td>
                      <td className="px-3 py-2 text-right text-sm">
                        HK${results.reduce((s, r) => { const h = r.assignment.isCombined ? (r.assignment.comTeachingHours ?? 0) : r.assignment.teachingHours; return s + h * r.hourlyRate; }, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-sm">
                        HK${results.reduce((s, r) => s + r.assignment.incentive, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-sm">HK${grandTotal.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Step 3: Generate ──────────────────────────────────────── */}
        {results.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 3 — 生成輸出</h2>
            <p className="text-sm text-gray-500 mb-6">
              學期代號：
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="ml-2 border border-gray-300 rounded px-2 py-0.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </p>

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => handleGenerate("budget")}
                disabled={generateState === "generating"}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                📊 生成預算彙總表（Draft 用）
              </button>
              <button
                onClick={() => handleGenerate("full")}
                disabled={generateState === "generating" || hasErrors || finalCount === 0}
                className="bg-green-600 hover:bg-green-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition disabled:opacity-50"
                title={hasErrors ? "請先修正所有驗證錯誤" : finalCount === 0 ? "請將至少一行狀態設為 FINAL" : ""}
              >
                📦 生成全部輸出（薪金表 + 合同 + 排程）
              </button>
            </div>

            {generateState === "generating" && <p className="mt-4 text-sm text-gray-500">生成中，請稍候…</p>}

            {generateState === "error" && generateError.length > 0 && (
              <div className="mt-4 bg-red-50 rounded-lg p-4">
                <p className="text-sm font-medium text-red-700 mb-2">驗證失敗，請修正以下問題：</p>
                <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
                  {generateError.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {hasErrors && (
              <p className="mt-3 text-sm text-red-600">
                ⚠ 部分行有驗證錯誤（紅色行），請修正後重新上傳再生成完整輸出。
              </p>
            )}
          </section>
        )}

        {/* ── Instalment Pattern Reference ─────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">分期模式說明</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.entries(INSTALMENT_PATTERN_LABELS) as [keyof typeof INSTALMENT_PATTERN_LABELS, string][]).map(
              ([code, label]) => (
                <div key={code} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{INSTALMENT_PATTERN_DESCRIPTIONS[code]}</p>
                  <span className="text-xs font-mono text-blue-600 mt-1 inline-block">{code}</span>
                </div>
              )
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
