"""
Seed Script — SwiftRoute Logistics Pvt Ltd (MSME Logistics Company)
====================================================================
Creates a new tenant and seeds:
  - 5 users  (owner, tenant_admin, manager, agent × 2)
  - 12 customers  (shippers: mix of VIP high-volume and regular)
  - 18 tickets across all statuses (logistics-domain scenarios)
  - Realistic conversation threads per ticket
  - 10 KB articles (logistics FAQs and policies)
  - Tenant settings tuned for logistics SLA

All passwords: Clario@2026!
"""
import asyncio, sys, uuid
from datetime import datetime, timedelta, timezone
sys.path.insert(0, ".")

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.tenant import Tenant
from app.models.tenant_settings import TenantSettings
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.ticket import Ticket, TicketStatus, TicketChannel
from app.models.message import Message, MessageSender, MessageType
from app.models.kb_entry import KBEntry

# ── Tenant ID (new, unique for SwiftRoute) ───────────────────────────────────
TENANT_ID = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
TENANT_NAME = "SwiftRoute Logistics Pvt Ltd"
DEFAULT_PASSWORD = "Clario@2026!"


def now(offset_days=0, offset_hours=0):
    return datetime.now(timezone.utc) - timedelta(days=offset_days, hours=offset_hours)


# ── Helpers ───────────────────────────────────────────────────────────────────
async def upsert_user(db, email, full_name, role, password=DEFAULT_PASSWORD):
    res = await db.execute(select(User).where(User.email == email))
    u = res.scalar_one_or_none()
    if u:
        u.role = role
        u.tenant_id = TENANT_ID
        u.full_name = full_name
        u.is_active = True
        u.hashed_password = hash_password(password)
        print(f"  updated : {email} → {role.value}")
    else:
        u = User(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=role,
            is_active=True,
        )
        db.add(u)
        print(f"  created : {email}  role={role.value}")
    await db.flush()
    return u


async def seed():
    async with AsyncSessionLocal() as db:

        # ── 0. Create / verify Tenant ─────────────────────────────────────────
        print("\n[0] Tenant")
        res = await db.execute(select(Tenant).where(Tenant.id == TENANT_ID))
        tenant = res.scalar_one_or_none()
        if not tenant:
            tenant = Tenant(
                id=TENANT_ID,
                name=TENANT_NAME,
                slug="swiftroute",
                is_active=True,
            )
            db.add(tenant)
            await db.flush()
            print(f"  created tenant: {TENANT_NAME}")
        else:
            print(f"  tenant exists:  {TENANT_NAME}")

        # ── 1. Users ──────────────────────────────────────────────────────────
        print("\n[1] Users")
        owner        = await upsert_user(db, "owner@swiftroute.com",        "Rajan Mehta",      UserRole.OWNER)
        tenant_admin = await upsert_user(db, "admin@swiftroute.com",        "Deepa Krishnan",   UserRole.TENANT_ADMIN)
        manager      = await upsert_user(db, "manager@swiftroute.com",      "Samuel Osei",      UserRole.MANAGER)
        agent1       = await upsert_user(db, "agent1@swiftroute.com",       "Anita Verma",      UserRole.AGENT)
        agent2       = await upsert_user(db, "agent2@swiftroute.com",       "Kevin Tran",       UserRole.AGENT)

        # ── 2. Tenant Settings ───────────────────────────────────────────────
        print("\n[2] Tenant settings")
        ts_res = await db.execute(
            select(TenantSettings).where(TenantSettings.tenant_id == TENANT_ID)
        )
        ts = ts_res.scalar_one_or_none()
        if not ts:
            ts = TenantSettings(
                tenant_id=TENANT_ID,
                escalation_threshold=0.60,       # logistics: escalate faster (SLA-sensitive)
                auto_draft_enabled=True,
                auto_escalate_enabled=True,
                max_response_time_hours=4,        # 4-hour SLA for logistics
                welcome_message=(
                    "Welcome to SwiftRoute Logistics Support! 🚚 "
                    "Track your shipment, raise a claim, or get help with pickups — "
                    "our AI assistant is available 24/7."
                ),
            )
            db.add(ts)
            print("  created tenant settings (logistics profile)")
        else:
            ts.escalation_threshold = 0.60
            ts.auto_draft_enabled = True
            ts.max_response_time_hours = 4
            ts.welcome_message = (
                "Welcome to SwiftRoute Logistics Support! 🚚 "
                "Track your shipment, raise a claim, or get help with pickups — "
                "our AI assistant is available 24/7."
            )
            print("  updated tenant settings")
        await db.flush()

        # ── 3. Customers (shippers) ───────────────────────────────────────────
        print("\n[3] Customers (shippers)")
        #   (name, email, phone, is_vip, crm_source, external_id, plan, monthly_shipments)
        CUSTOMERS_DATA = [
            ("Priya Textiles",        "priya.textiles@gmail.com",       "+91-98100-11111", True,  "zoho",    "ZH-T001", "premium", 400),
            ("Mumbai Mart Pvt Ltd",   "ops@mumbaimart.in",              "+91-22-3344-5566",True,  "shopify", "SH-M002", "premium", 650),
            ("QuickBite Foods",       "dispatch@quickbitefood.com",     "+91-80-9988-7766",True,  "hubspot", "HS-Q003", "premium", 280),
            ("Raj Electronics",       "logistics@rajelectronics.com",   "+91-44-6655-4433",False, "zoho",    "ZH-R004", "pro",     90),
            ("Neha Handicrafts",      "neha.h@crafts.in",               "+91-98765-22222", False, None,      None,      "basic",   35),
            ("Sunrise Pharma Dist",   "supply@sunrisepharma.com",       "+91-79-2222-3333",True,  "hubspot", "HS-S005", "premium", 520),
            ("TechParts Global",      "export@techpartsglobal.com",     "+91-40-8877-6655",False, "zoho",    "ZH-T006", "pro",     120),
            ("Kavita's Kitchen",      "kavita.k@gmail.com",             "+91-98400-33333", False, None,      None,      "basic",   18),
            ("BlueStar Apparel",      "warehouse@bluestarapparel.com",  "+91-33-9900-8811",False, "shopify", "SH-B007", "pro",     200),
            ("Deccan Agro Exports",   "export@deccanagro.in",           "+91-40-5544-3322",False, "hubspot", "HS-D008", "pro",     155),
            ("Meera Jewellery",       "meera.j@jewels.in",              "+91-99000-44444", False, None,      None,      "basic",   12),
            ("FastMove Courier",      "partner@fastmovecourier.com",    "+91-11-2244-6688",True,  "zoho",    "ZH-F009", "premium", 900),
        ]
        customers = []
        for (name, email, phone, vip, crm, ext_id, plan, monthly_shipments) in CUSTOMERS_DATA:
            res = await db.execute(
                select(Customer).where(Customer.email == email, Customer.tenant_id == TENANT_ID)
            )
            c = res.scalar_one_or_none()
            if not c:
                c = Customer(
                    id=uuid.uuid4(), tenant_id=TENANT_ID,
                    full_name=name, email=email, phone=phone,
                    is_vip=vip, crm_source=crm, external_id=ext_id,
                    extra_data={"plan": plan, "monthly_shipments": monthly_shipments},
                )
                db.add(c)
                print(f"  created customer: {name} (VIP={vip}, {monthly_shipments} shipments/mo)")
            customers.append(c)
        await db.flush()

        # ── 4. Tickets + Messages ─────────────────────────────────────────────
        print("\n[4] Tickets & messages (logistics scenarios)")

        # (cust_idx, subject, status, channel, frustration, days_ago, assigned_agent)
        TICKETS = [
            # ── ESCALATED (high frustration, SLA miss) ──────────────────────
            (0,  "Shipment AWB#SR9901 stuck at Delhi hub for 6 days — urgent textile order",
             TicketStatus.ESCALATED,        TicketChannel.EMAIL,     0.87, 6,  agent1),
            (1,  "200-unit bulk order SH-M002-B44 not moved from origin for 4 days",
             TicketStatus.ESCALATED,        TicketChannel.WHATSAPP,  0.90, 4,  manager),
            (5,  "Pharma shipment temperature-sensitive — held at customs without notification",
             TicketStatus.ESCALATED,        TicketChannel.EMAIL,     0.83, 3,  agent1),
            (11, "Partner account: 50 COD remittances overdue by 12 days — cash flow crisis",
             TicketStatus.ESCALATED,        TicketChannel.EMAIL,     0.92, 5,  manager),

            # ── OPEN (assigned, being worked) ───────────────────────────────
            (3,  "Parcel AWB#SR8812 marked 'Delivered' but customer says not received",
             TicketStatus.OPEN,             TicketChannel.WEB_CHAT,  0.65, 1,  agent2),
            (6,  "Wrong pickup address captured — need redirect before dispatch",
             TicketStatus.OPEN,             TicketChannel.WHATSAPP,  0.50, 1,  agent1),
            (8,  "Damaged parcel received — claim not initiated despite 3 days",
             TicketStatus.OPEN,             TicketChannel.EMAIL,     0.72, 2,  agent2),
            (10, "Return pickup scheduled 3 days ago — partner never showed up",
             TicketStatus.OPEN,             TicketChannel.WEB_CHAT,  0.55, 1,  agent1),

            # ── AI_DRAFTED (AI has pre-written reply) ────────────────────────
            (4,  "How do I track my shipment in real time?",
             TicketStatus.AI_DRAFTED,       TicketChannel.WEB_CHAT,  0.10, 0,  None),
            (7,  "What is the cut-off time for same-day pickup?",
             TicketStatus.AI_DRAFTED,       TicketChannel.WEB_CHAT,  0.08, 0,  None),
            (9,  "Do you offer COD for international shipments?",
             TicketStatus.AI_DRAFTED,       TicketChannel.EMAIL,     0.12, 0,  None),

            # ── WAITING_CUSTOMER (awaiting shipper response) ─────────────────
            (2,  "Invoice SR-INV-441 shows 12 kg but actual weight is 8 kg — dispute",
             TicketStatus.WAITING_CUSTOMER, TicketChannel.EMAIL,     0.35, 3,  agent2),
            (6,  "Customs duty amount exceeds declared value — need clarification",
             TicketStatus.WAITING_CUSTOMER, TicketChannel.EMAIL,     0.40, 2,  agent1),

            # ── CLOSED (resolved) ────────────────────────────────────────────
            (0,  "Pickup not done on scheduled date for order batch TX-3300",
             TicketStatus.CLOSED,           TicketChannel.WHATSAPP,  0.55, 10, agent1),
            (1,  "Extra insurance charges applied without consent on SH-M002-B40",
             TicketStatus.CLOSED,           TicketChannel.EMAIL,     0.30, 14, manager),
            (3,  "How to generate bulk shipping labels via API?",
             TicketStatus.CLOSED,           TicketChannel.WEB_CHAT,  0.05, 7,  agent2),
            (5,  "Can we change delivery attempt from 3 to 5 for our account?",
             TicketStatus.CLOSED,           TicketChannel.EMAIL,     0.10, 9,  manager),
            (8,  "Need GST invoice for all April 2025 shipments",
             TicketStatus.CLOSED,           TicketChannel.EMAIL,     0.15, 12, agent1),
        ]

        def build_messages(ticket_id, tenant_id, customer, ticket, assigned):
            msgs = []
            t = ticket.created_at

            def msg(sender, content, offset_min=0):
                return Message(
                    id=uuid.uuid4(), tenant_id=tenant_id,
                    ticket_id=ticket_id, sender=sender,
                    msg_type=MessageType.TEXT, content=content,
                    created_at=t + timedelta(minutes=offset_min),
                )

            subj = ticket.subject.lower()
            name_first = customer.full_name.split()[0]
            agent_name = assigned.full_name.split()[0] if assigned else "Team"

            # --- Opening customer message ---
            msgs.append(msg(MessageSender.CUSTOMER,
                f"Hi SwiftRoute team, I need urgent help: {ticket.subject}. "
                f"Please respond as soon as possible — this is affecting my business.", 0))

            # --- AI auto-acknowledge ---
            msgs.append(msg(MessageSender.AI,
                f"Hello {name_first}, thank you for contacting SwiftRoute Logistics Support! 🚚 "
                f"I've created ticket #{str(ticket_id)[:8].upper()} for your query. "
                f"Our team will respond within 4 hours per our SLA. "
                f"Meanwhile, you can track your shipment at swiftroute.in/track.", 2))

            # --- Branch by status ---
            if ticket.status == TicketStatus.ESCALATED:
                msgs.append(msg(MessageSender.CUSTOMER,
                    "It has been DAYS and nothing has moved! This is causing serious loss to my business. "
                    "I need someone senior to call me immediately or I will file a complaint with the "
                    "logistics regulator. This is completely unacceptable!", 60))
                msgs.append(msg(MessageSender.AI,
                    f"I sincerely apologise for the delay, {name_first}. I can see the urgency of your "
                    f"situation. I've immediately escalated this to our Senior Operations Team with HIGH "
                    f"priority. A specialist will contact you within 30 minutes.", 61))
                if assigned:
                    msgs.append(msg(MessageSender.AGENT,
                        f"Hi {name_first}, I'm {agent_name}, Senior Operations Specialist at SwiftRoute. "
                        f"I've taken direct ownership of your case. I've already contacted the "
                        f"hub/customs team and am getting a status update. Can you share the "
                        f"AWB number and consignee details so I can escalate to the highest priority?", 90))
                    msgs.append(msg(MessageSender.CUSTOMER,
                        f"Finally someone is responding! Here are the details: "
                        f"AWB #{str(uuid.uuid4())[:8].upper()}, Consignee: as per invoice. "
                        f"Please resolve this immediately.", 95))

            elif ticket.status == TicketStatus.OPEN:
                if assigned:
                    msgs.append(msg(MessageSender.AGENT,
                        f"Hi {name_first}, thanks for reaching out. I'm {agent_name} and I've picked up "
                        f"your case. Let me investigate this right now — I'll check with our operations "
                        f"team and update you within 2 hours.", 30))
                if "damaged" in subj or "claim" in subj:
                    msgs.append(msg(MessageSender.CUSTOMER,
                        "Please hurry — the contents are perishable / high value. "
                        "I have photos of the damage, shall I share them here?", 45))
                    if assigned:
                        msgs.append(msg(MessageSender.AGENT,
                            "Yes, please share the photos and also the original invoice value. "
                            "I'm initiating the claim form on our system right now.", 50))

            elif ticket.status == TicketStatus.WAITING_CUSTOMER:
                if assigned:
                    msgs.append(msg(MessageSender.AGENT,
                        f"Hi {name_first}, I've reviewed your request. Could you please share "
                        f"the original invoice / packing list so we can process the dispute / "
                        f"customs clearance? We'll move forward as soon as we receive it.", 40))
                msgs.append(msg(MessageSender.CUSTOMER,
                    "I'll send the documents shortly. My accounts team is preparing them.", 120))

            elif ticket.status == TicketStatus.CLOSED:
                if assigned:
                    msgs.append(msg(MessageSender.AGENT,
                        f"Hi {name_first}, I'm happy to share that your issue has been resolved. "
                        f"{'Your shipment has been dispatched and is now in transit.' if 'pickup' in subj or 'shipment' in subj else 'The adjustment has been processed on your account.'} "
                        f"You should see the update reflected within 24 hours. "
                        f"Is there anything else I can assist with?", 60))
                msgs.append(msg(MessageSender.CUSTOMER,
                    "Thank you for resolving this! The update looks correct now. "
                    "Good service — will keep using SwiftRoute.", 90))
                msgs.append(msg(MessageSender.SYSTEM,
                    "Ticket closed — customer confirmed resolution. CSAT: 4/5.", 91))

            elif ticket.status == TicketStatus.AI_DRAFTED:
                # AI generates domain-specific draft replies
                if "track" in subj:
                    draft = (
                        "[AI Draft] To track your shipment in real time: "
                        "1) Visit swiftroute.in/track and enter your AWB number. "
                        "2) You can also WhatsApp your AWB to +91-9000-SWIFT for instant updates. "
                        "3) Enable SMS alerts at My Account → Notifications. "
                        "Tracking updates every 2 hours at major hubs."
                    )
                elif "cut-off" in subj or "same-day" in subj:
                    draft = (
                        "[AI Draft] Same-day pickup cut-off times by city: "
                        "Mumbai/Delhi — 3:00 PM IST | Bangalore/Hyderabad — 2:30 PM IST | "
                        "Chennai/Pune — 2:00 PM IST | Other cities — 1:00 PM IST. "
                        "Bookings made after cut-off are scheduled for next business day. "
                        "Book at swiftroute.in/book or call 1800-SWIFT."
                    )
                elif "cod" in subj or "cash on delivery" in subj:
                    draft = (
                        "[AI Draft] COD (Cash on Delivery) is currently available only for "
                        "domestic shipments within India. For international shipments, "
                        "we support Prepaid, Credit Card on Delivery (CCOD) in select countries (UAE, UK, USA). "
                        "COD remittances are processed every 7 days to your registered bank account. "
                        "For COD limits and country list, visit swiftroute.in/services/cod."
                    )
                else:
                    draft = (
                        "[AI Draft] Thank you for your query. Based on our shipping policies, "
                        "our team will be able to assist you with the specific details. "
                        "Please allow 4 hours for a personalised response during business hours."
                    )
                msgs.append(msg(MessageSender.AI,
                    draft + " — ⚠️ This draft is pending agent review before sending.", 3))

            return msgs

        # --- Check for existing tickets to avoid duplicates ---
        existing_subjects = set(
            r[0] for r in (await db.execute(
                __import__("sqlalchemy").text(
                    "SELECT subject FROM tickets WHERE tenant_id = :tid"
                ),
                {"tid": str(TENANT_ID)},
            )).fetchall()
        )

        for (cidx, subject, status, channel, frustration, days_ago, assigned) in TICKETS:
            if subject in existing_subjects:
                print(f"  skip (exists): {subject[:60]}")
                continue
            customer = customers[cidx]
            t_id = uuid.uuid4()
            created_at = now(offset_days=days_ago)
            closed_at = now(offset_days=max(0, days_ago - 1)) if status == TicketStatus.CLOSED else None

            ticket = Ticket(
                id=t_id, tenant_id=TENANT_ID,
                customer_id=customer.id,
                assigned_agent_id=assigned.id if assigned else None,
                subject=subject,
                status=status, channel=channel,
                frustration_score=frustration,
                ai_draft=(
                    "AI has prepared a draft logistics reply. Please review before sending."
                    if status == TicketStatus.AI_DRAFTED else None
                ),
                created_at=created_at, closed_at=closed_at,
            )
            db.add(ticket)
            await db.flush()

            for m in build_messages(ticket.id, TENANT_ID, customer, ticket, assigned):
                db.add(m)

            print(f"  ticket [{status.value:18}] {subject[:60]}")

        # ── 5. KB Articles ─────────────────────────────────────────────────────
        print("\n[5] Knowledge base articles (logistics domain)")
        KB_ARTICLES = [
            (
                "How to Track Your Shipment (Real-Time Tracking)",
                "SwiftRoute offers real-time tracking via multiple channels:\n"
                "• Web: Go to swiftroute.in/track → enter your AWB number\n"
                "• WhatsApp: Send your AWB to +91-9000-SWIFT for instant location updates\n"
                "• SMS Alerts: Enable in My Account → Notifications\n"
                "• API: Use GET /v2/track?awb={awb_number} (API key required)\n"
                "Tracking events update every 2 hours at major hubs. "
                "Contact support if tracking shows no movement for more than 24 hours.",
            ),
            (
                "What to Do When a Shipment Is Delayed",
                "Shipment delays can occur due to customs, weather, strikes, or hub congestion. Steps:\n"
                "1. Check tracking — look for a reason code at the last hub event.\n"
                "2. If no movement for 48h, raise a ticket via Web Chat or WhatsApp.\n"
                "3. For bulk/B2B orders, call your dedicated account manager.\n"
                "4. SwiftRoute's SLA for standard delivery is 3–5 business days. "
                "Priority/Express SLA is 1–2 business days.\n"
                "5. For pharma/perishable — escalate immediately if delay exceeds 12 hours.",
            ),
            (
                "Damaged or Lost Parcel — Claim Process",
                "To file a claim for a damaged or lost shipment:\n"
                "1. Report within 48 hours of delivery (damaged) or 7 days of expected delivery (lost).\n"
                "2. Raise a ticket via Web Chat or email support@swiftroute.in with:\n"
                "   • AWB number\n"
                "   • Photos of damaged packaging/contents (for damage claims)\n"
                "   • Original invoice showing declared value\n"
                "   • Packing list\n"
                "3. Claims are processed within 7–14 business days.\n"
                "4. Compensation is capped at ₹5,000 unless additional insurance was purchased.\n"
                "5. Purchase ShieldPlus Insurance at booking for full declared value coverage.",
            ),
            (
                "COD (Cash on Delivery) Remittance Policy",
                "SwiftRoute COD remittance schedule:\n"
                "• Standard: Remittance every 7 days to registered bank account\n"
                "• Premium accounts: Remittance every 3 days\n"
                "• Minimum remittance amount: ₹500\n"
                "COD is available for domestic shipments only. Max COD value: ₹50,000/shipment.\n"
                "Remittance disputes: If an expected remittance is missing, raise a ticket with "
                "the AWB list and expected settlement date. We will reconcile within 48 hours.\n"
                "Bank details can be updated at My Account → Payments → Bank Details.",
            ),
            (
                "Customs & Duties — International Shipments Guide",
                "For international shipments:\n"
                "• Declare accurate value on the Commercial Invoice (customs fraud = shipment seizure)\n"
                "• Attach: Commercial Invoice, Packing List, Country of Origin Certificate (if required)\n"
                "• HS Code: Required for B2B cross-border. Find at swiftroute.in/hs-finder\n"
                "• Duties are typically paid by consignee (DDP: Delivered Duty Paid — we can arrange)\n"
                "• Restricted items: Batteries, liquids, sharp objects — check swiftroute.in/restricted\n"
                "For pharma exports: Requires CDSCO NOC + Export License.\n"
                "Contact our customs team at customs@swiftroute.in for pre-shipment advice.",
            ),
            (
                "Pickup Scheduling, Rescheduling & Cancellation",
                "Booking a pickup:\n"
                "• Book at swiftroute.in/book or via API\n"
                "• Same-day pickup cut-off: 3 PM in metros, 1 PM in Tier-2 cities\n"
                "• Pickup slots: 10AM–2PM and 2PM–6PM\n\n"
                "Rescheduling: Call 1800-SWIFT or log into My Account → Active Pickups → Reschedule "
                "at least 2 hours before the scheduled slot.\n\n"
                "Cancellation: Cancel at least 4 hours before pickup. "
                "Late cancellations (< 2h before slot) incur a ₹50 convenience fee.\n\n"
                "Missed pickup by courier: If our courier misses a confirmed pickup, "
                "re-schedule is done on priority the next morning at no extra charge.",
            ),
            (
                "Weight Discrepancy & Invoice Disputes",
                "SwiftRoute uses volumetric weight (L×B×H in cm ÷ 4000) or actual weight, "
                "whichever is higher. This is industry-standard.\n\n"
                "If you believe there is a billing error:\n"
                "1. Raise a dispute ticket within 7 days of invoice date.\n"
                "2. Attach: Original packing dimensions/weight proof (photo with measuring tape).\n"
                "3. Our team re-weighs the shipment records. If our records show discrepancy, "
                "   a credit note is issued within 5 business days.\n\n"
                "To avoid disputes: Install SwiftRoute Scale App to capture weight at pickup.",
            ),
            (
                "Return Logistics — How to Initiate a Return Pickup",
                "To initiate a return:\n"
                "1. Log into the Shipper Portal → Orders → [Select Order] → Request Return\n"
                "2. OR raise a support ticket with: AWB of original shipment + return reason + address\n"
                "3. A return pickup is scheduled within 24 hours.\n"
                "4. Return tracking is provided separately with a new AWB prefixed 'R-'.\n\n"
                "Return pricing: Standard reverse logistics rate applies (see your rate card).\n"
                "Failed return attempts: 3 attempts made. After 3 failures, shipment is held at "
                "hub for 7 days before being RTO'd (returned to origin) with additional storage fee.",
            ),
            (
                "API & Bulk Label Generation",
                "SwiftRoute API allows full automation of your logistics workflow:\n"
                "• Endpoints: Book shipment, Generate label, Track, Cancel, Get rate\n"
                "• Authentication: Bearer token (generate at Developer Portal → API Keys)\n"
                "• Rate limits: 60 req/min (Pro), 200 req/min (Premium)\n"
                "• Bulk label generation: POST /v2/bulk-shipments — accepts up to 500 shipments per call\n"
                "• Webhooks: Subscribe to shipment events (delivered, failed, OFD, RTO) at Settings → Webhooks\n"
                "SDK available for Python, Node.js, PHP. Docs: developers.swiftroute.in",
            ),
            (
                "GST Invoicing & Tax Documents",
                "SwiftRoute is GST-registered: GSTIN 27AAACS1234P1ZX (Maharashtra).\n"
                "GST invoices are generated automatically after each shipment and available at:\n"
                "  My Account → Invoices → Download\n\n"
                "Bulk invoice download (date range): Billing → Bulk Export → Select Month → CSV/PDF.\n"
                "GST rate on logistics services: 18% (standard), 5% (GTA services under RCM).\n"
                "For ITC (Input Tax Credit) eligibility, ensure your GSTIN is updated in your profile.\n"
                "Missing invoices or GSTIN amendments: Contact billing@swiftroute.in with your account ID.",
            ),
        ]

        existing_kb = set(
            r[0] for r in (await db.execute(
                __import__("sqlalchemy").text(
                    "SELECT title FROM kb_entries WHERE tenant_id = :tid"
                ),
                {"tid": str(TENANT_ID)},
            )).fetchall()
        )
        for title, content in KB_ARTICLES:
            if title in existing_kb:
                print(f"  skip (exists): {title[:60]}")
                continue
            db.add(KBEntry(
                id=uuid.uuid4(), tenant_id=TENANT_ID,
                title=title, content=content,
                source_type="manual", created_by_id=tenant_admin.id,
            ))
            print(f"  created KB: {title[:60]}")

        # ── Commit ────────────────────────────────────────────────────────────
        await db.commit()
        print("\n✅  SwiftRoute Logistics seeded successfully!")
        print(f"   Tenant  : {TENANT_NAME}")
        print(f"   ID      : {TENANT_ID}")
        print(f"   Users   : owner@swiftroute.com / admin@swiftroute.com / "
              f"manager@swiftroute.com / agent1@swiftroute.com / agent2@swiftroute.com")
        print(f"   Password: {DEFAULT_PASSWORD}")


asyncio.run(seed())
