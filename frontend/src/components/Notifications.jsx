import { X, MessageSquare, Plus, Info } from 'lucide-react';

export default function Notifications({ notifications, onClose, onTaskClick }) {
  const renderIcon = (type) => {
    if (type === 'CREATION') return <Plus size={16} className="text-success" />;
    if (type === 'UPDATE') return <Info size={16} className="text-brand" />;
    return <MessageSquare size={16} className="text-foreground-muted" />;
  };

  return (
    <div className="absolute right-6 top-16 z-50 w-80 shadow-xl bg-surface rounded-xl border border-surface-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-surface-border bg-surface-muted">
        <h3 className="font-bold text-foreground">Notifications</h3>
        <button onClick={onClose} className="transition-colors text-foreground-muted hover:text-foreground">
          <X size={16} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-80">
        {notifications.length === 0 ? (
          <div className="p-6 text-sm text-center text-foreground-muted">No new notifications</div>
        ) : (
          <ul className="divide-y divide-surface-border">
            {notifications.map((notif) => (
              <li 
                key={notif.id} 
                onClick={() => onTaskClick(notif.task_id, notif.project_id)}
                className="p-4 transition-colors cursor-pointer hover:bg-surface-muted"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-1">{renderIcon(notif.action_type)}</div>
                  <div>
                    <p className="text-sm text-foreground">
                      <span className="font-bold">{notif.actor_name}</span>{' '}
                      {notif.action_type === 'COMMENT' ? 'mentioned you:' : 'assigned you to:'}
                    </p>
                    <p className="mt-1 text-sm font-medium text-brand">
                      {notif.task_title}
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      Project: {notif.project_name}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}