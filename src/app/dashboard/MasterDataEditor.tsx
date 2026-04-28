"use client";

import { useState } from "react";
import type { RateTableRow, TeacherRow, EmploymentType } from "@/types";

interface MasterData {
  rateTable: RateTableRow[];
  teachers: TeacherRow[];
  savedAt: string;
}

interface Props {
  masterData: MasterData;
  onSave: (updated: MasterData) => void;
}

export default function MasterDataEditor({ masterData, onSave }: Props) {
  const [teachers, setTeachers] = useState<TeacherRow[]>(masterData.teachers);
  const [rateTable, setRateTable] = useState<RateTableRow[]>(masterData.rateTable);
  const [dirty, setDirty] = useState(false);

  function updateTeacher(i: number, patch: Partial<TeacherRow>) {
    setTeachers((prev) => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
    setDirty(true);
  }

  function deleteTeacher(i: number) {
    setTeachers((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  }

  function addTeacher() {
    setTeachers((prev) => [...prev, { displayName: "", fullName: "", payTo: "", employmentType: "PT" }]);
    setDirty(true);
  }

  function updateRate(i: number, patch: Partial<RateTableRow>) {
    setRateTable((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
    setDirty(true);
  }

  function deleteRate(i: number) {
    setRateTable((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  }

  function addRate() {
    setRateTable((prev) => [...prev, { subjectCode: "", subjectName: "", category: "", hourlyRate: 0 }]);
    setDirty(true);
  }

  function handleSave() {
    const updated: MasterData = {
      teachers,
      rateTable,
      savedAt: new Date().toLocaleString("zh-HK"),
    };
    onSave(updated);
    setDirty(false);
  }

  const inputCls = "w-full border border-transparent hover:border-gray-300 focus:border-blue-400 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 transition bg-transparent focus:bg-white";

  return (
    <div className="border-t border-gray-100">
      {/* Save bar */}
      {dirty && (
        <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-xs text-blue-700">有未儲存的修改</span>
          <button
            onClick={handleSave}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition"
          >
            儲存更新
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

        {/* Teachers */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">老師名單</p>
            <button onClick={addTeacher} className="text-xs text-blue-600 hover:text-blue-800">+ 新增</button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100">
                <th className="pb-1.5 text-left font-medium">顯示名稱</th>
                <th className="pb-1.5 text-left font-medium">全名</th>
                <th className="pb-1.5 text-left font-medium">付款對象</th>
                <th className="pb-1.5 text-left font-medium">類型</th>
                <th className="pb-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teachers.map((t, i) => (
                <tr key={i} className="group">
                  <td className="py-1 pr-1">
                    <input
                      value={t.displayName}
                      onChange={(e) => updateTeacher(i, { displayName: e.target.value })}
                      className={inputCls}
                      placeholder="Mr. Smith"
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      value={t.fullName}
                      onChange={(e) => updateTeacher(i, { fullName: e.target.value })}
                      className={inputCls}
                      placeholder="Smith John"
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      value={t.payTo}
                      onChange={(e) => updateTeacher(i, { payTo: e.target.value })}
                      className={inputCls}
                      placeholder="個人或公司"
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <select
                      value={t.employmentType}
                      onChange={(e) => updateTeacher(i, { employmentType: e.target.value as EmploymentType })}
                      className="border border-transparent hover:border-gray-300 focus:border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none bg-transparent focus:bg-white"
                    >
                      <option value="PT">PT</option>
                      <option value="FT">FT</option>
                    </select>
                  </td>
                  <td className="py-1">
                    <button
                      onClick={() => deleteTeacher(i)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition px-1"
                      title="刪除"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rate table */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">科目費率</p>
            <button onClick={addRate} className="text-xs text-blue-600 hover:text-blue-800">+ 新增</button>
          </div>
          <div className="max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="pb-1.5 text-left font-medium">代碼</th>
                  <th className="pb-1.5 text-left font-medium">科目名稱</th>
                  <th className="pb-1.5 text-right font-medium">時薪 (HK$)</th>
                  <th className="pb-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rateTable.map((r, i) => (
                  <tr key={i} className="group">
                    <td className="py-1 pr-1">
                      <input
                        value={r.subjectCode}
                        onChange={(e) => updateRate(i, { subjectCode: e.target.value })}
                        className={`${inputCls} font-mono text-blue-700`}
                        placeholder="DAE201"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <input
                        value={r.subjectName}
                        onChange={(e) => updateRate(i, { subjectName: e.target.value })}
                        className={inputCls}
                        placeholder="科目名稱"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <input
                        type="number"
                        value={r.hourlyRate}
                        onChange={(e) => updateRate(i, { hourlyRate: Number(e.target.value) || 0 })}
                        className={`${inputCls} text-right`}
                        placeholder="0"
                      />
                    </td>
                    <td className="py-1">
                      <button
                        onClick={() => deleteRate(i)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition px-1"
                        title="刪除"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
