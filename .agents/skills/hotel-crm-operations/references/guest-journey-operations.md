---
description: Comprehensive operational workflows for hotel guest journey, housekeeping dispatch, incident recovery, and front office automation.
metadata:
  tags: [guest-journey, housekeeping, front-desk, service-recovery, operations]
  source: hotel-crm-operations
---

# Hotel Guest Journey & Operations Playbook

## 1. End-to-End Guest Lifecycle State Machine

```
[Booking Confirmed]
       │
       ▼ (T-48h to T-24h)
[Pre-Arrival Outreach] ──► (Digital Check-in, Upsell, ETA, Special Requests)
       │
       ▼ (Day of Arrival)
[Room Pre-Assignment]  ──► (Match VIP Preferences + "Inspected" Room Status)
       │
       ▼ (Arrival at Hotel)
[Front Desk Check-in]  ──► (ID Verification, Incidental Pre-Auth, Keycard Handover)
       │
       ▼ (During Stay)
[In-Stay Engagement]   ──► (Messaging, Incident Recovery, Housekeeping, Minibar, POS)
       │
       ▼ (Day of Departure)
[Check-out & Billing]  ──► (Split Folio Review, Payment Settlement, Key Return)
       │
       ▼ (Post-Departure)
[Post-Stay & Loyalty]  ──► (NPS Survey, OTA Review Boost, Points Awarded, RFM Update)
```

---

## 2. Pre-Arrival & Smart Room Assignment

### Automated Pre-Arrival Sequence
1. **Trigger**: 48 hours before check-in date at 10:00 AM local property time.
2. **Channel Priority**: WhatsApp / Zalo (Vietnam/SEA) -> SMS -> Email.
3. **Payload**:
   - Welcome message with reservation summary (Arrival date, room type, nights).
   - Link to mobile pre-registration:
     - Verify identification (upload passport/CCCD photos).
     - Expected Arrival Time (ETA). If ETA < 14:00, prompt Early Check-in upsell fee.
     - Preference selection (Pillow type: Feather, Foam, Lavender; Bed setup; Room temperature preset).
     - Ancillary Upsell: Airport transfer limousine, breakfast buffet package, romantic setup package.

### Room Assignment Logic (Priority Scoring Algorithm)
When allocating rooms for arriving guests, evaluate:
```
PriorityScore = (VIP_Level * 40) + (IsRepeatGuest * 20) + (DirectBooking * 15) + (HasSpecialRequest * 25)
```
- Only assign rooms in `Inspected` status. If no inspected room matches, assign `Clean` with an expedited inspection flag.
- Match guest negative preferences strictly (e.g. `NeverLowFloor` -> filter out floor <= 3; `NoNearElevator` -> filter out rooms adjacent to lift shafts).

---

## 3. In-Stay Service Recovery & Incident Management

Hospitality requires strict SLAs for complaint resolution. Service recovery failures directly cause negative TripAdvisor / Google reviews.

### Incident Severity & SLA Matrix

| Severity | Examples | Target Initial Response | Target Resolution | Compensation Matrix |
|---|---|---|---|---|
| **P1 - Critical** | A/C breakdown in summer, no hot water, bedbugs, room flood | < 5 minutes | < 30 minutes (or immediate room move) | Immediate room upgrade + Complimentary dinner + Personal apology by Duty Manager |
| **P2 - Major** | TV not working, missing amenity requested 3x, noisy neighbor | < 10 minutes | < 45 minutes | Bottle of wine / fruit platter + Late check-out (14:00) |
| **P3 - Minor** | Slow WiFi, extra towel request, light bulb replacement | < 15 minutes | < 60 minutes | Sincere apology, followed up by phone confirmation |

### Incident Lifecycle & Post-Recovery
1. Ticket logged by Front Desk, Concierge, or Guest mobile app.
2. Ticket assigned automatically to on-duty technician / floor supervisor via push notification.
3. Once marked `Resolved`, Front Desk Duty Manager must call or message the guest within 20 minutes to verify guest satisfaction: *"Is everything to your satisfaction now, Mr. Smith?"*
4. Flag in Guest Profile: Record incident tag (e.g., `INCIDENT_AC_2026`). On next stay, system automatically generates an alert for Front Office Manager to provide a VIP welcome note.

---

## 4. Housekeeping & Maintenance Management

### Housekeeping Daily Board Generation
Every morning at 07:00, the Housekeeping Executive System generates daily assignments:
- Standard Room Attendant capacity: **14 - 16 credits per shift (8 hours)**.
- Workload Credit Allocation:
  - Check-out / Departure Room (Full Clean): **3.0 credits** (~35-40 min)
  - Stay-over Room (Refresh Clean): **1.0 credit** (~15 min)
  - Suite / Villa Turnover: **5.0 credits** (~60 min)
  - Turndown Service: **0.5 credit** (~8 min)

### Real-Time Room Status Progression
```
[Occupied / Dirty] ──(Attendant cleans)──► [Occupied / Clean]
[Vacant / Dirty]   ──(Attendant cleans)──► [Vacant / Clean] ──(Supervisor inspects)──► [Inspected / Ready]
```
- If a room has minor defects (e.g. faucet leaking): Change status to `OOS (Out of Service)` - can still be assigned if emergency, counts toward room capacity.
- If major renovation or water damage: Change status to `OOO (Out of Order)` - completely deducted from room inventory count (adjusts RevPAR capacity).

---

## 5. Check-Out, Folio Settlement & Night Audit

### Folio Partitioning (Split Invoicing)
- **Folio A (Master / Corporate)**: Room rate, city tax, service charge, contracted banquet events. Routed directly to Corporate AR (Accounts Receivable) with 30-day payment terms.
- **Folio B (Guest Personal)**: Room service, laundry, minibar, spa treatments, damaged items. Paid immediately at desk via Credit Card, Cash, or QR Code (VietQR / MoMo / Stripe).

### Night Audit Routine (02:00 AM daily)
1. Verify all expected arrivals for the day: Mark non-arrivals as `No-Show` and post 1-night penalty charge according to cancellation policy.
2. Post room & tax charges across all occupied rooms to their respective folios.
3. Roll business date from `D` to `D+1`.
4. Generate flash daily reports: Total Room Revenue, F&B Revenue, OCC%, ADR, RevPAR, Complimentary Rooms count, Cashier balance.
