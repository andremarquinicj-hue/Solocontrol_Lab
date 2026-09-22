'use client';

import { Download, HardDriveDownload, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { getBackupSnapshot } from '@/lib/store';

export default function SettingsPage(){
  const[loading,setLoading]=useState(false);
  async function backup(){setLoading(true);try{const data=await getBackupSnapshot();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`solocontrol-lab-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)}finally{setLoading(false)}}
  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">SEGURANÇA E CONTINGÊNCIA</span><h1>Configurações</h1><p>Backup, proteção e orientações para colocar o sistema em produção.</p></div></section><section className="two-columns"><div className="panel settings-card"><HardDriveDownload size={32}/><h2>Backup manual completo</h2><p>Baixa uma cópia JSON de obras, fichas, ensaios, usuários, auditoria, equipamentos, checklists e não conformidades.</p><button className="button primary" onClick={backup} disabled={loading}><Download size={16}/>{loading?'Gerando...':'Gerar backup agora'}</button></div><div className="panel settings-card"><ShieldCheck size={32}/><h2>Produção segura</h2><p>Antes do uso definitivo, ative login nominal por E-mail/Senha, configure App Check e mantenha os alertas de orçamento do Firebase.</p><div className="rule-list"><span>✓ Preferir arquivar fichas ao invés de excluir.</span><span>✓ Manter auditoria independente da ficha.</span><span>✓ Criar rotina de backup do Firestore no Google Cloud.</span><span>✓ Revisar acessos de clientes por obra.</span></div></div></section><section className="panel"><h2>Backup automático</h2><p>O aplicativo web consegue gerar backup manual, mas o agendamento automático do Firestore deve ser configurado no Google Cloud/Firebase, pois depende de infraestrutura do projeto e cobrança. O sistema está preparado para continuar funcionando com cache local de leitura quando houver falha temporária de conexão.</p></section></div>
}
