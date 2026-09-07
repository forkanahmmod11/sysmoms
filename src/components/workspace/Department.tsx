import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2, LoaderCircle, Plus, Search, X } from 'lucide-react';
import { supabase, useAuth } from '@/lib/auth';

type Department = { id:string; name:string; description:string|null; moderator_id:string|null; created_at:string };

export function DepartmentView() {
  const { profile } = useAuth();
  const [items,setItems]=useState<Department[]>([]);
  const [loading,setLoading]=useState(true);
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [search,setSearch]=useState('');
  const load=useCallback(async()=>{ if(!supabase){setLoading(false);return;} const {data}=await supabase.from('departments').select('id,name,description,moderator_id,created_at').order('created_at',{ascending:false}); setItems((data as Department[])||[]); setLoading(false);},[]);
  useEffect(()=>{void load()},[load]);
  const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!supabase)return;setSaving(true);const f=new FormData(e.currentTarget);const {error}=await supabase.from('departments').insert({name:String(f.get('name')||'').trim(),description:String(f.get('description')||'').trim()||null,moderator_id:profile?.id||null});setSaving(false);if(!error){setOpen(false);void load();}};
  const filtered=items.filter(x=>x.name.toLowerCase().includes(search.toLowerCase()));
  return <div className="merged-oms section-view"><div className="page-heading"><div><div className="eyebrow dark"><span className="eyebrow-dot"/> Office structure</div><h1>Departments</h1><p>Organize people and work by department.</p></div><button className="primary-button" onClick={()=>setOpen(true)}><Plus size={16}/> New department</button></div>
    <div className="toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search departments..."/></div></div>
    {loading?<div className="panel empty-state"><LoaderCircle className="spin"/> Loading departments...</div>:filtered.length===0?<div className="panel empty-state"><Building2 size={28}/><strong>No departments yet</strong><span>Create the first department to structure your workspace.</span></div>:
    <div className="card-grid">{filtered.map(d=><article className="panel" key={d.id}><div className="panel-icon"><Building2 size={18}/></div><h3>{d.name}</h3><p>{d.description||'No description provided.'}</p><small>Created {new Date(d.created_at).toLocaleDateString()}</small></article>)}</div>}
    {open&&<div className="modal-backdrop" onMouseDown={()=>setOpen(false)}><div className="modal-card" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>New department</h2><button onClick={()=>setOpen(false)}><X size={18}/></button></div><form onSubmit={submit} className="form-stack"><label className="form-field"><span>Name</span><input name="name" required placeholder="Human Resources"/></label><label className="form-field"><span>Description</span><textarea name="description" rows={4} placeholder="What this department handles"/></label><button className="primary-button" disabled={saving}>{saving?<LoaderCircle className="spin" size={16}/>:<Plus size={16}/>} Create department</button></form></div></div>}</div>
}
