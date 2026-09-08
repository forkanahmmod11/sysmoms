import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, FolderKanban, LoaderCircle, Search, ShieldCheck, UsersRound, XCircle } from 'lucide-react';
import { supabase, useAuth } from '@/lib/auth';

type Tab = 'overview' | 'users' | 'projects' | 'departments' | 'applications';

type Row = Record<string, any>;

export function AdminPanelView() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [departments, setDepartments] = useState<Row[]>([]);
  const [applications, setApplications] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const canManage = profile?.role === 'admin' || profile?.role === 'super_admin';

  const load = useCallback(async () => {
    if (!supabase || !profile?.id || !canManage) { setLoading(false); return; }
    setLoading(true);
    const orgId = profile.organization?.id;
    const [u, p, d, a] = await Promise.all([
      supabase.from('organization_members').select('id,user_id,organization_id,role,profiles(full_name,email,avatar_url,position,status)').eq('organization_id', orgId || ''),
      supabase.from('projects').select('*').eq('organization_id', orgId || '').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').order('name'),
      supabase.from('applications').select('*').eq('organization_id', orgId || '').order('created_at', { ascending: false }),
    ]);
    setUsers((u.data || []) as Row[]); setProjects((p.data || []) as Row[]); setDepartments((d.data || []) as Row[]); setApplications((a.data || []) as Row[]);
    setLoading(false);
  }, [profile?.id, profile?.organization?.id, canManage]);

  useEffect(() => { void load(); }, [load]);

  const updateApplication = async (id: string, status: 'approved' | 'rejected') => {
    if (!supabase || !canManage) return;
    await supabase.from('applications').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
    await load();
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.profiles?.full_name || ''} ${u.profiles?.email || ''}`.toLowerCase().includes(q));
  }, [users, search]);

  if (!canManage) return <div className="admin-empty"><ShieldCheck size={32}/><strong>Admin access required</strong><span>You do not have permission to open the administration panel.</span></div>;

  const stats = [
    { label: 'Team members', value: users.length, icon: UsersRound },
    { label: 'Projects', value: projects.length, icon: FolderKanban },
    { label: 'Departments', value: departments.length, icon: Building2 },
    { label: 'Pending applications', value: applications.filter(a => a.status === 'pending').length, icon: ShieldCheck },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' }, { key: 'users', label: 'Users' }, { key: 'projects', label: 'Projects' }, { key: 'departments', label: 'Departments' }, { key: 'applications', label: 'Applications' },
  ];

  return <div className="section-view admin-page">
    <div className="page-heading"><div><div className="eyebrow dark"><span className="eyebrow-dot"/> Administration</div><h1>Admin Panel</h1><p>Manage your organization, people and office operations.</p></div></div>
    <div className="admin-tabs">{tabs.map(t => <button key={t.key} className={tab === t.key ? 'selected' : ''} onClick={() => setTab(t.key)}>{t.label}</button>)}</div>
    {loading ? <div className="admin-loading"><LoaderCircle className="spin"/> Loading administration data...</div> : <>
      {tab === 'overview' && <>
        <div className="stats-grid admin-stats">{stats.map(s => <div className="stat-card" key={s.label}><div className="stat-icon blue"><s.icon size={18}/></div><div className="stat-content"><span>{s.label}</span><strong>{s.value}</strong><small>Current workspace</small></div></div>)}</div>
        <div className="admin-grid"><div className="panel"><div className="panel-heading"><div><h2>Pending applications</h2><p className="panel-subtitle">Review requests from your team</p></div></div>{applications.filter(a=>a.status==='pending').slice(0,6).map(a=><div className="admin-list-row" key={a.id}><div><strong>{a.title}</strong><span>{a.type.replace('_',' ')} · {a.start_date} → {a.end_date}</span></div><div className="inline-actions"><button className="approve" onClick={()=>void updateApplication(a.id,'approved')}><CheckCircle2 size={15}/></button><button className="reject" onClick={()=>void updateApplication(a.id,'rejected')}><XCircle size={15}/></button></div></div>)}{!applications.some(a=>a.status==='pending')&&<div className="empty-inline">No pending applications.</div>}</div><div className="panel"><div className="panel-heading"><div><h2>Organization</h2><p className="panel-subtitle">Workspace details</p></div></div><div className="admin-detail"><span>Name</span><strong>{profile.organization?.name || '—'}</strong></div><div className="admin-detail"><span>Members</span><strong>{users.length}</strong></div><div className="admin-detail"><span>Projects</span><strong>{projects.length}</strong></div></div></div>
      </>}
      {tab === 'users' && <div className="panel"><div className="admin-toolbar"><div className="admin-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..."/></div></div>{filteredUsers.map(u=><div className="admin-list-row" key={u.id}><div className="admin-person"><span className="member-avatar">{(u.profiles?.full_name||'U').slice(0,2).toUpperCase()}</span><div><strong>{u.profiles?.full_name || 'Unknown'}</strong><span>{u.profiles?.email || '—'} · {u.profiles?.position || 'Employee'}</span></div></div><span className="status-badge approved">{u.role || 'employee'}</span></div>)}{!filteredUsers.length&&<div className="empty-inline">No users found.</div>}</div>}
      {tab === 'projects' && <div className="panel">{projects.map(p=><div className="admin-list-row" key={p.id}><div><strong>{p.name}</strong><span>{p.description || 'No description'}</span></div><span className={`status-badge ${p.status}`}>{p.status?.replace('_',' ')}</span></div>)}{!projects.length&&<div className="empty-inline">No projects yet.</div>}</div>}
      {tab === 'departments' && <div className="panel">{departments.map(d=><div className="admin-list-row" key={d.id}><div><strong>{d.name}</strong><span>{d.description || 'No description'}</span></div><Building2 size={18}/></div>)}{!departments.length&&<div className="empty-inline">No departments yet.</div>}</div>}
      {tab === 'applications' && <div className="panel">{applications.map(a=><div className="admin-list-row" key={a.id}><div><strong>{a.title}</strong><span>{a.type.replace('_',' ')} · {a.start_date} → {a.end_date}</span></div><div className="inline-actions"><span className={`status-badge ${a.status}`}>{a.status}</span>{a.status==='pending'&&<><button className="approve" onClick={()=>void updateApplication(a.id,'approved')}><CheckCircle2 size={15}/></button><button className="reject" onClick={()=>void updateApplication(a.id,'rejected')}><XCircle size={15}/></button></>}</div></div>)}{!applications.length&&<div className="empty-inline">No applications yet.</div>}</div>}
    </>}
  </div>;
}
