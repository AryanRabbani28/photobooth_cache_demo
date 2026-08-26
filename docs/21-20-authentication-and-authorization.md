# 20. Authentication and Authorization

## 20.1 Authentication Mechanism

- **JWT-based** authentication for all human users
- **Device token** authentication for booth devices
- Access tokens expire after a configurable period (e.g., 1 hour)
- Refresh tokens expire after a longer period (e.g., 7 days)
- Passwords are hashed using bcrypt

## 20.2 Role-Based Access Control (RBAC)

Three roles:

```
ADMIN         — Full system access
OPERATOR      — Session control for assigned booth only
BOOTH_DEVICE  — Hardware operations, status reporting, sync
```

## 20.3 Booth Device Authentication

Each booth authenticates as a device, not as a human user:

```json
POST /auth/device-login
{
  "device_id": "DEVICE_9832",
  "device_secret": "sk_booth_abc123..."
}
```

Response:

```json
{
  "access_token": "eyJ...",
  "booth_id": "BC-01",
  "location": "Bashundhara City"
}
```

The device secret is generated when the booth is registered and stored securely on the booth laptop's config file.

---