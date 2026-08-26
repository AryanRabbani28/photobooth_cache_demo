# 6. System Components

The complete system contains the following components:

| # | Component                    | Technology           | Purpose                                       |
|---|------------------------------|----------------------|-----------------------------------------------|
| 1 | Customer Photobooth App      | Python + PySide6     | Customer-facing kiosk application              |
| 2 | Operator Dashboard           | React + TypeScript   | Web app for booth staff                        |
| 3 | Admin Dashboard              | React + TypeScript   | Web app for business owner                     |
| 4 | Central Backend              | Python + FastAPI     | REST API + WebSocket server                    |
| 5 | Central Database             | PostgreSQL           | Permanent structured data                      |
| 6 | Object/File Storage          | S3-compatible        | Photos, templates, LUTs                        |
| 7 | Local Booth Database         | SQLite               | Offline session/photo data per booth           |
| 8 | Local Booth File Storage     | Local filesystem     | Original/processed photos on booth laptop      |
| 9 | Synchronization Service      | Background service   | Sync local data to central when online         |
| 10| Camera Integration Layer     | Camera SDK adapters  | Abstraction over DSLR brands                   |
| 11| Printer Integration Layer    | Printer adapters     | Abstraction over printer brands                |
| 12| Real-Time Communication      | WebSockets           | Operator commands, booth status events         |
| 13| Device Monitor               | Background service   | Camera/printer/internet health checking        |

---