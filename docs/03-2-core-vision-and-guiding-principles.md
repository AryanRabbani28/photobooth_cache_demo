# 2. Core Vision and Guiding Principles

## 2.1 Experience Vision

The final system should feel like this:

**Customer Experience** — Extremely simple:

```
Pay → Enter → Choose Template → Take Photos → Review → Print
```

**Operator Experience** — Controlled and flexible:

```
Receive Payment → Start Session → Monitor → Help When Needed → Reprint if Necessary
```

**Admin Experience** — Complete visibility:

```
See Every Booth → See Every Session → See Photos → Manage Templates → Monitor Business Performance
```

## 2.2 Architectural Principles

> **Principle 1: Offline Independence**  
> The photobooth must be able to operate independently. The cloud should not control basic photo capture. The internet should not be required for printing. The local booth should own the active customer session.

> **Principle 2: Central Coordination**  
> The central server should coordinate, store data, and provide visibility — but never be a single point of failure for the customer experience.

> **Principle 3: Hardware First**  
> Do not start with the admin dashboard. The project's biggest unknown is DSLR and printer integration. Prove hardware communication works before building anything else.

> **Principle 4: Incremental Delivery**  
> Do not move to the next major version until the previous version is working reliably. Each version has a clear success condition.

> **Principle 5: Abstraction Layers**  
> Use adapter patterns for all hardware (cameras, printers). The main application should never directly depend on one hardware brand or model.

---