import React from 'react'
import {
  Calendar,
  Users,
  Building2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Download,
  RotateCcw,
  Sliders,
  Grid3X3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export default function Navbar({
  stats = {},
  activeTab = 'roster',
  setActiveTab,
  onGenerateRoster,
  onResetDemo,
  onOpenSimulator,
  onToggleConflicts,
  onExportCSV,
  isGenerating = false,
  isResetting = false,
  conflictCount = 0,
  criticalCount = 0
}) {
  const {
    totalEmployees = 32,
    totalBrands = 20,
    singleBrands = 16,
    multiBrands = 4,
    coverageHealthPct = 94,
    workingCount = 0,
    leaveCount = 0
  } = stats

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      {/* Top Banner & Primary Brand Bar */}
      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80">
        {/* Logo and System Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Smart Roster Management
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  D2C Ops
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic 80/20 Staffing Engine • 32 Employees • 20 Brands • 3 Pods
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onGenerateRoster}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            title="Generate deterministic schedule for all 32 employees"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate Roster'}
          </button>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
            title="Simulate mid-month leave or availability change before saving"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Simulate Change
          </button>

          <button
            onClick={onToggleConflicts}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
              criticalCount > 0
                ? 'bg-rose-950/60 text-rose-300 border-rose-800/80 hover:bg-rose-900/60 animate-pulse'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title="Open real-time conflict detector & 1-click backup resolution drawer"
          >
            {criticalCount > 0 ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            Conflicts
            {conflictCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                criticalCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-200'
              }`}>
                {conflictCount}
              </span>
            )}
          </button>

          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Export monthly schedule matrix as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-800/50 transition disabled:opacity-50"
            title="Reset database to baseline November 2026 dataset"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            Reset Demo
          </button>
        </div>
      </div>

      {/* KPI Stats Bar & Tab Navigation */}
      <div className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 bg-slate-950/50">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'roster'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Roster Matrix View
          </button>

          <button
            onClick={() => setActiveTab('brand-coverage')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'brand-coverage'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Brand Coverage View
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'config'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Config Manager
          </button>
        </nav>

        {/* Live KPI Pills */}
        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          {/* Month Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">November 2026</span>
            <span className="text-[10px] text-slate-500 font-mono">(30 Days)</span>
          </div>

          {/* Employees Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{totalEmployees} Employees</span>
          </div>

          {/* Brands 80/20 Ratio Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{totalBrands} Brands</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono">
              {singleBrands} Single (80%) / {multiBrands} Multi (20%)
            </span>
          </div>

          {/* Coverage Health Score */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Coverage Health:</span>
            <span className="font-bold text-emerald-400">{coverageHealthPct}%</span>
          </div>

          {/* Conflict Counts */}
          {criticalCount > 0 ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{criticalCount} Critical</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-medium text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Coverage Satisfied</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
