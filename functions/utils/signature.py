import hmac
import base64
import hashlib
from config import config

def verify_line_signature(body: str, signature: str) -> bool:
    """
    Verifies the LINE Messaging API signature.
    """
    channel_secret = config.line_channel_secret
    if not channel_secret:
        print("LINE_CHANNEL_SECRET is not set.")
        return False

    hash = hmac.new(channel_secret.encode('utf-8'),
                    body.encode('utf-8'), hashlib.sha256).digest()
    expected_signature = base64.b64encode(hash).decode('utf-8')
    
    return hmac.compare_digest(expected_signature, signature)
