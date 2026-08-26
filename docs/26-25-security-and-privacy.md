# 25. Security and Privacy

## 25.1 Authentication Security

- Passwords hashed with **bcrypt** (cost factor 12)
- JWT tokens with short expiry (1 hour access, 7 days refresh)
- Device secrets stored in encrypted config files on booth laptops
- HTTPS enforced for all API communication
- WebSocket connections authenticated via JWT

## 25.2 Data Access Control

- Operators can only see sessions from their assigned booth
- Booth devices can only access their own data
- Admin has full access
- Customer photos are only accessible through authenticated API endpoints

## 25.3 Photo Privacy

Since customer photos are stored, the system must consider privacy:

| Question                                 | Recommended Policy                                |
|------------------------------------------|---------------------------------------------------|
| How long should photos be stored?         | Configurable retention period (e.g., 30/60/90 days) |
| Can customers download their photos?      | Future feature via QR code + temporary link        |
| Who can access customer photos?           | Admin and operator of the specific booth           |
| Should operators see all historical photos?| Only from their assigned booth                     |
| Auto-deletion of old photos?              | Yes, after retention period expires                |

### Photo Retention Implementation

```
Daily cleanup job (scheduled):
    │
    ├── Find photos older than retention_period_days
    ├── Delete from object storage
    ├── Delete from local booth storage (on next sync)
    └── Mark database records as DELETED (soft delete)
```

## 25.4 Network Security

- All central API communication over **HTTPS/TLS**
- WebSocket connections over **WSS** (WebSocket Secure)
- Booth-to-backend communication authenticated with device tokens
- API rate limiting to prevent abuse
- Input validation on all endpoints (Pydantic schemas)

---