import React, { useState, useEffect, useMemo, useCallback } from 'react'
import * as api from './api'
import Navbar from './components/Navbar'
import RosterMatrixView from './components/RosterMatrixView'
import BrandCoverageView from './components/BrandCoverageView'
import ConflictPanel from './components/ConflictPanel'
import ChangeSimulatorModal from './components/ChangeSimulatorModal'
import ConfigManagerView from './components/ConfigManagerView'
import {
  AlertCircle,
  CheckCircle2,
  X,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('roster') // 'roster' | 'brand-coverage' | 'config'
  const [yearMonth, setYearMonth] = useState('2026-11')

  // Main Data States
  const [rosterEntries, setRosterEntries] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [employees, setEmployees] = useState([])
  const [brands, setBrands] = useState([])
  const [pods, setPods] = useState([])
  const [processRules, setProcessRules] = useState([])
  const [assignments, setAssignments] = useState([])
  const [leaves, setLeaves] = useState([])
  const [holidays, setHolidays] = useState([])

  // UI States
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isUpdatingCell, setIsUpdatingCell] = useState(false)
  const [isResolvingBackup, setIsResolvingBackup] = useState(false)

  // Drawer / Modal States
  const [isConflictDrawerOpen, setIsConflictDrawerOpen] = useState(false)
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)

  // Toast Notification
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev))
    }, 4500)
  }

  // Load All System Data
  const loadAllData = useCallback(async (showNotification = false) => {
    try {
      setIsLoading(true)
      const [
        rosterData,
        conflictData,
        empData,
        brandData,
        podData,
        ruleData,
        assignData,
        leaveData,
        holidayData
      ] = await Promise.all([
        api.fetchRoster(yearMonth),
        api.validateRoster(yearMonth),
        api.fetchEmployees(),
        api.fetchBrands(),
        api.fetchPods(),
        api.fetchProcessRules(),
        api.fetchAssignments(),
        api.fetchLeaves({ month: yearMonth }),
        api.fetchHolidays(yearMonth)
      ])

      setRosterEntries(rosterData)
      setConflicts(conflictData)
      setEmployees(empData)
      setBrands(brandData)
      setPods(podData)
      setProcessRules(ruleData)
      setAssignments(assignData)
      setLeaves(leaveData)
      setHolidays(holidayData)

      if (showNotification) {
        showToast('success', 'Roster and validation data refreshed successfully.')
      }
    } catch (err) {
      console.error('Error loading roster data:', err)
      showToast('error', `Failed to load data: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [yearMonth])

  // Initial mount
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Action: Generate Roster
  const handleGenerateRoster = async () => {
    setIsGenerating(true)
    try {
      const res = await api.generateRoster(yearMonth)
      await loadAllData()
      showToast('success', res.message || `Generated ${res.entries_count} roster shifts for ${yearMonth}!`)
    } catch (err) {
      showToast('error', `Generation failed: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Action: Reset Demo
  const handleResetDemo = async () => {
    if (!confirm('Reset demo data? This will restore the exact November 2026 baseline with 32 employees, 20 brands, and baseline schedule.')) {
      return
    }
    setIsResetting(true)
    try {
      const res = await api.resetDemo()
      await loadAllData()
      showToast('success', res.message || 'Demo dataset reset to November 2026 baseline.')
    } catch (err) {
      showToast('error', `Reset failed: ${err.message}`)
    } finally {
      setIsResetting(false)
    }
  }

  // Action: Cell Update
  const handleCellUpdate = async (payload) => {
    setIsUpdatingCell(true)
    try {
      const res = await api.updateCell(payload)
      // Refresh roster & conflicts
      const [newRoster, newConflicts, newLeaves] = await Promise.all([
        api.fetchRoster(yearMonth),
        api.validateRoster(yearMonth),
        api.fetchLeaves({ month: yearMonth })
      ])
      setRosterEntries(newRoster)
      setConflicts(newConflicts)
      setLeaves(newLeaves)

      const conflictCount = res.date_conflicts?.length || 0
      showToast(
        conflictCount > 0 ? 'warning' : 'success',
        `${res.message} ${conflictCount > 0 ? `(${conflictCount} conflicts on this date)` : ''}`
      )
    } catch (err) {
      showToast('error', `Cell update failed: ${err.message}`)
    } finally {
      setIsUpdatingCell(false)
    }
  }

  // Action: Simulate Change
  const handleSimulateChange = async (payload) => {
    try {
      const result = await api.simulateChange(payload)
      return result
    } catch (err) {
      showToast('error', `Simulation error: ${err.message}`)
      throw err
    }
  }

  // Action: 1-Click Backup Assignment
  const handleAssignBackup = async (payload) => {
    setIsResolvingBackup(true)
    try {
      const res = await api.assignBackup(payload)
      const [newRoster, newConflicts] = await Promise.all([
        api.fetchRoster(yearMonth),
        api.validateRoster(yearMonth)
      ])
      setRosterEntries(newRoster)
      setConflicts(newConflicts)
      showToast('success', `Assigned ${res.employee_name} as backup for ${res.backup_for_brand_name} (${res.backup_process_code}) on ${res.date}!`)
    } catch (err) {
      showToast('error', `Backup assignment failed: ${err.message}`)
    } finally {
      setIsResolvingBackup(false)
    }
  }

  // Action: Commit Simulation Change alone
  const handleCommitChange = async (updatePayload) => {
    await handleCellUpdate(updatePayload)
    showToast('success', 'Simulated change successfully committed to schedule.')
  }

  // Action: Commit Simulation Change AND assign recommended backup
  const handleCommitWithBackup = async (updatePayload, backupPayload) => {
    await handleCellUpdate(updatePayload)
    await handleAssignBackup(backupPayload)
    showToast('success', 'Change committed and recommended backup assigned simultaneously!')
  }

  // Action: Export CSV
  const handleExportCSV = () => {
    try {
      const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const headers = ['Employee Code', 'Employee Name', 'Role', 'Pod']

      for (let day = 1; day <= 30; day++) {
        const d = new Date(2026, 10, day)
        const wk = weekdayNames[d.getDay()]
        // Format as "Nov 01 (Sun)" so Excel treats it as clean text and never displays "########"
        headers.push(`"Nov ${String(day).padStart(2, '0')} (${wk})"`)
      }
      headers.push('Total Working', 'Total Off', 'Total Leave')

      // Clean, industry-standard 1-2 letter shift codes for readable CSV matrix
      const shortCodes = {
        WORKING: 'W',
        WEEKLY_OFF: 'WO',
        PUBLIC_HOLIDAY: 'PH',
        LEAVE: 'LV',
        COMP_OFF: 'CO'
      }

      const rows = employees.map((emp) => {
        const row = [emp.emp_code, `"${emp.name}"`, emp.role, `"${emp.pod_name || ''}"`]
        let work = 0, off = 0, leave = 0

        for (let day = 1; day <= 30; day++) {
          const dateStr = `2026-11-${String(day).padStart(2, '0')}`
          const entry = rosterEntries.find((r) => r.employee_id === emp.id && r.date === dateStr)
          const status = entry ? entry.status : 'N/A'
          const code = shortCodes[status] || status
          const backup = entry?.backup_for_brand_name ? ` [BK:${entry.backup_for_brand_name}]` : ''
          row.push(`"${code}${backup}"`)

          if (status === 'WORKING') work++
          else if (status === 'WEEKLY_OFF' || status === 'PUBLIC_HOLIDAY') off++
          else if (status === 'LEAVE' || status === 'COMP_OFF') leave++
        }

        row.push(work, off, leave)
        return row.join(',')
      })

      const csvContent = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `SmartRoster_November2026.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast('success', 'Roster matrix exported as CSV!')
    } catch (err) {
      showToast('error', `CSV Export failed: ${err.message}`)
    }
  }

  // KPI Calculations
  const stats = useMemo(() => {
    const singleBrandsCount = brands.filter((b) => b.staffing_type === 'SINGLE_RESOURCE').length
    const multiBrandsCount = brands.filter((b) => b.staffing_type === 'MULTI_RESOURCE').length

    let workingCount = 0
    let leaveCount = 0
    rosterEntries.forEach((r) => {
      if (r.status === 'WORKING') workingCount++
      if (r.status === 'LEAVE' || r.status === 'COMP_OFF') leaveCount++
    })

    const criticalCount = conflicts.filter((c) => c.severity === 'CRITICAL').length
    const warningCount = conflicts.filter((c) => c.severity === 'WARNING').length

    // Health Score: 100% minus penalty for critical conflicts
    const health = Math.max(70, Math.min(100, Math.round(100 - criticalCount * 1.25)))

    return {
      totalEmployees: employees.length || 32,
      totalBrands: brands.length || 20,
      singleBrands: singleBrandsCount || 16,
      multiBrands: multiBrandsCount || 4,
      coverageHealthPct: health,
      workingCount,
      leaveCount,
      criticalCount,
      warningCount
    }
  }, [employees, brands, rosterEntries, conflicts])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Command Bar */}
      <Navbar
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onGenerateRoster={handleGenerateRoster}
        onResetDemo={handleResetDemo}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onToggleConflicts={() => setIsConflictDrawerOpen((prev) => !prev)}
        onExportCSV={handleExportCSV}
        isGenerating={isGenerating}
        isResetting={isResetting}
        conflictCount={conflicts.length}
        criticalCount={stats.criticalCount}
      />

      {/* Main Content Body */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24 space-y-4 text-slate-400">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm font-semibold tracking-wide">
              Loading Smart Roster Operations Engine...
            </p>
          </div>
        ) : (
          <>
            {/* View 1: Roster Matrix View (Company, Pod, Employee) */}
            {activeTab === 'roster' && (
              <RosterMatrixView
                rosterEntries={rosterEntries}
                employees={employees}
                pods={pods}
                assignments={assignments}
                brands={brands}
                onCellUpdate={handleCellUpdate}
                isUpdating={isUpdatingCell}
              />
            )}

            {/* View 2: Brand Coverage View (Brand, Process) */}
            {activeTab === 'brand-coverage' && (
              <BrandCoverageView
                brands={brands}
                processRules={processRules}
                assignments={assignments}
                employees={employees}
                rosterEntries={rosterEntries}
                pods={pods}
                onSelectConflictDate={(date) => {
                  setIsConflictDrawerOpen(true)
                }}
              />
            )}

            {/* View 3: Configuration Manager View */}
            {activeTab === 'config' && (
              <ConfigManagerView
                employees={employees}
                brands={brands}
                pods={pods}
                processRules={processRules}
                assignments={assignments}
                leaves={leaves}
                holidays={holidays}
                onRefreshData={() => loadAllData(true)}
                api={api}
              />
            )}
          </>
        )}
      </main>

      {/* Slide-out Conflict Resolution Drawer */}
      <ConflictPanel
        isOpen={isConflictDrawerOpen}
        onClose={() => setIsConflictDrawerOpen(false)}
        conflicts={conflicts}
        onAssignBackup={handleAssignBackup}
        isResolving={isResolvingBackup}
      />

      {/* Change Simulator Modal (Section 3F) */}
      <ChangeSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        employees={employees}
        onSimulate={handleSimulateChange}
        onCommitChange={handleCommitChange}
        onCommitWithBackup={handleCommitWithBackup}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold ${
              toast.type === 'error'
                ? 'bg-rose-950 text-rose-200 border-rose-800 shadow-rose-950/50'
                : toast.type === 'warning'
                ? 'bg-amber-950 text-amber-200 border-amber-800 shadow-amber-950/50'
                : 'bg-emerald-950 text-emerald-200 border-emerald-800 shadow-emerald-950/50'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
