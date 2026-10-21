---
name: hotel-crm-operations
description: "Use when designing, building, or configuring a Hotel CRM, hotel property management system (PMS) integration, hotel sales pipeline (B2B/MICE/Corporate), or hotel operational workflows (front desk, housekeeping, guest journey)."
metadata:
  category: domain-architecture
  triggers: hotel crm, hotel management, hospitality, guest profile, mice sales, b2b hotel, room allotment, banquet event order, pms integration, housekeeping, revpar, front desk
risk: safe
source: custom
---

# Hotel CRM & Hospitality Operations Expert

Comprehensive domain blueprint and architectural guide for engineering a modern Hotel CRM, hospitality sales engine (B2B/MICE/Corporate), and operational management workflows (front office, housekeeping, guest journey, and revenue analytics).

---

## When to Use This Skill

Activate this skill when:
- Designing or implementing a **Hotel CRM** (Guest 360 profile, stay history, preference tracking, loyalty tiers, guest communications).
- Building **Hotel Sales & B2B Pipeline** features (Corporate negotiated rates, MICE inquiries, Banquet Event Orders/BEO, group bookings, room blocks & allotments).
- Developing **Hotel Operations** modules (Front desk pre-arrival/check-in/check-out, housekeeping dispatch, maintenance ticketing, room status management).
- Integrating with **PMS (Property Management Systems)**, **Channel Managers** (SiteMinder, Cloudbeds, Opera PMS), or OTA booking feeds.
- Designing relational database schemas for hospitality (Folios, Reservations, Room inventory, Rate Plans, Guest profiles, Corporate accounts).

---

## Core Domain Architecture

```
                                  ┌────────────────────────┐
                                  │   Guest 360 & Loyalty   │
                                  │ (Profiles, Preferences,│
                                  │  LTV, Feedback, Segm.) │
                                  └───────────┬────────────┘
                                              │
      ┌───────────────────────────────────────┼──────────────────────────────────────┐
      │                                       │                                      │
┌─────▼──────────────────┐         ┌──────────▼────────────┐              ┌──────────▼────────────┐
│   Hotel Sales & B2B    │         │   Hotel Operations    │              │  PMS / Channel Engine  │
│  - Corporate Accounts  │         │  - Front Desk & Folio │              │  - Room Inventory & ARI│
│  - MICE & BEO Engine   │         │  - Housekeeping Task  │              │  - OTA & Direct Web    │
│  - Room Block / Allot  │         │  - Maintenance & SLA  │              │  - Night Audit Sync    │
│  - Contracts & Quoting │         │  - Guest Recovery     │              │  - Payment / POS / Lock│
└────────────────────────┘         └───────────────────────┘              └───────────────────────┘
```

---

## 1. Single Guest View (Guest 360 Profile)

A Hotel CRM must unify fragmented guest touchpoints (OTA bookings, direct web, restaurant POS, spa, event attendees) into a single profile.

### Key Data Elements:
- **Core Identity**: Full name, legal ID/Passport, Nationality, Phone, Email, Language, Country, VIP Status (Regular, Silver, Gold, Platinum, VIP Diamond).
- **Guest Preferences**:
  - *Room*: Floor preference (high/low), bed type (King/Twin), view, quiet room, proximity to elevator, pillow menu choice.
  - *Dietary & Wellness*: Allergies, vegetarian/vegan, diabetic, wellness preferences.
  - *Special Occasions*: Birthdays, wedding anniversaries, honeymoon, business travel vs family leisure.
- **Financial & Metrics**:
  - Total Stays, Total Room Nights, Total Folio Spend, Total F&B/Ancillary Spend, Average Daily Spend, LTV (Lifetime Value).
  - Recency, Frequency, Monetary (RFM) score.
- **Sentiment & Incidents History**:
  - Past complaints, service recovery compensation logs (e.g., complimentary drink vouchers), NPS / CSAT survey scores, OTA review links.

---

## 2. Hotel Sales & Commercial Operations (B2B & MICE)

Hospitality sales differs fundamentally from standard SaaS CRM due to **inventory perishability** (unsold room nights have zero salvage value) and **capacity constraints**.

### 1. Corporate Sales & LNR (Local Negotiated Rates)
- **Corporate Account Hierarchy**: Parent Company -> Subsidiary -> Booking Booker / Travel Arranger -> Business Travelers.
- **Contract Terms**: Negotiated corporate rate by room category, minimum annual room night commitment (production target), blackout dates (peak seasons/holidays), last room availability (LRA) vs non-last room availability (NLRA).
- **Corporate Production Tracking**: Realized room nights vs contracted quota, automated alerts when accounts fall behind quota.

### 2. MICE & Group Booking Management
- **Pipeline Stages**:
  1. `Inquiry / RFP Received`: Dates, estimated room nights, attendee count, meeting space requirements.
  2. `Space & Inventory Block Check`: Check function room availability and sleeping room inventory allotment.
  3. `Proposal & Quotation`: Customized packages (Room + Half-day/Full-day meeting package + F&B banquets + Audio/Visual).
  4. `Contract & Tentative Block`: Contract signed, tentative room block holds inventory with a **Cutoff Date**.
  5. `Definite / Deposit Collected`: Deposit paid, rooming list collection schedule locked.
  6. `Execution & BEO Finalized`: Banquet Event Order issued to Kitchen, F&B, Audio/Visual, Housekeeping.
  7. `Post-Event Billing & Master Folio`: Rebilling, credit card settlement, group commission.
- **Key Concepts**:
  - **Cutoff Date**: Date when unallocated rooms in the group block are released back to general public inventory without penalty.
  - **Attrition Clause**: Contractual agreement where client pays a penalty if actual pickup is less than a threshold (e.g. 80-85% of contracted rooms).
  - **BEO (Banquet Event Order)**: The single operational truth document specifying setup style (Theater, Classroom, U-shape, Banquet), menu, timing, A/V equipment, and billing instructions.

---

## 3. Hotel Operations Management

### 1. Front Desk & Reception Workflow
- **Pre-Arrival**:
  - Automated digital pre-registration via WhatsApp/Email/Zalo 24-48h prior.
  - Upsell prompts: Early check-in, airport limousine transfer, room upgrade, breakfast package.
  - Special request verification and VIP amenity order dispatch.
- **Check-in & Room Assignment**:
  - Smart room assignment algorithms: match guest profile preferences (floor, quiet, view) with rooms in `Inspected` or `Clean` status.
  - Keycard creation & mobile key generation integration (Assa Abloy, Salto, Dormakaba).
  - Pre-authorization on credit card for incidentals deposit (PCI-DSS compliant tokenization).
- **In-Stay & Service Recovery**:
  - Real-time guest messaging concierge.
  - Incident ticketing: Category (Plumbing, Air-conditioner, Noise, Cleanliness), Urgency, SLA countdown timer (e.g. 15-minute response for VIP).
  - Service recovery compensation tracking.
- **Check-Out & Folio Settlement**:
  - Split billing: Master Folio (Room rate to Corporate Account) vs Guest Personal Folio (Minibar, Room Service, Laundry to Guest).
  - Express digital check-out.
  - Automated electronic invoice / tax receipt (e.g. Hóa đơn điện tử VAT in Vietnam).

### 2. Housekeeping & Maintenance Management
- **Room Status Matrix**:
  - `Clean / Vacant`
  - `Dirty / Vacant` (Departure room needing full turnover)
  - `Clean / Occupied` (Daily stay-over refreshed)
  - `Dirty / Occupied` (Stay-over pending cleaning)
  - `Inspected` (Supervised and ready for check-in)
  - `OOO (Out of Order)`: Taken out of hotel inventory (reduces capacity denominator in RevPAR calculations).
  - `OOS (Out of Service)`: Minor repair, not sold tonight, but counts in hotel inventory.
- **Housekeeping Credit / Point System**:
  - Room attendant daily work quota calculated by credits (e.g. Checkout room = 3 credits, Stay-over = 1 credit, Suite = 4.5 credits).
  - Real-time status update via mobile tablet/phone by room attendants.

---

## 4. Key Performance Indicators (Hospitality Formulas)

A compliant Hotel CRM / PMS dashboard must calculate:

| Metric | Formula | Business Significance |
|---|---|---|
| **Occupancy Rate (OCC %)** | `(Total Rooms Sold / Total Available Rooms) * 100` | Basic capacity utilization |
| **ADR (Average Daily Rate)** | `Total Room Revenue / Total Rooms Sold` | Average price realized per occupied room |
| **RevPAR (Revenue Per Available Room)** | `Total Room Revenue / Total Available Rooms` OR `OCC * ADR` | Industry standard benchmark for revenue efficiency |
| **GOPPAR** | `Gross Operating Profit / Total Available Rooms` | Operational profitability per available room |
| **ALOS** | `Total Room Nights / Total Bookings` | Average Length of Stay |
| **Direct Booking Ratio** | `Direct Website Bookings / Total Bookings` | Channel distribution health vs OTA commissions |

---

## Detailed References

For detailed implementation guidelines and schemas, inspect the following documents:
- [Guest Journey & Operational Workflows](file:///Users/duyduong/.gemini/config/skills/hotel-crm-operations/references/guest-journey-operations.md): Detailed state machine for guest stay cycles, incident management, and housekeeping rules.
- [Hotel Sales & MICE Engine](file:///Users/duyduong/.gemini/config/skills/hotel-crm-operations/references/hotel-sales-mice.md): Corporate rate negotiations, RFP flows, BEO generation, and room block attrition.
- [Database Schema Blueprint](file:///Users/duyduong/.gemini/config/skills/hotel-crm-operations/references/database-schema.md): Production-ready PostgreSQL / Prisma schema for Hotel CRM.

---

## Compliance & Security Guardrails

1. **PCI-DSS Compliance**:
   - NEVER store unmasked Credit Card PAN (Primary Account Number) or CVV/CVC in the database.
   - Use tokenization gateways (Stripe, Adyen, VNPay, OnePay) and only persist `card_token`, `last4`, `exp_month`, `exp_year`.
2. **Privacy & Identity (GDPR / Local Police Registry)**:
   - Passport/ID numbers must be encrypted at rest (`pgcrypto` or column-level AES-256).
   - Provide automated guest data export and right-to-be-forgotten deletion routines.
3. **Audit Trails**:
   - Every rate modification, discount application, room upgrade, and folio refund must log `operator_id`, `timestamp`, `old_value`, `new_value`, and `reason`.
