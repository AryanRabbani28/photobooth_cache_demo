# 22. Admin Dashboard Specification

## 22.1 Dashboard Overview

```
┌──────────────────────────────────────────────────┐
│  PHOTOBOOTH MANAGEMENT SYSTEM                    │
│                                                  │
│  TODAY                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Sessions │ │  Online  │ │  Active  │         │
│  │   127    │ │  8 / 10  │ │    3     │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  Photos  │ │  Prints  │ │  Errors  │         │
│  │   508    │ │   254    │ │    2     │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│                                                  │
│  TOP LOCATIONS                                   │
│  Bashundhara City .............. 52 Sessions    │
│  Centre Point .................. 38 Sessions    │
│  SKS Tower ..................... 37 Sessions    │
└──────────────────────────────────────────────────┘
```

## 22.2 Admin Sections

| Section              | Features                                                    |
|----------------------|-------------------------------------------------------------|
| Dashboard            | Summary stats, top locations, alerts, recent activity       |
| Booth Management     | All booths, status, camera/printer health, last activity    |
| Session History      | Search by date, booth, operator, customer, status           |
| Photo Gallery        | View photos, download, view final outputs, reprint          |
| Template Management  | Add, edit, disable, upload assets, configure layout         |
| LUT/Filter Management| Add, edit, disable, upload .cube files                     |
| Package Management   | Add, edit, disable, set pricing and limits                  |
| Operator Management  | Create accounts, assign to booths, disable, view activity   |
| Analytics            | Revenue, popular templates, peak hours, booth comparison    |
| System Logs          | Error logs, sync failures, device disconnects               |
| Settings             | Photo retention, default package, system-wide config        |

---