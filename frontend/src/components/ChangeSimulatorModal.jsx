import React, { useState } from 'react'
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Calendar,
  ArrowRight,
  ShieldAlert,
  UserCheck
} from 'lucide-react'

export default function ChangeSimulatorModal({
  isOpen,
  onClose,
  employees = [],
  onSimulate,
  onCommitChange,
  onCommitWithBackup,
  isSimulating = false,
  isCommitting = false
}) {
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '')
  const [selectedDate, setSelectedDate] = useState('2026-11-05')
  const [newStatus, setNewStatus] = useState('LEAVE')
  const [notes, setNotes] = useState('Mid-month unplanned leave request')

  const [simResult, setSimResult] = useState(null)
  const [hasSimulated, setHasSimulated] = useState(false)

  if (!isOpen) return null

  const handleRunSimulation = async () => {
    setHasSimulated(true)
    const res = await onSimulate({
      employee_id: Number(selectedEmpId || employees[0]?.id),
      date: selectedDate,
      new_status: newStatus,
      notes
    })
    setSimResult(res)
  }

  const handleCommitOnly = async () => {
    await onCommitChange({
      employee_id: Number(selectedEmpId || employees[0]?.id),
      date: selectedDate,
      status: newStatus,
      notes,
      leave_type: 'PLANNED_LEAVE',
      reason: notes
    })
    onClose()
  }

  const handleCommitWithBackupAction = async (backupPayload) => {
    await onCommitWithBackup(
      {
        employee_id: Number(selectedEmpId || employees[0]?.id),
        date: selectedDate,
        status: newStatus,
        notes,
        leave_type: 'PLANNED_LEAVE',
        reason: notes
      },
      backupPayload
    )
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Mid-Month Availability & Change Simulator
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Section 3F
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Preview downstream coverage impacts before committing roster changes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          {/* Employee */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Select Employee:
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value)
                setSimResult(null)
                setHasSimulated(false)
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.emp_code} — {e.name} ({e.role})
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Simulation Date:
            </label>
            <select
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setSimResult(null)
                setHasSimulated(false)
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {Array.from({ length: 30 }, (_, i) => {
                const day = String(i + 1).padStart(2, '0')
                return `2026-11-${day}`
              }).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* New Status */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Proposed Status:
            </label>
            <select
              value={newStatus}
              onChange={(e) => {
                setNewStatus(e.target.value)
                setSimResult(null)
                setHasSimulated(false)
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="LEAVE">LEAVE (Unplanned / Emergency)</option>
              <option value="WEEKLY_OFF">WEEKLY_OFF (Shift change)</option>
              <option value="WORKING">WORKING (Overtime / Call-in)</option>
              <option value="COMP_OFF">COMP_OFF</option>
            </select>
          </div>

          {/* Reason */}
          <div className="sm:col-span-3">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Reason / Change Explanation:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Family emergency, shift swap, sick leave..."
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Run Simulation CTA */}
        <div className="flex justify-end">
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
            {isSimulating ? 'Simulating Impact...' : 'Simulate Change Impact'}
          </button>
        </div>

        {/* Simulation Results Card */}
        {simResult && (
          <div className="space-y-4 pt-2">
            {/* Impact Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                simResult.can_maintain_coverage
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-800 text-rose-200 shadow-lg shadow-rose-950/30'
              }`}
            >
              {simResult.can_maintain_coverage ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-bounce" />
              )}
              <div className="space-y-1">
                <h4 className="text-sm font-bold">
                  {simResult.can_maintain_coverage
                    ? 'Coverage Maintained — Safe to Apply'
                    : 'Coverage Gap Detected — Client Minimum Staffing Breach'}
                </h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  {simResult.ai_explanation}
                </p>
              </div>
            </div>

            {/* Impacted Processes Comparison Table */}
            {simResult.impacted_processes.length > 0 && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Impact on Assigned Brand Processes
                </h4>
                <div className="space-y-2">
                  {simResult.impacted_processes.map((proc, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{proc.brand_name}</span>
                          <span className="font-mono text-emerald-400 font-bold">({proc.process_code})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Required Minimum Staff: <span className="text-slate-200 font-bold">{proc.required_staff}</span>
                        </div>
                      </div>

                      {/* Before vs After Pill */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-center">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Current</span>
                            <span className="font-mono font-bold text-slate-300">{proc.current_active_staff}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                          <div>
                            <span className="text-[10px] text-slate-500 block">Simulated</span>
                            <span
                              className={`font-mono font-bold ${
                                proc.coverage_maintained ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {proc.simulated_active_staff}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            proc.coverage_maintained
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border-rose-700'
                          }`}
                        >
                          {proc.coverage_maintained ? 'Maintained' : `Gap (-${proc.gap_size})`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Backup Dispatch (if gap occurred) */}
            {simResult.impacted_processes.some((p) => p.recommended_backups?.length > 0) && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-sky-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-sky-300 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-sky-400" />
                    Recommended Pod Backup Resolution (1-Click)
                  </h4>
                  <span className="text-[10px] text-slate-400 italic">Dispatches available pod teammate</span>
                </div>

                <div className="space-y-2">
                  {simResult.impacted_processes
                    .filter((p) => p.recommended_backups?.length > 0)
                    .map((p) => (
                      <div key={p.brand_id} className="space-y-2">
                        {p.recommended_backups.map((act, bIdx) => (
                          <div
                            key={bIdx}
                            className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-white">
                                {act.label}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Current Load: <span className="text-emerald-400 font-bold">{act.candidate.current_utilization_pct}%</span> • Candidate Role: <span className="text-slate-300">{act.candidate.role}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleCommitWithBackupAction(act.payload)}
                              disabled={isCommitting}
                              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-600/20 transition disabled:opacity-50"
                            >
                              Commit & Assign Backup
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Commit Change Alone Button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                {simResult.can_maintain_coverage
                  ? 'All brand requirements satisfied.'
                  : 'Warning: Committing without backup will register an active critical conflict.'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommitOnly}
                  disabled={isCommitting}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition disabled:opacity-50 ${
                    simResult.can_maintain_coverage
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-rose-700 hover:bg-rose-600 text-white shadow-md shadow-rose-700/20'
                  }`}
                >
                  {isCommitting ? 'Committing...' : 'Commit Change'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
