import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useAuth, type UserProfile } from '@/lib/auth';
import { SuperAdminPanel } from '@/components/SuperAdminPanel';
import { Reveal, RevealStagger, RevealItem, fadeUp, stagger } from '@/lib/motion';
import {
  ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, CircleHelp,
  ClipboardCheck, Clock3, CreditCard, FolderKanban, LayoutDashboard,
  LoaderCircle, Menu, MessageSquare, MoreHorizontal, Plus, Search, Settings,
  Sparkles, Target, TrendingUp, UsersRound, X, Zap,
} from 'lucide-react';

type View = 'overview' | 'tasks' | 'projects' | 'team' | 'schedule' | 'messages' | 'transactions' | 'settings';

type NavItem = { label: string; icon: typeof LayoutDashboard; view: View; badge?: string };

const navItems: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, view: 'overview' },
  { label: 'My tasks', icon: ClipboardCheck, view: 'tasks', badge: '08' },
  { label: 'Projects', icon: FolderKanban, view: 'projects' },
  { label: 'Team', icon: UsersRound, view: 'team' },
  { label: 'Schedule', icon: CalendarDays, view: 'schedule' },
  { label: 'Messages', icon: MessageSquare, view: 'messages', badge: '03' },
];

const stats = [
  { label: 'Active projects', value: '12', change: '+18.2%', icon: FolderKanban, tone: 'cyan' },
  { label: 'Tasks completed', value: '86.4%', change: '+12.8%', icon: Target, tone: 'lime' },
  { label: 'Team velocity', value: '94.8', change: '+8.4%', icon: TrendingUp, tone: 'orange' },
  { label: 'Hours this week', value: '32h 40m', change: 'On track', icon: Clock3, tone: 'blue' },
];

const tasks = [
  { title: 'Finalize onboarding flow', project: 'Nexus platform', due: 'Today, 4:00 PM', status: 'In progress', color: 'cyan' },
  { title: 'Review analytics dashboard', project: 'Pulse analytics', due: 'Tomorrow, 11:00 AM', status: 'Review', color: 'orange' },
  { title: 'Update brand guidelines', project: 'Internal ops', due: 'Wed, 2:30 PM', status: 'In progress', color: 'lime' },
  { title: 'Prepare sprint retrospective', project: 'Nexus platform', due: 'Thu, 9:00 AM', status: 'To do', color: 'blue' },
];

const projectRows = [
  { name: 'Nexus platform', team: 'Product + Engineering', progress: 74, health: 'On track', color: 'cyan' },
  { name: 'Pulse analytics', team: 'Data intelligence', progress: 58, health: 'On track', color: 'orange' },
  { name: 'Atlas rebrand', team: 'Brand studio', progress: 32, health: 'At risk', color: 'lime' },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function App() {
  const { loading, session, profile, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } = useAuth();
  const [screen, setScreen] = useState<'landing' | 'auth' | 'app'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    setScreen(session ? 'app' : 'landing');
  }, [loading, session]);

  const enterAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthError(null);
    setAuthMode(mode);
    setScreen('auth');
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');
    const { error } = authMode === 'login' ? await signInWithEmail(email, password) : await signUpWithEmail(email, password);
    if (error) { setAuthError(error); setAuthLoading(false); return; }
    setAuthLoading(false);
  };

  const handleGoogle = async () => {
    setAuthError(null);
    setAuthLoading(true);
    const { error } = await signInWithGoogle();
    if (error) { setAuthError(error); setAuthLoading(false); }
  };

  const handleLogout = async () => { await signOut(); setScreen('landing'); };

  if (loading) return <SplashLoader />;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen + (screen === 'app' ? (profile?.role === 'super_admin' ? '-admin' : '-ws') : '')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ minHeight: '100vh' }}
      >
        {screen === 'auth' && <AuthScreen mode={authMode} loading={authLoading} error={authError} onSubmit={handleAuth} onGoogle={handleGoogle} onBack={() => setScreen('landing')} onSwitch={() => { setAuthError(null); setAuthMode(authMode === 'login' ? 'signup' : 'login'); }} />}
        {screen === 'app' && session && (profile?.role === 'super_admin' ? <SuperAdminPanel onLogout={handleLogout} /> : <Workspace onLogout={handleLogout} />)}
        {screen !== 'auth' && !(screen === 'app' && session) && <Landing onLogin={() => enterAuth('login')} onSignup={() => enterAuth('signup')} />}
      </motion.div>
    </AnimatePresence>
  );
}

function SplashLoader() {
  return <main className="splash-screen"><div className="splash-brand"><Logo light /><div className="splash-dots"><span /><span /><span /></div></div></main>;
}

function Logo({ light = false }: { light?: boolean }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><span /><span /><span /></span><span>sysmo<span className="brand-accent">byte</span></span></div>;
}

function Landing({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.93]);
  const imageX = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Logo light />
        <div className="landing-links"><a href="#platform">Platform</a><a href="#features">Features</a><a href="#trust">Customers</a></div>
        <div className="nav-actions"><button className="text-button" onClick={onLogin}>Log in</button><button className="primary-button small" onClick={onSignup}>Start free <ArrowUpRight size={15} /></button></div>
      </nav>
      <motion.section className="hero" ref={heroRef} style={{ opacity: heroOpacity }}>
        <motion.div className="hero-copy" style={{ y: heroY }}>
          <motion.img className="hero-copy-background" src="/Shadow.png" alt="" aria-hidden="true" style={{ x: imageX }} />
          <motion.div className="eyebrow" variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }}><span className="eyebrow-bracket" aria-hidden="true" /><span className="eyebrow-dot" /> All-in-one office management platform</motion.div>
          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2, duration: 0.7 }}>The workspace where<br />teams manage <em>projects,</em><br />tasks &amp; workflow.</motion.h1>
          <motion.p variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>Sysmobyte unifies project tracking, team collaboration, scheduling, and operations into one focused workspace — so your team ships faster, together.</motion.p>
          <motion.div className="hero-actions" variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.55 }}>
            <button className="primary-button" onClick={onSignup}>Start Free — No Credit Card <ArrowUpRight size={17} /></button>
            <button className="play-button" onClick={onLogin}><span className="play-triangle" /> Watch demo</button>
          </motion.div>
          <motion.div className="hero-trust" variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.7 }}>
            <div className="avatar-stack"><span>AM</span><span>RK</span><span>JD</span><span>SA</span><span>+4k</span></div>
            <span>Loved by <strong>4,000+ teams</strong> worldwide</span>
          </motion.div>
        </motion.div>
        <motion.div className="hero-art" style={{ y: heroY, scale: heroScale }}>
          <div className="hero-glow" />
          <motion.div className="hero-product-mockup" initial={{ opacity: 0, y: 40, rotateY: -12 }} animate={{ opacity: 1, y: 0, rotateY: -6 }} transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <div className="mockup-browser-bar">
              <span className="mockup-dot r" /><span className="mockup-dot y" /><span className="mockup-dot g" />
              <div className="mockup-url"><span className="mockup-lock" /> app.sysmobyte.com/dashboard</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-sidebar">
                <div className="mockup-logo-dot" />
                <div className="mockup-nav-item active" /><div className="mockup-nav-item" /><div className="mockup-nav-item" /><div className="mockup-nav-item" /><div className="mockup-nav-item" />
              </div>
              <div className="mockup-content">
                <div className="mockup-header"><div className="mockup-title" /><div className="mockup-avatar" /></div>
                <div className="mockup-stats">
                  <div className="mockup-stat-card"><div className="mockup-stat-icon lime" /><div className="mockup-stat-lines"><span /><span /></div></div>
                  <div className="mockup-stat-card"><div className="mockup-stat-icon cyan" /><div className="mockup-stat-lines"><span /><span /></div></div>
                  <div className="mockup-stat-card"><div className="mockup-stat-icon orange" /><div className="mockup-stat-lines"><span /><span /></div></div>
                </div>
                <div className="mockup-chart-row">
                  <div className="mockup-chart-card">
                    <div className="mockup-chart-title" />
                    <div className="mockup-donut"><span>72%</span></div>
                    <div className="mockup-legend"><span /><span /><span /></div>
                  </div>
                  <div className="mockup-feed-card">
                    <div className="mockup-chart-title" />
                    <div className="mockup-feed-item" /><div className="mockup-feed-item" /><div className="mockup-feed-item" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div className="floating-card floating-card-top" animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
            <div className="mini-icon"><Zap size={15} /></div>
            <div><strong>Team velocity</strong><small>+18.4% this month</small></div>
            <TrendingUp size={20} className="green-icon" />
          </motion.div>
          <motion.div className="floating-card floating-card-bottom" animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2.2 }}>
            <div className="ring-chart"><span>86%</span></div>
            <div><strong>Project health</strong><small>All systems on track</small></div>
            <Check size={18} className="green-icon" />
          </motion.div>
        </motion.div>
      </motion.section>
      <Reveal className="logo-strip-wrap" delay={0.1}>
        <div className="logo-strip" id="trust">
          <span>Trusted by 4,000+ teams worldwide</span>
          <strong>northstar</strong><strong>arc<span>°</span></strong><strong>MONOCO</strong><strong>vertex<span className="text-blue">/</span></strong><strong>FWD.</strong>
        </div>
      </Reveal>
      <section className="platform-section" id="features">
        <Reveal><div className="section-kicker">A clearer way to work</div></Reveal>
        <Reveal delay={0.1}><h2>Everything your team needs.<br /><span>Nothing it doesn't.</span></h2></Reveal>
        <RevealStagger className="feature-grid">
          <RevealItem><FeatureCard icon={<FolderKanban />} title="Projects that think ahead" text="See every milestone, dependency, and decision in one calm, connected view." /></RevealItem>
          <RevealItem><FeatureCard icon={<UsersRound />} title="People in their flow" text="Give every teammate the context, focus, and autonomy to do their best work." /></RevealItem>
          <RevealItem><FeatureCard icon={<Sparkles />} title="Momentum, made visible" text="Turn daily progress into clear signals your whole organization can act on." /></RevealItem>
        </RevealStagger>
      </section>
      <section className="trust-section" id="platform">
        <Reveal>
          <div className="trust-card">
            <div className="trust-quote">"Sysmobyte replaced four separate tools for our team. Onboarding took minutes, not weeks. Everyone finally sees the same picture."</div>
            <div className="trust-author"><span className="trust-avatar">SA</span><span><strong>Sarah Ahmed</strong><small>Head of Product · Northstar</small></span></div>
          </div>
        </Reveal>
        <RevealStagger className="trust-stats">
          <RevealItem><div className="trust-stat"><strong>4,000+</strong><span>Teams onboarded</span></div></RevealItem>
          <RevealItem><div className="trust-stat"><strong>98.6%</strong><span>Uptime SLA</span></div></RevealItem>
          <RevealItem><div className="trust-stat"><strong>12M+</strong><span>Tasks completed</span></div></RevealItem>
        </RevealStagger>
      </section>
      <footer className="landing-footer"><Logo light /><span>© 2025 Sysmobyte. Built for the way work moves.</span><span>Dhaka · Remote-first</span></footer>
    </main>
  );
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <article className="feature-card"><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p><ArrowUpRight size={18} className="feature-arrow" /></article>;
}

function AuthScreen({ mode, loading, error, onSubmit, onGoogle, onBack, onSwitch }: { mode: 'login' | 'signup'; loading: boolean; error: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onGoogle: () => void; onBack: () => void; onSwitch: () => void }) {
  return <main className="auth-page"><div className="auth-visual"><div className="auth-visual-overlay" /><nav><button className="back-button" onClick={onBack}><X size={17} /> Close</button><Logo light /></nav><div className="auth-quote"><span className="quote-mark">“</span><h2>Clarity is a competitive advantage.</h2><p>Bring your team's best thinking into focus.</p><div className="quote-author"><span className="author-avatar">SA</span><span><strong>Sarah Ahmed</strong><small>Head of Product, Northstar</small></span></div></div><div className="auth-caption"><span>SYS/01</span><span>Human-centered operations</span></div></div><section className="auth-panel"><div className="auth-panel-inner"><div className="mobile-auth-logo"><Logo /></div><AnimatePresence mode="wait"><motion.div key={mode} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}><div className="auth-heading"><div className="status-pill"><span /> Secure workspace access</div><h1>{mode === 'login' ? 'Welcome back.' : 'Start moving forward.'}</h1><p>{mode === 'login' ? 'Pick up exactly where your team left off.' : 'Create your focused workspace in under a minute.'}</p></div><button className="google-button" onClick={onGoogle} disabled={loading}><span className="google-g">G</span> Continue with Google <ArrowUpRight size={16} /></button><div className="divider"><span>or continue with email</span></div><form onSubmit={onSubmit}><label>Work email<input type="email" name="email" placeholder="you@company.com" required /></label><label>Password<input type="password" name="password" placeholder="At least 8 characters" minLength={8} required /></label>{mode === 'login' && <div className="form-row"><label className="check-label"><input type="checkbox" /> <span>Remember me</span></label><button type="button" className="link-button">Forgot password?</button></div>}{error && <div className="auth-error">{error}</div>}<button className="primary-button auth-submit" disabled={loading}>{loading ? <><LoaderCircle size={18} className="spin" /> Preparing your workspace...</> : <>{mode === 'login' ? 'Enter workspace' : 'Create workspace'} <ArrowUpRight size={17} /></>}</button></form><p className="switch-auth">{mode === 'login' ? 'New to Sysmobyte?' : 'Already have a workspace?'} <button className="link-button" onClick={onSwitch}>{mode === 'login' ? 'Create an account' : 'Log in instead'}</button></p><p className="legal">By continuing, you agree to Sysmobyte's <u>Terms</u> and <u>Privacy Policy</u>.</p></motion.div></AnimatePresence></div></section></main>;
}

function Workspace({ onLogout }: { onLogout: () => void }) {
  const { profile } = useAuth();
  const [view, setView] = useState<View>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const activeLabel = useMemo(() => navItems.find((item) => item.view === view)?.label || 'Overview', [view]);
  return <main className="workspace"><AnimatePresence>{mobileMenu && <motion.div className="sidebar-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={() => setMobileMenu(false)} />}</AnimatePresence><aside className={`sidebar ${mobileMenu ? 'open' : ''}`}><div className="sidebar-top"><Logo /><button className="close-mobile" onClick={() => setMobileMenu(false)}><X size={19} /></button></div><div className="workspace-switcher"><span className="workspace-symbol">N</span><span><strong>Northstar HQ</strong><small>Personal workspace</small></span><ChevronDown size={15} /></div><p className="nav-label">Workspace</p><nav className="side-nav">{navItems.map((item) => <button key={item.view} className={view === item.view ? 'active' : ''} onClick={() => { setView(item.view); setMobileMenu(false); }}><item.icon size={18} /><span>{item.label}</span>{item.badge && <b>{item.badge}</b>}</button>)}</nav><p className="nav-label">Manage</p><nav className="side-nav"><button className={view === 'transactions' ? 'active' : ''} onClick={() => { setView('transactions'); setMobileMenu(false); }}><CreditCard size={18} /><span>Transactions</span></button><button className={view === 'settings' ? 'active' : ''} onClick={() => { setView('settings'); setMobileMenu(false); }}><Settings size={18} /><span>Settings</span></button></nav><div className="sidebar-bottom"><div className="help-box"><CircleHelp size={18} /><span><strong>Need a hand?</strong><small>Visit help center</small></span><ArrowUpRight size={15} /></div><UserCard profile={profile} onLogout={onLogout} /></div></aside><section className="workspace-main"><header className="workspace-header"><button className="mobile-menu-button" onClick={() => setMobileMenu(true)}><Menu size={21} /></button><div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{activeLabel}</strong></div><div className="header-actions"><button className={`icon-button ${searchOpen ? 'selected' : ''}`} onClick={() => setSearchOpen(!searchOpen)}><Search size={19} /></button><button className="icon-button notification"><Bell size={19} /><i /></button><HeaderAvatar profile={profile} /></div>{searchOpen && <div className="search-popover"><Search size={17} /><input autoFocus placeholder="Search anything..." /><span>⌘ K</span></div>}</header><div className="content-area"><AnimatePresence mode="wait"><motion.div key={view} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>{view === 'overview' ? <Overview onView={setView} profile={profile} /> : <SectionView view={view} />}</motion.div></AnimatePresence></div></section></main>;
}

function UserCard({ profile, onLogout }: { profile: UserProfile | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const name = profile?.fullName || 'Guest';
  const role = profile?.role || 'employee';
  return <div className="user-card-wrap"><button className="user-card" onClick={() => setOpen(!open)}>{profile?.avatarUrl ? <img src={profile.avatarUrl} alt={name} className="profile-avatar img" /> : <span className="profile-avatar">{initials(name)}</span>}<span><strong>{name}</strong><small>{role}</small></span><MoreHorizontal size={17} /></button>{open && <div className="user-popover"><button onClick={onLogout}>Sign out</button></div>}</div>;
}

function HeaderAvatar({ profile }: { profile: UserProfile | null }) {
  const name = profile?.fullName || 'Guest';
  return profile?.avatarUrl ? <img src={profile.avatarUrl} alt={name} className="header-avatar img" /> : <div className="header-avatar">{initials(name)}</div>;
}

function Overview({ onView, profile }: { onView: (view: View) => void; profile: UserProfile | null }) {
  const firstName = (profile?.fullName || 'Ahmed').split(' ')[0];
  return <div className="overview"><div className="page-heading"><div><div className="eyebrow dark"><span className="eyebrow-dot" /> Tuesday, March 18, 2025</div><h1>Good morning, {firstName} <span>✦</span></h1><p>Here's what is happening across your workspace today.</p></div><button className="primary-button small" onClick={() => onView('tasks')}><Plus size={17} /> Add task</button></div><div className="stats-grid">{stats.map((stat) => <div className="stat-card" key={stat.label}><div className={`stat-icon ${stat.tone}`}><stat.icon size={19} /></div><div className="stat-content"><span>{stat.label}</span><strong>{stat.value}</strong><small className={stat.change.startsWith('+') ? 'positive' : ''}>{stat.change.startsWith('+') && <TrendingUp size={12} />} {stat.change}</small></div><MoreHorizontal size={17} className="stat-more" /></div>)}</div><div className="dashboard-grid"><section className="panel project-panel"><div className="panel-heading"><div><span className="panel-eyebrow">Portfolio pulse</span><h2>Project performance</h2></div><button className="period-button">Last 30 days <ChevronDown size={14} /></button></div><div className="chart-wrap"><div className="donut-chart"><div><strong>72%</strong><span>overall health</span></div></div><div className="legend-list"><div><span className="legend-dot cyan" /><span>On track</span><strong>08</strong></div><div><span className="legend-dot orange" /><span>At risk</span><strong>03</strong></div><div><span className="legend-dot muted" /><span>Not started</span><strong>01</strong></div><div className="legend-total"><span>Total projects</span><strong>12</strong></div></div></div><button className="panel-link" onClick={() => onView('projects')}>View all projects <ArrowUpRight size={16} /></button></section><section className="panel activity-panel"><div className="panel-heading"><div><span className="panel-eyebrow">Live feed</span><h2>Team activity</h2></div><button className="more-button"><MoreHorizontal size={18} /></button></div><div className="activity-list"><Activity avatar="RK" name="Rafi Khan" action="completed a task in" context="Nexus platform" time="2m ago" tone="cyan" /><Activity avatar="NA" name="Nusrat A." action="shared a new file in" context="Pulse analytics" time="18m ago" tone="orange" /><Activity avatar="JD" name="James Davis" action="commented on" context="Sprint planning" time="1h ago" tone="lime" /><Activity avatar="SA" name="Sarah Ahmed" action="joined the project" context="Atlas rebrand" time="3h ago" tone="blue" /></div><button className="panel-link">See all activity <ArrowUpRight size={16} /></button></section></div><div className="lower-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><span className="panel-eyebrow">Your focus</span><h2>Upcoming tasks</h2></div><button className="panel-link" onClick={() => onView('tasks')}>View all <ArrowUpRight size={15} /></button></div><div className="task-list">{tasks.map((task) => <div className="task-row" key={task.title}><span className={`task-check ${task.color}`} /> <div className="task-info"><strong>{task.title}</strong><span>{task.project}</span></div><span className={`task-status ${task.color}`}>{task.status}</span><span className="task-due">{task.due}</span><MoreHorizontal size={17} /></div>)}</div></section><section className="panel agenda-panel"><div className="panel-heading"><div><span className="panel-eyebrow">Up next</span><h2>Today's agenda</h2></div><button className="calendar-button"><CalendarDays size={16} /></button></div><div className="agenda"><div className="agenda-item now"><span className="agenda-time">10:00</span><div><strong>Design sync</strong><span>Product team · Room 04</span></div><span className="now-pill">Now</span></div><div className="agenda-item"><span className="agenda-time">13:30</span><div><strong>Project check-in</strong><span>Sarah, Rafi + 3 others</span></div></div><div className="agenda-item"><span className="agenda-time">16:00</span><div><strong>Focus time</strong><span>Deep work block</span></div></div></div></section></div></div>;
}

function Activity({ avatar, name, action, context, time, tone }: { avatar: string; name: string; action: string; context: string; time: string; tone: string }) {
  return <div className="activity-item"><span className={`activity-avatar ${tone}`}>{avatar}</span><p><strong>{name}</strong> {action} <b>{context}</b><small>{time}</small></p><MoreHorizontal size={16} /></div>;
}

function SectionView({ view }: { view: View }) {
  const titles: Record<View, [string, string]> = { tasks: ['My tasks', 'Keep your momentum moving forward.'], projects: ['Projects', 'A clear view of everything in motion.'], team: ['Team', 'The people making progress happen.'], schedule: ['Schedule', 'Your time, intentionally arranged.'], messages: ['Messages', 'Stay close to the conversations that matter.'], transactions: ['Transactions', 'A simple view of your workspace finances.'], settings: ['Settings', 'Make Sysmobyte work the way you do.'], overview: ['Overview', ''] };
  const [title, subtitle] = titles[view];
  return <div className="section-view"><div className="page-heading"><div><div className="eyebrow dark"><span className="eyebrow-dot" /> Workspace</div><h1>{title}</h1><p>{subtitle}</p></div><button className="primary-button small"><Plus size={17} /> New {view === 'tasks' ? 'task' : view === 'projects' ? 'project' : 'item'}</button></div>{view === 'projects' || view === 'tasks' ? <div className="panel section-table"><div className="table-toolbar"><div className="table-tabs"><button className="selected">All</button><button>In progress</button><button>Completed</button></div><button className="filter-button"><Search size={16} /> Filter</button></div>{(view === 'projects' ? projectRows : tasks).map((row, index) => <div className="table-row" key={index}>{view === 'projects' ? <><span className={`project-bullet ${projectRows[index].color}`} /><div className="table-primary"><strong>{projectRows[index].name}</strong><span>{projectRows[index].team}</span></div><div className="progress-cell"><span><b>{projectRows[index].progress}%</b> complete</span><div className="progress-bar"><i style={{ width: `${projectRows[index].progress}%` }} /></div></div><span className={`health ${projectRows[index].health === 'At risk' ? 'risk' : ''}`}><i />{projectRows[index].health}</span></> : <><span className={`task-check ${tasks[index].color}`} /><div className="table-primary"><strong>{tasks[index].title}</strong><span>{tasks[index].project}</span></div><span className={`task-status ${tasks[index].color}`}>{tasks[index].status}</span><span className="task-due">{tasks[index].due}</span></>}<MoreHorizontal size={18} /></div>)}</div> : <div className="empty-state panel"><div className="empty-icon"><Sparkles size={25} /></div><h2>{view === 'messages' ? 'Your conversations will appear here' : 'This space is ready for your team'}</h2><p>Connect your workspace data to start seeing this view come alive.</p><button className="secondary-button"><Plus size={16} /> Create something new</button></div>}</div>;
}

export default App;
