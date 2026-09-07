import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FileText, LoaderCircle, Plus, X } from 'lucide-react';
import { supabase, useAuth } from '@/lib/auth';

type Application = {
  id: string;
  organization_id: string | null;
  user_id: string;
  type: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  admin_note: string | null;
  reviewed_at?: string | null;
  created_at: string;
};

const types = ['leave', 'remote', 'half_day', 'other'] as const;

export function ApplicationsView() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !profile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const query = supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    const result = isAdmin
      ? await query
      : await query.eq('user_id', profile.id);

    if (result.error) {
      setError(result.error.message);
      setItems([]);
    } else {
      setError(null);
      setItems((result.data as Application[]) || []);
    }
    setLoading(false);
  }, [profile?.id, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !profile?.id) return;

    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const startDate = String(form.get('start_date') || '');
    const endDate = String(form.get('end_date') || '');

    if (endDate < startDate) {
      setSaving(false);
      setError('End date cannot be earlier than the start date.');
      return;
    }

    const { error: insertError } = await supabase.from('applications').insert({
      user_id: profile.id,
      type: String(form.get('type') || 'other'),
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim() || null,
      start_date: startDate,
      end_date: endDate,
      status: 'pending',
      organization_id: profile.organization?.id || null,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setOpen(false);
    void load();
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!supabase || !isAdmin) return;

    const { error: updateError } = await supabase
      .from('applications')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setError(null);
    void load();
  };

  return (
    <div className="merged-oms section-view">
      <div className="page-heading">
        <div>
          <div className="eyebrow dark">
            <span className="eyebrow-dot" /> Requests & approvals
          </div>
          <h1>Applications</h1>
          <p>Submit and track leave, remote-work and other office requests.</p>
        </div>
        <button className="primary-button" onClick={() => setOpen(true)} type="button">
          <Plus size={16} /> New application
        </button>
      </div>

      {error && <div className="form-hint error">{error}</div>}

      {loading ? (
        <div className="panel empty-state">
          <LoaderCircle className="spin" /> Loading applications...
        </div>
      ) : items.length === 0 ? (
        <div className="panel empty-state">
          <FileText size={28} />
          <strong>No applications yet</strong>
          <span>Your submitted requests will appear here.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((application) => (
                <tr key={application.id}>
                  <td>
                    <strong>{application.title}</strong>
                    <small>{application.description || '—'}</small>
                  </td>
                  <td>{application.type.replace('_', ' ')}</td>
                  <td>
                    {application.start_date} → {application.end_date}
                  </td>
                  <td>
                    <span className={`status-badge ${application.status}`}>
                      {application.status}
                    </span>
                    {isAdmin && application.status === 'pending' && (
                      <div className="inline-actions">
                        <button type="button" onClick={() => void updateStatus(application.id, 'approved')}>
                          Approve
                        </button>
                        <button type="button" onClick={() => void updateStatus(application.id, 'rejected')}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>New application</h2>
              <button onClick={() => setOpen(false)} type="button" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="form-stack">
              <label className="form-field">
                <span>Type</span>
                <select name="type" defaultValue="leave">
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Title</span>
                <input name="title" required placeholder="Annual leave request" />
              </label>

              <label className="form-field">
                <span>Start date</span>
                <input name="start_date" type="date" required />
              </label>

              <label className="form-field">
                <span>End date</span>
                <input name="end_date" type="date" required />
              </label>

              <label className="form-field">
                <span>Description</span>
                <textarea name="description" rows={4} />
              </label>

              <button className="primary-button" disabled={saving} type="submit">
                {saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
                Submit application
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
