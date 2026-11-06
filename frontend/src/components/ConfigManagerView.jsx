import React, { useState } from 'react'
import {
  Users,
  Building2,
  Layers,
  Briefcase,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sliders,
  ShieldAlert,
  Search
} from 'lucide-react'

export default function ConfigManagerView({
  employees = [],
  brands = [],
  pods = [],
  processRules = [],
  assignments = [],
  leaves = [],
  holidays = [],
  onRefreshData,
  api
}) {
  const [activeSubTab, setActiveSubTab] = useState('employees')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal / Add Form State
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Forms State
  const [newEmp, setNewEmp] = useState({
    emp_code: 'EMP-033',
    name: '',
    role: 'AGENT',
    pod_id: pods[0]?.id || 1,
    preferred_weekly_off: 6,
    max_daily_capacity: 100,
    skills: 'CS, ACC'
  })

  const [newBrand, setNewBrand] = useState({
    name: '',
    pod_id: pods[0]?.id || 1,
    staffing_type: 'SINGLE_RESOURCE'
  })

  const [newRule, setNewRule] = useState({
    brand_id: brands[0]?.id || 1,
    process_code: 'CS',
    operating_calendar: 'MON_SAT_EXCEPT_HOLIDAYS',
    min_daily_staff: 1,
    sunday_min_staff: 0
  })

  const [newAssign, setNewAssign] = useState({
    employee_id: employees[0]?.id || 1,
    brand_id: brands[0]?.id || 1,
    process_code: 'CS',
    allocation_pct: 100,
    is_primary: true
  })

  const [newLeave, setNewLeave] = useState({
    employee_id: employees[0]?.id || 1,
    date: '2026-11-20',
    leave_type: 'PLANNED_LEAVE',
    reason: 'Planned vacation'
  })

  // Submit Handlers
  const handleCreateEmployee = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const skillsArray = newEmp.skills.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      await api.createEmployee({
        ...newEmp,
        pod_id: Number(newEmp.pod_id),
        preferred_weekly_off: Number(newEmp.preferred_weekly_off),
        max_daily_capacity: Number(newEmp.max_daily_capacity),
        skills: skillsArray
      })
      setShowAddModal(false)
      await onRefreshData()
    } catch (err) {
      alert(`Error creating employee: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEmployee = async (id, name) => {
    if (!confirm(`Are you sure you want to delete employee "${name}"?`)) return
    try {
      await api.deleteEmployee(id)
      await onRefreshData()
    } catch (err) {
      alert(`Error deleting employee: ${err.message}`)
    }
  }

  const handleCreateBrand = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api.createBrand({
        ...newBrand,
        pod_id: Number(newBrand.pod_id)
      })
      setShowAddModal(false)
      await onRefreshData()
    } catch (err) {
      alert(`Error creating brand: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBrand = async (id, name) => {
    if (!confirm(`Are you sure you want to delete brand "${name}"?`)) return
    try {
      await api.deleteBrand(id)
      await onRefreshData()
    } catch (err) {
      alert(`Error deleting brand: ${err.message}`)
    }
  }

  const handleCreateRule = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api.createProcessRule({
        ...newRule,
        brand_id: Number(newRule.brand_id),
        min_daily_staff: Number(newRule.min_daily_staff),
        sunday_min_staff: Number(newRule.sunday_min_staff)
      })
      setShowAddModal(false)
      await onRefreshData()
    } catch (err) {
      alert(`Error creating process rule: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRule = async (id) => {
    if (!confirm('Are you sure you want to delete this process rule?')) return
    try {
      await api.deleteProcessRule(id)
      await onRefreshData()
    } catch (err) {
      alert(`Error deleting rule: ${err.message}`)
    }
  }

  const handleCreateAssign = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api.createAssignment({
        ...newAssign,
        employee_id: Number(newAssign.employee_id),
        brand_id: Number(newAssign.brand_id),
        allocation_pct: Number(newAssign.allocation_pct)
      })
      setShowAddModal(false)
      await onRefreshData()
    } catch (err) {
      alert(`Error creating assignment: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAssign = async (id) => {
    if (!confirm('Are you sure you want to delete this employee assignment?')) return
    try {
      await api.deleteAssignment(id)
      await onRefreshData()
    } catch (err) {
      alert(`Error deleting assignment: ${err.message}`)
    }
  }

  const handleCreateLeave = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api.createLeave({
        ...newLeave,
        employee_id: Number(newLeave.employee_id)
      })
      setShowAddModal(false)
      await onRefreshData()
    } catch (err) {
      alert(`Error creating leave: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLeave = async (id) => {
    if (!confirm('Are you sure you want to delete this leave record?')) return
    try {
      await api.deleteLeave(id)
      await onRefreshData()
    } catch (err) {
      alert(`Error deleting leave: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Subtabs and Top Bar */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Subtabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs flex-wrap">
          <button
            onClick={() => { setActiveSubTab('employees'); setSearchQuery('') }}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'employees'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Employees ({employees.length})
          </button>

          <button
            onClick={() => { setActiveSubTab('brands'); setSearchQuery('') }}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'brands'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Brands ({brands.length})
          </button>

          <button
            onClick={() => { setActiveSubTab('rules'); setSearchQuery('') }}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'rules'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Process Rules ({processRules.length})
          </button>

          <button
            onClick={() => { setActiveSubTab('assignments'); setSearchQuery('') }}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'assignments'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Assignments ({assignments.length})
          </button>

          <button
            onClick={() => { setActiveSubTab('leaves'); setSearchQuery('') }}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'leaves'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Planned Leaves ({leaves.length})
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Add New {activeSubTab.slice(0, -1)}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. EMPLOYEES TABLE                                            */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'employees' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Pod</th>
                  <th className="py-3 px-3">Pref. Off</th>
                  <th className="py-3 px-3">Capacity</th>
                  <th className="py-3 px-4">Skills</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-300">{e.emp_code}</td>
                    <td className="py-2.5 px-4 font-bold text-white">{e.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                        {e.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{e.pod_name || `Pod #${e.pod_id}`}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][e.preferred_weekly_off]}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400">{e.max_daily_capacity}%</td>
                    <td className="py-2.5 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {(e.skills || []).map((sk) => (
                          <span key={sk} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteEmployee(e.id, e.name)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete employee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. BRANDS TABLE                                               */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'brands' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Brand Name</th>
                  <th className="py-3 px-3">Pod</th>
                  <th className="py-3 px-3">Staffing Model</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {brands.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-mono text-slate-500">{b.id}</td>
                    <td className="py-2.5 px-4 font-bold text-white">{b.name}</td>
                    <td className="py-2.5 px-3 text-slate-300">{b.pod_name || `Pod #${b.pod_id}`}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          b.staffing_type === 'SINGLE_RESOURCE'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                            : 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80'
                        }`}
                      >
                        {b.staffing_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteBrand(b.id, b.name)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete brand"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. PROCESS RULES TABLE                                        */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'rules' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-3">Process</th>
                  <th className="py-3 px-4">Operating Calendar</th>
                  <th className="py-3 px-3">Min Daily Staff</th>
                  <th className="py-3 px-3">Sunday Min Staff</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {processRules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-bold text-white">{r.brand_name || `Brand #${r.brand_id}`}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{r.process_code}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-300">{r.operating_calendar}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{r.min_daily_staff}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{r.sunday_min_staff}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteRule(r.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. ASSIGNMENTS TABLE                                          */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'assignments' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-3">Process</th>
                  <th className="py-3 px-3">Allocation %</th>
                  <th className="py-3 px-3">Primary</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-bold text-white">{a.employee_name || `Emp #${a.employee_id}`}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-300">{a.brand_name || `Brand #${a.brand_id}`}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{a.process_code}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-200">{a.allocation_pct}%</td>
                    <td className="py-2.5 px-3 text-slate-400">{a.is_primary ? 'Yes' : 'Secondary'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteAssign(a.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. PLANNED LEAVES TABLE                                       */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'leaves' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-300">{l.date}</td>
                    <td className="py-2.5 px-4 font-bold text-white">{l.employee_name || `Emp #${l.employee_id}`}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{l.employee_code}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 border border-rose-800 text-rose-300">
                        {l.leave_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 italic">{l.reason || '-'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteLeave(l.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete leave"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* GENERIC ADD MODAL                                             */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                Add New {activeSubTab.slice(0, -1).toUpperCase()}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Form */}
            {activeSubTab === 'employees' && (
              <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={newEmp.emp_code}
                    onChange={(e) => setNewEmp({ ...newEmp, emp_code: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newEmp.name}
                    onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Role</label>
                    <select
                      value={newEmp.role}
                      onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="AGENT">AGENT</option>
                      <option value="POD_LEAD">POD_LEAD</option>
                      <option value="FLOATER">FLOATER</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Pod</label>
                    <select
                      value={newEmp.pod_id}
                      onChange={(e) => setNewEmp({ ...newEmp, pod_id: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      {pods.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={newEmp.skills}
                    onChange={(e) => setNewEmp({ ...newEmp, skills: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-emerald-600 rounded-lg text-white font-semibold">
                    {isSubmitting ? 'Saving...' : 'Save Employee'}
                  </button>
                </div>
              </form>
            )}

            {/* Brand Form */}
            {activeSubTab === 'brands' && (
              <form onSubmit={handleCreateBrand} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Brand Name</label>
                  <input
                    type="text"
                    required
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Pod</label>
                    <select
                      value={newBrand.pod_id}
                      onChange={(e) => setNewBrand({ ...newBrand, pod_id: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      {pods.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Staffing Type</label>
                    <select
                      value={newBrand.staffing_type}
                      onChange={(e) => setNewBrand({ ...newBrand, staffing_type: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="SINGLE_RESOURCE">SINGLE_RESOURCE (80%)</option>
                      <option value="MULTI_RESOURCE">MULTI_RESOURCE (20%)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-emerald-600 rounded-lg text-white font-semibold">
                    {isSubmitting ? 'Saving...' : 'Save Brand'}
                  </button>
                </div>
              </form>
            )}

            {/* Process Rule Form */}
            {activeSubTab === 'rules' && (
              <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Brand</label>
                  <select
                    value={newRule.brand_id}
                    onChange={(e) => setNewRule({ ...newRule, brand_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Process Code</label>
                    <select
                      value={newRule.process_code}
                      onChange={(e) => setNewRule({ ...newRule, process_code: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="CS">CS</option>
                      <option value="ACC">ACC</option>
                      <option value="NDR">NDR</option>
                      <option value="RET">RET</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Operating Calendar</label>
                    <select
                      value={newRule.operating_calendar}
                      onChange={(e) => setNewRule({ ...newRule, operating_calendar: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="MON_SAT_EXCEPT_HOLIDAYS">MON_SAT_EXCEPT_HOLIDAYS</option>
                      <option value="DAILY_EXCEPT_HOLIDAYS">DAILY_EXCEPT_HOLIDAYS</option>
                      <option value="DAYS_365">DAYS_365</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Min Daily Staff</label>
                    <input
                      type="number"
                      min="1"
                      value={newRule.min_daily_staff}
                      onChange={(e) => setNewRule({ ...newRule, min_daily_staff: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Sunday Min Staff</label>
                    <input
                      type="number"
                      min="0"
                      value={newRule.sunday_min_staff}
                      onChange={(e) => setNewRule({ ...newRule, sunday_min_staff: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-emerald-600 rounded-lg text-white font-semibold">
                    {isSubmitting ? 'Saving...' : 'Save Rule'}
                  </button>
                </div>
              </form>
            )}

            {/* Assignments Form */}
            {activeSubTab === 'assignments' && (
              <form onSubmit={handleCreateAssign} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Employee</label>
                  <select
                    value={newAssign.employee_id}
                    onChange={(e) => setNewAssign({ ...newAssign, employee_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.emp_code} - {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Brand</label>
                  <select
                    value={newAssign.brand_id}
                    onChange={(e) => setNewAssign({ ...newAssign, brand_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Process</label>
                    <select
                      value={newAssign.process_code}
                      onChange={(e) => setNewAssign({ ...newAssign, process_code: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="CS">CS</option>
                      <option value="ACC">ACC</option>
                      <option value="NDR">NDR</option>
                      <option value="RET">RET</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Allocation %</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newAssign.allocation_pct}
                      onChange={(e) => setNewAssign({ ...newAssign, allocation_pct: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-emerald-600 rounded-lg text-white font-semibold">
                    {isSubmitting ? 'Saving...' : 'Save Assignment'}
                  </button>
                </div>
              </form>
            )}

            {/* Leave Form */}
            {activeSubTab === 'leaves' && (
              <form onSubmit={handleCreateLeave} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Employee</label>
                  <select
                    value={newLeave.employee_id}
                    onChange={(e) => setNewLeave({ ...newLeave, employee_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.emp_code} - {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Date</label>
                    <input
                      type="date"
                      value={newLeave.date}
                      onChange={(e) => setNewLeave({ ...newLeave, date: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Leave Type</label>
                    <select
                      value={newLeave.leave_type}
                      onChange={(e) => setNewLeave({ ...newLeave, leave_type: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="PLANNED_LEAVE">Planned Leave</option>
                      <option value="EMERGENCY_LEAVE">Emergency Leave</option>
                      <option value="COMP_OFF">Comp-Off</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Reason</label>
                  <input
                    type="text"
                    value={newLeave.reason}
                    onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-emerald-600 rounded-lg text-white font-semibold">
                    {isSubmitting ? 'Saving...' : 'Save Leave'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
