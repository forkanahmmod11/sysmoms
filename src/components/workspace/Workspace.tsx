import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, supabase, type UserProfile } from '@/lib/auth';
import { TasksView } from '@/components/workspace/Tasks';
import { ProjectsView } from '@/components/workspace/Projects';
import { TeamView } from '@/components/workspace/Team';
import { ScheduleView } from '@/components/workspace/Schedule';
import { MessagesView } from '@/components/workspace/Messages';
import { TransactionsView } from '@/components/workspace/Transactions';
import { SettingsView } from '@/components/workspace/Settings';
import { DepartmentView } from '@/components/workspace/Department';
import { NoticesView } from '@/components/workspace/Notices';
import { ApplicationsView } from '@/components/workspace/Applications';
import { AdminPanelView } from '@/components/workspace/AdminPanel';
import { PublicFeed, PublicPostAdmin, UserProfileView } from '@/components/Community';
import { SearchRecommendations } from '@/components/workspace/SearchRecommendations';
import { getUserRequest, type SubscriptionRequest } from '@/lib/subscription';
import { SubscriptionPage } from '@/components/SubscriptionPage';
import {
  ArrowUpRight, Bell, CalendarDays, ChevronDown, CircleHelp, ClipboardCheck,
  Clock3, CreditCard, FolderKanban, LayoutDashboard, LoaderCircle, Menu,
  MessageSquare, MoreHorizontal, Plus, Search, Settings, Target, TrendingUp,
  UsersRound, X, Zap, Shield, Newspaper,
} from 'lucide-react';

export type View = 'overview' | 'subscription' | 'tasks' | 'projects' | 'team' | 'departments' | 'schedule' | 'messages' | 'notices' | 'applications' | 'community' | 'transactions' | 'settings' | 'profile' | 'admin';

type NavItem = { label: string; icon: typeof LayoutDashboard; view: View; badge?: string };

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'overview' },
  { label: 'Tasks', icon: ClipboardCheck, view: 'tasks' },
  { label: 'Projects', icon: FolderKanban, view: 'projects' },
  { label: 'Team', icon: UsersRound, view: 'team' },
  { label: 'Department', icon: UsersRound, view: 'departments' },
  { label: 'Schedule', icon: CalendarDays, view: 'schedule' },
  { label: 'Notice', icon: Bell, view: 'notices' },
  { label: 'Messenger', icon: MessageSquare, view: 'messages' },
  { label: 'Transaction', icon: CreditCard, view: 'transactions' },
  { label: 'Application', icon: ClipboardCheck, view: 'applications' },
  { label: 'Profile', icon: UsersRound, view: 'profile' },
  { label: 'Settings', icon: Settings, view: 'settings' },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Workspace({ onLogout, onEnterPlatform, limited = false }: { onLogout: () => void; onEnterPlatform?: () => void; limited?: boolean }) {
  const { profile } = useAuth();
  const [view, setView] = useState<View>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [taskBadge, setTaskBadge] = useState<string | undefined>();
  const [msgBadge, setMsgBadge] = useState<string | undefined>();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const activeLabel = useMemo(() => navItems.find((item) => item.view === view)?.label || (view === 'profile' ? 'Profile' : 'Overview'), [view]);

  useEffect(() => {
    if (!supabase || !profile?.id) return;
    (async () => {
      const [{ count: tasks }, { count: msgs }] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).neq('status', 'done'),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', profile.id).is('read_at', null),
      ]);
      if (tasks) setTaskBadge(String(tasks).padStart(2, '0'));
      if (msgs) setMsgBadge(String(msgs).padStart(2, '0'));
    })();
  }, [profile?.id, view]);

  const navWithBadges = navItems.map((item) => ({
    ...item,
    badge: item.view === 'tasks' ? taskBadge : item.view === 'messages' ? msgBadge : item.badge,
  }));
  const allowedView = (next: View) => !limited || next === 'overview' || next === 'subscription';

  return (
    <main className="workspace">
      <AnimatePresence>
        {mobileMenu && (
          <motion.div className="sidebar-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={() => setMobileMenu(false)} />
        )}
      </AnimatePresence>
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="close-mobile" onClick={() => setMobileMenu(false)}><X size={19} /></button>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-symbol">{profile?.organization?.name?.[0] || 'S'}</span>
          <span><strong>{profile?.organization?.name || 'Sysmobyte HQ'}</strong><small>{profile?.organization?.subdomain ? `${profile.organization.subdomain}.sysmobyte.app` : 'Workspace'}</small></span>
          {onEnterPlatform ? <button className="workspace-switch-icon" onClick={onEnterPlatform} title="Back to platform admin"><Shield size={14} /></button> : <ChevronDown size={15} />}
        </div>
        <p className="nav-label">Workspace</p>
        <nav className="side-nav">
          {navWithBadges.map((item) => (
            <button key={item.view} disabled={!allowedView(item.view)} className={`${view === item.view ? 'active' : ''} ${!allowedView(item.view) ? 'locked' : ''}`} onClick={() => { if (!allowedView(item.view)) return; setView(item.view); setMobileMenu(false); }}>
              <item.icon size={18} /><span>{item.label}</span>{!allowedView(item.view) ? <span className="nav-lock">🔒</span> : item.badge && <b>{item.badge}</b>}
            </button>
          ))}
        </nav>
        {(profile?.role === 'admin' || profile?.role === 'super_admin') && <>
          <p className="nav-label">Administration</p>
          <nav className="side-nav">
            <button disabled={limited} className={`${view === 'admin' ? 'active' : ''} ${limited ? 'locked' : ''}`} onClick={() => { if (limited) return; setView('admin'); setMobileMenu(false); }}>
              <Shield size={18} /><span>Admin Panel</span>
            </button>
          </nav>
        </>}
        <div className="sidebar-bottom">
          <div className="help-box">
            <CircleHelp size={18} />
            <span><strong>Need a hand?</strong><small>Visit help center</small></span>
            <ArrowUpRight size={15} />
          </div>
          <UserCard profile={profile} onLogout={onLogout} />
        </div>
      </aside>
      <section className="workspace-main">
        <header className="workspace-header">
          <button className="mobile-menu-button" onClick={() => setMobileMenu(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{activeLabel}</strong></div>
          <div className="header-actions">
            <button className={`icon-button ${searchOpen ? 'selected' : ''}`} onClick={() => setSearchOpen(!searchOpen)}><Search size={19} /></button>
            <button className="icon-button notification"><Bell size={19} /><i /></button>
            <HeaderAvatar profile={profile} />
          </div>
          {searchOpen && <SearchRecommendations profile={profile} onSelect={(target) => { setView(target as View); setSearchOpen(false); }} />}
        </header>
        <div className="content-area">
          {limited && <div className="workspace-activation-banner"><div><strong>Your workspace is created but not fully activated.</strong><br/><span>Purchase a subscription and wait for admin approval to unlock projects, tasks, team, messages and all workspace tools.</span></div><button className="primary-button small" onClick={() => setView('subscription')}>View subscription</button></div>}
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              {view === 'overview' && <Overview onView={setView} profile={profile} />}
              {view === 'subscription' && <SubscriptionStatusView limited={limited} onLogout={onLogout} />}
              {view === 'admin' && <AdminPanelView />}
              {view === 'tasks' && <TasksView />}
              {view === 'projects' && <ProjectsView />}
              {view === 'team' && <TeamView onOpenProfile={(id) => { setProfileUserId(id); setView('profile'); }} />}
              {view === 'departments' && <DepartmentView />}
              {view === 'schedule' && <ScheduleView />}
              {view === 'messages' && <MessagesView />}
              {view === 'notices' && <NoticesView />}
              {view === 'applications' && <ApplicationsView />}
              {view === 'community' && <CommunityView />}
              {view === 'profile' && (profileUserId || profile?.id) && <UserProfileView userId={profileUserId || profile!.id} onBack={() => setView('team')} />}
              {view === 'transactions' && <TransactionsView />}
              {view === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}


function CommunityView() {
  const { profile } = useAuth();
  return <div className="community-page">
    {profile?.role === 'admin' || profile?.role === 'super_admin' ? <PublicPostAdmin /> : (
      <div className="section-view">
        <div className="page-heading"><div><div className="eyebrow dark"><span className="eyebrow-dot" /> Community</div><h1>Public updates</h1><p>Announcements and updates from Sysmobyte admins.</p></div></div>
        <PublicFeed limit={20} />
      </div>
    )}
  </div>;
}

function SubscriptionStatusView({ limited, onLogout }: { limited: boolean; onLogout: () => void }) {
  const { profile } = useAuth();
  const [request, setRequest] = useState<SubscriptionRequest | null>(null);
  useEffect(() => { if (profile?.id) void getUserRequest(profile.id).then(setRequest); }, [profile?.id]);
  if (limited && !request) return <SubscriptionPage onLogout={onLogout} />;
  return <div className="section-view">
    <div className="page-heading"><div><div className="eyebrow dark"><span className="eyebrow-dot"/> Billing & access</div><h1>Subscription</h1><p>Manage the plan that activates your isolated workspace.</p></div></div>
    <div className="panel"><div className="pending-details">
      <div className="pending-detail-row"><span>Workspace</span><strong>{profile?.organization?.name || '—'}</strong></div>
      <div className="pending-detail-row"><span>Plan</span><strong>{request?.plan_name || 'No plan'}</strong></div>
      <div className="pending-detail-row"><span>Subscription status</span><strong className={`status-badge ${request?.status || 'pending'}`}>{request?.status || 'not submitted'}</strong></div>
      <div className="pending-detail-row"><span>Payment status</span><strong>{request?.payment_status || '—'}</strong></div>
    </div></div>
  </div>;
}

function Logo() {
  return <div className="brand"><span className="brand-mark"><span /><span /><span /></span><span>sysmo<span className="brand-accent">byte</span></span></div>;
}

function UserCard({ profile, onLogout }: { profile: UserProfile | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const name = profile?.fullName || 'Guest';
  const role = profile?.role || 'employee';
  return (
    <div className="user-card-wrap">
      <button className="user-card" onClick={() => setOpen(!open)}>
        {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={name} className="profile-avatar img" /> : <span className="profile-avatar">{initials(name)}</span>}
        <span><strong>{name}</strong><small>{role.replace(/_/g, ' ')}</small></span>
        <MoreHorizontal size={17} />
      </button>
      {open && <div className="user-popover"><button onClick={onLogout}>Sign out</button></div>}
    </div>
  );
}

function HeaderAvatar({ profile }: { profile: UserProfile | null }) {
  const name = profile?.fullName || 'Guest';
  return profile?.avatarUrl ? <img src={profile.avatarUrl} alt={name} className="header-avatar img" /> : <div className="header-avatar">{initials(name)}</div>;
}

type TaskRow = { id: string; title: string; status: string; priority: string; due_date: string | null; profiles: { full_name: string }[] | null; projects: { name: string }[] | null };
type EventRow = { id: string; title: string; start_time: string; end_time: string | null; location: string | null };
type NoticeRow = { id: string; title: string; content: string; priority: string; created_at: string; profiles: { full_name: string }[] | null };

function Overview({ onView, profile }: { onView: (view: View) => void; profile: UserProfile | null }) {
  const [stats, setStats] = useState({ activeProjects: 0, myTasks: 0, completed: 0, inProgress: 0 });
  const [projects, setProjects] = useState<{ id: string; status: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase || !profile?.id) { setLoading(false); return; }
      const [{ data: projectRows }, { data: taskRows }] = await Promise.all([
        supabase.from('projects').select('id,status').order('created_at', { ascending: false }),
        supabase.from('tasks').select('id,status,created_at').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(100),
      ]);
      const ps = (projectRows || []) as { id: string; status: string }[];
      const ts = (taskRows || []) as { id: string; status: string; created_at: string }[];
      setProjects(ps); setTasks(ts);
      setStats({ activeProjects: ps.filter(p => p.status === 'active').length, myTasks: ts.filter(t => t.status !== 'done').length, completed: ts.filter(t => t.status === 'done').length, inProgress: ts.filter(t => t.status === 'in_progress').length });
      setLoading(false);
    })();
  }, [profile?.id]);

  const firstName = profile?.fullName || 'User';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const projectTotal = projects.length;
  const taskTotal = tasks.length;
  const taskDonePct = taskTotal ? Math.round((stats.completed / taskTotal) * 100) : 0;
  const projectDone = projects.filter(p => p.status === 'completed').length;
  const projectActive = projects.filter(p => p.status === 'active').length;
  const projectOther = Math.max(0, projectTotal - projectDone - projectActive);
  const projectPct = projectTotal ? Math.round((projectActive / projectTotal) * 100) : 0;
  const week = Array.from({ length: 7 }, (_, index) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-(6-index)); const next=new Date(d); next.setDate(next.getDate()+1); const dayTasks=tasks.filter(t=>{const c=new Date(t.created_at);return c>=d&&c<next}); return { label:d.toLocaleDateString('en-US',{weekday:'short'}).slice(0,1), tasks:dayTasks.length, completed:dayTasks.filter(t=>t.status==='done').length }; });
  const maxBar=Math.max(1,...week.map(w=>Math.max(w.tasks,w.completed)));
  const statCards=[
    {label:'Active Projects',value:stats.activeProjects,icon:FolderKanban,tone:'blue',view:'projects' as View},
    {label:'My Tasks',value:stats.myTasks,icon:ClipboardCheck,tone:'cyan',view:'tasks' as View},
    {label:'Completed',value:stats.completed,icon:Target,tone:'lime',view:'tasks' as View},
    {label:'In Progress',value:stats.inProgress,icon:Zap,tone:'orange',view:'tasks' as View},
  ];

  return <div className="overview video-dashboard">
    <div className="page-heading"><div><h1>Welcome back, {firstName}!</h1><p>Here's what's happening in your workspace today.</p></div><div className="dashboard-date"><CalendarDays size={18}/> {today}</div></div>
    {loading ? <div className="loading-grid">{[0,1,2,3].map(i=><div className="skeleton-card" key={i}/>)}</div> : <div className="stats-grid video-stats">{statCards.map(stat=><button key={stat.label} className="stat-card video-stat-card" onClick={()=>onView(stat.view)}><div className={`stat-icon ${stat.tone}`}><stat.icon size={22}/></div><div className="stat-content"><strong>{stat.value}</strong><span>{stat.label}</span></div><ArrowUpRight className="stat-more" size={17}/></button>)}</div>}
    <div className="video-chart-grid">
      <section className="panel video-chart-card"><div className="panel-heading"><div><h2>Project Analysis</h2><p className="panel-subtitle">Status distribution</p></div><TrendingUp size={22}/></div><div className="video-donut-wrap"><div className="video-donut project-donut" style={{'--pct':`${projectPct*3.6}deg`} as CSSProperties}><div><strong>{projectPct}%</strong><span>active</span></div></div><div className="video-legend"><div><i className="dot active"/><span>Active</span><b>{projectActive}</b></div><div><i className="dot completed"/><span>Completed</span><b>{projectDone}</b></div><div><i className="dot other"/><span>Other</span><b>{projectOther}</b></div><div className="legend-total"><span>Total Projects</span><b>{projectTotal}</b></div></div></div></section>
      <section className="panel video-chart-card"><div className="panel-heading"><div><h2>My Tasks</h2><p className="panel-subtitle">Status breakdown</p></div><ClipboardCheck size={22}/></div><div className="video-donut-wrap"><div className="video-donut task-donut" style={{'--pct':`${taskDonePct*3.6}deg`} as CSSProperties}><div><strong>{taskDonePct}%</strong><span>completed</span></div></div><div className="video-legend"><div><i className="dot done"/><span>Completed</span><b>{stats.completed}</b></div><div><i className="dot progress"/><span>In Progress</span><b>{stats.inProgress}</b></div><div><i className="dot todo"/><span>To do</span><b>{Math.max(0,taskTotal-stats.completed-stats.inProgress)}</b></div><div className="legend-total"><span>Total Tasks</span><b>{taskTotal}</b></div></div></div></section>
      <section className="panel video-chart-card weekly-card"><div className="panel-heading"><div><h2>Weekly Activity</h2><p className="panel-subtitle">Tasks vs completed</p></div><TrendingUp size={22}/></div><div className="bar-chart">{week.map((w,i)=><div className="bar-col" key={i}><div className="bars"><i style={{height:`${Math.max(6,w.tasks/maxBar*100)}%`}}/><i className="completed-bar" style={{height:`${Math.max(4,w.completed/maxBar*100)}%`}}/></div><span>{w.label}</span></div>)}</div><div className="chart-key"><span><i className="key-task"/> Tasks</span><span><i className="key-completed"/> Completed</span></div></section>
    </div>
    <div className="video-dashboard-bottom"><section className="panel"><div className="panel-heading"><div><h2>My Tasks</h2><p className="panel-subtitle">Tasks assigned to you</p></div><button className="panel-link" onClick={()=>onView('tasks')}>View all <ArrowUpRight size={15}/></button></div>{tasks.slice(0,5).map((t,i)=><div className="video-list-row" key={t.id}><span className={`video-check ${t.status}`}/><div><strong>{i===0&&t.status!=='done'?'Latest task':'Task'}</strong><span>{t.status.replace('_',' ')}</span></div><span className={`status-badge ${t.status}`}>{t.status.replace('_',' ')}</span></div>)}{!tasks.length&&<div className="empty-inline">No tasks assigned yet.</div>}</section><section className="panel"><div className="panel-heading"><div><h2>My Portfolio</h2><p className="panel-subtitle">Your workspace profile</p></div><button className="panel-link" onClick={()=>onView('profile')}>View profile <ArrowUpRight size={15}/></button></div><div className="portfolio-mini"><span className="profile-avatar-large">{initials(profile?.fullName || 'U')}</span><div><strong>{profile?.fullName || 'User'}</strong><span>{profile?.position || 'Employee'}</span><small>{profile?.organization?.name || 'Workspace'}</small></div></div></section></div>
  </div>;
}
