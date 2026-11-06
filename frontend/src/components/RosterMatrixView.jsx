import React, { useState, useMemo } from 'react'
import {
  Users,
  Search,
  Filter,
  Check,
  X,
  Calendar as CalendarIcon,
  Briefcase,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  UserCheck,
  Building,
  Clock,
  Sparkles,
  Info
} from 'lucide-react'

// Days of November 2026
const DAYS_OF_NOV = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1
  const dateStr = `2026-11-${String(day).padStart(2, '0')}`
  const d = new Date(2026, 10, day)
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekday = weekdayNames[d.getDay()]
  const isSunday = d.getDay() === 0
  const isSaturday = d.getDay() === 6
  const isHoliday = dateStr === '2026-11-08' || dateStr === '2026-11-24'
  const holidayName = dateStr === '2026-11-08' ? 'Diwali' : dateStr === '2026-11-24' ? 'Guru Nanak Jayanti' : null

  return {
    day,
    dateStr,
    weekday,
    isSunday,
    isSaturday,
    isHoliday,
    holidayName
  }
})

export default function RosterMatrixView({
  rosterEntries = [],
  employees = [],
  pods = [],
  assignments = [],
  brands = [],
  onCellUpdate,
  isUpdating = false
}) {
  // Mode: 'company' | 'pod' | 'employee'
  const [viewMode, setViewMode] = useState('company')
  const [selectedPodId, setSelectedPodId] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)

  // Cell Edit Modal state
  const [activeCell, setActiveCell] = useState(null)
  const [editStatus, setEditStatus] = useState('WORKING')
  const [editLeaveType, setEditLeaveType] = useState('PLANNED_LEAVE')
  const [editReason, setEditReason] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Map entries by (employee_id, date) -> entry
  const entryMap = useMemo(() => {
    const map = {}
    for (const r of rosterEntries) {
      map[`${r.employee_id}_${r.date}`] = r
    }
    return map
  }, [rosterEntries])

  // Map employee assignments for rich tooltip/context
  const empBrandMap = useMemo(() => {
    const map = {}
    for (const a of assignments) {
      if (!map[a.employee_id]) map[a.employee_id] = []
      map[a.employee_id].push(a)
    }
    return map
  }, [assignments])

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedPodId !== 'all' && emp.pod_id !== Number(selectedPodId)) return false
      if (selectedRole !== 'all' && emp.role !== selectedRole) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = emp.name.toLowerCase().includes(q)
        const matchesCode = emp.emp_code.toLowerCase().includes(q)
        if (!matchesName && !matchesCode) return false
      }
      return true
    })
  }, [employees, selectedPodId, selectedRole, searchQuery])

  // Current selected employee for Employee-Wise View
  const activeEmployee = useMemo(() => {
    if (viewMode !== 'employee') return null
    if (selectedEmployeeId) {
      return employees.find((e) => e.id === Number(selectedEmployeeId)) || employees[0]
    }
    return employees[0] || null
  }, [viewMode, selectedEmployeeId, employees])

  // Cell Click Handler
  const handleCellClick = (emp, dayObj) => {
    const entry = entryMap[`${emp.id}_${dayObj.dateStr}`]
    setActiveCell({
      employee: emp,
      day: dayObj,
      entry
    })
    setEditStatus(entry ? entry.status : 'WORKING')
    setEditLeaveType('PLANNED_LEAVE')
    setEditReason(entry && entry.notes ? entry.notes : '')
    setEditNotes(entry && entry.notes ? entry.notes : '')
  }

  // Save Cell Update
  const handleSaveCell = async () => {
    if (!activeCell) return
    const payload = {
      employee_id: activeCell.employee.id,
      date: activeCell.day.dateStr,
      status: editStatus,
      notes: editNotes,
      leave_type: editLeaveType,
      reason: editReason
    }
    await onCellUpdate(payload)
    setActiveCell(null)
  }

  // Status Styling Helper
  const getStatusStyle = (entry) => {
    if (!entry) return 'bg-slate-900/40 text-slate-500 border-slate-800/40'

    const { status, is_override, backup_for_brand_name, notes } = entry
    const isPreferenceViolated = notes && notes.includes('SOFT_PREFERENCE_VIOLATION')

    if (status === 'WORKING') {
      if (backup_for_brand_name) {
        return 'bg-sky-950/60 text-sky-200 border-sky-600/80 font-bold ring-1 ring-sky-500/50 shadow-sm shadow-sky-500/10'
      }
      if (isPreferenceViolated) {
        return 'bg-emerald-950/40 text-emerald-300 border-amber-600/80 font-semibold ring-1 ring-amber-500/30'
      }
      if (is_override) {
        return 'bg-emerald-900/40 text-emerald-200 border-emerald-500 font-semibold'
      }
      return 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40'
    }

    if (status === 'WEEKLY_OFF') {
      return 'bg-slate-900/70 text-slate-400 border-slate-800/80'
    }

    if (status === 'PUBLIC_HOLIDAY') {
      return 'bg-purple-950/60 text-purple-200 border-purple-800/60 font-semibold'
    }

    if (status === 'LEAVE') {
      return 'bg-rose-950/80 text-rose-200 border-rose-700/80 font-bold ring-1 ring-rose-500/40 shadow-sm shadow-rose-950'
    }

    if (status === 'COMP_OFF') {
      return 'bg-amber-950/60 text-amber-200 border-amber-800/60 font-semibold'
    }

    return 'bg-slate-900 text-slate-400 border-slate-800'
  }

  const getStatusShortLabel = (entry) => {
    if (!entry) return '-'
    if (entry.backup_for_brand_name) return 'BK'
    switch (entry.status) {
      case 'WORKING':
        return 'W'
      case 'WEEKLY_OFF':
        return 'WO'
      case 'PUBLIC_HOLIDAY':
        return 'PH'
      case 'LEAVE':
        return 'LV'
      case 'COMP_OFF':
        return 'CO'
      default:
        return entry.status.slice(0, 2)
    }
  }

  // Render a single employee row in Company-wide or Pod-wise matrix
  const renderEmployeeRow = (emp) => {
    // Calculate monthly totals for this employee
    let totalWorking = 0
    let totalOff = 0
    let totalLeave = 0

    DAYS_OF_NOV.forEach((d) => {
      const entry = entryMap[`${emp.id}_${d.dateStr}`]
      if (entry) {
        if (entry.status === 'WORKING') totalWorking++
        else if (entry.status === 'WEEKLY_OFF' || entry.status === 'PUBLIC_HOLIDAY') totalOff++
        else if (entry.status === 'LEAVE' || entry.status === 'COMP_OFF') totalLeave++
      }
    })

    const roleBadgeColor =
      emp.role === 'POD_LEAD'
        ? 'bg-purple-950 text-purple-300 border-purple-800'
        : emp.role === 'FLOATER'
        ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
        : 'bg-slate-800 text-slate-300 border-slate-700'

    const empAssignmentsList = empBrandMap[emp.id] || []

    return (
      <tr key={emp.id} className="hover:bg-slate-800/40 transition group">
        {/* Sticky Employee Name & Code */}
        <td className="py-2 px-3 sticky left-0 z-20 bg-slate-900 group-hover:bg-slate-800 border-r border-slate-800">
          <div className="flex flex-col">
            <span className="font-semibold text-white tracking-tight flex items-center gap-1.5">
              {emp.name}
              {emp.role === 'POD_LEAD' && (
                <span className="text-[10px] text-amber-400 font-bold" title="Pod Lead">★</span>
              )}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {emp.emp_code} • Off: {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][emp.preferred_weekly_off]}
            </span>
            {/* Brand tags preview */}
            {empAssignmentsList.length > 0 && (
              <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                {empAssignmentsList.map((a) => `${a.brand_name || 'Brand'} (${a.process_code})`).join(', ')}
              </div>
            )}
          </div>
        </td>

        {/* Role Badge */}
        <td className="py-2 px-2 text-center border-r border-slate-800">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadgeColor}`}>
            {emp.role}
          </span>
        </td>

        {/* Pod Name */}
        <td className="py-2 px-2 text-center border-r border-slate-800 text-[11px] text-slate-400 font-medium truncate max-w-[85px]">
          {emp.pod_name || 'Unassigned'}
        </td>

        {/* Days 1 to 30 Interactive Cells */}
        {DAYS_OF_NOV.map((d) => {
          const entry = entryMap[`${emp.id}_${d.dateStr}`]
          const style = getStatusStyle(entry)
          const label = getStatusShortLabel(entry)

          return (
            <td
              key={d.day}
              onClick={() => handleCellClick(emp, d)}
              className="py-1 px-0.5 text-center border-r border-slate-800/70 cursor-pointer"
              title={
                entry
                  ? `${emp.name} on ${d.dateStr}: ${entry.status}${entry.backup_for_brand_name ? ` (Backup for ${entry.backup_for_brand_name} ${entry.backup_process_code})` : ''}${entry.notes ? ` - ${entry.notes}` : ''}`
                  : `${emp.name} on ${d.dateStr}`
              }
            >
              <div
                className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-[11px] font-bold border transition-transform hover:scale-110 ${style}`}
              >
                {label}
              </div>
            </td>
          )
        })}

        {/* Totals */}
        <td className="py-2 px-2 text-center border-l border-slate-800 font-bold text-emerald-400">
          {totalWorking}
        </td>
        <td className="py-2 px-2 text-center text-slate-400 font-semibold">
          {totalOff}
        </td>
        <td className="py-2 px-2 text-center font-bold text-rose-400">
          {totalLeave}
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Switcher & Filters */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Stakeholder View Toggle Buttons */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('company')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'company'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Company-Wide View (32 Emps)
          </button>
          <button
            onClick={() => setViewMode('pod')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'pod'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pod-Wise View (3 Pods)
          </button>
          <button
            onClick={() => setViewMode('employee')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'employee'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Employee-Wise View (Monthly Card)
          </button>
        </div>

        {/* Filter Controls (for Company and Pod views) */}
        {viewMode !== 'employee' && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employee or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 w-52"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Pod Selector */}
            {viewMode === 'company' && (
              <select
                value={selectedPodId}
                onChange={(e) => setSelectedPodId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Pods (Alpha, Beta, Gamma)</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Roles</option>
              <option value="AGENT">Agents</option>
              <option value="POD_LEAD">Pod Leads</option>
              <option value="FLOATER">Floaters</option>
            </select>
          </div>
        )}

        {/* Employee Dropdown (for Employee-Wise view) */}
        {viewMode === 'employee' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Select Employee:</span>
            <select
              value={selectedEmployeeId || (activeEmployee ? activeEmployee.id : '')}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.emp_code} — {e.name} ({e.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Legend Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-3 py-2 bg-slate-900/40 rounded-xl border border-slate-800/60 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-slate-300">Status Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-950/60 border border-emerald-700/80 flex items-center justify-center text-[9px] font-bold text-emerald-300">W</span>
            <span>Working</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-400">WO</span>
            <span>Weekly Off</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-purple-950/60 border border-purple-700 flex items-center justify-center text-[9px] font-bold text-purple-300">PH</span>
            <span>Public Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-950/80 border border-rose-700 flex items-center justify-center text-[9px] font-bold text-rose-300">LV</span>
            <span>Approved Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-950/60 border border-amber-700 flex items-center justify-center text-[9px] font-bold text-amber-300">CO</span>
            <span>Comp-Off</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-sky-950/80 border border-sky-500 ring-1 ring-sky-400 flex items-center justify-center text-[9px] font-bold text-sky-200">BK</span>
            <span>Backup Assigned (Override)</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 italic">
          💡 Click any cell to update status or record a leave
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. COMPANY-WIDE VIEW & 2. POD-WISE VIEW MATRIX                */}
      {/* ------------------------------------------------------------- */}
      {viewMode !== 'employee' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[750px] relative">
            <table className="w-full text-left border-collapse border-spacing-0">
              {/* Sticky Table Header */}
              <thead className="bg-slate-950 text-slate-300 text-xs font-semibold sticky top-0 z-30 shadow-md">
                <tr className="border-b border-slate-800">
                  {/* Sticky Employee Name Column */}
                  <th className="py-3 px-4 sticky left-0 z-40 bg-slate-950 min-w-[200px] border-r border-slate-800">
                    Employee Details
                  </th>
                  <th className="py-3 px-3 text-center min-w-[70px] border-r border-slate-800">
                    Role
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px] border-r border-slate-800">
                    Pod
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
                          : d.isSaturday
                          ? 'bg-slate-900 text-slate-300'
                          : 'text-slate-400'
                      }`}
                      title={d.holidayName ? `${d.holidayName} (Public Holiday)` : `${d.dateStr} (${d.weekday})`}
                    >
                      <div className="text-[10px] uppercase font-mono tracking-tighter leading-tight">
                        {d.weekday}
                      </div>
                      <div className="text-xs font-bold leading-tight">{d.day}</div>
                      {d.isHoliday && (
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mx-auto mt-0.5" />
                      )}
                    </th>
                  ))}
                  {/* Monthly Summary Columns */}
                  <th className="py-3 px-3 text-center min-w-[65px] border-l border-slate-800 text-emerald-400">
                    Work
                  </th>
                  <th className="py-3 px-3 text-center min-w-[60px] text-slate-400">
                    Off
                  </th>
                  <th className="py-3 px-3 text-center min-w-[60px] text-rose-400">
                    Leave
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {/* If Pod-Wise View, group by Pods */}
                {viewMode === 'pod' ? (
                  pods.map((pod) => {
                    const podEmps = filteredEmployees.filter((e) => e.pod_id === pod.id)
                    const podLead = employees.find((e) => e.id === pod.pod_lead_id)

                    return (
                      <React.Fragment key={pod.id}>
                        {/* Pod Group Header Row */}
                        <tr className="bg-slate-950/90 font-bold text-white border-y-2 border-slate-700/80">
                          <td
                            colSpan={35}
                            className="py-2.5 px-4 sticky left-0 z-20 bg-slate-950 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                              <span className="text-sm tracking-wide text-emerald-400 font-bold">{pod.name}</span>
                              <span className="text-xs text-slate-400 font-normal">
                                ({podEmps.length} members)
                              </span>
                              {podLead && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800">
                                  Lead: {podLead.name}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Pod Employees Rows */}
                        {podEmps.map((emp) => renderEmployeeRow(emp))}
                      </React.Fragment>
                    )
                  })
                ) : (
                  // Company-Wide flat rows
                  filteredEmployees.map((emp) => renderEmployeeRow(emp))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ------------------------------------------------------------- */}
      {/* 3. EMPLOYEE-WISE VIEW (DEDICATED MONTHLY CARD)                */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'employee' && activeEmployee && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
          {/* Employee Header Profile */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-700 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-emerald-500/20">
                {activeEmployee.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{activeEmployee.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                    {activeEmployee.emp_code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {activeEmployee.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Pod: <span className="text-slate-200 font-medium">{activeEmployee.pod_name || 'N/A'}</span> • Preferred Weekly Off: <span className="text-slate-200 font-medium">{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][activeEmployee.preferred_weekly_off]}</span> • Max Daily Capacity: <span className="text-slate-200 font-medium">{activeEmployee.max_daily_capacity}%</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-slate-400">Certified Skills:</span>
                  {(activeEmployee.skills || []).map((sk) => (
                    <span key={sk} className="px-2 py-0.2 rounded bg-slate-800 text-slate-200 text-[10px] font-mono border border-slate-700">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Assigned Brands Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 min-w-[280px]">
              <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                Assigned Brands & Processes
              </h4>
              <div className="space-y-1.5">
                {(empBrandMap[activeEmployee.id] || []).length > 0 ? (
                  (empBrandMap[activeEmployee.id] || []).map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 font-medium">{a.brand_name || `Brand #${a.brand_id}`}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{a.process_code} • {a.allocation_pct}%</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No static brands assigned (Pod Lead / Floater)</span>
                )}
              </div>
            </div>
          </div>

          {/* Monthly KPI Row for this Employee */}
          {(() => {
            let working = 0, off = 0, leave = 0, holidays = 0, backups = 0
            DAYS_OF_NOV.forEach((d) => {
              const entry = entryMap[`${activeEmployee.id}_${d.dateStr}`]
              if (entry) {
                if (entry.status === 'WORKING') working++
                else if (entry.status === 'WEEKLY_OFF') off++
                else if (entry.status === 'PUBLIC_HOLIDAY') holidays++
                else if (entry.status === 'LEAVE' || entry.status === 'COMP_OFF') leave++
                if (entry.backup_for_brand_name) backups++
              }
            })
            const utilizationPct = Math.round((working / (30 - off - holidays)) * 100) || 100

            return (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Working Days</span>
                  <span className="text-xl font-bold text-emerald-400">{working}</span>
                  <span className="text-[10px] text-slate-500 block">days</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Weekly Offs</span>
                  <span className="text-xl font-bold text-slate-300">{off}</span>
                  <span className="text-[10px] text-slate-500 block">Sundays/Staggered</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Approved Leaves</span>
                  <span className="text-xl font-bold text-rose-400">{leave}</span>
                  <span className="text-[10px] text-slate-500 block">days off</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Public Holidays</span>
                  <span className="text-xl font-bold text-purple-400">{holidays}</span>
                  <span className="text-[10px] text-slate-500 block">Diwali & Gurpurab</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Backups Dispatched</span>
                  <span className="text-xl font-bold text-sky-400">{backups}</span>
                  <span className="text-[10px] text-slate-500 block">cross-brand days</span>
                </div>
              </div>
            )
          })()}

          {/* 30-Day Calendar Grid for this Employee */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
              November 2026 Daily Schedule Calendar
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-7 gap-2.5">
              {DAYS_OF_NOV.map((d) => {
                const entry = entryMap[`${activeEmployee.id}_${d.dateStr}`]
                const style = getStatusStyle(entry)

                return (
                  <div
                    key={d.day}
                    onClick={() => handleCellClick(activeEmployee, d)}
                    className={`p-3 rounded-xl border cursor-pointer transition hover:scale-[1.02] flex flex-col justify-between min-h-[90px] ${style}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">
                        {d.day} {d.weekday}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/30">
                        {entry ? entry.status : 'N/A'}
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-300 leading-snug">
                      {entry?.backup_for_brand_name ? (
                        <span className="text-sky-300 font-semibold block">
                          Covering: {entry.backup_for_brand_name} ({entry.backup_process_code})
                        </span>
                      ) : entry?.notes ? (
                        <span className="truncate block" title={entry.notes}>
                          {entry.notes}
                        </span>
                      ) : d.holidayName ? (
                        <span className="text-purple-300 block">{d.holidayName}</span>
                      ) : (
                        <span className="text-slate-400">Regular shift</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CELL EDIT POPOVER / MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      {activeCell && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Edit Daily Schedule
                  <span className="text-xs font-mono text-emerald-400">
                    {activeCell.day.dateStr}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeCell.employee.name} ({activeCell.employee.emp_code}) • {activeCell.day.weekday}
                </p>
              </div>
              <button
                onClick={() => setActiveCell(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status Preview */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400">Current Status:</span>
              <span className="font-bold text-emerald-400">
                {activeCell.entry ? activeCell.entry.status : 'WORKING'}
              </span>
            </div>

            {/* New Status Options */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                New Status:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['WORKING', 'WEEKLY_OFF', 'LEAVE', 'COMP_OFF'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setEditStatus(st)}
                    className={`py-2 px-3 rounded-lg font-semibold border transition text-center ${
                      editStatus === st
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* If Status is LEAVE, provide leave type and reason */}
            {editStatus === 'LEAVE' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Leave Type:
                  </label>
                  <select
                    value={editLeaveType}
                    onChange={(e) => setEditLeaveType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PLANNED_LEAVE">Planned Leave</option>
                    <option value="EMERGENCY_LEAVE">Emergency Leave</option>
                    <option value="COMP_OFF">Comp-Off</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Leave Reason:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Medical appointment, Family event..."
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Notes / Reason */}
            {editStatus !== 'LEAVE' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Notes (Optional):
                </label>
                <input
                  type="text"
                  placeholder="Reason or override explanation..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveCell(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCell}
                disabled={isUpdating}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save & Validate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
