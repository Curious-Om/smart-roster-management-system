import sys
from fastapi.testclient import TestClient
from backend.main import app

def run_tests():
    with TestClient(app) as client:
        # 1. Health check
        resp = client.get("/api/health")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert resp.json() == {"status": "ok", "healthy": True}
        print("[PASS] /api/health returned 200 OK")

        # 2. Root SPA index.html
        resp = client.get("/")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert "<div id=\"root\"></div>" in resp.text, "Expected index.html with #root"
        print("[PASS] GET / returned SPA index.html")

        # 3. SPA fallback for arbitrary client routes
        resp = client.get("/roster/company-matrix")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert "<div id=\"root\"></div>" in resp.text
        print("[PASS] SPA route fallback /roster/company-matrix returned index.html")

        # 4. Unknown API route should 404, not fallback to index.html
        resp = client.get("/api/nonexistent-route")
        assert resp.status_code == 404
        assert "Endpoint not found" in resp.json().get("detail", "") or "Not Found" in resp.text
        print("[PASS] /api/nonexistent-route correctly returned 404")

        # 5. Roster entries endpoint
        resp = client.get("/api/roster?year_month=2026-11")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        entries = resp.json()
        assert len(entries) == 960, f"Expected 960 entries, got {len(entries)}"
        print(f"[PASS] /api/roster returned {len(entries)} entries")

        # 6. Roster validation endpoint
        resp = client.get("/api/roster/validate?year_month=2026-11")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        conflicts = resp.json()
        assert isinstance(conflicts, list), f"Expected list of conflicts, got {type(conflicts)}"
        criticals = [c for c in conflicts if c.get("severity") == "CRITICAL"]
        warnings = [c for c in conflicts if c.get("severity") == "WARNING"]
        print(f"[PASS] /api/roster/validate returned {len(conflicts)} conflicts ({len(criticals)} critical, {len(warnings)} warnings)")

    print("\nALL CHECKPOINT 4 INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
