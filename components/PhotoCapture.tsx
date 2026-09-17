'use client';

import { Camera, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function PhotoCapture({ label, required = true, value, onChange }: { label: string; required?: boolean; value?: File; onChange: (file: File) => void }) {
  const [preview, setPreview] = useState<string>('');
  return <label className={`photo-capture ${value ? 'has-file' : ''}`}>
    {preview ? <img src={preview} alt={label}/> : <div className="photo-placeholder"><Camera size={28}/><span>Adicionar foto</span></div>}
    <div className="photo-label"><span>{label}{required && <b>*</b>}</span>{value && <CheckCircle2 size={18}/>}</div>
    <input type="file" accept="image/*" capture="environment" onChange={(e) => { const f=e.target.files?.[0]; if (!f) return; onChange(f); setPreview(URL.createObjectURL(f)); }} />
  </label>
}
