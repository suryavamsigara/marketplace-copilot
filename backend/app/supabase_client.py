import os
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

_client: Optional[Client] = None


def get_supabase() -> Client:
    """Returns a singleton instance of the Supabase Client initialized
    with SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_KEY)."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "").strip()
        key = os.getenv("SUPABASE_SERVICE_KEY", "").strip() or os.getenv("SUPABASE_KEY", "").strip()
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment.")
        _client = create_client(url, key)
    return _client
