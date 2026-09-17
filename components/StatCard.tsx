import { ReactNode } from 'react';
export default function StatCard({ label, value, icon, tone='blue', hint }: {label:string;value:number|string;icon:ReactNode;tone?:string;hint?:string}) {
  return <div className={`stat-card tone-${tone}`}><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div></div>
}
