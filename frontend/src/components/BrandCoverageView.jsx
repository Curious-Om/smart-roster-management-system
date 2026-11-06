import React, { useState, useMemo } from 'react'
import {
  Building2,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  ShieldAlert,
  ArrowRight
} from 'lucide-react'

// Days of November 2026
const DAYS_OF_NOV = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1
  const dateStr = `2026-11-${String(day).padStart(2, '0')}`
  const d = new Date(2026, 10, day)
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekday = weekdayNames[d.getDay()]
  const isSunday = d.getDay() === 0
  const isHoliday = dateStr === '2026-11-08' || dateStr === '2026-11-24'
  const holidayName = dateStr === '2026-11-08' ? 'Diwali' : dateStr === '2026-11-24' ? 'Guru Nanak Jayanti' : null

  return {
    day,
    dateStr,
    weekday,
    isSunday,
    isHoliday,
    holidayName
  }
})

export default function BrandCoverageView({
  brands = [],
  processRules = [],
  assignments = [],
  employees = [],
  rosterEntries = [],
  pods = [],
  onSelectConflictDate
}) {
  // Mode: 'brand' | 'process'
  const [subView, setSubView] = useState('brand')
  const [selectedPodId, setSelectedPodId] = useState('all')
  const [selectedStaffingType, setSelectedStaffingType] = useState('all')
  const [selectedProcessCode, setSelectedProcessCode] = useState('CS')
  const [searchBrand, setSearchBrand] = useState('')

  // Map employees and roster entries
  const empMap = useMemo(() => {
    const map = {}
    employees.forEach((e) => { map[e.id] = e })
    return map
  }, [employees])

  const rosterMap = useMemo(() => {
    const map = {}
    rosterEntries.forEach((r) => {
      map[`${r.employee_id}_${r.date}`] = r
    })
    return map
  }, [rosterEntries])

  // Backups map: (date, brand_id, process_code) -> count of working backups
  const backupsMap = useMemo(() => {
    const map = {}
    rosterEntries.forEach((r) => {
      if (r.backup_for_brand_id && r.status === 'WORKING') {
        const key = `${r.date}_${r.backup_for_brand_id}_${r.backup_process_code}`
        map[key] = (map[key] || 0) + 1
      }
    })
    return map
  }, [rosterEntries])

  // Assignments mapped by brand_id
  const brandAssignmentsMap = useMemo(() => {
    const map = {}
    assignments.forEach((a) => {
      if (!map[a.brand_id]) map[a.brand_id] = []
      map[a.brand_id].push(a)
    })
    return map
  }, [assignments])

  // Process rules mapped by brand_id
  const brandRulesMap = useMemo(() => {
    const map = {}
    processRules.forEach((r) => {
      if (!map[r.brand_id]) map[r.brand_id] = []
      map[r.brand_id].push(r)
    })
    return map
  }, [processRules])

  // Filtered brands
  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      if (selectedPodId !== 'all' && b.pod_id !== Number(selectedPodId)) return false
      if (selectedStaffingType !== 'all' && b.staffing_type !== selectedStaffingType) return false
      if (searchBrand.trim()) {
        const q = searchBrand.toLowerCase()
        if (!b.name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [brands, selectedPodId, selectedStaffingType, searchBrand])

  // Helper to compute daily coverage for (brand, process, date)
  const evaluateDailyCoverage = (brand, rule, dayObj) => {
    if (!rule) return { status: 'CLOSED', active: 0, required: 0 }

    const { dateStr, isSunday, isHoliday } = dayObj
    const cal = rule.operating_calendar

    // Check operating status
    let isOperating = true
    if (cal === 'DAYS_365') {
      isOperating = true
    } else if (cal === 'DAILY_EXCEPT_HOLIDAYS') {
      isOperating = !isHoliday
    } else if (cal === 'MON_SAT_EXCEPT_HOLIDAYS') {
      isOperating = !isSunday && !isHoliday
    }

    if (!isOperating) {
      return { status: 'CLOSED', active: 0, required: 0, cal }
    }

    const requiredStaff = isSunday ? rule.sunday_min_staff : rule.min_daily_staff
    if (requiredStaff === 0) {
      return { status: 'CLOSED', active: 0, required: 0, cal }
    }

    // Active primary staff
    const assignedPeers = (brandAssignmentsMap[brand.id] || []).filter(
      (a) => a.process_code === rule.process_code
    )

    let primaryWorking = 0
    assignedPeers.forEach((a) => {
      const entry = rosterMap[`${a.employee_id}_${dateStr}`]
      if (entry && entry.status === 'WORKING') {
        primaryWorking++
      }
    })

    // Active backups
    const backupKey = `${dateStr}_${brand.id}_${rule.process_code}`
    const backupWorking = backupsMap[backupKey] || 0
    const totalActive = primaryWorking + backupWorking

    if (totalActive >= requiredStaff) {
      if (backupWorking > 0 && primaryWorking < requiredStaff) {
        return { status: 'BACKUP_COVERED', active: totalActive, required: requiredStaff, cal, primary: primaryWorking, backup: backupWorking }
      }
      return { status: 'MET', active: totalActive, required: requiredStaff, cal }
    }

    return { status: 'UNDERSTAFFED', active: totalActive, required: requiredStaff, cal, gap: requiredStaff - totalActive }
  }

  // Cell color helper
  const getCoverageCellStyle = (cov) => {
    if (cov.status === 'CLOSED') {
      return 'bg-slate-900/60 text-slate-600 border-slate-800/40'
    }
    if (cov.status === 'MET') {
      return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 font-bold'
    }
    if (cov.status === 'BACKUP_COVERED') {
      return 'bg-sky-950/60 text-sky-200 border-sky-600 font-bold ring-1 ring-sky-500/40 shadow-sm'
    }
    if (cov.status === 'UNDERSTAFFED') {
      return 'bg-rose-950/80 text-rose-200 border-rose-700 font-extrabold ring-1 ring-rose-500/50 animate-pulse'
    }
    return 'bg-slate-900 text-slate-500 border-slate-800'
  }

  return (
    <div className="space-y-4">
      {/* View Switcher & Filters */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Toggle between Brand-Wise and Process-Wise */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setSubView('brand')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              subView === 'brand'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Brand-Wise View (20 D2C Brands)
          </button>
          <button
            onClick={() => setSubView('process')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              subView === 'process'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Process-Wise View (CS, ACC, NDR, RET)
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Brand */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search brand name..."
              value={searchBrand}
              onChange={(e) => setSearchBrand(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 w-48"
            />
          </div>

          {/* Pod Filter */}
          <select
            value={selectedPodId}
            onChange={(e) => setSelectedPodId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Pods</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Staffing Type Filter (Brand view) */}
          {subView === 'brand' && (
            <select
              value={selectedStaffingType}
              onChange={(e) => setSelectedStaffingType(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Staffing Types</option>
              <option value="SINGLE_RESOURCE">Single-Resource (80%)</option>
              <option value="MULTI_RESOURCE">Multi-Resource (20%)</option>
            </select>
          )}

          {/* Process Code Filter (Process view) */}
          {subView === 'process' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {['CS', 'ACC', 'NDR', 'RET'].map((pc) => (
                <button
                  key={pc}
                  onClick={() => setSelectedProcessCode(pc)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                    selectedProcessCode === pc
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pc}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coverage Status Legend */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-3 py-2 bg-slate-900/40 rounded-xl border border-slate-800/60 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-slate-300">Coverage Grid Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-950/60 border border-emerald-700/80 flex items-center justify-center text-[9px] font-bold text-emerald-300">✓</span>
            <span>Coverage Met (Active ≥ Min Daily Staff)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-950/80 border border-rose-700 flex items-center justify-center text-[9px] font-bold text-rose-300">!</span>
            <span>Understaffed Gap (Critical Shortage)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-sky-950/80 border border-sky-500 flex items-center justify-center text-[9px] font-bold text-sky-200">B</span>
            <span>Covered by Backup (Floater/Pod Lead)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-600">·</span>
            <span>Closed Operating Day</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. BRAND-WISE VIEW GRID                                       */}
      {/* ------------------------------------------------------------- */}
      {subView === 'brand' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[750px] relative">
            <table className="w-full text-left border-collapse border-spacing-0">
              {/* Header */}
              <thead className="bg-slate-950 text-slate-300 text-xs font-semibold sticky top-0 z-30 shadow-md">
                <tr className="border-b border-slate-800">
                  <th className="py-3 px-4 sticky left-0 z-40 bg-slate-950 min-w-[220px] border-r border-slate-800">
                    Brand & Staffing Model
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px] border-r border-slate-800">
                    Pod
                  </th>
                  <th className="py-3 px-3 min-w-[140px] border-r border-slate-800">
                    Active Processes
                  </th>
                  {/* Days 1 to 30 */}
                  {DAYS_OF_NOV.map((d) => (
                    <th
                      key={d.day}
                      className={`py-2 px-1 text-center min-w-[36px] max-w-[36px] border-r border-slate-800/80 ${
                        d.isSunday
                          ? 'bg-rose-950/20 text-rose-300 font-bold'
                          : d.isHoliday
                          ? 'bg-purple-950/40 text-purple-300 font-bold'
                          : 'text-slate-400'
                      }`}
                      title={d.holidayName || `${d.dateStr} (${d.weekday})`}
                    >
                      <div className="text-[10px] uppercase font-mono tracking-tighter leading-tight">
                        {d.weekday}
                      </div>
                      <div className="text-xs font-bold leading-tight">{d.day}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center min-w-[80px] border-l border-slate-800 text-emerald-400">
                    Coverage %
                  </th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredBrands.map((brand) => {
                  const rules = brandRulesMap[brand.id] || []
                  const brandAssigned = brandAssignmentsMap[brand.id] || []
                  const isSingle = brand.staffing_type === 'SINGLE_RESOURCE'

                  // Compute primary process to display (e.g. CS or all)
                  const primaryRule = rules.find((r) => r.process_code === 'CS') || rules[0]

                  let metDays = 0
                  let operatingDays = 0

                  DAYS_OF_NOV.forEach((d) => {
                    const cov = evaluateDailyCoverage(brand, primaryRule, d)
                    if (cov.status !== 'CLOSED') {
                      operatingDays++
                      if (cov.status === 'MET' || cov.status === 'BACKUP_COVERED') {
                        metDays++
                      }
                    }
                  })

                  const coverageRate = operatingDays > 0 ? Math.round((metDays / operatingDays) * 100) : 100

                  return (
                    <tr key={brand.id} className="hover:bg-slate-800/40 transition group">
                      {/* Brand Info */}
                      <td className="py-2.5 px-4 sticky left-0 z-20 bg-slate-900 group-hover:bg-slate-800 border-r border-slate-800">
                        <div className="flex flex-col">
                          <span className="font-bold text-white tracking-tight flex items-center gap-1.5">
                            {brand.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                                isSingle
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                                  : 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80'
                              }`}
                            >
                              {isSingle ? 'SINGLE_RESOURCE' : 'MULTI_RESOURCE'}
                            </span>
                            {primaryRule && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {primaryRule.operating_calendar === 'DAYS_365'
                                  ? '365 Days'
                                  : primaryRule.operating_calendar === 'DAILY_EXCEPT_HOLIDAYS'
                                  ? 'Daily (ex. PH)'
                                  : 'Mon-Sat'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Pod Name */}
                      <td className="py-2 px-2 text-center border-r border-slate-800 text-[11px] text-slate-400 font-medium">
                        {brand.pod_name || `Pod #${brand.pod_id}`}
                      </td>

                      {/* Active Processes & Assignees */}
                      <td className="py-2 px-3 border-r border-slate-800 text-[11px]">
                        <div className="space-y-1">
                          {rules.map((r) => (
                            <div key={r.id} className="flex items-center justify-between text-[10px]">
                              <span className="font-mono text-slate-300 font-bold">{r.process_code}</span>
                              <span className="text-slate-400">Min: {r.min_daily_staff} (Sun: {r.sunday_min_staff})</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* 30 Days Coverage Grid */}
                      {DAYS_OF_NOV.map((d) => {
                        const cov = evaluateDailyCoverage(brand, primaryRule, d)
                        const style = getCoverageCellStyle(cov)

                        return (
                          <td
                            key={d.day}
                            className="py-1 px-0.5 text-center border-r border-slate-800/70"
                            title={
                              cov.status === 'CLOSED'
                                ? `${brand.name} closed on ${d.dateStr} (${cov.cal})`
                                : `${brand.name} (${primaryRule?.process_code || 'CS'}) on ${d.dateStr}: Active ${cov.active} / Req ${cov.required} [${cov.status}]`
                            }
                          >
                            <div
                              className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-[11px] border transition-transform hover:scale-110 ${style}`}
                            >
                              {cov.status === 'MET' && '✓'}
                              {cov.status === 'UNDERSTAFFED' && '!'}
                              {cov.status === 'BACKUP_COVERED' && 'B'}
                              {cov.status === 'CLOSED' && '·'}
                            </div>
                          </td>
                        )
                      })}

                      {/* Health Rate */}
                      <td className="py-2 px-2 text-center border-l border-slate-800 font-bold">
                        <span
                          className={`text-xs ${
                            coverageRate >= 95
                              ? 'text-emerald-400'
                              : coverageRate >= 80
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {coverageRate}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. PROCESS-WISE VIEW                                          */}
      {/* ------------------------------------------------------------- */}
      {subView === 'process' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Process Coverage Matrix — {selectedProcessCode}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparing daily scheduled staff against mandatory client requirements for {selectedProcessCode}
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Process Code: <span className="font-bold text-emerald-400">{selectedProcessCode}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-spacing-0 text-xs">
              <thead className="bg-slate-950 text-slate-300 font-semibold sticky top-0 z-20">
                <tr className="border-b border-slate-800">
                  <th className="py-2.5 px-4 sticky left-0 z-30 bg-slate-950 min-w-[200px] border-r border-slate-800">
                    Brand Name
                  </th>
                  <th className="py-2.5 px-3 min-w-[120px] border-r border-slate-800">
                    Operating Calendar
                  </th>
                  {DAYS_OF_NOV.map((d) => (
                    <th
                      key={d.day}
                      className={`py-2 px-1 text-center min-w-[36px] max-w-[36px] border-r border-slate-800/80 ${
                        d.isSunday ? 'bg-rose-950/20 text-rose-300 font-bold' : ''
                      }`}
                    >
                      <div className="text-[10px] font-mono leading-tight">{d.day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBrands.map((b) => {
                  const rules = brandRulesMap[b.id] || []
                  const rule = rules.find((r) => r.process_code === selectedProcessCode)

                  if (!rule) {
                    return (
                      <tr key={b.id} className="opacity-40">
                        <td className="py-2 px-4 font-semibold text-slate-500 border-r border-slate-800 sticky left-0 bg-slate-900">
                          {b.name}
                        </td>
                        <td className="py-2 px-3 text-slate-500 italic border-r border-slate-800">
                          Not active for {selectedProcessCode}
                        </td>
                        {DAYS_OF_NOV.map((d) => (
                          <td key={d.day} className="py-1 px-0.5 text-center border-r border-slate-800/50 text-slate-700">
                            -
                          </td>
                        ))}
                      </tr>
                    )
                  }

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-4 font-bold text-white border-r border-slate-800 sticky left-0 bg-slate-900">
                        {b.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-300 border-r border-slate-800">
                        {rule.operating_calendar}
                      </td>
                      {DAYS_OF_NOV.map((d) => {
                        const cov = evaluateDailyCoverage(b, rule, d)
                        const style = getCoverageCellStyle(cov)

                        return (
                          <td
                            key={d.day}
                            className="py-1 px-0.5 text-center border-r border-slate-800/70"
                            title={`${b.name} (${selectedProcessCode}) on ${d.dateStr}: Active ${cov.active} / Req ${cov.required}`}
                          >
                            <div
                              className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-[10px] border ${style}`}
                            >
                              {cov.status === 'CLOSED' ? '·' : `${cov.active}/${cov.required}`}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
