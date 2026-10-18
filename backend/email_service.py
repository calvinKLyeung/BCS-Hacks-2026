import html
import logging

import resend

import config

log = logging.getLogger("email")


def send_contact_email(to: str, reply_to: str, buyer_name: str, message: str,
                       title: str, listing_id: str) -> None:
    link = f"{config.FRONTEND_URL}/item/{listing_id}"
    subject = f'New message about your "{title}" on CampusSwap'
    text = (
        f"{buyer_name} sent you a message about \"{title}\":\n\n"
        f"{message}\n\n"
        f"Item: {link}\n\n"
        f"Reply to this email to respond to {buyer_name}."
    )
    body_html = (
        f"<p><strong>{html.escape(buyer_name)}</strong> sent you a message about "
        f"<strong>{html.escape(title)}</strong>:</p>"
        f"<blockquote style=\"border-left:3px solid #1F6B4A;padding-left:12px;white-space:pre-wrap\">"
        f"{html.escape(message)}</blockquote>"
        f"<p><a href=\"{html.escape(link)}\">View the item</a></p>"
        f"<p>Reply to this email to respond to {html.escape(buyer_name)}.</p>"
    )

    if not config.RESEND_API_KEY:
        print(
            "\n===== EMAIL (no RESEND_API_KEY, not sent) =====\n"
            f"To: {to}\nReply-To: {reply_to}\nSubject: {subject}\n\n{text}\n"
            "===============================================\n",
            flush=True,
        )
        return

    resend.api_key = config.RESEND_API_KEY
    resend.Emails.send({
        "from": config.EMAIL_FROM,
        "to": [to],
        "reply_to": reply_to,
        "subject": subject,
        "text": text,
        "html": body_html,
    })
