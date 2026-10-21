---
description: Commercial sales operations, corporate negotiated contracts, MICE pipeline, Banquet Event Order (BEO), room allotment, and attrition rules for hotels.
metadata:
  tags: [hotel-sales, mice, corporate-rates, beo, allotment, banquet]
  source: hotel-crm-operations
---

# Hotel Sales & MICE (B2B & Group Events) Playbook

## 1. Hospitality Commercial Segments

Hotel sales operates across distinct market segments with varying booking windows and price elasticities:

| Segment | Target Audience | Rate Structure | Lead Time | Key Characteristics |
|---|---|---|---|---|
| **Corporate Negotiated (LNR)** | Multinational companies, local enterprises | Fixed year-round rate (with blackout dates) | 1-7 days | Stable Sunday-Thursday production, low cancellation fee sensitivity |
| **MICE (Meetings & Events)** | Corporations, associations, event agencies | Package (Sleeping rooms + Meeting package + F&B banquets) | 30-180 days | High F&B spending, critical function room scheduling |
| **Wholesale / FIT / Travel Agents** | DMCs, tour operators, travel agencies | Net rates (-20% to -35% below BAR), dynamic API rates | 14-60 days | Seasonal room allocations (Allotments) |
| **Social / Wedding / Banqueting** | Couples, family celebrations | Tiered banquet menu + bridal suite complimentary | 60-365 days | Weekend peak, high deposit milestones |

---

## 2. Corporate Account Management & LNR Contracts

### Contract Lifecycle
1. **Account Qualification**:
   - Estimate annual room night potential (e.g. 200+ room nights/year).
   - Determine preferred room categories (Deluxe King, Executive Suite with lounge access).
2. **Rate Negotiation**:
   - Fixed LNR rate vs Dynamic % off BAR (Best Available Rate).
   - Inclusions: Breakfast for 1 or 2 guests, high-speed business WiFi, 2 pieces laundry per day, 10% discount on F&B.
   - **LRA (Last Room Availability)**: Company can book the contracted rate even if only 1 room remains in that category. Higher rate premium.
   - **NLRA (Non-Last Room Availability)**: Hotel can close out the contracted rate during high occupancy (>85%) to sell at higher public rates.
3. **Production Quota & Review**:
   - Monthly production tracking: Account Manager reviews actual room nights booked.
   - If production drops < 60% of contracted threshold, CRM triggers account review notification to renegotiate rates next season.

---

## 3. MICE & Group Inquiry Pipeline

### Sales Pipeline Stages
```
[1. New RFP / Lead]
       │  (Log event dates, delegates count, meeting space, sleeping rooms)
       ▼
[2. Inventory Feasibility Check]
       │  (Check function rooms & sleeping room availability against BAR yield)
       ▼
[3. Proposal & Custom Quotation]
       │  (Room block + DDR [Day Delegate Rate] + AV equipment + Coffee breaks)
       ▼
[4. Contract Sent (Tentative Block)]
       │  (Locks inventory temporarily with an Option Date / Hold expiration)
       ▼
[5. Contract Signed & Deposit Paid (Definite Block)]
       │  (Definite status, credit card pre-auth / wire transfer collected)
       ▼
[6. Rooming List & Cutoff Tracking]
       │  (Collect names, release unpicked rooms without penalty prior to Cutoff)
       ▼
[7. BEO Issuance & Pre-Con Meeting]
       │  (Final Banquet Event Order signed off 72h prior to event)
       ▼
[8. Post-Event Master Folio Audit & Settlement]
```

### Room Block Management, Cutoff & Attrition Clause

#### 1. Cutoff Date
- Example: 50 Deluxe rooms held for XYZ Tech Summit taking place Nov 15-18.
- Cutoff Date = Oct 25 (21 days prior).
- On Oct 25 at 23:59: Any unsold rooms from the 50-room block automatically release back to public online inventory to prevent empty rooms.

#### 2. Attrition Schedule Calculation
Protects hotel revenue when a group books 100 rooms but only fills 60:
- *Standard Clause*: Client is allowed up to 15% slippage without penalty up to 30 days prior.
- *Calculation*:
  - Contracted: 100 room nights @ $150 = $15,000.
  - Allowed slippage (15%): 15 rooms. Minimum required pickup = 85 room nights ($12,750).
  - Actual pickup: 65 room nights.
  - Attrition Penalty due: `(85 - 65) * $150 = 20 * $150 = $3,000`.
  - Added directly to the Master Folio billing.

---

## 4. Banquet Event Order (BEO) Standards

The BEO is the contract and operational instruction sheet distributed to Banquet, Kitchen, Stewarding, Front Office, Housekeeping, and Finance.

### Mandatory BEO Sections:
1. **Header Details**: Event Name, Group Name, Client Contact, Sales Manager, Catering Manager, Date, Location/Room, Expected Attendance, Guaranteed Attendance.
2. **Function Room Setup**:
   - Setup Type: `Classroom`, `Theater`, `U-Shape`, `Boardroom`, `Hollow Square`, `Banquet Rounds of 10`, `Cocktail Standing`.
   - Stage & Podium specifications, Head table seating.
3. **Audio-Visual (AV) & Technical Requirements**:
   - LED Screen / Projector lumens, Wireless handheld mics, Lapel mics, Clicker, Zoom/Hybrid conferencing link, Dedicated sound engineer.
4. **Food & Beverage Schedule**:
   - 08:30 - Welcome Coffee & Tea (Pastries, Fruit skewers)
   - 10:30 - Morning Themed Coffee Break (Mini croissants, Vietnamese iced coffee, healthy smoothies)
   - 12:00 - International Buffet Lunch (Guaranteed 120 pax, Set for 125 pax [5% over-set rule])
   - 15:30 - Afternoon Coffee Break
5. **Billing Instructions**:
   - Master account for Room + Meeting package.
   - Individual pays own incidental expenses (alcohol outside package, minibar).
