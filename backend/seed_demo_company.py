"""
Seed a realistic mock company (Demo Company) with:
  - 4 properly-assigned users (tenant_admin, owner, manager, agent)
  - 10 customers (2 VIP)
  - 15 tickets across all statuses & channels
  - Messages per ticket (customer + agent + AI replies)
  - 8 KB articles
  - Tenant settings
"""
import asyncio, sys, uuid
from datetime import datetime, timedelta, timezone
sys.path.insert(0, ".")

from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.tenant import Tenant
from app.models.tenant_settings import TenantSettings
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.ticket import Ticket, TicketStatus, TicketChannel
from app.models.message import Message, MessageSender, MessageType
from app.models.kb_entry import KBEntry

# ── IDs ──────────────────────────────────────────────────────────────────────
TENANT_ID = uuid.UUID("0c1ef5be-4fde-4bf7-ae8e-3f56cb174828")  # Demo Company
DEFAULT_PASSWORD = "Clario@2026!"
TENANT_SLUG = "demo-company"

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
        print(f"  updated: {email} -> {role.value}")
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
        print(f"  created: {email}  role={role.value}")
    await db.flush()
    return u


async def seed():
    async with AsyncSessionLocal() as db:

        # ── 0. Ensure tenant exists ────────────────────────────────────────
        tenant_res = await db.execute(select(Tenant).where(Tenant.id == TENANT_ID))
        tenant = tenant_res.scalar_one_or_none()
        if not tenant:
            tenant = Tenant(
                id=TENANT_ID,
                name="Demo Company",
                slug=TENANT_SLUG,
                is_active=True,
            )
            db.add(tenant)
            await db.flush()
            print(f"  created tenant: Demo Company ({TENANT_ID})")
        else:
            print("  tenant exists: Demo Company")

        # ── 1. Users ──────────────────────────────────────────────────────────
        print("\n[1] Users")
        owner        = await upsert_user(db, "owner@demo.com",       "Sarah Mitchell",   UserRole.OWNER)
        tenant_admin = await upsert_user(db, "tenantadmin@demo.com", "Alex Rivera",      UserRole.TENANT_ADMIN)
        manager      = await upsert_user(db, "manager@demo.com",     "James Thornton",   UserRole.MANAGER)
        agent        = await upsert_user(db, "agent@demo.com",       "Priya Nair",       UserRole.AGENT)

        # ── 2. Tenant settings ───────────────────────────────────────────────
        print("\n[2] Tenant settings")
        ts_res = await db.execute(select(TenantSettings).where(TenantSettings.tenant_id == TENANT_ID))
        ts = ts_res.scalar_one_or_none()
        if not ts:
            ts = TenantSettings(
                tenant_id=TENANT_ID,
                escalation_threshold=0.65,
                auto_draft_enabled=True,
                auto_escalate_enabled=True,
                max_response_time_hours=6,
                welcome_message="Hi! How can we help you today? Our AI assistant will respond immediately.",
            )
            db.add(ts)
            print("  created tenant settings")
        else:
            ts.escalation_threshold = 0.65
            ts.auto_draft_enabled = True
            ts.welcome_message = "Hi! How can we help you today? Our AI assistant will respond immediately."
            print("  updated tenant settings")
        await db.flush()

        # ── 3. Customers ──────────────────────────────────────────────────────
        print("\n[3] Customers")
        CUSTOMERS_DATA = [
            ("Emma Johnson",    "emma.johnson@shopnow.com",   "+1-555-201-1111", True,  "shopify", "SH-10021"),
            ("Liam Chen",       "liam.chen@techcorp.io",      "+1-555-202-2222", False, "hubspot", "HS-88821"),
            ("Aisha Patel",     "aisha.patel@gmail.com",      "+91-98765-43210", False, None,      None),
            ("Carlos Mendes",   "carlos@mendes-retail.com",   "+34-611-334455",  True,  "zoho",    "ZH-4401"),
            ("Sophie Müller",   "sophie.m@berlin-shop.de",    "+49-171-555-9900",False, "hubspot", "HS-77340"),
            ("Raj Sharma",      "raj.sharma@enterprise.in",   "+91-80-4567-8901",False, "zoho",    "ZH-5512"),
            ("Fatima Al-Hassan","fatima.h@quickbuy.ae",       "+971-50-123-4567",True,  "shopify", "SH-10098"),
            ("Noah Williams",   "noah.w@startupco.com",       "+1-555-300-4444", False, None,      None),
            ("Mei Lin",         "mei.lin@ecomstore.sg",       "+65-9123-4567",   False, "shopify", "SH-10154"),
            ("Daniel Okafor",   "d.okafor@lagostech.ng",      "+234-802-555-7890",False,None,      None),
        ]
        customers = []
        for name, email, phone, vip, crm, ext_id in CUSTOMERS_DATA:
            res = await db.execute(
                select(Customer).where(Customer.email == email, Customer.tenant_id == TENANT_ID)
            )
            c = res.scalar_one_or_none()
            if not c:
                c = Customer(
                    id=uuid.uuid4(), tenant_id=TENANT_ID,
                    full_name=name, email=email, phone=phone,
                    is_vip=vip, crm_source=crm, external_id=ext_id,
                    extra_data={"plan": "premium" if vip else "basic"},
                )
                db.add(c)
                print(f"  created customer: {name}")
            customers.append(c)
        await db.flush()

        # ── 4. Tickets + Messages ─────────────────────────────────────────────
        print("\n[4] Tickets & messages")

        TICKETS = [
            # (customer_idx, subject, status, channel, frustration, days_ago, agent_user)
            (0, "Order #45231 not delivered after 10 days",     TicketStatus.ESCALATED,       TicketChannel.EMAIL,     0.82, 3, agent),
            (1, "API rate limit keeps hitting 429 errors",      TicketStatus.OPEN,            TicketChannel.WEB_CHAT,  0.35, 1, agent),
            (2, "Cannot reset my password — no email received", TicketStatus.AI_DRAFTED,      TicketChannel.WEB_CHAT,  0.4,  0, None),
            (3, "Wrong item shipped in order #ZH990",           TicketStatus.ESCALATED,       TicketChannel.WHATSAPP,  0.78, 5, agent),
            (4, "How do I import bulk products via CSV?",       TicketStatus.CLOSED,          TicketChannel.EMAIL,     0.1,  7, manager),
            (5, "Invoice missing GST breakdown",                TicketStatus.WAITING_CUSTOMER,TicketChannel.EMAIL,     0.25, 2, agent),
            (6, "Checkout page crashes on mobile Safari",       TicketStatus.ESCALATED,       TicketChannel.WEB_CHAT,  0.88, 1, manager),
            (7, "Subscription upgrade not reflecting",          TicketStatus.OPEN,            TicketChannel.WEB_CHAT,  0.45, 0, None),
            (8, "Duplicate charge on 15 Feb — need refund",    TicketStatus.OPEN,            TicketChannel.EMAIL,     0.60, 1, agent),
            (9, "African payment gateway support timeline?",    TicketStatus.CLOSED,          TicketChannel.WEB_CHAT,  0.15, 10, manager),
            (0, "Discount code SAVE20 not applying",            TicketStatus.AI_DRAFTED,      TicketChannel.WEB_CHAT,  0.30, 0, None),
            (2, "Can I switch from monthly to annual plan?",    TicketStatus.CLOSED,          TicketChannel.EMAIL,     0.05, 14, agent),
            (4, "Integration with WooCommerce broken after update", TicketStatus.OPEN,        TicketChannel.WEB_CHAT,  0.55, 0, None),
            (6, "AI draft reply sent to wrong customer",        TicketStatus.ESCALATED,       TicketChannel.EMAIL,     0.92, 2, manager),
            (1, "Custom domain not propagating after 48h",      TicketStatus.WAITING_CUSTOMER,TicketChannel.WEB_CHAT,  0.40, 3, agent),
        ]

        # Conversation templates keyed by ticket subject keywords
        def build_messages(ticket_id, tenant_id, customer, ticket, agent_user):
            msgs = []
            t = ticket.created_at

            def msg(sender, content, offset_minutes=0):
                return Message(
                    id=uuid.uuid4(), tenant_id=tenant_id, ticket_id=ticket_id,
                    sender=sender, msg_type=MessageType.TEXT, content=content,
                    created_at=t + timedelta(minutes=offset_minutes),
                )

            subj = ticket.subject.lower()

            # Opening message from customer
            msgs.append(msg(MessageSender.CUSTOMER,
                f"Hi, I need help with: {ticket.subject}. Please assist ASAP.", 0))

            # AI auto-response
            msgs.append(msg(MessageSender.AI,
                "Thank you for reaching out! I've logged your request and our team will respond shortly. "
                "In the meantime, here's what I found in our knowledge base that might help you.", 1))

            if ticket.status in (TicketStatus.ESCALATED,):
                msgs.append(msg(MessageSender.CUSTOMER,
                    "This is taking too long. I've been waiting for days and nobody has helped me. "
                    "I want to speak to a manager immediately!", 30))
                msgs.append(msg(MessageSender.AI,
                    "I understand your frustration and sincerely apologise. I'm escalating this to a "
                    "senior agent right now. You'll hear back within 1 hour.", 31))
                if agent_user:
                    msgs.append(msg(MessageSender.AGENT,
                        f"Hi {customer.full_name.split()[0]}, I'm {agent_user.full_name.split()[0]}, "
                        "a senior support specialist. I've taken ownership of your case and will resolve "
                        "this for you personally. Can you confirm your order number?", 60))

            elif ticket.status == TicketStatus.WAITING_CUSTOMER:
                if agent_user:
                    msgs.append(msg(MessageSender.AGENT,
                        f"Hi {customer.full_name.split()[0]}, I've reviewed your request. "
                        "Could you please provide your account ID so I can look into this further?", 45))
                msgs.append(msg(MessageSender.CUSTOMER,
                    "Sure, my account ID is ACC-" + str(uuid.uuid4())[:8].upper() + ". Let me know if you need anything else.", 90))

            elif ticket.status == TicketStatus.CLOSED:
                if agent_user:
                    msgs.append(msg(MessageSender.AGENT,
                        f"Hi {customer.full_name.split()[0]}, I've resolved your issue. "
                        "The fix has been applied to your account. Please let me know if anything else comes up!", 60))
                msgs.append(msg(MessageSender.CUSTOMER,
                    "Thank you so much! That worked perfectly. Great support as always.", 90))
                msgs.append(msg(MessageSender.SYSTEM,
                    "Ticket closed by agent. Customer confirmed resolution.", 91))

            elif ticket.status == TicketStatus.AI_DRAFTED:
                msgs.append(msg(MessageSender.AI,
                    "[AI Draft] Based on our knowledge base: " + (
                        "Discount codes are case-sensitive and can only be used once per account. "
                        "Please verify the code is in CAPS and hasn't been used before."
                        if "discount" in subj else
                        "Password reset emails are sent within 5 minutes. Please check your spam folder. "
                        "If you still don't see it, try using a different email or contact us."
                    ) + " — This draft is awaiting agent review.", 3))

            elif ticket.status == TicketStatus.OPEN:
                if agent_user:
                    msgs.append(msg(MessageSender.AGENT,
                        f"Hi {customer.full_name.split()[0]}, thanks for reaching out. "
                        "I'm looking into this right now and will update you shortly.", 30))

            return msgs

        existing_subjects = set(
            r[0] for r in (await db.execute(
                __import__("sqlalchemy").text("SELECT subject FROM tickets WHERE tenant_id = :tid"),
                {"tid": str(TENANT_ID)}
            )).fetchall()
        )

        created_tickets = []
        for (cidx, subject, status, channel, frustration, days_ago, assigned) in TICKETS:
            if subject in existing_subjects:
                print(f"  skip (exists): {subject[:50]}")
                continue
            customer = customers[cidx]
            t_id = uuid.uuid4()
            created_at = now(offset_days=days_ago)
            closed_at = now(offset_days=max(0, days_ago - 1)) if status == TicketStatus.CLOSED else None

            ticket = Ticket(
                id=t_id,
                tenant_id=TENANT_ID,
                customer_id=customer.id,
                assigned_agent_id=assigned.id if assigned else None,
                subject=subject,
                status=status,
                channel=channel,
                frustration_score=frustration,
                ai_draft=(
                    "AI has prepared a draft response based on your knowledge base. "
                    "Please review and send." if status == TicketStatus.AI_DRAFTED else None
                ),
                created_at=created_at,
                closed_at=closed_at,
            )
            db.add(ticket)
            await db.flush()  # get ticket.id

            for m in build_messages(ticket.id, TENANT_ID, customer, ticket, assigned):
                db.add(m)

            print(f"  ticket [{status.value:18}] {subject[:55]}")
            created_tickets.append(ticket)

        # ── 5. KB Articles ────────────────────────────────────────────────────
        print("\n[5] Knowledge base articles")
        KB_ARTICLES = [
            ("Getting Started with AISupportHub",
             "Welcome to AISupportHub! This guide walks you through setting up your account, connecting your CRM, "
             "configuring your AI assistant, and inviting your support team. Start by navigating to Settings → "
             "Integrations to connect Zoho, HubSpot, or Shopify. Then visit Team to add agents and managers."),
            ("How to Reset Your Password",
             "If you've forgotten your password: 1) Click 'Forgot Password' on the login page. 2) Enter your "
             "registered email. 3) Check your inbox (and spam folder) for the reset email. 4) The link expires "
             "in 30 minutes. If you don't receive the email, ensure you're using the address registered on your "
             "account. Contact support if issues persist."),
            ("Subscription Plans & Pricing",
             "AISupportHub offers three tiers: Basic (up to 3 agents, 500 tickets/mo, $29/mo), Pro (up to 10 "
             "agents, 5000 tickets/mo, AI drafting, $79/mo), and Premium (unlimited agents, unlimited tickets, "
             "full BI dashboards, priority support, $199/mo). Annual plans get 20% off. Upgrade anytime from "
             "Settings → Subscription."),
            ("Understanding AI Draft Responses",
             "AI drafting automatically generates a suggested reply for every new ticket using your knowledge "
             "base content. Agents see the draft highlighted in yellow and can 1) send it as-is, 2) edit before "
             "sending, or 3) discard and write manually. To improve draft quality, add more articles to your "
             "Knowledge Base under Settings → KB."),
            ("Escalation Rules & Thresholds",
             "Tickets are auto-escalated when the frustration score exceeds your threshold (default 0.7). "
             "The score = 0.5×sentiment_negativity + 0.3×message_frequency + 0.2×vip_flag. VIP customers have "
             "a 0.2 bonus added. You can adjust the threshold in Policies. Escalated tickets are flagged orange "
             "and assigned to your most senior available agent."),
            ("Refund & Return Policy Guide",
             "Standard refund window is 30 days from purchase. To initiate: 1) Customer opens a ticket via "
             "web chat or email. 2) Agent verifies order in CRM. 3) Refund is processed within 5-7 business "
             "days to the original payment method. For duplicate charges, refunds are expedited within 24h. "
             "Physical returns require a return label generated from the Orders tab."),
            ("CRM Integration Setup (Zoho / HubSpot / Shopify)",
             "To connect your CRM: Go to Settings → Integrations. Choose your CRM and click Connect. "
             "You'll need: API key (Zoho/HubSpot) or Store URL + Admin API key (Shopify). Once connected, "
             "customer profiles sync automatically. Webhooks are configured automatically for real-time events "
             "like new orders, refunds, and customer updates."),
            ("Using Discount Codes",
             "Discount codes are case-sensitive and must be entered exactly as provided (e.g. SAVE20 not save20). "
             "Each code can only be used once per account unless specified as multi-use. Codes cannot be combined "
             "with other promotions. Expired codes show an error at checkout. If a valid code isn't applying, "
             "clear your browser cache and try again. Contact support with your code and order ID for manual "
             "application."),
        ]
        existing_kb = set(
            r[0] for r in (await db.execute(
                __import__("sqlalchemy").text("SELECT title FROM kb_entries WHERE tenant_id = :tid"),
                {"tid": str(TENANT_ID)}
            )).fetchall()
        )
        for title, content in KB_ARTICLES:
            if title in existing_kb:
                print(f"  skip (exists): {title[:55]}")
                continue
            db.add(KBEntry(
                id=uuid.uuid4(), tenant_id=TENANT_ID,
                title=title, content=content,
                source_type="manual", created_by_id=tenant_admin.id,
            ))
            print(f"  created KB: {title[:55]}")

        # ── Commit all ────────────────────────────────────────────────────────
        await db.commit()
        print("\n[SUCCESS] Demo company seeded successfully!")
        print(f"   Tenant:  Demo Company  ({TENANT_ID})")
        print(f"   Users:   owner@demo.com / tenantadmin@demo.com / manager@demo.com / agent@demo.com")
        print(f"   Password: {DEFAULT_PASSWORD}")

asyncio.run(seed())
