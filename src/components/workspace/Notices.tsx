import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BellRing, LoaderCircle, Pin, Plus, Search, X } from 'lucide-react';
import { supabase, useAuth } from '@/lib/auth';

type Notice = {
  id: string;
  title: string;
  content: string;
  priority: string;
  user_id: string;
  created_at: string;
};

export function NoticesView() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('notices')
      .select('id,title,content,priority,user_id,created_at')
      .order('created_at', { ascending: false });

    setItems((data as Notice[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setSaving(true);
    const form = new FormData(event.currentTarget);

    const { error } = await supabase.from('notices').insert({
      title: String(form.get('title') || '').trim(),
      content: String(form.get('content') || '').trim(),
      priority: String(form.get('priority') || 'normal'),
      user_id: profile?.id,
      organization_id: profile?.organization?.id,
    });

    setSaving(false);

    if (!error) {
      setOpen(false);
      void load();
    }
  };

  const filtered = items.filter((notice) =>
    `${notice.title} ${notice.content}`.toLowerCase().includes(search.toLowerCase()),
  );

  const canManage = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <div className="merged-oms section-view">
      <div className="page-heading">
        <div>
          <div className="eyebrow dark">
            <span className="eyebrow-dot" /> Internal communications
          </div>
          <h1>Notices</h1>
          <p>Keep your organization aligned with important announcements.</p>
        </div>
        {canManage && (
          <button className="primary-button" onClick={() => setOpen(true)}>
            <Plus size={16} /> Post notice
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notices..."
          />
        </div>
      </div>

      {loading ? (
        <div className="panel empty-state">
          <LoaderCircle className="spin" /> Loading notices...
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel empty-state">
          <BellRing size={28} />
          <strong>No notices found</strong>
          <span>Publish an announcement for your team.</span>
        </div>
      ) : (
        <div className="notice-list">
          {filtered.map((notice) => (
            <article className="panel notice-card" key={notice.id}>
              <div className="notice-meta">
                <span className={`status-badge ${notice.priority}`}>
                  {notice.priority}
                </span>
                <span>{new Date(notice.created_at).toLocaleString()}</span>
              </div>
              <h3>{notice.title}</h3>
              <p>{notice.content}</p>
              {notice.user_id === profile?.id && (
                <span className="notice-author">Posted by you</span>
              )}
            </article>
          ))}
        </div>
      )}

      {open && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>Post notice</h2>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="form-stack">
              <label className="form-field">
                <span>Title</span>
                <input name="title" required placeholder="Office update" />
              </label>

              <label className="form-field">
                <span>Priority</span>
                <select name="priority" defaultValue="normal">
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>

              <label className="form-field">
                <span>Message</span>
                <textarea
                  name="content"
                  rows={5}
                  required
                  placeholder="Write the announcement..."
                />
              </label>

              <button className="primary-button" disabled={saving} type="submit">
                {saving ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Pin size={16} />
                )}
                Publish notice
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
