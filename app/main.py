from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, manager_tasks, member_subtasks, reports

app = FastAPI(title="Mini Task Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(manager_tasks.router)
app.include_router(member_subtasks.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {"message": "Mini Task Dashboard API is running"}
