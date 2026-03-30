"""
Email Notification Service
Handles sending escalation notifications and ticket links to customers
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import structlog
from app.config import settings

log = structlog.get_logger()


class EmailService:
    def __init__(self):
        self.smtp_host = getattr(settings, 'SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_user = getattr(settings, 'SMTP_USER', None)
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@aisupporthub.com')
        self.frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

    async def send_escalation_email(
        self,
        customer_email: str,
        customer_name: str,
        ticket_id: str,
        share_token: str,
        subject: str,
    ) -> bool:
        """
        Send escalation notification email with shareable ticket link
        """
        if not self.smtp_user or not self.smtp_password:
            log.warning("Email not configured, skipping email notification", ticket_id=ticket_id)
            return False

        try:
            # Generate shareable link
            ticket_link = f"{self.frontend_url}/ticket/{share_token}"

            # Create HTML email
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #1C1815; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #1E6E4E 0%, #5A876C 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }}
                    .content {{ background: #FDFCF9; padding: 30px; border: 1px solid #E3DDD4; border-top: none; border-radius: 0 0 12px 12px; }}
                    .alert-box {{ background: #FEF0EE; border-left: 4px solid #C8412D; padding: 15px; margin: 20px 0; border-radius: 6px; }}
                    .button {{ display: inline-block; background: #C8412D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                    .button:hover {{ background: #B43A28; }}
                    .footer {{ text-align: center; color: #9E9890; font-size: 12px; margin-top: 20px; }}
                    .ticket-info {{ background: #ECF2EE; padding: 15px; border-radius: 8px; margin: 15px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0; font-size: 24px;">Your Support Request Has Been Escalated</h1>
                    </div>
                    <div class="content">
                        <p>Hi {customer_name},</p>

                        <div class="alert-box">
                            <strong>⚠️ Important Update</strong><br>
                            Your support request has been escalated to our human support team for immediate attention.
                        </div>

                        <div class="ticket-info">
                            <strong>Ticket Details:</strong><br>
                            <strong>Subject:</strong> {subject}<br>
                            <strong>Ticket ID:</strong> {ticket_id[:8]}...
                        </div>

                        <p>Our support specialists are now reviewing your case and will respond as soon as possible. You can continue the conversation and track progress in real-time using the link below:</p>

                        <center>
                            <a href="{ticket_link}" class="button">View & Continue Conversation →</a>
                        </center>

                        <p style="font-size: 14px; color: #5A554F;">
                            <strong>What happens next?</strong><br>
                            • A support specialist will review your chat history<br>
                            • You'll receive a personalized response shortly<br>
                            • You can reply directly through the link above<br>
                            • All your messages are secure and private
                        </p>

                        <p style="margin-top: 30px;">Thank you for your patience!</p>

                        <p style="color: #5A554F;">
                            Best regards,<br>
                            <strong>Customer Support Team</strong>
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from your support system.</p>
                        <p>If you didn't create this ticket, please ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = customer_email
            msg['Subject'] = f"🔔 Your Support Request Has Been Escalated - {subject}"

            # Create plain text fallback
            text_content = f"""
            Hi {customer_name},

            Your support request has been escalated to our human support team.

            Ticket ID: {ticket_id}
            Subject: {subject}

            Continue the conversation here: {ticket_link}

            Our support specialists are reviewing your case and will respond shortly.

            Best regards,
            Customer Support Team
            """

            msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            log.info("Escalation email sent successfully", ticket_id=ticket_id, customer_email=customer_email)
            return True

        except Exception as e:
            log.error("Failed to send escalation email", ticket_id=ticket_id, error=str(e))
            return False

    async def send_ticket_link_email(
        self,
        customer_email: str,
        customer_name: str,
        ticket_id: str,
        share_token: str,
        subject: str,
    ) -> bool:
        """
        Send ticket access link to customer (e.g., when they're not actively online)
        """
        return await self.send_escalation_email(
            customer_email=customer_email,
            customer_name=customer_name,
            ticket_id=ticket_id,
            share_token=share_token,
            subject=subject,
        )
