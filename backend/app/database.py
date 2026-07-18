import psycopg2
from psycopg2.extras import RealDictCursor
import os

DB_USER = "postgres"
DB_PASSWORD = "binny905"
DB_HOST = "localhost"
DB_PORT = "5433"
DB_NAME = "ezmedtech.ai"

def get_db_connection():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        cursor_factory=RealDictCursor
    )
    return conn
