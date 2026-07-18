from fastapi import APIRouter, Depends
from app.database import get_db_connection
from app.routers.auth import require_manager

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/summary")
def get_summary_report(current_user: dict = Depends(require_manager)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Status Breakdown
    cursor.execute("SELECT status, COUNT(*) FROM tasks GROUP BY status")
    status_breakdown = cursor.fetchall()
    
    # Overdue Tasks
    cursor.execute("SELECT COUNT(*) as overdue_count FROM tasks WHERE expected_end_date < CURRENT_DATE AND status != 'Done'")
    overdue_count = cursor.fetchone()['overdue_count']
    
    # Tasks per Member
    cursor.execute("""
        SELECT u.name, COUNT(t.task_id) as task_count 
        FROM users u 
        LEFT JOIN tasks t ON u.user_id = t.resource_id 
        WHERE u.role = 'member' 
        GROUP BY u.name
    """)
    tasks_per_member = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {
        "status_breakdown": status_breakdown,
        "overdue_count": overdue_count,
        "tasks_per_member": tasks_per_member
    }
