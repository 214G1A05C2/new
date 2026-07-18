import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function MemberGrid() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState([]);
  const [managerTasks, setManagerTasks] = useState([]); // for dropdown when creating subtask
  
  const [expandedSubtasks, setExpandedSubtasks] = useState(new Set());
  const [histories, setHistories] = useState({});
  
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedSubtask, setSelectedSubtask] = useState(null);

  const [formFields, setFormFields] = useState({
    task_id: '',
    title: '',
    expected_end_date: '',
    environment: 'Dev',
    area: 'Backend',
    status: 'Not Started',
    description: ''
  });
  
  const [newStatusNote, setNewStatusNote] = useState("");
  const [statusNoteError, setStatusNoteError] = useState("");

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      const res = await api.get('/member/my-tasks');
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchManagerTasks = async () => {
    try {
      // In this setup, we just fetch all tasks the member is assigned to
      // or we can use a dedicated endpoint. The member grid gives us all subtasks, but to create a new subtask we need the parent tasks.
      // We'll reuse the manager task endpoint or an assumed one. For simplicity, we just extract unique parent tasks from my-tasks.
      const res = await api.get(`/manager/tasks?member=${user.user_id}`);
      setManagerTasks(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpand = async (id) => {
    const newExpanded = new Set(expandedSubtasks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      if (!histories[id]) {
        try {
          const res = await api.get(`/member/subtasks/${id}/status-history`);
          setHistories(prev => ({ ...prev, [id]: res.data }));
        } catch (e) {
          console.error(e);
        }
      }
    }
    setExpandedSubtasks(newExpanded);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/member/subtasks/${id}`, { status: newStatus });
      fetchMyTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/member/subtasks', {
        task_id: parseInt(formFields.task_id),
        title: formFields.title,
        expected_end_date: formFields.expected_end_date,
        environment: formFields.environment,
        area: formFields.area,
        status: formFields.status
      });
      
      const subtaskId = res.data.subtask_id;
      
      // Also post the initial status log
      await api.post(`/member/subtasks/${subtaskId}/status-updates`, {
        description: formFields.description
      });
      
      setIsSubtaskModalOpen(false);
      fetchMyTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddSubtaskModal = () => {
    fetchManagerTasks();
    setIsSubtaskModalOpen(true);
  };

  const handleStatusNoteSubmit = async (e) => {
    e.preventDefault();
    if (!newStatusNote || newStatusNote.trim().length === 0) {
      setStatusNoteError("Required");
      return;
    }
    if (newStatusNote.length > 2000) {
      setStatusNoteError("Max 2000 chars");
      return;
    }
    
    try {
      await api.post(`/member/subtasks/${selectedSubtask.subtask_id}/status-updates`, {
        description: newStatusNote
      });
      setIsStatusModalOpen(false);
      setSelectedSubtask(null);
      setNewStatusNote('');
      fetchMyTasks();
      
      // Refresh history if open
      if (expandedSubtasks.has(selectedSubtask.subtask_id)) {
          const res = await api.get(`/member/subtasks/${selectedSubtask.subtask_id}/status-history`);
          setHistories(prev => ({ ...prev, [selectedSubtask.subtask_id]: res.data }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const LiveCharCounter = ({ currentLength, maxLength = 2000 }) => {
    const remaining = maxLength - currentLength;
    let color = "#4a5568";
    if (currentLength >= 1900) color = "red";
    else if (currentLength >= 1500) color = "orange";
    return (
      <div style={{ fontSize: '12px', color, marginTop: '4px', textAlign: 'right' }}>
        <strong>{currentLength}</strong> / {maxLength} ({remaining} left)
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>My Work Grid - {user?.name}</h2>
        <div>
          <button onClick={openAddSubtaskModal} style={{ marginRight: '10px', padding: '8px 16px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '4px' }}>+ Add Sub-Task</button>
          <button onClick={logout} style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px' }}>Logout</button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', background: '#f7fafc' }}>
            <th style={{ padding: '12px' }}>Main Task</th>
            <th style={{ padding: '12px' }}>Sub-Task</th>
            <th style={{ padding: '12px' }}>Due</th>
            <th style={{ padding: '12px' }}>Env / Area</th>
            <th style={{ padding: '12px' }}>Status</th>
            <th style={{ padding: '12px', width: '30%' }}>Latest Note</th>
            <th style={{ padding: '12px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(st => (
            <React.Fragment key={st.subtask_id}>
              <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                <td style={{ padding: '12px' }}>{st.main_task} <br/><span style={{ fontSize: '12px', color: '#718096' }}>Due: {st.main_due}</span></td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{st.sub_task}</td>
                <td style={{ padding: '12px' }}>{st.sub_due}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ fontSize: '11px', background: '#edf2f7', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>{st.environment}</span>
                  <span style={{ fontSize: '11px', background: '#edf2f7', padding: '2px 6px', borderRadius: '4px' }}>{st.area}</span>
                </td>
                <td style={{ padding: '12px' }}>
                  <select value={st.status} onChange={e => handleStatusChange(st.subtask_id, e.target.value)} style={{ padding: '4px' }}>
                    <option>Not Started</option><option>In-Progress</option><option>Done</option>
                  </select>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '4px' }}>{st.latest_status_desc || 'No notes yet.'}</div>
                  <button onClick={() => toggleExpand(st.subtask_id)} style={{ background: 'none', border: 'none', color: '#3182ce', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
                    {expandedSubtasks.has(st.subtask_id) ? "Collapse ▲" : "Expand ▼"}
                  </button>
                </td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => { setSelectedSubtask(st); setIsStatusModalOpen(true); }} style={{ padding: '4px 8px', fontSize: '12px', background: '#edf2f7', border: '1px solid #cbd5e0', borderRadius: '4px' }}>
                    + Note
                  </button>
                </td>
              </tr>
              {expandedSubtasks.has(st.subtask_id) && (
                <tr style={{ background: '#f7fafc' }}>
                  <td colSpan="7" style={{ padding: '15px 30px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#2d3748' }}>Timeline History</h4>
                    <div style={{ borderLeft: '2px solid #cbd5e0', paddingLeft: '15px' }}>
                      {histories[st.subtask_id]?.map((log, i) => (
                        <div key={i} style={{ marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#718096', marginRight: '10px' }}>{log.update_date}</span>
                          <span style={{ fontSize: '13px' }}>{log.description}</span>
                        </div>
                      ))}
                      {!histories[st.subtask_id]?.length && <div style={{ fontSize: '13px', color: '#a0aec0' }}>No history found.</div>}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Add Subtask Modal */}
      {isSubtaskModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '500px' }}>
            <h3>Create Sub-Task</h3>
            <form onSubmit={handleFormSubmit}>
              <select required value={formFields.task_id} onChange={e => setFormFields({...formFields, task_id: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
                <option value="">Select Parent Task ▾</option>
                {managerTasks.map(t => (
                  <option key={t.task_id} value={t.task_id}>{t.title}</option>
                ))}
              </select>
              <input required placeholder="Sub-Task Title" value={formFields.title} onChange={e => setFormFields({...formFields, title: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
              <input required type="date" value={formFields.expected_end_date} onChange={e => setFormFields({...formFields, expected_end_date: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select value={formFields.environment} onChange={e => setFormFields({...formFields, environment: e.target.value})} style={{ flex: 1, padding: '8px' }}>
                  <option>Dev</option><option>Prod</option>
                </select>
                <select value={formFields.area} onChange={e => setFormFields({...formFields, area: e.target.value})} style={{ flex: 1, padding: '8px' }}>
                  <option>Backend</option><option>UI</option>
                </select>
              </div>
              <textarea 
                required 
                placeholder="Initial Status Note (Max 2000 Chars)" 
                value={formFields.description} 
                onChange={e => { if (e.target.value.length <= 2000) setFormFields({...formFields, description: e.target.value}) }}
                style={{ width: '100%', padding: '8px', height: '80px', marginBottom: '0px' }}
              />
              <LiveCharCounter currentLength={formFields.description.length} />
              
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsSubtaskModalOpen(false)}>Cancel</button>
                <button type="submit" style={{ background: '#3182ce', color: 'white', padding: '6px 12px', border: 'none' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {isStatusModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '500px' }}>
            <h3>Log Daily Status</h3>
            <form onSubmit={handleStatusNoteSubmit}>
              <textarea 
                required 
                placeholder="Today's update..." 
                value={newStatusNote} 
                onChange={e => { if (e.target.value.length <= 2000) setNewStatusNote(e.target.value) }}
                style={{ width: '100%', padding: '8px', height: '100px', marginBottom: '0px' }}
              />
              <LiveCharCounter currentLength={newStatusNote.length} />
              {statusNoteError && <div style={{ color: 'red', fontSize: '12px' }}>{statusNoteError}</div>}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsStatusModalOpen(false)}>Cancel</button>
                <button type="submit" style={{ background: '#3182ce', color: 'white', padding: '6px 12px', border: 'none' }}>Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
