import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Info, MessageSquare } from 'lucide-react';
import api from '../api';

export default function TaskLog({ taskId, users }) {
  const [logs, setLogs] = useState([]);
  const [comment, setComment] = useState('');
  
  const [mentionState, setMentionState] = useState({ visible: false, filteredUsers: [], search: '', selectedIndex: 0 });
  const commentInputRef = useRef(null);

  const fetchLogs = async () => {
    try {
      const res = await api.get(`/activity/task/${taskId}`);
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [taskId]);

  const handleCommentChange = (e) => {
    const text = e.target.value;
    setComment(text);

    const lastWord = text.split(' ').pop();
    if (lastWord.startsWith('@')) {
      const search = lastWord.slice(1).toLowerCase();
      const filtered = users.filter(u => u.username.toLowerCase().includes(search));
      if (filtered.length > 0) {
        setMentionState({ visible: true, filteredUsers: filtered, search, selectedIndex: 0 });
      } else {
        setMentionState({ visible: false, filteredUsers: [], search: '', selectedIndex: 0 });
      }
    } else {
      setMentionState({ visible: false, filteredUsers: [], search: '', selectedIndex: 0 });
    }
  };

  const insertMention = (username) => {
    const words = comment.split(' ');
    words.pop();
    const newText = [...words, `@${username} `].join(' ');
    setComment(newText);
    setMentionState({ visible: false, filteredUsers: [], search: '', selectedIndex: 0 });
    commentInputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!mentionState.visible) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionState(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, prev.filteredUsers.length - 1) }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionState(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) }));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      insertMention(mentionState.filteredUsers[mentionState.selectedIndex].username);
    } else if (e.key === 'Escape') {
      setMentionState({ visible: false, filteredUsers: [], search: '', selectedIndex: 0 });
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.post('/activity', { task_id: taskId, content: comment });
      setComment('');
      setMentionState({ visible: false, filteredUsers: [], search: '', selectedIndex: 0 });
      fetchLogs();
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const renderIcon = (type) => {
    if (type === 'CREATION') return <Plus size={14} className="text-success" />;
    if (type === 'UPDATE') return <Info size={14} className="text-brand" />;
    return <MessageSquare size={14} className="text-foreground-muted" />;
  };

  return (
    <div className="flex flex-col h-full bg-surface relative">
      <div className="p-4 border-b border-surface-border bg-surface-muted">
        <h3 className="font-bold text-foreground">Log</h3>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {logs.length === 0 ? (
          <p className="text-sm text-center text-foreground-muted mt-4">No activity yet.</p>
        ) : (
          logs.map((log) => {
            const content = typeof log.content === 'string' ? JSON.parse(log.content) : log.content;
            return (
              <div key={log.id} className="flex space-x-3 text-sm">
                <div className="mt-1">{renderIcon(log.action_type)}</div>
                <div className="flex-1">
                  
                  {log.action_type === 'CREATION' && (
                    <p className="text-foreground">
                      <span className="font-bold">{log.username}</span> created this task
                      {content?.assignee && <span> and assigned it to <span className="font-bold">{content.assignee}</span></span>}.
                    </p>
                  )}

                  {log.action_type === 'UPDATE' && (
                    <p className="text-foreground">
                      <span className="font-bold">{log.username}</span>
                      {content.field_changed === 'assignee' ? (
                        content.new_value === 'Unassigned' ? (<span> unassigned this task </span>) :
                        (<span> assigned it to <span className="font-semibold">{content.new_value}</span>.</span>)
                      ) : content.field_changed === 'due_date' ? (
                        <span> changed due date to <span className="font-semibold">{content.new_value || 'No Date'}</span>.</span>
                      ) : (
                        <span> changed <span className="font-semibold">{content.field_changed}</span> to <span className="font-semibold">{content.new_value || 'nothing'}</span>.</span>
                      )}
                    </p>
                  )}

                  {log.action_type === 'COMMENT' && (
                    <>
                      <p className="text-foreground"><span className="font-bold">{log.username}</span>:</p>
                      <p className="p-2 mt-1 border rounded-md bg-surface-muted text-foreground border-surface-border break-words">
                        {content.text}
                      </p>
                    </>
                  )}
                  
                  <div className="mt-1 text-[11px] font-medium text-foreground-muted">
                    {new Date(log.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {mentionState.visible && (
        <div className="absolute left-0 right-0 z-10 p-1 mx-4 bg-surface border rounded-md shadow-lg bottom-16 border-surface-border">
          {mentionState.filteredUsers.map((u, index) => (
            <div 
              key={u.id}
              onClick={() => insertMention(u.username)}
              className={`px-3 py-2 text-sm cursor-pointer rounded-md ${index === mentionState.selectedIndex ? 'bg-brand text-surface' : 'text-foreground hover:bg-surface-muted'}`}
            >
              {u.username}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleComment} className="flex gap-2 p-4 border-t border-surface-border bg-surface shrink-0">
        <input
          ref={commentInputRef}
          type="text"
          placeholder="Add a comment... (Type @ to mention)"
          className="flex-1 px-3 py-2 text-sm border rounded-md bg-surface text-foreground border-surface-border focus:ring-2 focus:ring-brand focus:outline-none"
          value={comment}
          onChange={handleCommentChange}
          onKeyDown={handleKeyDown}
        />
        <button type="submit" className="p-2 transition-opacity rounded-md bg-brand text-surface hover:opacity-90">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}