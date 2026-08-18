# ADR-003 — User Account Groups above Account Containers

Status: **Superseded by ADR-004**
Date: 2026-08-18

This decision described the interim `Group → Account → Holding` model. Direct product testing showed that forcing an Account container above every Asset creates artificial entities such as «حساب أصول الذهب» and makes land, vehicles and physical metals depend on containers that do not exist in reality.

ADR-004 replaces this model with the approved `Group → Asset` model:

- Group is the only organizational container.
- Asset is the financial entity carrying quantity/value/ownership/cost basis and receiving transactions.
- Asset never contains another Asset.
- Account is retained only as legacy schema-v4 compatibility/provenance during migration.

Historical implementation details of ADR-003 remain in Git history and prior snapshots; they are not target architecture.
