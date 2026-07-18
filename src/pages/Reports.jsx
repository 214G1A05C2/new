import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function Reports() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await api.get('/reports/summary');
      setReport(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!report) return <div style={{ padding: '20px' }}>Loading...</div>;

  const pieData = {
    labels: report.status_breakdown.map(s => s.status),
    datasets: [{
      data: report.status_breakdown.map(s => s.count),
      backgroundColor: ['#e2e8f0', '#feebc8', '#c6f6d5'],
      borderColor: ['#cbd5e0', '#fbd38d', '#9ae6b4'],
    }]
  };

  const barData = {
    labels: report.tasks_per_member.map(m => m.name),
    datasets: [{
      label: 'Tasks Assigned',
      data: report.tasks_per_member.map(m => m.task_count),
      backgroundColor: '#3182ce',
    }]
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Dashboard Analytics</h2>
        <div>
          <button onClick={() => navigate('/manager/board')} style={{ marginRight: '10px', padding: '8px 16px' }}>Back to Board</button>
          <button onClick={logout} style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px' }}>Logout</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px', marginBottom: '30px' }}>
        <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h1 style={{ fontSize: '48px', color: '#e53e3e', margin: '10px 0' }}>{report.overdue_count}</h1>
          <div style={{ color: '#718096', fontWeight: 'bold' }}>OVERDUE TASKS</div>
        </div>
        <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ textAlign: 'center', marginTop: 0 }}>Status Breakdown</h3>
          <div style={{ width: '200px', margin: '0 auto' }}>
            <Pie data={pieData} />
          </div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3>Tasks per Member</h3>
        <div style={{ height: '300px' }}>
          <Bar data={barData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
}
