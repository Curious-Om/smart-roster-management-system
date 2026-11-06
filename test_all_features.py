import sys
from fastapi.testclient import TestClient
from backend.main import app

def test_full_system():
    with TestClient(app) as client:
        print("=== 1. Health & SPA Serving ===")
        res = client.get("/api/health")
        assert res.status_code == 200 and res.json() == {"status": "ok", "healthy": True}
        print("[PASS] /api/health returned 200 OK")

        res = client.get("/")
        assert res.status_code == 200 and "<div id=\"root\"></div>" in res.text
        print("[PASS] GET / served Vite SPA index.html")

        print("\n=== 2. Demo Reset & Initial Seeding ===")
        res = client.post("/api/reset-demo")
        assert res.status_code == 200
        counts = res.json()["counts"]
        assert counts["employees"] == 32
        assert counts["brands"] == 20
        assert counts["pods"] == 3
        assert counts["roster_entries"] == 960
        print(f"[PASS] /api/reset-demo seeded {counts['employees']} emps, {counts['brands']} brands, {counts['roster_entries']} entries")

        print("\n=== 3. Monthly Roster Retrieval ===")
        res = client.get("/api/roster?year_month=2026-11")
        assert res.status_code == 200
        entries = res.json()
        assert len(entries) == 960
        print(f"[PASS] /api/roster retrieved {len(entries)} entries")

        print("\n=== 4. Conflict Validation Engine ===")
        res = client.get("/api/roster/validate?year_month=2026-11")
        assert res.status_code == 200
        conflicts = res.json()
        assert isinstance(conflicts, list) and len(conflicts) > 0
        criticals = [c for c in conflicts if c.get("severity") == "CRITICAL"]
        print(f"[PASS] /api/roster/validate returned {len(conflicts)} conflicts ({len(criticals)} critical)")

        print("\n=== 5. Module 4: Change Simulator ===")
        # Test simulate change for Employee #1 on Nov 10 (change to LEAVE)
        sim_payload = {
            "employee_id": 1,
            "date": "2026-11-10",
            "new_status": "LEAVE",
            "notes": "Simulating emergency medical leave"
        }
        res = client.post("/api/roster/simulate-change", json=sim_payload)
        assert res.status_code == 200
        sim_data = res.json()
        assert "can_maintain_coverage" in sim_data
        assert "impacted_processes" in sim_data
        assert "ai_explanation" in sim_data
        print(f"[PASS] /api/roster/simulate-change simulated impact: can_maintain_coverage={sim_data['can_maintain_coverage']}, impacted_processes={len(sim_data['impacted_processes'])}")

        print("\n=== 6. Module 4: Cell Update ===")
        # Change status for Employee #1 on Nov 10 to LEAVE
        update_payload = {
            "employee_id": 1,
            "date": "2026-11-10",
            "status": "LEAVE",
            "leave_type": "EMERGENCY_LEAVE",
            "reason": "Family emergency",
            "notes": "Cell update test"
        }
        res = client.post("/api/roster/cell-update", json=update_payload)
        assert res.status_code == 200
        update_data = res.json()
        assert update_data["success"] is True
        assert update_data["entry"]["status"] == "LEAVE"
        print(f"[PASS] /api/roster/cell-update updated Employee #1 to LEAVE on 2026-11-10")

        print("\n=== 7. Module 3B/4: Assign Backup ===")
        # If there are conflicts on Nov 10, pick a critical one with recommended actions and assign backup
        date_conflicts = client.get("/api/roster/validate?year_month=2026-11").json()
        target_conflict = next((c for c in date_conflicts if c.get("date") == "2026-11-10" and len(c.get("recommended_actions", [])) > 0), None)
        if target_conflict:
            rec = target_conflict["recommended_actions"][0]
            backup_payload = rec["payload"]
            res = client.post("/api/roster/assign-backup", json=backup_payload)
            assert res.status_code == 200
            print(f"[PASS] /api/roster/assign-backup assigned {backup_payload['employee_name']} as backup for brand #{backup_payload['brand_id']}")

    print("\n=======================================================")
    print("ALL END-TO-END AUTOMATED VERIFICATION TESTS PASSED (100%)")
    print("=======================================================")

if __name__ == "__main__":
    test_full_system()
