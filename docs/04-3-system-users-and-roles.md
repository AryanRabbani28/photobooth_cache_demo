# 3. System Users and Roles

## 3.1 Customer

The customer interacts directly with the photobooth. The customer does **not** need to create an account, enter a password, or type a session key.

**The customer can:**

- Use the photobooth after their session is activated
- Choose a photo template
- Start the photo session
- See the live camera preview
- Select filters
- Capture photos
- Retake photos
- Review the final result
- Print the final photo

**The customer should NOT have access to:**

- System settings
- Historical photos from other customers
- Other customer data
- Camera configuration
- Printer configuration

**Design Priority:** The customer experience should be as simple and frictionless as possible. No key. No login. No typing.

## 3.2 Operator

The operator is the person physically standing near the photobooth. They receive the customer's payment manually and control the session.

**The operator can:**

- Log in to the operator dashboard
- View their assigned booth
- Start a new customer session
- Select the customer's package
- Select or confirm the session duration
- Pause a session
- Resume a session
- Stop/cancel a session (with confirmation)
- Add additional time (e.g., 30 seconds, 1 minute, 2 minutes)
- Restart a session if something goes wrong
- View the current session status
- Reprint the latest completed photo
- Handle errors or technical problems
- Check whether the booth is online
- Check whether the camera is connected
- Check whether the printer is connected
- Monitor internet status

**Assignment Model:** Each operator account is assigned to a specific photobooth.

Example:

```
Operator: Rahim
Assigned Booth: Bashundhara City – Booth 01
```

When Rahim starts a session, **only his assigned photobooth** receives the command.

## 3.3 Admin

The admin is the owner or manager of the photobooth business.

**The admin can:**

- View all photobooth locations
- See which booths are online or offline
- View active sessions
- View completed sessions
- View session history
- View captured photos
- View processed/final photos
- Manage templates (add, edit, disable, upload)
- Manage LUTs/filters (add, edit, disable, upload)
- Manage operators (create, assign, disable)
- View booth statistics
- View printing history
- Reprint photos if necessary
- Monitor technical issues
- Manage packages and session durations
- Configure system settings
- View analytics and performance comparisons

Example admin dashboard summary:

```
TOTAL BOOTHS:       10
ONLINE:              8
OFFLINE:             2
ACTIVE SESSIONS:     3
TODAY'S SESSIONS:  127
TODAY'S PHOTOS:    508
```

Performance by location:

```
Bashundhara City     52 Sessions
Centre Point         38 Sessions
SKS Tower            37 Sessions
```

## 3.4 Booth Device

In addition to human roles, every physical photobooth is a system actor. It authenticates as a **device**, not as a human user.

```
booth_id:   booth_bc_01
device_id:  DEVICE_9832
```

The booth device can:

- Capture photos
- Print photos
- Report status (camera, printer, internet, session)
- Download templates and LUTs
- Sync session data to the backend
- Receive real-time commands from operators

## 3.5 Permission Matrix

| Action                    | Admin | Operator | Booth Device |
| ------------------------- | ----- | -------- | ------------ |
| Manage all booths         | ✅     | ❌        | ❌            |
| Start assigned session    | ✅     | ✅        | ❌            |
| Pause session             | ✅     | ✅        | ✅ (locally)  |
| Resume session            | ✅     | ✅        | ✅ (locally)  |
| Add time                  | ✅     | ✅        | ❌            |
| Cancel session            | ✅     | ✅        | ❌            |
| Manage templates          | ✅     | ❌        | Download only |
| Manage LUTs               | ✅     | ❌        | Download only |
| Manage operators          | ✅     | ❌        | ❌            |
| Manage packages           | ✅     | ❌        | ❌            |
| Capture photos            | ❌     | ❌        | ✅            |
| Print photos              | ❌     | Reprint  | ✅            |
| View all sessions         | ✅     | Own only | Own only     |
| View analytics            | ✅     | ❌        | ❌            |
| Configure system settings | ✅     | ❌        | ❌            |

---