# 13. Session Management and State Machine

## 13.1 Session States

A session should not simply be "active" or "inactive." It follows a controlled state machine:

```
                    CREATED
                       │
                       ▼
                     READY
                       │
                       ▼
               TEMPLATE_SELECTED
                       │
                       ▼
                    ACTIVE ◄────── RESUMED
                       │              ▲
                       ├──────► PAUSED─┘
                       │
                       ▼
                PHOTO_COMPLETE
                       │
                       ▼
                 FINAL_PREVIEW
                       │
                       ▼
                   PRINTING
                       │
                       ├──────► PRINT_FAILED
                       │
                       ▼
                   COMPLETED
```

**Terminal States:**

```
CANCELLED   — Operator or admin cancelled the session
EXPIRED     — Session timer ran out
ERROR       — Unrecoverable error occurred
```

## 13.2 State Transition Rules

| From               | To                 | Trigger                           |
|--------------------|--------------------|-----------------------------------|
| (none)             | CREATED            | Operator starts new session       |
| CREATED            | READY              | Booth receives and acknowledges   |
| READY              | TEMPLATE_SELECTED  | Customer selects a template       |
| TEMPLATE_SELECTED  | ACTIVE             | Customer presses "Begin"          |
| ACTIVE             | PAUSED             | Operator pauses session           |
| PAUSED             | ACTIVE (RESUMED)   | Operator resumes session          |
| ACTIVE             | PHOTO_COMPLETE     | All required photos captured      |
| PHOTO_COMPLETE     | FINAL_PREVIEW      | Template composition generated    |
| FINAL_PREVIEW      | ACTIVE             | Customer retakes a photo          |
| FINAL_PREVIEW      | PRINTING           | Customer presses "Print"          |
| PRINTING           | COMPLETED          | Print job succeeds                |
| PRINTING           | PRINT_FAILED       | Print job fails                   |
| PRINT_FAILED       | PRINTING           | Retry print                       |
| ACTIVE             | EXPIRED            | Timer reaches zero                |
| Any non-terminal   | CANCELLED          | Operator cancels                  |
| Any non-terminal   | ERROR              | Unrecoverable error               |

## 13.3 Session Data Model

```
session_id:         UUID
booth_id:           FK → booths
operator_id:        FK → operators
customer_name:      string (optional)
package_id:         FK → packages
template_id:        FK → templates
status:             enum (see state machine)
started_at:         timestamp (when ACTIVE begins)
ended_at:           timestamp (when terminal state reached)
allocated_time:     integer (seconds)
remaining_time:     integer (seconds, updated in real-time)
total_photos:       integer (required by template)
photos_captured:    integer (current count)
retakes_used:       integer
created_at:         timestamp
updated_at:         timestamp
sync_status:        enum (PENDING, UPLOADING, SYNCED, FAILED)
```

## 13.4 Timer Behavior

- Timer starts when the customer presses "Begin Photo Session" (state → ACTIVE)
- Timer pauses when operator pauses the session
- Timer resumes when operator resumes
- Operator can add time (+30s, +1m, +2m)
- When timer reaches 0:
  - If all photos captured → proceed to final preview
  - If photos incomplete → apply session expiry rule (configurable per package)

---