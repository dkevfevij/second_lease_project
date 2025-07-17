from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SECRET_KEY = os.environ.get("SECRET_KEY", "SecondLeaseJWTSecret2025")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_storage = supabase.storage
