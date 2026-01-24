import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from urllib.parse import urlparse, parse_qs, urlunparse, urlencode
from .config import DB_URL

# Helper to fix postgresql protocol for asyncpg
def get_db_url():
    url = DB_URL
    if url and url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Parse sslmode from URL and remove it (pass to connect_args instead)
    connect_args = {}
    if url:
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        if 'sslmode' in query_params:
            sslmode = query_params.pop('sslmode')[0]
            connect_args['ssl'] = sslmode
        
        # Rebuild URL without sslmode
        new_query = urlencode(query_params, doseq=True)
        url = urlunparse(parsed._replace(query=new_query))
    
    return url, connect_args

final_db_url, connect_args = get_db_url()

if not final_db_url:
    raise ValueError("DB_URL is not set in environment variables")

# Optimized for 120 concurrent students
engine = create_async_engine(
    final_db_url,
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
