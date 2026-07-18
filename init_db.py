import psycopg2
import os

DB_USER = "postgres"
DB_PASSWORD = "binny905"
DB_HOST = "localhost"
DB_PORT = "5433"
DB_NAME = "ezmedtech.ai"

print(f"Connecting to {DB_NAME} at {DB_HOST}:{DB_PORT} as {DB_USER}...")

try:
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    with open("schema.sql", "r") as f:
        sql = f.read()
    
    print("Executing schema.sql...")
    cursor.execute(sql)
    print("Schema applied successfully!")
    
except Exception as e:
    print(f"Error initializing DB: {e}")
finally:
    if 'conn' in locals() and conn:
        cursor.close()
        conn.close()
