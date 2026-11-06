/**
 * Smart Roster Management System - API Client
 * Wraps all backend endpoints with full support for roster generation,
 * validation conflicts, change simulations, cell updates, and CRUD configs.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorDetail = typeof errorJson.detail === "string" 
            ? errorJson.detail 
            : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fallback to text
      }
      throw new Error(errorDetail);
    }

    return await response.json();
  } catch (err) {
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
    throw err;
  }
}

// -------------------------------------------------------------
// System & Demo Reset
// -------------------------------------------------------------
export async function checkHealth() {
  return request("/api/health");
}

export async function resetDemo() {
  return request("/api/reset-demo", { method: "POST" });
}

// -------------------------------------------------------------
// Roster Operations
// -------------------------------------------------------------
export async function fetchRoster(yearMonth = "2026-11", filters = {}) {
  const params = new URLSearchParams({ year_month: yearMonth });
  if (filters.employee_id) params.append("employee_id", filters.employee_id);
  if (filters.pod_id) params.append("pod_id", filters.pod_id);
  if (filters.date) params.append("date", filters.date);
  if (filters.status) params.append("status", filters.status);
  return request(`/api/roster?${params.toString()}`);
}

export async function generateRoster(yearMonth = "2026-11") {
  return request(`/api/roster/generate?year_month=${encodeURIComponent(yearMonth)}`, {
    method: "POST",
  });
}

export async function validateRoster(yearMonth = "2026-11") {
  return request(`/api/roster/validate?year_month=${encodeURIComponent(yearMonth)}`);
}

export async function updateCell(payload) {
  // payload: { employee_id, date, status, notes, leave_type, reason }
  return request("/api/roster/cell-update", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function simulateChange(payload) {
  // payload: { employee_id, date, new_status, notes }
  return request("/api/roster/simulate-change", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function assignBackup(payload) {
  // payload: { date, employee_id, brand_id, process_code, notes }
  return request("/api/roster/assign-backup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// -------------------------------------------------------------
// Pods CRUD
// -------------------------------------------------------------
export async function fetchPods() {
  return request("/api/pods");
}

export async function fetchPod(podId) {
  return request(`/api/pods/${podId}`);
}

export async function createPod(data) {
  return request("/api/pods", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePod(podId, data) {
  return request(`/api/pods/${podId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePod(podId) {
  return request(`/api/pods/${podId}`, { method: "DELETE" });
}

// -------------------------------------------------------------
// Employees CRUD
// -------------------------------------------------------------
export async function fetchEmployees(filters = {}) {
  const params = new URLSearchParams();
  if (filters.pod_id) params.append("pod_id", filters.pod_id);
  if (filters.role) params.append("role", filters.role);
  const q = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/employees${q}`);
}

export async function fetchEmployee(employeeId) {
  return request(`/api/employees/${employeeId}`);
}

export async function createEmployee(data) {
  return request("/api/employees", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEmployee(employeeId, data) {
  return request(`/api/employees/${employeeId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteEmployee(employeeId) {
  return request(`/api/employees/${employeeId}`, { method: "DELETE" });
}

// -------------------------------------------------------------
// Brands CRUD
// -------------------------------------------------------------
export async function fetchBrands(filters = {}) {
  const params = new URLSearchParams();
  if (filters.pod_id) params.append("pod_id", filters.pod_id);
  if (filters.staffing_type) params.append("staffing_type", filters.staffing_type);
  const q = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/brands${q}`);
}

export async function fetchBrand(brandId) {
  return request(`/api/brands/${brandId}`);
}

export async function createBrand(data) {
  return request("/api/brands", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateBrand(brandId, data) {
  return request(`/api/brands/${brandId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteBrand(brandId) {
  return request(`/api/brands/${brandId}`, { method: "DELETE" });
}

// -------------------------------------------------------------
// Brand Process Rules CRUD
// -------------------------------------------------------------
export async function fetchProcessRules(brandId = null) {
  const q = brandId ? `?brand_id=${brandId}` : "";
  return request(`/api/process-rules${q}`);
}

export async function createProcessRule(data) {
  return request("/api/process-rules", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProcessRule(ruleId, data) {
  return request(`/api/process-rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProcessRule(ruleId) {
  return request(`/api/process-rules/${ruleId}`, { method: "DELETE" });
}

// -------------------------------------------------------------
// Employee Assignments CRUD
// -------------------------------------------------------------
export async function fetchAssignments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.employee_id) params.append("employee_id", filters.employee_id);
  if (filters.brand_id) params.append("brand_id", filters.brand_id);
  const q = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/assignments${q}`);
}

export async function createAssignment(data) {
  return request("/api/assignments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAssignment(assignmentId, data) {
  return request(`/api/assignments/${assignmentId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAssignment(assignmentId) {
  return request(`/api/assignments/${assignmentId}`, { method: "DELETE" });
}

// -------------------------------------------------------------
// Employee Leaves CRUD
// -------------------------------------------------------------
export async function fetchLeaves(filters = {}) {
  const params = new URLSearchParams();
  if (filters.employee_id) params.append("employee_id", filters.employee_id);
  if (filters.month) params.append("month", filters.month);
  if (filters.date) params.append("date", filters.date);
  const q = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/leaves${q}`);
}

export async function createLeave(data) {
  return request("/api/leaves", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLeave(leaveId, data) {
  return request(`/api/leaves/${leaveId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteLeave(leaveId) {
  return request(`/api/leaves/${leaveId}`, { method: "DELETE" });
}

// -------------------------------------------------------------
// Public Holidays CRUD
// -------------------------------------------------------------
export async function fetchHolidays(yearMonth = null) {
  const q = yearMonth ? `?year_month=${encodeURIComponent(yearMonth)}` : "";
  return request(`/api/holidays${q}`);
}

export async function createHoliday(data) {
  return request("/api/holidays", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteHoliday(holidayId) {
  return request(`/api/holidays/${holidayId}`, { method: "DELETE" });
}
