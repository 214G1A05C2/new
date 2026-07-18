import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ManagerBoard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [filterMember, setFilterMember] = useState('');
  
  const [newTask, setNewTask] = useState({
    title: '',
    resource_id: '',
    expected_end_date: '',
    status: 'Not Started'
  });

  useEffect(() => {
    fetchMembers();
    fetchTasks();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await api.get('/manager/users?role=member');
      setMembers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async (memberId = '') => {
    try {
      const url = memberId ? `/manager/tasks?member=${memberId}` : '/manager/tasks';
      const res = await api.get(url);
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFilterChange = (e) => {
    const val = e.target.value;
    setFilterMember(val);
    fetchTasks(val);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/manager/tasks', newTask);
      setNewTask({ title: '', resource_id: '', expected_end_date: '', status: 'Not Started' });
      fetchTasks(filterMember);
    } catch (e) {
      console.error("Failed to create task");
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Manager Task Board</h2>
        <div>
          <button onClick={() => navigate('/reports')} style={{ marginRight: '10px', padding: '8px 16px' }}>View Reports</button>
          <button onClick={logout} style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px' }}>Logout</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px' }}>
        {/* Screen A: Assign Task */}
        <div style={{ flex: '0 0 350px', background: '#f7fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', alignSelf: 'flex-start' }}>
          <h3>+ Add Task</h3>
          <form onSubmit={handleCreateTask}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Title:</label>
              <input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Resource:</label>
              <select required value={newTask.resource_id} onChange={e => setNewTask({...newTask, resource_id: e.target.value})} style={{ width: '100%', padding: '8px' }}>
                <option value="">Select Member ▾</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Expected End Date:</label>
              <input required type="date" value={newTask.expected_end_date} onChange={e => setNewTask({...newTask, expected_end_date: e.target.value})} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Status:</label>
              <select value={newTask.status} onChange={e => setNewTask({...newTask, status: e.target.value})} style={{ width: '100%', padding: '8px' }}>
                <option value="Not Started">Not Started</option>
                <option value="In-Progress">In-Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <button type="submit" style={{ width: '100%', padding: '10px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Task</button>
          </form>
        </div>

        {/* Screen B: Task Board */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Task Overview</h3>
            <div>
              <label style={{ marginRight: '10px' }}>Filter:</label>
              <select value={filterMember} onChange={handleFilterChange} style={{ padding: '6px 12px' }}>
                <option value="">All Members ▾</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.name}</option>
                ))}
              </select>
              <span style={{ marginLeft: '15px', color: '#718096', fontSize: '14px' }}>Sort: Date ↓</span>
            </div>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Due Date ↓</th>
                <th style={{ padding: '12px' }}>Resource</th>
                <th style={{ padding: '12px' }}>Task Title</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>No tasks found.</td></tr>
              ) : tasks.map(t => (
                <tr key={t.task_id} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '12px' }}>{t.expected_end_date}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{t.resource_name}</td>
                  <td style={{ padding: '12px' }}>{t.title}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                      background: t.status === 'Done' ? '#c6f6d5' : t.status === 'In-Progress' ? '#feebc8' : '#e2e8f0',
                      color: t.status === 'Done' ? '#22543d' : t.status === 'In-Progress' ? '#744210' : '#4a5568'
                    }}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
