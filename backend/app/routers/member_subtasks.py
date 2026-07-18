from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db_connection
from app.schemas import SubtaskCreate, SubtaskUpdate, StatusUpdateCreate
from app.routers.auth import get_current_user

router = APIRouter(tags=["Member"])

@router.get("/my-tasks")
def get_my_tasks(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM v_member_grid WHERE resource_id = %s", (current_user["user_id"],))
    tasks = cursor.fetchall()
    cursor.close()
    conn.close()
    return tasks

@router.post("/subtasks")
def create_subtask(subtask: SubtaskCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify task belongs to this member (or manager)
    cursor.execute("SELECT resource_id FROM tasks WHERE task_id = %s", (subtask.task_id,))
    task = cursor.fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Parent task not found")
        
    if current_user["role"] == "member" and task["resource_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only add subtasks to your assigned tasks")
    
    cursor.execute(
        """
        INSERT INTO subtasks (task_id, title, expected_end_date, status, environment, area, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING subtask_id
        """,
        (subtask.task_id, subtask.title, subtask.expected_end_date, subtask.status, 
         subtask.environment, subtask.area, current_user["user_id"])
    )
    subtask_id = cursor.fetchone()['subtask_id']
    conn.commit()
    cursor.close()
    conn.close()
    return {"subtask_id": subtask_id, "message": "Subtask created successfully"}

@router.patch("/subtasks/{subtask_id}")
def update_subtask(subtask_id: int, subtask: SubtaskUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    update_fields = []
    values = []
    
    if subtask.status is not None:
        update_fields.append("status = %s")
        values.append(subtask.status)
    if subtask.environment is not None:
        update_fields.append("environment = %s")
        values.append(subtask.environment)
    if subtask.area is not None:
        update_fields.append("area = %s")
        values.append(subtask.area)
        
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")
        
    values.append(subtask_id)
    # Basic authorization check could go here
    query = f"UPDATE subtasks SET {', '.join(update_fields)} WHERE subtask_id = %s"
    
    cursor.execute(query, tuple(values))
    conn.commit()
    
    rowcount = cursor.rowcount
    cursor.close()
    conn.close()
    
    if rowcount == 0:
        raise HTTPException(status_code=404, detail="Subtask not found")
        
    return {"message": "Subtask updated successfully"}

@router.post("/subtasks/{subtask_id}/status-updates")
def add_status_update(subtask_id: int, status_update: StatusUpdateCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Upsert logic based on the UNIQUE (subtask_id, update_date) constraint
    cursor.execute(
        """
        INSERT INTO status_updates (subtask_id, description, created_by, update_date)
        VALUES (%s, %s, %s, CURRENT_DATE)
        ON CONFLICT (subtask_id, update_date) 
        DO UPDATE SET description = EXCLUDED.description, created_at = NOW()
        """,
        (subtask_id, status_update.description, current_user["user_id"])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Status update logged successfully"}

@router.get("/subtasks/{subtask_id}/status-history")
def get_status_history(subtask_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM v_status_history WHERE subtask_id = %s", (subtask_id,))
    history = cursor.fetchall()
    cursor.close()
    conn.close()
    return history
