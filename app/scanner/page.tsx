'use client';

import { Camera, Search, ScanLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { listSamples } from '@/lib/store';
import { Sample } from '@/lib/types';

export default function ScannerPage(){
  const [samples,setSamples]=useState<Sample[]>([]);const[value,setValue]=useState('');const[message,setMessage]=useState('');const[scanning,setScanning]=useState(false);const videoRef=useRef<HTMLVideoElement>(null);const streamRef=useRef<MediaStream>();const router=useRouter();
  useEffect(()=>{listSamples().then(setSamples);return()=>streamRef.current?.getTracks().forEach(t=>t.stop())},[]);
  function find(raw:string){const q=raw.trim().replace(/\s+/g,'').toUpperCase();if(!q)return;const found=samples.find(s=>[s.labelBase,...s.cpLabels].some(label=>label.replace(/\s+/g,'').toUpperCase()===q));if(found){router.push(`/amostras/${found.id}`)}else setMessage(`Etiqueta ${raw} não localizada.`)}
  async function scan(){
    setMessage('');
    const Detector=(window as any).BarcodeDetector;
    if(!Detector){setMessage('Este navegador não oferece leitura nativa de código de barras. Use o campo manual abaixo ou abra no Chrome/Android compatível.');return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});streamRef.current=stream;if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}
      setScanning(true);const detector=new Detector({formats:['code_128','code_39','ean_13','qr_code']});
      const loop=async()=>{if(!videoRef.current||!streamRef.current)return;try{const codes=await detector.detect(videoRef.current);if(codes?.[0]?.rawValue){const raw=codes[0].rawValue;stream.getTracks().forEach(t=>t.stop());setScanning(false);setValue(raw);find(raw);return}}catch{}requestAnimationFrame(loop)};loop();
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível abrir a câmera.')}
  }
  return <div className="page-stack narrow-page"><section className="page-heading"><div><span className="eyebrow">IDENTIFICAÇÃO RÁPIDA</span><h1>Ler etiqueta</h1><p>Escaneie o código de barras do CP ou pesquise pela identificação impressa.</p></div></section><section className="panel scanner-panel"><div className="scanner-stage">{scanning?<video ref={videoRef} playsInline muted/>:<div><ScanLine size={52}/><b>Aponte a câmera para a etiqueta Solocontrol</b><span>A leitura abre automaticamente a rastreabilidade do CP.</span></div>}</div><button className="button primary" onClick={scan}><Camera size={17}/>{scanning?'Lendo...':'Abrir câmera'}</button>{message&&<div className="warning-box">{message}</div>}<div className="scanner-manual"><label>Digitar etiqueta<input value={value} onChange={e=>setValue(e.target.value)} placeholder="Ex.: 011251-26-4" onKeyDown={e=>{if(e.key==='Enter')find(value)}}/></label><button className="button secondary" onClick={()=>find(value)}><Search size={16}/>Localizar</button></div></section></div>
}
