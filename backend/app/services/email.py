"""Async transactional email via aiosmtplib + Jinja2 inline templates.

In development (no SMTP_HOST configured) the message is logged via loguru
instead of being sent, so the auth flow never crashes for lack of a mail
server. Email failures are swallowed and logged — they must never break a
request path such as signup.
"""
from email.message import EmailMessage

import aiosmtplib
from jinja2 import Template
from loguru import logger

from app.core.config import settings

# --- Inline HTML templates -------------------------------------------------
_BASE_TEMPLATE = Template(
    """
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f4f5f7; margin:0; padding:24px;">
    <table align="center" width="100%" style="max-width:480px; background:#ffffff; border-radius:12px; padding:32px;">
      <tr><td>
        <h2 style="color:#1a1a2e; margin-top:0;">{{ heading }}</h2>
        <p style="color:#444; font-size:15px; line-height:1.6;">{{ intro }}</p>
        <p style="text-align:center; margin:28px 0;">
          <a href="{{ action_url }}"
             style="background:#4f46e5; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; display:inline-block;">
            {{ action_label }}
          </a>
        </p>
        <p style="color:#888; font-size:13px; line-height:1.6;">
          If the button does not work, copy and paste this link into your browser:<br>
          <a href="{{ action_url }}" style="color:#4f46e5; word-break:break-all;">{{ action_url }}</a>
        </p>
        <p style="color:#aaa; font-size:12px; margin-top:24px;">{{ footer }}</p>
      </td></tr>
    </table>
  </body>
</html>
"""
)


async def send_email(to: str, subject: str, html: str) -> None:
    """Send an HTML email. If SMTP is not configured, log it (dev mode)."""
    if not settings.SMTP_HOST:
        logger.info(f"[email:dev] To={to} Subject={subject!r}\n{html}")
        return

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content("This message requires an HTML-capable email client.")
    message.add_alternative(html, subtype="html")

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=settings.SMTP_PORT == 587,
            use_tls=settings.SMTP_PORT == 465,
        )
        logger.info(f"Sent email to {to}: {subject!r}")
    except Exception as exc:  # never break the request path on mail failure
        logger.error(f"Failed to send email to {to}: {exc}")


async def send_verification_email(to: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = _BASE_TEMPLATE.render(
        heading="Verify your email",
        intro=f"Welcome to {settings.PROJECT_NAME}! Confirm your email address to activate your account.",
        action_url=link,
        action_label="Verify Email",
        footer="This link expires in 48 hours. If you did not sign up, you can ignore this email.",
    )
    await send_email(to, f"Verify your {settings.PROJECT_NAME} account", html)


async def send_reset_email(to: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = _BASE_TEMPLATE.render(
        heading="Reset your password",
        intro="We received a request to reset your password. Click below to choose a new one.",
        action_url=link,
        action_label="Reset Password",
        footer="This link expires in 2 hours. If you did not request a reset, you can safely ignore this email.",
    )
    await send_email(to, f"Reset your {settings.PROJECT_NAME} password", html)
