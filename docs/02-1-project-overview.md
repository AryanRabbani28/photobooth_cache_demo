# 1. Project Overview

## 1.1 Purpose

This project will build a complete software system for managing multiple photobooths located in different shopping malls and locations across the city. The system will replace the existing Darkroom Booth software with a custom-built, centrally managed, offline-capable photobooth management platform.

## 1.2 Current State

The photobooth business currently operates with a physical booth where:

1. A customer comes to the photobooth.
2. A staff member (operator) receives payment manually.
3. The customer enters or uses the photobooth.
4. A DSLR camera captures photos.
5. The customer selects or uses a photo template.
6. The photos are processed.
7. The final photos are printed.
8. Information about the session should eventually be available to the business owner.

The current system uses **Darkroom Booth** software. There is no centralized management, no remote monitoring, no operator dashboard, and no analytics.

## 1.3 Proposed System

The proposed system will improve this process by introducing:

| Capability                         | Description                                                       |
| ---------------------------------- | ----------------------------------------------------------------- |
| Customer Photobooth Application    | Touch-friendly kiosk app for the photo-taking experience          |
| Operator Control Panel             | Web dashboard for booth staff to control sessions                 |
| Central Admin Dashboard            | Web dashboard for the business owner to manage everything         |
| Session Management                 | Full lifecycle tracking of every customer interaction              |
| Template Management                | Dynamic, configurable photo layouts                               |
| Photo Storage                      | Local + cloud storage with synchronization                        |
| Multi-Booth Management             | Central oversight of 10+ booths across locations                  |
| Remote Monitoring and Control      | Real-time booth status, hardware health, operator commands        |
| Printing Management                | Job-based printing with retry, reprint, and failure recovery      |
| Offline Functionality              | Full local operation when internet is unavailable                 |
| Data Synchronization               | Automatic background sync when connectivity is restored           |
| Image Processing and Filters       | LUT-based filters, real-time preview, and template compositing    |
| Analytics and Reporting            | Session counts, revenue tracking, performance comparison by booth |

The system is designed not just as a photo-taking application, but as a complete **Photobooth Management System**.

## 1.4 Business Context

- The business currently operates **multiple photobooth locations** across shopping malls.
- Each booth has a **dedicated laptop**, **DSLR camera**, and **photo printer**.
- An **operator** (staff member) is physically present at each booth.
- Payment is handled **manually** (cash, mobile banking, etc.).
- The **business owner** needs centralized visibility across all locations.
- Internet connectivity in malls **can be unreliable**.

---