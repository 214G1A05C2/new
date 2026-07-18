from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.database import get_db_connection
from app.schemas import TaskCreate, TaskUpdate
from app.routers.auth import require_manager

router = APIRouter(tags=["Manager"])

@router.get("/users")
def get_users(role: str = "member", current_user: dict = Depends(require_manager)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, name, email, role FROM users WHERE role = %s AND is_active = TRUE", (role,))
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return users

@router.post("/tasks")
def create_task(task: TaskCreate, current_user: dict = Depends(require_manager)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        """
        INSERT INTO tasks (title, resource_id, expected_end_date, status, created_by)
        VALUES (%s, %s, %s, %s, %s) RETURNING task_id
        """,
        (task.title, task.resource_id, task.expected_end_date, task.status, current_user["user_id"])
    )
    task_id = cursor.fetchone()['task_id']
    conn.commit()
    cursor.close()
    conn.close()
    return {"task_id": task_id, "message": "Task created successfully"}

@router.get("/tasks")
def get_tasks(member: Optional[int] = None, current_user: dict = Depends(require_manager)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if member:
        cursor.execute("SELECT * FROM v_task_board WHERE resource_id = %s ORDER BY expected_end_date DESC", (member,))
    else:
        cursor.execute("SELECT * FROM v_task_board ORDER BY expected_end_date DESC")
        
    tasks = cursor.fetchall()
    cursor.close()
    conn.close()
    return tasks

@router.get("/tasks/{task_id}")
def get_task(task_id: int, current_user: dict = Depends(require_manager)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE task_id = %s", (task_id,))
    task = cursor.fetchone()
    cursor.close()
    conn.close()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.patch("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate, current_user: dict = Depends(require_manager)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    update_fields = []
    values = []
    
    if task.title is not None:
        update_fields.append("title = %s")
        values.append(task.title)
    if task.resource_id is not None:
        update_fields.append("resource_id = %s")
        values.append(task.resource_id)
    if task.expected_end_date is not None:
        update_fields.append("expected_end_date = %s")
        values.append(task.expected_end_date)
    if task.status is not None:
        update_fields.append("status = %s")
        values.append(task.status)
        
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")
        
    values.append(task_id)
    query = f"UPDATE tasks SET {', '.join(update_fields)} WHERE task_id = %s"
    
    cursor.execute(query, tuple(values))
    conn.commit()
    
    rowcount = cursor.rowcount
    cursor.close()
    conn.close()
    
    if rowcount == 0:
        raise HTTPException(status_code=404, detail="Task not found")
        
    return {"message": "Task updated successfully"}
