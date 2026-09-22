'use client';

import { Sample, Work } from './types';
import { analyzeFormRelease, lotTechnicalSummary, sampleStrengthSeries } from './technical-analysis';
import { processTypeLabel, sampleProcessLabel, sampleProcessType } from './process-profiles';
import { formatDate, ruptureAgeLabel } from './utils';
import { normalizeElementGroup, sampleCollectionDate, sampleVolume } from './work-analytics';

export interface LotReportInput {
  work: Work;
  block: string;
  lot: string;
  samples: Sample[];
  clientView?: boolean;
}

const NAVY:[number,number,number]=[8,45,80];
const BLUE:[number,number,number]=[11,104,178];
const GREEN:[number,number,number]=[31,157,104];
const RED:[number,number,number]=[220,53,69];
const MUTED:[number,number,number]=[100,116,132];
const LIGHT:[number,number,number]=[244,247,249];

function safe(value: unknown) { return String(value ?? '').replace(/[\r\n]+/g,' ').trim(); }
function fileSafe(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'_').replace(/^_|_$/g,'');}

async function logoDataUrl(){
  try{
    const response=await fetch('/logo-solocontrol.png');
    if(!response.ok)return undefined;
    const blob=await response.blob();
    return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob)});
  }catch{return undefined}
}

export async function buildLotTechnicalPdf(input:LotReportInput){
  const {jsPDF}=await import('jspdf');
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const pageW=210,pageH=297,margin=14,contentW=pageW-margin*2;
  let y=14;
  const lotSummary=lotTechnicalSummary(input.samples,input.work);
  const volume=input.samples.reduce((sum,s)=>sum+sampleVolume(s),0);
  const tests=input.samples.reduce((sum,s)=>sum+s.ruptures.filter(r=>r.resistanceMpa!==undefined||r.measurements?.length||r.importedResultsMpa?.length).length,0);
  const reportCount=new Set(input.samples.map(s=>s.reportNumber||s.physicalFormNumber).filter(Boolean)).size;

  const setText=(size=9,color:[number,number,number]=MUTED,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color)};
  const newPageIf=(needed:number)=>{if(y+needed>pageH-18){doc.addPage();y=15;drawPageHeader(false)}};
  const line=(x1:number,y1:number,x2:number,y2:number,color:[number,number,number]=[220,228,235])=>{doc.setDrawColor(...color);doc.line(x1,y1,x2,y2)};
  const wrap=(text:string,width:number)=>doc.splitTextToSize(text,width) as string[];

  function drawPageHeader(first=true){
    doc.setFillColor(...NAVY);doc.rect(0,0,pageW,first?10:6,'F');
    if(!first){setText(7,MUTED);doc.text(`Solocontrol Lab • ${input.work.name} • Q${input.block} L${input.lot}`,margin,11)}
  }

  drawPageHeader(true);
  const logo=await logoDataUrl();
  if(logo){try{doc.addImage(logo,'PNG',margin,14,44,22,undefined,'FAST')}catch{}}
  setText(8,BLUE,true);doc.text('RELATÓRIO TÉCNICO DE ACOMPANHAMENTO',logo?64:margin,18);
  setText(19,NAVY,true);doc.text(`Quadra ${input.block} • Lote ${input.lot}`,logo?64:margin,26);
  setText(9,MUTED);doc.text(`${input.work.name} • ${input.work.client}${input.work.contractor?` • ${input.work.contractor}`:''}`,logo?64:margin,32);
  setText(8,MUTED);doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`,logo?64:margin,37);
  y=44;

  // KPI cards
  const cards=[['Concretagens',String(input.samples.length)],['Volume controlado',`${volume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³`],['Ensaios/resultados',String(tests)],['Laudos/referências',String(reportCount)]];
  const gap=3,cardW=(contentW-gap*3)/4;
  cards.forEach(([label,value],i)=>{const x=margin+i*(cardW+gap);doc.setFillColor(...LIGHT);doc.setDrawColor(222,230,237);doc.roundedRect(x,y,cardW,18,2,2,'FD');setText(6.8,MUTED,true);doc.text(label.toUpperCase(),x+3,y+6);setText(11,NAVY,true);doc.text(value,x+3,y+13)});
  y+=25;

  // Executive status
  const statusColor=lotSummary.tone==='good'?GREEN:lotSummary.tone==='danger'?RED:lotSummary.tone==='attention'?[245,158,11] as [number,number,number]:BLUE;
  doc.setFillColor(249,251,252);doc.setDrawColor(...statusColor);doc.setLineWidth(1);doc.roundedRect(margin,y,contentW,22,2,2,'FD');doc.setLineWidth(.2);
  setText(10,NAVY,true);doc.text(lotSummary.headline,margin+4,y+7);
  setText(8,MUTED);const summaryLines=wrap(lotSummary.summary,contentW-8).slice(0,3);doc.text(summaryLines,margin+4,y+13);
  y+=28;

  // Concretagens
  newPageIf(35);setText(11,NAVY,true);doc.text('1. Concretagens e rastreabilidade',margin,y);y+=5;line(margin,y,pageW-margin,y);y+=5;
  const ordered=[...input.samples].sort((a,b)=>sampleCollectionDate(a).localeCompare(sampleCollectionDate(b)));
  for(const sample of ordered){
    newPageIf(17);
    const date=formatDate(sampleCollectionDate(sample));
    const process=sampleProcessLabel(sample);
    setText(8.4,NAVY,true);doc.text(`${date} • ${process} • NF ${sample.invoice||'—'}`,margin,y);
    setText(7.5,MUTED);doc.text(`Concreteira: ${sample.supplier||'—'}   Volume: ${sampleVolume(sample).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³   Slump: ${sample.slumpActualCm!==undefined?`${sample.slumpActualCm} cm`:'—'}   MPa projeto: ${sample.specifiedStrengthMpa!==undefined?`${sample.specifiedStrengthMpa} MPa`:'—'}`,margin,y+4.5);
    doc.text(`Ficha/Laudo: ${sample.physicalFormNumber||sample.reportNumber||sample.labelBase||'—'}${sample.qualityDecision?`   Decisão: ${sample.qualityDecision}`:''}`,margin,y+9);
    if(sample.qualityObservation){setText(7.1,RED);const obs=wrap(`Obs.: ${sample.qualityObservation}`,contentW).slice(0,2);doc.text(obs,margin,y+13)}
    y+=sample.qualityObservation?20:15;line(margin,y-2,pageW-margin,y-2);
  }

  // Results table-style
  newPageIf(30);setText(11,NAVY,true);doc.text('2. Resultados de ruptura',margin,y);y+=5;line(margin,y,pageW-margin,y);y+=5;
  for(const sample of ordered){
    const results=sample.ruptures.filter(r=>r.resistanceMpa!==undefined||r.measurements?.length||r.importedResultsMpa?.length);
    if(!results.length)continue;
    newPageIf(10+results.length*6);
    setText(8.5,NAVY,true);doc.text(`${sample.labelBase} • ${sampleProcessLabel(sample)} • ${formatDate(sampleCollectionDate(sample))}`,margin,y);y+=5;
    for(const r of results){
      const values=r.measurements?.length?r.measurements.map(m=>m.resistanceMpa):(r.importedResultsMpa?.length?r.importedResultsMpa:(r.resistanceMpa!==undefined?[r.resistanceMpa]:[]));
      const avg=values.length?values.reduce((a,b)=>a+b,0)/values.length:undefined;
      setText(7.5,MUTED);doc.text(`${ruptureAgeLabel(r).padEnd(12)}  ${values.map(v=>v.toFixed(2)).join(' / ') || '—'} MPa${avg!==undefined&&values.length>1?`   média ${avg.toFixed(2)} MPa`:''}`,margin+3,y);y+=5;
    }
    y+=2;
  }

  // Strength chart
  const chartSeries=ordered.map(sample=>({sample,points:sampleStrengthSeries(sample)})).filter(s=>s.points.length).slice(-6);
  if(chartSeries.length){
    newPageIf(82);setText(11,NAVY,true);doc.text('3. Evolução da resistência do concreto',margin,y);y+=6;
    const chartX=margin,chartY=y,chartW=contentW,chartH=62,left=14,bottom=12,top=5,right=4;
    const allPoints=chartSeries.flatMap(s=>s.points);
    const ages=Array.from(new Set(allPoints.map(p=>p.ageDays))).sort((a,b)=>a-b);
    const targets=ordered.map(s=>s.specifiedStrengthMpa||input.work.defaultStrengthMpa).filter((v):v is number=>Boolean(v));
    const target=targets.length?Math.max(...targets):undefined;
    const values=allPoints.map(p=>p.value);if(target)values.push(target);
    const yMax=Math.max(5,Math.ceil(Math.max(...values)*1.2/5)*5);
    const px=(age:number)=>ages.length===1?chartX+left+(chartW-left-right)/2:chartX+left+(ages.indexOf(age)/(ages.length-1))*(chartW-left-right);
    const py=(v:number)=>chartY+top+(chartH-top-bottom)-(v/yMax)*(chartH-top-bottom);
    doc.setDrawColor(220,228,235);for(let i=0;i<=5;i++){const v=yMax*i/5;const yy=py(v);doc.line(chartX+left,yy,chartX+chartW-right,yy);setText(6,MUTED);doc.text(v.toFixed(0),chartX+left-2,yy+1,{align:'right'})}
    ages.forEach(age=>{const xx=px(age);doc.line(xx,chartY+top,xx,chartY+chartH-bottom);setText(6,MUTED);const label=age<1?`${Math.round(age*24)}h`:`${age}d`;doc.text(label,xx,chartY+chartH-5,{align:'center'})});
    if(target){doc.setDrawColor(...RED);doc.setLineDashPattern([2,1],0);doc.line(chartX+left,py(target),chartX+chartW-right,py(target));doc.setLineDashPattern([],0);setText(6.5,RED,true);doc.text(`Projeto ${target.toFixed(1)} MPa`,chartX+chartW-right-1,py(target)-1,{align:'right'})}
    const colors:[[number,number,number],[number,number,number],[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[BLUE,GREEN,[245,158,11],[139,92,246],RED,[15,118,110]];
    chartSeries.forEach((series,index)=>{const color=colors[index%colors.length];doc.setDrawColor(...color);doc.setFillColor(...color);series.points.forEach((point,i)=>{const xx=px(point.ageDays),yy=py(point.value);if(i){const prev=series.points[i-1];doc.line(px(prev.ageDays),py(prev.value),xx,yy)}doc.circle(xx,yy,1.1,'F')})});
    y=chartY+chartH+3;
    chartSeries.forEach((series,index)=>{const color=colors[index%colors.length];doc.setFillColor(...color);doc.rect(margin+(index%3)*60,y+Math.floor(index/3)*5-2,3,3,'F');setText(6.5,MUTED);doc.text(`${series.sample.labelBase} - ${sampleProcessLabel(series.sample)}`,margin+4+(index%3)*60,y+Math.floor(index/3)*5)});
    y+=chartSeries.length>3?13:8;
  }

  // Technical analysis
  newPageIf(40);setText(11,NAVY,true);doc.text('4. Análise técnica de apoio',margin,y);y+=5;line(margin,y,pageW-margin,y);y+=6;
  for(const item of lotSummary.analyses){
    newPageIf(30);
    const {sample,analysis,formRelease}=item;
    setText(8.5,NAVY,true);doc.text(`${sample.labelBase} • ${sampleProcessLabel(sample)} • ${formatDate(sampleCollectionDate(sample))}`,margin,y);y+=4.5;
    setText(7.4,MUTED);doc.text(`Referência: ${analysis.targetMpa!==undefined?`${analysis.targetMpa.toFixed(2)} MPa`:'não configurada'}   28d: ${analysis.controlAverage!==undefined?`${analysis.controlAverage.toFixed(2)} MPa`:'aguardando'}   Reserva: ${analysis.reserveDecision}`,margin,y);y+=4;
    setText(7.4,analysis.tone==='danger'?RED:analysis.tone==='good'?GREEN:MUTED,true);doc.text(analysis.headline,margin,y);y+=4;
    setText(7.1,MUTED);const lines=wrap(analysis.summary,contentW).slice(0,3);doc.text(lines,margin,y);y+=lines.length*3.5;
    if(formRelease.applicable){setText(7.1,MUTED,true);doc.text(`Baixa idade: ${formRelease.headline}`,margin,y);y+=4}
    y+=4;line(margin,y-2,pageW-margin,y-2);
  }

  newPageIf(25);doc.setFillColor(247,249,251);doc.roundedRect(margin,y,contentW,18,2,2,'F');setText(6.8,MUTED);const disclaimer=input.clientView
    ? 'Documento de acompanhamento. Resultados formais devem ser interpretados conforme projeto, especificações, procedimentos e relatórios técnicos aprovados.'
    : 'Análise automática de apoio à gestão. A aceitação técnica, liberação de formas e descarte de CPs devem seguir projeto, contrato, procedimentos, normas aplicáveis e responsável técnico.';
  doc.text(wrap(disclaimer,contentW-8),margin+4,y+6);y+=22;

  const filename=`SOLOCONTROL_${fileSafe(input.work.name)}_Q${fileSafe(input.block)}_L${fileSafe(input.lot)}_${new Date().toISOString().slice(0,10)}.pdf`;
  const blob=doc.output('blob');
  const summaryText=`Solocontrol - ${input.work.name}\nQuadra ${input.block} / Lote ${input.lot}\nConcretagens: ${input.samples.length}\nVolume controlado: ${volume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³\nEnsaios/resultados: ${tests}\nSituação: ${lotSummary.headline}`;
  return {doc,blob,filename,summaryText};
}

export async function downloadLotTechnicalPdf(input:LotReportInput){
  const built=await buildLotTechnicalPdf(input);
  built.doc.save(built.filename);
  return built;
}

export async function shareLotTechnicalPdf(input:LotReportInput){
  const built=await buildLotTechnicalPdf(input);
  const file=new File([built.blob],built.filename,{type:'application/pdf'});
  const nav=navigator as Navigator & {canShare?:(data:ShareData)=>boolean};
  if(nav.share && (!nav.canShare || nav.canShare({files:[file]}))){
    await nav.share({title:`Relatório técnico - Q${input.block} L${input.lot}`,text:built.summaryText,files:[file]});
    return {shared:true,downloaded:false};
  }
  built.doc.save(built.filename);
  const text=`${built.summaryText}\n\nO PDF foi gerado no Solocontrol Lab. Anexe o arquivo baixado nesta conversa.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');
  return {shared:false,downloaded:true};
}
