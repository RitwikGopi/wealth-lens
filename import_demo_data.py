#!/usr/bin/env python3
"""Import demo data from demo-data.json into the portfolio app via its REST API.

Usage:
    uv run import_demo_data.py [--base-url http://localhost:8998]

Requires the backend server to be running.
"""

import argparse
import json
import sys
from pathlib import Path

import httpx

BASE_URL = "http://localhost:8998/api/v1"


def load_data() -> dict:
    path = Path(__file__).parent / "demo-data.json"
    with open(path) as f:
        return json.load(f)


def api(client: httpx.Client, method: str, path: str, **kwargs) -> dict | None:
    resp = getattr(client, method)(f"{BASE_URL}{path}", **kwargs)
    if resp.status_code >= 400:
        print(f"  ERROR {method.upper()} {path}: {resp.status_code} {resp.text}")
        return None
    if resp.status_code == 204:
        return {}
    return resp.json()


def import_tags(client: httpx.Client, tags: list[dict]) -> dict[str, int]:
    """Create tags and return name->id mapping."""
    print("\n--- Tags ---")
    name_to_id: dict[str, int] = {}

    # First pass: top-level tags (no parent)
    for tag in tags:
        if "parent" not in tag:
            result = api(client, "post", "/tags", json={
                "name": tag["name"],
                "description": tag.get("description"),
                "color": tag.get("color"),
            })
            if result:
                name_to_id[tag["name"]] = result["id"]
                print(f"  Created tag: {tag['name']} (id={result['id']})")

    # Second pass: child tags
    for tag in tags:
        if "parent" in tag:
            parent_id = name_to_id.get(tag["parent"])
            if parent_id is None:
                print(f"  SKIP tag {tag['name']}: parent '{tag['parent']}' not found")
                continue
            result = api(client, "post", "/tags", json={
                "name": tag["name"],
                "parent_id": parent_id,
                "description": tag.get("description"),
                "color": tag.get("color"),
            })
            if result:
                name_to_id[tag["name"]] = result["id"]
                print(f"  Created tag: {tag['name']} -> {tag['parent']} (id={result['id']})")

    return name_to_id


def import_holdings(client: httpx.Client, holdings: list[dict], tag_map: dict[str, int]) -> dict[str, int]:
    """Create holdings and return symbol->id mapping."""
    print("\n--- Holdings ---")
    symbol_to_id: dict[str, int] = {}

    for h in holdings:
        result = api(client, "post", "/holdings", json={
            "symbol": h["symbol"],
            "exchange": h.get("exchange", "NSE"),
            "instrument_type": h.get("instrument_type", "EQ"),
            "quantity": h["quantity"],
            "average_price": h["average_price"],
            "current_price": h.get("current_price"),
            "notes": h.get("notes"),
        })
        if result:
            hid = result["id"]
            symbol_to_id[h["symbol"]] = hid
            print(f"  Created holding: {h['symbol']} (id={hid})")

            # Assign tags
            tag_ids = [tag_map[t] for t in h.get("tags", []) if t in tag_map]
            if tag_ids:
                api(client, "post", f"/holdings/{hid}/tags", json={"tag_ids": tag_ids})
                print(f"    Tagged: {h['tags']}")

    return symbol_to_id


def import_fixed_deposits(client: httpx.Client, fds: list[dict], tag_map: dict[str, int]) -> dict[str, int]:
    """Create fixed deposits and return bank_name->id mapping."""
    print("\n--- Fixed Deposits ---")
    bank_to_id: dict[str, int] = {}

    for fd in fds:
        result = api(client, "post", "/fixed-deposits", json={
            "bank_name": fd["bank_name"],
            "principal": fd["principal"],
            "interest_rate": fd["interest_rate"],
            "compounding_frequency": fd.get("compounding_frequency", "quarterly"),
            "start_date": fd["start_date"],
            "maturity_date": fd["maturity_date"],
            "maturity_amount": fd.get("maturity_amount"),
            "is_cumulative": fd.get("is_cumulative", True),
            "auto_renew": fd.get("auto_renew", False),
            "notes": fd.get("notes"),
        })
        if result:
            fid = result["id"]
            bank_to_id[fd["bank_name"]] = fid
            print(f"  Created FD: {fd['bank_name']} ₹{fd['principal']:,.0f} @ {fd['interest_rate']}% (id={fid})")

            # Assign tags
            tag_ids = [tag_map[t] for t in fd.get("tags", []) if t in tag_map]
            if tag_ids:
                api(client, "post", f"/fixed-deposits/{fid}/tags", json={"tag_ids": tag_ids})
                print(f"    Tagged: {fd['tags']}")

            # Close if status is closed
            if fd.get("status") == "closed" and fd.get("closure_date"):
                api(client, "post", f"/fixed-deposits/{fid}/close", json={
                    "closure_date": fd["closure_date"],
                    "closure_amount": fd.get("closure_amount", fd["principal"]),
                    "premature": False,
                    "notes": "Matured",
                })
                print(f"    Closed on {fd['closure_date']}")

    return bank_to_id


def import_transactions(
    client: httpx.Client,
    txns: list[dict],
    symbol_to_id: dict[str, int],
    bank_to_id: dict[str, int],
):
    """Create transactions, linking to holdings or FDs."""
    print("\n--- Transactions ---")

    for txn in txns:
        payload: dict = {
            "type": txn["type"],
            "amount": txn["amount"],
            "date": txn["date"],
            "notes": txn.get("notes"),
            "source": "manual",
        }

        # Link to holding or FD
        if "symbol" in txn:
            hid = symbol_to_id.get(txn["symbol"])
            if hid:
                payload["holding_id"] = hid
            else:
                # Sold position not in current holdings — skip holding link
                pass
            payload["quantity"] = txn.get("quantity")
            payload["price"] = txn.get("price")
        elif "fd_bank" in txn:
            fid = bank_to_id.get(txn["fd_bank"])
            if fid:
                payload["fd_id"] = fid

        result = api(client, "post", "/transactions", json=payload)
        if result:
            label = txn.get("symbol") or txn.get("fd_bank", "?")
            print(f"  {txn['type']:>10s} | {label:<12s} | ₹{txn['amount']:>12,.2f} | {txn['date']}")


def import_kite_backfill(client: httpx.Client, kite_data: dict):
    """Backfill portfolio snapshots via the Kite portal JSON API."""
    print("\n--- Portfolio Snapshots (Kite Backfill) ---")

    date_count = len(kite_data.get("data", {}).get("result", {}))
    print(f"  Sending {date_count} date entries to backfill API...")

    result = api(client, "post", "/portfolio/backfill", json={"kite_data": kite_data})
    if result:
        print(f"  Created: {result.get('snapshots_created', 0)} snapshots")
        print(f"  Updated: {result.get('snapshots_updated', 0)} snapshots")
        if result.get("errors"):
            for err in result["errors"]:
                print(f"  WARNING: {err}")
    else:
        print("  ERROR: Backfill failed")


def import_allocation_plans(client: httpx.Client, plans: list[dict], tag_map: dict[str, int]):
    """Create allocation plans and their targets."""
    print("\n--- Allocation Plans ---")

    for plan in plans:
        result = api(client, "post", "/allocations/plans", json={
            "name": plan["name"],
            "description": plan.get("description"),
            "is_primary": plan.get("is_primary", False),
        })
        if result:
            pid = result["id"]
            print(f"  Created plan: {plan['name']} (id={pid}, primary={plan.get('is_primary')})")

            for target in plan.get("targets", []):
                tid = tag_map.get(target["tag"])
                if tid is None:
                    print(f"    SKIP target: tag '{target['tag']}' not found")
                    continue
                api(client, "put", f"/allocations/plans/{pid}/targets/{tid}", json={
                    "target_pct": target["target_pct"],
                    "notes": target.get("notes"),
                })
                print(f"    {target['tag']}: {target['target_pct']}%")


def import_rebalancing(client: httpx.Client, operations: list[dict]):
    """Create rebalancing operations."""
    print("\n--- Rebalancing Operations ---")

    for op in operations:
        result = api(client, "post", "/rebalancing", json={
            "name": op["name"],
            "date": op["date"],
            "notes": op.get("notes"),
            "moves": op.get("moves", []),
        })
        if result:
            print(f"  Created: {op['name']} ({op['date']}) — {len(op.get('moves', []))} moves")


def main():
    parser = argparse.ArgumentParser(description="Import demo data into portfolio app")
    parser.add_argument("--base-url", default="http://localhost:8998", help="Backend base URL")
    args = parser.parse_args()

    global BASE_URL
    BASE_URL = f"{args.base_url}/api/v1"

    # Health check
    try:
        r = httpx.get(f"{args.base_url}/api/v1/holdings", timeout=5)
        r.raise_for_status()
    except Exception as e:
        print(f"Cannot reach backend at {args.base_url}: {e}")
        print("Make sure the backend server is running.")
        sys.exit(1)

    data = load_data()
    print(f"Loaded demo data from demo-data.json")

    with httpx.Client(timeout=30) as client:
        tag_map = import_tags(client, data.get("tags", []))
        symbol_map = import_holdings(client, data.get("holdings", []), tag_map)
        fd_map = import_fixed_deposits(client, data.get("fixed_deposits", []), tag_map)
        import_transactions(client, data.get("transactions", []), symbol_map, fd_map)
        import_kite_backfill(client, data.get("kite_backfill_data", {}))
        import_allocation_plans(client, data.get("allocation_plans", []), tag_map)
        import_rebalancing(client, data.get("rebalancing_operations", []))

    print("\nDone! Demo data imported successfully.")


if __name__ == "__main__":
    main()
