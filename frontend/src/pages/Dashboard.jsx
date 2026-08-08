import { useState, useEffect } from 'react';
import { Plus, X, Calendar, Bell, LogOut, Pencil } from 'lucide-react';
import api from '../api';
import TaskLog from '../components/TaskLog';
import Notifications from '../components/Notifications';

export default function Dashboard() {
  const [user, setUser] = useState({ username: '', role: '' });
  const [users, setUsers] = useState([]); 
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: '', data: null });
  
  const [modal, setModal] = useState({ visible: false, type: '', data: null });
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'Medium', status: 'To Do', due_date: '', assigned_to: '', name: '' });

  useEffect(() => {
    const closeContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0, type: '', data: null });
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, []);

  const extractUserData = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ username: payload.username, role: payload.role });
    } catch {
      // Silent catch
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
      if (res.data.length > 0 && !activeProject) {
        setActiveProject(res.data[0]);
        fetchTasks(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const fetchTasks = async (projectId) => {
    try {
      const res = await api.get(`/tasks/project/${projectId}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/activity/notifications');
      setNotifications(res.data);
      
      const token = localStorage.getItem('token');
      let userId = 'default';
      if (token) {
        userId = JSON.parse(atob(token.split('.')[1])).id;
      }
      const lastViewed = localStorage.getItem(`lastViewed_${userId}`);
      
      if (res.data.length > 0) {
        const latestNotifTime = new Date(res.data[0].created_at).getTime();
        // Compare directly with lastViewed timestamp to avoid clock drift
        if (!lastViewed || latestNotifTime > new Date(lastViewed).getTime()) {
          setHasUnread(true);
        } else {
          setHasUnread(false);
        }
      } else {
        setHasUnread(false);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  useEffect(() => {
    extractUserData();
    fetchProjects();
    fetchUsers();
    fetchNotifications();
    
    // eslint-disable-next-line
  }, []);

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    setTasks(tasks.map((t) => (t.id === parseInt(taskId) ? { ...t, status: newStatus } : t)));
    
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task', err);
      fetchTasks(activeProject.id); 
    }
  };

  const handleContextMenu = (e, type, data) => {
    if (user.role !== 'Admin') return;
    e.preventDefault();
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, type, data });
  };

  const handleContextEdit = () => {
    const { type, data } = contextMenu;
    if (type === 'project') {
      setFormData({ name: data.name });
      setModal({ visible: true, type: 'edit_project', data });
    } else if (type === 'task') {
      setFormData({
        title: data.title,
        description: data.description || '',
        priority: data.priority,
        status: data.status,
        due_date: data.due_date || '',
        assigned_to: data.assigned_to || ''
      });
      setModal({ visible: true, type: 'edit_task', data });
    }
  };

  const handleContextDelete = async () => {
    const { type, data } = contextMenu;
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    try {
      if (type === 'project') {
        await api.delete(`/projects/${data.id}`);
        if (activeProject?.id === data.id) setActiveProject(null);
        fetchProjects();
      } else if (type === 'task') {
        await api.delete(`/tasks/${data.id}`);
        fetchTasks(activeProject.id);
      }
    } catch {
      alert(`Failed to delete ${type}`);
    }
  };

  const handleNotificationTaskClick = async (taskId, projectId) => {
    setShowNotifications(false);
    try {
      const targetProj = projects.find(p => p.id === projectId);
      if (targetProj && activeProject?.id !== projectId) {
        setActiveProject(targetProj);
        await fetchTasks(projectId);
      }
      const res = await api.get(`/tasks/${taskId}`);
      setModal({ visible: true, type: 'view_task', data: res.data });
    } catch {
      alert('Task not found or deleted.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const safePayload = {
      ...formData,
      due_date: formData.due_date === '' ? null : formData.due_date,
      assigned_to: formData.assigned_to === '' ? null : formData.assigned_to
    };

    try {
      if (modal.type === 'project') {
        await api.post('/projects', { name: formData.name });
        fetchProjects();
      } else if (modal.type === 'edit_project') {
        await api.put(`/projects/${modal.data.id}`, { name: formData.name });
        fetchProjects();
      } else if (modal.type === 'task') {
        await api.post('/tasks', { ...safePayload, project_id: activeProject.id });
        fetchTasks(activeProject.id);
      } else if (modal.type === 'edit_task') {
        await api.put(`/tasks/${modal.data.id}`, { ...safePayload });
        fetchTasks(activeProject.id);
      }
      closeModal();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  const closeModal = () => {
    setModal({ visible: false, type: '', data: null });
    setFormData({ title: '', description: '', priority: 'Medium', status: 'To Do', due_date: '', assigned_to: '', name: '' });
  };

  const renderPriorityBadge = (priority) => {
    const styles = {
      High: 'bg-red-100 text-red-700 border-red-200',
      Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      Low: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${styles[priority] || styles.Medium}`}>{priority}</span>;
  };

  const renderColumn = (status, title, bgColor) => {
    const columnTasks = tasks.filter((task) => task.status === status);
    return (
      <div 
        className={`flex-1 min-w-[300px] p-4 rounded-xl ${bgColor} border border-surface-border`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">{title}</h3>
          <span className="px-2 py-1 text-xs font-bold rounded-full bg-surface text-foreground-muted">{columnTasks.length}</span>
        </div>
        <div className="space-y-3">
          {columnTasks.map((task) => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';
            
            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => setModal({ visible: true, type: 'view_task', data: task })}
                onContextMenu={(e) => handleContextMenu(e, 'task', task)}
                className={`p-3 transition-shadow border rounded-lg shadow-sm cursor-pointer active:cursor-grabbing hover:shadow-md ${isOverdue ? 'bg-red-50/50 border-red-200' : 'bg-surface border-surface-border'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium leading-tight text-foreground pr-2">{task.title}</p>
                  {renderPriorityBadge(task.priority)}
                </div>
                <div className="flex items-center justify-between mt-4">
                  {task.due_date && (
                    <div className={`flex items-center text-xs font-medium ${isOverdue ? 'text-danger' : 'text-foreground-muted'}`}>
                      <Calendar size={14} className="mr-1" />
                      {task.due_date}
                    </div>
                  )}
                  {/* Avatar removed as requested, keeping card clean */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted text-foreground">
      
      {contextMenu.visible && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-32 py-1 border shadow-lg bg-surface border-surface-border rounded-md"
        >
          <button onClick={handleContextEdit} className="w-full px-4 py-2 text-sm text-left transition-colors text-foreground hover:bg-surface-muted">Edit</button>
          <button onClick={handleContextDelete} className="w-full px-4 py-2 text-sm text-left transition-colors text-danger hover:bg-red-50">Delete</button>
        </div>
      )}

      <aside className="flex flex-col w-64 border-r bg-surface border-surface-border">
        <div className="flex items-center h-16 px-4 border-b bg-brand border-surface-border">
          <h1 className="text-xl font-black text-surface">Project Tracker</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold tracking-wider uppercase text-foreground-muted">Projects</h2>
              {user.role === 'Admin' && (
                <button onClick={() => setModal({ visible: true, type: 'project' })} className="transition-colors text-brand hover:text-brand-dark" title="New Project">
                  <Plus size={16} />
                </button>
              )}
            </div>
            <ul className="space-y-1">
              {projects.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => { setActiveProject(p); fetchTasks(p.id); }}
                    onContextMenu={(e) => handleContextMenu(e, 'project', p)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeProject?.id === p.id 
                        ? 'bg-brand/10 text-brand' 
                        : 'text-foreground hover:bg-surface-muted'
                    }`}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="p-4 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium truncate max-w-[120px]">{user.username}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border bg-surface-muted text-foreground-muted border-surface-border">
                {user.role}
              </span>
            </div>
            <button onClick={handleLogout} className="p-1 transition-colors text-foreground-muted hover:text-danger" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex flex-col flex-1 min-w-0">
        <header className="relative flex items-center justify-between h-16 px-6 border-b bg-surface border-surface-border">
          <h2 className="text-xl font-bold text-brand">
            {activeProject ? activeProject.name : 'Select a Project'}
          </h2>
          
          <div className="flex items-center space-x-4">
            {user.role === 'Admin' && (
              <button 
                onClick={() => setModal({ visible: true, type: 'task' })}
                disabled={!activeProject}
                className="flex items-center px-4 py-2 text-sm font-semibold transition-opacity rounded-md bg-brand text-surface hover:opacity-90 disabled:opacity-50"
              >
                <Plus size={16} className="mr-1" /> New Task
              </button>
            )}
            
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications && notifications.length > 0) {
                  const token = localStorage.getItem('token');
                  if (token) {
                    const userId = JSON.parse(atob(token.split('.')[1])).id;
                    localStorage.setItem(`lastViewed_${userId}`, notifications[0].created_at);
                  }
                  setHasUnread(false);
                }
              }}
              className="relative p-2 transition-colors rounded-full text-foreground hover:bg-surface-muted"
            >
              <Bell size={20} />
              {hasUnread && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full"></span>
              )}
            </button>
          </div>

          {showNotifications && (
            <Notifications 
              notifications={notifications} 
              onClose={() => setShowNotifications(false)}
              onTaskClick={handleNotificationTaskClick}
            />
          )}
        </header>

        <div className="flex-1 p-6 overflow-x-auto overflow-y-hidden">
          {activeProject ? (
            <div className="flex h-full space-x-6">
              {renderColumn('To Do', 'To Do', 'bg-red-50/50')}
              {renderColumn('In Progress', 'In Progress', 'bg-yellow-50/50')}
              {renderColumn('Done', 'Done', 'bg-green-50/50')}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-foreground-muted">
              Create or select a project to view tasks.
            </div>
          )}
        </div>
      </main>

      {modal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className={`w-full ${modal.type === 'view_task' ? 'max-w-4xl h-[80vh]' : 'max-w-md'} bg-surface rounded-xl shadow-xl border border-surface-border flex flex-col`}>
            
            <div className="flex items-center justify-between p-6 border-b border-surface-border shrink-0">
              
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-foreground">
                  {modal.type.includes('project') ? (modal.type === 'edit_project' ? 'Edit Project' : 'New Project') : 
                   modal.type === 'view_task' ? modal.data?.title : 
                   (modal.type === 'edit_task' ? 'Edit Task' : 'New Task')}
                </h3>
                {/* Admin Quick Edit Button */}
                {modal.type === 'view_task' && user.role === 'Admin' && (
                  <button 
                    onClick={() => {
                      setFormData({
                        title: modal.data.title,
                        description: modal.data.description || '',
                        priority: modal.data.priority,
                        status: modal.data.status,
                        due_date: modal.data.due_date || '',
                        assigned_to: modal.data.assigned_to || ''
                      });
                      setModal({ ...modal, type: 'edit_task' });
                    }} 
                    className="p-1.5 text-foreground-muted hover:text-brand transition-colors rounded-md hover:bg-surface-muted"
                    title="Edit Task"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              
              <button onClick={closeModal} className="text-foreground-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            {modal.type === 'view_task' ? (
              <div className="flex flex-1 overflow-hidden">
                <div className="w-1/2 p-6 overflow-y-auto border-r border-surface-border space-y-6">
                  <div>
                    <h5 className="mb-1 text-sm font-medium text-foreground-muted">Description</h5>
                    <p className="p-3 text-sm border rounded-md bg-surface-muted border-surface-border text-foreground">
                      {modal.data?.description || 'No description provided.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="mb-1 text-sm font-medium text-foreground-muted">Status</h5>
                      <span className="inline-block px-2 py-1 text-xs font-semibold border rounded bg-surface border-surface-border">
                        {modal.data?.status}
                      </span>
                    </div>
                    <div>
                      <h5 className="mb-1 text-sm font-medium text-foreground-muted">Priority</h5>
                      <div>{renderPriorityBadge(modal.data?.priority)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="mb-1 text-sm font-medium text-foreground-muted">Due Date</h5>
                      <div className="flex items-center text-sm text-foreground">
                        <Calendar size={14} className="mr-2 text-foreground-muted" />
                        {modal.data?.due_date || 'No Date'}
                      </div>
                    </div>
                    <div>
                      <h5 className="mb-1 text-sm font-medium text-foreground-muted">Assigned to</h5>
                      <div className="text-sm text-foreground">
                        {modal.data?.assigned_to_username || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-1/2 flex flex-col">
                  <TaskLog taskId={modal.data.id} users={users} />
                </div>
              </div>
            ) : (
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {modal.type.includes('project') ? (
                    <div>
                      <label className="block mb-1 text-sm font-medium text-foreground-muted">Project Name</label>
                      <input
                        autoFocus
                        type="text"
                        required
                        className="w-full px-3 py-2 border rounded-md bg-surface text-foreground border-surface-border focus:ring-2 focus:ring-brand focus:outline-none"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block mb-1 text-sm font-medium text-foreground-muted">Task Title</label>
                        <input
                          autoFocus
                          type="text"
                          required
                          className="w-full px-3 py-2 border rounded-md bg-surface text-foreground border-surface-border focus:ring-2 focus:ring-brand focus:outline-none"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-1 text-sm font-medium text-foreground-muted">Description</label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 border rounded-md bg-surface text-foreground border-surface-border focus:ring-2 focus:ring-brand focus:outline-none resize-none"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-1 text-sm font-medium text-foreground-muted">Due Date</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border rounded-md bg-surface text-foreground border-surface-border focus:ring-2 focus:ring-brand focus:outline-none"
                            value={formData.due_date}
                            onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-sm font-medium text-foreground-muted">Priority</label>
                          <select
                            className="w-full px-3 py-2 border rounded-md bg-surface text-foreground border-surface-border focus:ring-2 focus:ring-brand focus:outline-none"
                            value={formData.priority}
                            onChange={(e) => setFormData({...formData, priority: e.target.value})}
                          >
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-1 text-sm font-medium text-foreground-muted">Assign To</label>
                        <select
                          className="w-full px-3 py-2 border rounded-md bg-surface text-foreground border-surface-border focus:ring-2 focus:ring-brand focus:outline-none"
                          value={formData.assigned_to}
                          onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                        >
                          <option value="">Unassigned</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.username}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div className="flex justify-end pt-4 space-x-3">
                    <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium rounded-md text-foreground-muted hover:bg-surface-muted">
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-md bg-brand text-surface hover:opacity-90">
                      Save
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}