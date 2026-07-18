from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    role: str
    name: str

class TaskCreate(BaseModel):
    title: str
    resource_id: int
    expected_end_date: date
    status: str = "Not Started"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    resource_id: Optional[int] = None
    expected_end_date: Optional[date] = None
    status: Optional[str] = None

class SubtaskCreate(BaseModel):
    task_id: int
    title: str
    expected_end_date: date
    environment: str
    area: str
    status: str = "Not Started"

class SubtaskUpdate(BaseModel):
    status: Optional[str] = None
    environment: Optional[str] = None
    area: Optional[str] = None

class StatusUpdateCreate(BaseModel):
    description: str
