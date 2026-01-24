import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs, urlunparse, urlencode

load_dotenv()

# MUST start with postgresql+asyncpg://
DB_URL = os.getenv("DB_URL")
if DB_URL and DB_URL.startswith("postgresql://"):
    DB_URL = DB_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Parse sslmode from URL and remove it
connect_args = {}
if DB_URL:
    parsed = urlparse(DB_URL)
    query_params = parse_qs(parsed.query)
    if 'sslmode' in query_params:
        sslmode = query_params.pop('sslmode')[0]
        connect_args['ssl'] = sslmode
    
    # Rebuild URL without sslmode
    new_query = urlencode(query_params, doseq=True)
    DB_URL = urlunparse(parsed._replace(query=new_query))


# Optimized for 120 concurrent students
engine = create_async_engine(
    DB_URL,
    pool_size=20,          # Connections kept in memory
    max_overflow=30,       # Extra burst capacity for the "rush"
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=connect_args
)

AsyncSessionLocal = sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Dependency to use in routes
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
