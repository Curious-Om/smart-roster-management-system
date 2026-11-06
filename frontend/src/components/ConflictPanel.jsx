import React, { useState, useMemo } from 'react'
import {
  X,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Sparkles,
  UserPlus,
  ArrowRight,
  Clock,
  Building,
  HelpCircle
} from 'lucide-react'

export default function ConflictPanel({
  isOpen,
  onClose,
  conflicts = [],
  onAssignBackup,
  isResolving = false
}) {
  const [filterSeverity, setFilterSeverity] = useState('ALL') // 'ALL' | 'CRITICAL' | 'WARNING'
  const [filterType, setFilterType] = useState('ALL')
  const [resolvingId, setResolvingId] = useState(null)

  // Counts
  const criticalCount = useMemo(() => conflicts.filter((c) => c.severity === 'CRITICAL').length, [conflicts])
  const warningCount = useMemo(() => conflicts.filter((c) => c.severity === 'WARNING').length, [conflicts])

  // Filtered conflicts list
  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      if (filterSeverity !== 'ALL' && c.severity !== filterSeverity) return false
      if (filterType !== 'ALL' && c.conflict_type !== filterType) return false
      return true
    })
  }, [conflicts, filterSeverity, filterType])

  if (!isOpen) return null

  const handle1ClickResolution = async (action, conflictId) => {
    setResolvingId(conflictId)
    try {
      await onAssignBackup(action.payload)
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Conflict Detection & Resolution Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time rule validator identifying hard SLA breaches, leave gaps, and soft preference overrides
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Severity Toggles & Filter Bar */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Severity Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterSeverity('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                filterSeverity === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({conflicts.length})
            </button>
            <button
              onClick={() => setFilterSeverity('CRITICAL')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition ${
                filterSeverity === 'CRITICAL'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-400 hover:bg-rose-950/40'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setFilterSeverity('WARNING')}
              className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                filterSeverity === 'WARNING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-400 hover:bg-amber-950/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Warnings ({warningCount})
            </button>
          </div>

          {/* Conflict Type Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Conflict Types</option>
            <option value="UNMET_BRAND_COVERAGE">UNMET_BRAND_COVERAGE</option>
            <option value="SINGLE_RESOURCE_UNAVAILABLE">SINGLE_RESOURCE_UNAVAILABLE</option>
            <option value="OVERLAPPING_CAPACITY_EXCEEDED">OVERLAPPING_CAPACITY_EXCEEDED</option>
            <option value="LEAVE_COVERAGE_CONFLICT">LEAVE_COVERAGE_CONFLICT</option>
            <option value="PREFERENCE_OVERRIDDEN">PREFERENCE_OVERRIDDEN</option>
            <option value="CONSECUTIVE_WORK_LIMIT">CONSECUTIVE_WORK_LIMIT</option>
          </select>
        </div>

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {filteredConflicts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <ShieldCheck className="w-12 h-12 text-emerald-500/40 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">
                No conflicts match your active filter!
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All scheduled shifts comply with brand operational rules, capacity limits, and labor guidelines.
              </p>
            </div>
          ) : (
            filteredConflicts.map((c) => {
              const isCritical = c.severity === 'CRITICAL'
              const hasActions = c.recommended_actions && c.recommended_actions.length > 0

              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-2xl border transition shadow-lg ${
                    isCritical
                      ? 'bg-rose-950/30 border-rose-800/80 shadow-rose-950/20'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Severity, Conflict Type, Date */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          isCritical
                            ? 'bg-rose-600 text-white border-rose-500'
                            : 'bg-amber-950/80 text-amber-300 border-amber-700'
                        }`}
                      >
                        {c.severity}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-200">
                        {c.conflict_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>{c.date}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] text-slate-500">{c.id}</span>
                    </div>
                  </div>

                  {/* Brand & Employee Target details if available */}
                  {(c.brand_name || c.employee_name) && (
                    <div className="flex items-center gap-3 text-xs text-slate-300 mb-2 font-medium">
                      {c.brand_name && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Building className="w-3.5 h-3.5 text-emerald-500" />
                          {c.brand_name} {c.process_code ? `(${c.process_code})` : ''}
                        </span>
                      )}
                      {c.employee_name && (
                        <span className="text-slate-400">
                          Emp: <span className="text-slate-200 font-semibold">{c.employee_name}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-slate-200 font-medium leading-relaxed mb-3">
                    {c.description}
                  </p>

                  {/* AI Explanation Box */}
                  {c.ai_explanation && (
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 mb-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 uppercase tracking-wide">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        AI Operational Diagnosis
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {c.ai_explanation}
                      </p>
                    </div>
                  )}

                  {/* 1-Click Recommended Actions */}
                  {hasActions && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                        <span>Recommended Pod Backup Candidates:</span>
                        <span className="text-[10px] text-slate-500 italic">1-Click Dispatch</span>
                      </div>
                      <div className="space-y-2">
                        {c.recommended_actions.map((act, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                                {act.label}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Current Load: <span className="text-emerald-400 font-mono font-bold">{act.candidate.current_utilization_pct}%</span> • Pod Role: <span className="text-slate-300">{act.candidate.role}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handle1ClickResolution(act, c.id)}
                              disabled={isResolving && resolvingId === c.id}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition shadow shadow-sky-600/20 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isResolving && resolvingId === c.id ? (
                                <span>Assigning...</span>
                              ) : (
                                <>
                                  <span>Assign</span>
                                  <ArrowRight className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
