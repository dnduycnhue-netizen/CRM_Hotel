---
description: Production-grade relational PostgreSQL and Prisma schema models for Hotel CRM, sales, and operations.
metadata:
  tags: [database, schema, postgresql, prisma, hotel-crm, data-modeling]
  source: hotel-crm-operations
---

# Production Relational Database Schema (Prisma / PostgreSQL)

This schema covers Guest 360, Reservations, Rooms, Folios/Billing, Corporate Accounts, Sales Opportunities, MICE Events, BEOs, and Housekeeping tasks.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -------------------------------------------------------------
// 1. GUEST & LOYALTY (GUEST 360)
// -------------------------------------------------------------

enum VipTier {
  STANDARD
  SILVER
  GOLD
  PLATINUM
  DIAMOND_VIP
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

model Guest {
  id                String       @id @default(uuid())
  firstName         String
  lastName          String
  email             String?      @unique
  phone             String?      @unique
  gender            Gender?
  birthday          DateTime?
  nationality       String?      // ISO 2-letter country code
  idNumberEncrypted String?      // Passport / CCCD (encrypted at rest)
  vipTier           VipTier      @default(STANDARD)
  loyaltyPoints     Int          @default(0)
  totalStays        Int          @default(0)
  totalNights       Int          @default(0)
  totalSpend        Decimal      @default(0.0) @db.Decimal(12, 2)
  notes             String?
  
  // Preferences
  roomPreferences   Json?        // e.g. { "floor": "high", "bed": "king", "pillow": "feather", "quiet": true }
  dietaryNotes      String?
  allergies         String?
  
  // Relations
  reservations      Reservation[]
  incidents         GuestIncident[]
  feedbacks         GuestFeedback[]
  corporateGuest    CorporateAccountGuest[]
  
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  @@index([phone])
  @@index([email])
  @@index([vipTier])
}

// -------------------------------------------------------------
// 2. HOTEL ROOM INVENTORY & HOUSEKEEPING
// -------------------------------------------------------------

enum RoomCleanStatus {
  CLEAN_VACANT
  DIRTY_VACANT
  CLEAN_OCCUPIED
  DIRTY_OCCUPIED
  INSPECTED
  OUT_OF_ORDER   // OOO (Deducted from available inventory)
  OUT_OF_SERVICE // OOS (In inventory, not sellable today)
}

model RoomType {
  id          String   @id @default(uuid())
  code        String   @unique // e.g. "DLX_K", "EXE_STE"
  name        String
  basePrice   Decimal  @db.Decimal(10, 2)
  maxAdults   Int      @default(2)
  maxChildren Int      @default(1)
  description String?
  rooms       Room[]
}

model Room {
  id             String          @id @default(uuid())
  roomNumber     String          @unique // e.g. "1001"
  floor          Int
  roomTypeId     String
  roomType       RoomType        @relation(fields: [roomTypeId], references: [id])
  cleanStatus    RoomCleanStatus @default(DIRTY_VACANT)
  isSmoking      Boolean         @default(false)
  currentGuestId String?
  
  reservations   ReservationRoom[]
  cleaningTasks  HousekeepingTask[]
  maintenance    MaintenanceTicket[]

  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@index([cleanStatus])
  @@index([floor])
}

model HousekeepingTask {
  id          String    @id @default(uuid())
  roomId      String
  room        Room      @relation(fields: [roomId], references: [id])
  assignedTo  String?   // Staff ID
  taskType    String    // "DEPARTURE_CLEAN", "STAYOVER_REFRESH", "TURNDOWN", "DEEP_CLEAN"
  credits     Decimal   @default(1.0) @db.Decimal(3, 1)
  isCompleted Boolean   @default(false)
  startedAt   DateTime?
  completedAt DateTime?
  inspectedBy String?
  notes       String?
  
  createdAt   DateTime  @default(now())
}

// -------------------------------------------------------------
// 3. RESERVATIONS & FOLIOS (BILLING)
// -------------------------------------------------------------

enum ReservationStatus {
  PROVISIONAL
  CONFIRMED
  CHECKED_IN
  CHECKED_OUT
  CANCELLED
  NO_SHOW
}

enum BookingChannel {
  DIRECT_WEB
  DIRECT_PHONE
  WALK_IN
  OTA_BOOKING_COM
  OTA_AGODA
  OTA_EXPEDIA
  CORPORATE_CONTRACT
  TRAVEL_AGENT
}

model Reservation {
  id               String            @id @default(uuid())
  bookingReference String            @unique // e.g. "BK-20261021-9921"
  guestId          String
  guest            Guest             @relation(fields: [guestId], references: [id])
  status           ReservationStatus @default(CONFIRMED)
  channel          BookingChannel    @default(DIRECT_WEB)
  checkInDate      DateTime          @db.Date
  checkOutDate     DateTime          @db.Date
  adultsCount      Int               @default(1)
  childrenCount    Int               @default(0)
  specialRequests  String?
  estimatedArrival String?           // e.g. "14:30"
  
  totalAmount      Decimal           @db.Decimal(12, 2)
  depositPaid      Decimal           @default(0.0) @db.Decimal(12, 2)
  
  corporateAccountId String?
  corporateAccount   CorporateAccount? @relation(fields: [corporateAccountId], references: [id])

  roomAllocations  ReservationRoom[]
  folios           Folio[]
  
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([guestId])
  @@index([checkInDate, checkOutDate])
  @@index([status])
}

model ReservationRoom {
  id            String      @id @default(uuid())
  reservationId String
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  roomId        String
  room          Room        @relation(fields: [roomId], references: [id])
  nightlyRate   Decimal     @db.Decimal(10, 2)
}

enum FolioType {
  MASTER_CORPORATE // Paid by company
  GUEST_INCIDENTAL // Paid by guest at desk
}

model Folio {
  id            String       @id @default(uuid())
  folioNumber   String       @unique // e.g. "FOL-2026-0045"
  reservationId String
  reservation   Reservation  @relation(fields: [reservationId], references: [id])
  folioType     FolioType    @default(GUEST_INCIDENTAL)
  isClosed      Boolean      @default(false)
  balance       Decimal      @default(0.0) @db.Decimal(12, 2)
  items         FolioItem[]
  payments      Payment[]
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

model FolioItem {
  id          String   @id @default(uuid())
  folioId     String
  folio       Folio    @relation(fields: [folioId], references: [id], onDelete: Cascade)
  description String   // e.g. "Room Charge Night 1", "Minibar Heineken", "Laundry Express"
  department  String   // "ROOM", "F&B", "SPA", "MINIBAR", "LAUNDRY"
  amount      Decimal  @db.Decimal(10, 2)
  taxAmount   Decimal  @default(0.0) @db.Decimal(10, 2)
  postedAt    DateTime @default(now())
}

model Payment {
  id            String   @id @default(uuid())
  folioId       String
  folio         Folio    @relation(fields: [folioId], references: [id])
  method        String   // "CREDIT_CARD", "VIETQR", "CASH", "DIRECT_BILLING"
  amount        Decimal  @db.Decimal(12, 2)
  transactionRef String?
  cardLast4     String?  // PCI Compliant (never store full PAN or CVV)
  paidAt        DateTime @default(now())
}

// -------------------------------------------------------------
// 4. B2B SALES & CORPORATE ACCOUNTS
// -------------------------------------------------------------

model CorporateAccount {
  id              String            @id @default(uuid())
  companyName     String
  taxCode         String?           @unique
  billingAddress  String?
  contactPerson   String
  contactEmail    String
  contactPhone    String
  creditLimit     Decimal           @default(0.0) @db.Decimal(12, 2)
  creditTermsDays Int               @default(30)
  accountManagerId String?          // Sales Staff ID
  
  contracts       CorporateContract[]
  opportunities   SalesOpportunity[]
  reservations    Reservation[]
  miceEvents      MiceEvent[]
  employees       CorporateAccountGuest[]
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

model CorporateAccountGuest {
  id                 String           @id @default(uuid())
  corporateAccountId String
  corporateAccount   CorporateAccount @relation(fields: [corporateAccountId], references: [id])
  guestId            String
  guest              Guest            @relation(fields: [guestId], references: [id])
  designation        String?          // e.g. "VP of Operations"
  isBooker           Boolean          @default(false)
}

model CorporateContract {
  id                 String           @id @default(uuid())
  contractCode       String           @unique
  corporateAccountId String
  corporateAccount   CorporateAccount @relation(fields: [corporateAccountId], references: [id])
  startDate          DateTime         @db.Date
  endDate            DateTime         @db.Date
  annualRoomTarget   Int              @default(100) // Minimum commitment
  actualRoomsSold    Int              @default(0)
  isLra              Boolean          @default(false) // Last Room Availability
  blackoutDates      Json?            // Array of date ranges: [{from, to}]
  negotiatedRates    Json             // e.g. { "DLX_K": 120.00, "EXE_STE": 200.00 }
  isActive           Boolean          @default(true)
  
  createdAt          DateTime         @default(now())
}

// -------------------------------------------------------------
// 5. MICE & BANQUET EVENT ORDERS (BEO)
// -------------------------------------------------------------

enum MiceStage {
  INQUIRY
  PROPOSAL_SENT
  TENTATIVE_HOLD
  DEFINITE_CONFIRMED
  CLOSED_WON_EXECUTED
  CLOSED_LOST
}

model SalesOpportunity {
  id                 String           @id @default(uuid())
  title              String           // e.g. "Annual APAC Partner Conference 2026"
  corporateAccountId String?
  corporateAccount   CorporateAccount? @relation(fields: [corporateAccountId], references: [id])
  stage              MiceStage        @default(INQUIRY)
  estimatedRevenue   Decimal          @db.Decimal(12, 2)
  probability        Int              @default(20) // Percentage 0-100
  expectedCloseDate  DateTime?        @db.Date
  ownerSalesId       String           // Staff ID
  lostReason         String?
  
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
}

model MiceEvent {
  id                 String           @id @default(uuid())
  eventName          String
  corporateAccountId String?
  corporateAccount   CorporateAccount? @relation(fields: [corporateAccountId], references: [id])
  startDate          DateTime
  endDate            DateTime
  attendeesCount     Int
  totalContractValue Decimal          @db.Decimal(12, 2)
  cutoffDate         DateTime?        // Unsold rooms release date
  attritionThreshold Decimal          @default(0.85) @db.Decimal(3, 2) // 85% pickup commitment
  
  beos               BanquetEventOrder[]
  
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
}

model BanquetEventOrder {
  id             String    @id @default(uuid())
  beoNumber      String    @unique // e.g. "BEO-2026-104"
  miceEventId    String
  miceEvent      MiceEvent @relation(fields: [miceEventId], references: [id])
  functionRoom   String    // e.g. "Grand Ballroom A", "Lotus Meeting Room"
  setupStyle     String    // "CLASSROOM", "THEATER", "U_SHAPE", "BANQUET_ROUNDS"
  sessionDate    DateTime  @db.Date
  startTime      String    // "08:30"
  endTime        String    // "17:00"
  guaranteedPax  Int
  setForPax      Int       // Usually guaranteedPax + 5%
  menuDetails    String    @db.Text
  avEquipment    String?   @db.Text
  specialNotes   String?   @db.Text
  isFinalized    Boolean   @default(false)
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

// -------------------------------------------------------------
// 6. SERVICE RECOVERY & MAINTENANCE
// -------------------------------------------------------------

enum IncidentPriority {
  P1_CRITICAL
  P2_MAJOR
  P3_MINOR
}

model GuestIncident {
  id           String           @id @default(uuid())
  guestId      String
  guest        Guest            @relation(fields: [guestId], references: [id])
  priority     IncidentPriority @default(P3_MINOR)
  category     String           // "AC_DEFECT", "NOISE", "CLEANLINESS", "BILLING"
  description  String
  reportedAt   DateTime         @default(now())
  resolvedAt   DateTime?
  resolutionNotes String?
  compensationGiven String?     // e.g. "Free Dinner Voucher + Late Checkout"
  isResolved   Boolean          @default(false)
}

model GuestFeedback {
  id           String   @id @default(uuid())
  guestId      String
  guest        Guest    @relation(fields: [guestId], references: [id])
  source       String   // "PRE_CHECKOUT_APP", "POST_STAY_EMAIL", "GOOGLE_REVIEW", "TRIPADVISOR"
  npsScore     Int?     // 0 to 10
  rating       Int      // 1 to 5
  comments     String?
  sentiment    String?  // "POSITIVE", "NEUTRAL", "NEGATIVE"
  submittedAt  DateTime @default(now())
}

model MaintenanceTicket {
  id          String   @id @default(uuid())
  roomId      String?
  room        Room?    @relation(fields: [roomId], references: [id])
  area        String   // "ROOM_1001", "GYM", "SWIMMING_POOL", "RESTAURANT"
  issue       String
  isFixed     Boolean  @default(false)
  reportedBy  String
  assignedTo  String?
  createdAt   DateTime @default(now())
  fixedAt     DateTime?
}
```
