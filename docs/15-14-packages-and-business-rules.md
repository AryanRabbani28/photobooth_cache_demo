# 14. Packages and Business Rules

## 14.1 Package Configuration

Packages are configurable through the admin dashboard. The business owner can change settings without modifying code.

```
packages
    id:                 UUID
    name:               string
    duration_seconds:   integer
    max_photos:         integer
    max_retakes:        integer
    number_of_prints:   integer
    is_active:          boolean
    price:              decimal (for display/reporting only)
    expiry_behavior:    enum (AUTO_COMPLETE, GRACE_PERIOD, ASK_OPERATOR)
    grace_period_sec:   integer (only if expiry_behavior = GRACE_PERIOD)
    created_at:         timestamp
    updated_at:         timestamp
```

### Example Packages

**Standard Package:**

- 3-minute session
- 4 photos
- 2 prints
- 2 retakes maximum
- Auto-complete on timer expiry

**Premium Package:**

- 5-minute session
- 6 photos
- 4 prints
- Unlimited retakes within session time
- 30-second grace period on timer expiry

**Custom Package:**

- Admin-defined duration
- Admin-defined photo count
- Admin-defined print count
- Admin-defined retake limit

---