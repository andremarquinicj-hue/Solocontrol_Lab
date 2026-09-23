'use client';

import { useEffect, useState } from 'react';
import { DatabaseZap } from 'lucide-react';
import { ensureVillaAraucoHistoricalBaseline } from '@/lib/historical-baseline';

export default function HistoricalBaselineMigration(){
  const [state,setState]=useState<'idle'|'running'|'error'>('idle');
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let cancelled=false;
    async function run(){
      try{
        setState('running');
        setMessage('Consolidando a base histórica da Villa Arauco...');
        const result=await ensureVillaAraucoHistoricalBaseline();
        if(cancelled)return;
        if(result.alreadyApplied){setState('idle');setMessage('');return;}
        setMessage(`Base histórica consolidada: ${result.sourceRows} linhas de rupturas incorporadas e ${result.samplesArchived} fichas anteriores arquivadas. Atualizando a tela...`);
        sessionStorage.setItem('solocontrol.baseline.v080.reloaded','1');
        window.setTimeout(()=>window.location.reload(),900);
      }catch(error){
        console.error(error);
        if(cancelled)return;
        setState('error');
        setMessage(`Não foi possível consolidar a base histórica automaticamente. ${error instanceof Error?error.message:String(error)}`);
      }
    }
    run();
    return()=>{cancelled=true};
  },[]);

  if(state==='idle'||!message)return null;
  return <div className={`baseline-migration-toast ${state}`}><DatabaseZap size={18}/><span>{message}</span></div>;
}
