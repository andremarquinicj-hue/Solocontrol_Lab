'use client';

import { useParams, useRouter } from 'next/navigation';
import { Camera, CheckCircle2, FileImage, Printer, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PhotoCapture from '@/components/PhotoCapture';
import { deleteSample, getSample, saveSample, uploadEvidence } from '@/lib/store';
import { PhotoEvidence, RuptureEvent, Sample } from '@/lib/types';
import { formatDate, physicalLocationByDate, pressureMpa } from '@/lib/utils';

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [sample, setSample] = useState<Sample>();
  const [active, setActive] = useState<string>();
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [load, setLoad] = useState('');
  const [unit, setUnit] = useState<'kN' | 'tf' | 'kgf' | 'N'>('kN');
  const [diameter, setDiameter] = useState('100');
  const [height, setHeight] = useState('200');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getSample(id).then((found) => {
      setSample(found);
      setActive(found?.ruptures.find((rupture) => rupture.status !== 'concluido')?.id);
    });
  }, [id]);

  const rupture = sample?.ruptures.find((item) => item.id === active);

  const calc = useMemo(
    () => pressureMpa(Number(load), unit, Number(diameter)),
    [load, unit, diameter],
  );

  if (!sample) {
    return <div className="panel">Carregando amostra...</div>;
  }

  async function finish() {
    const currentSample = sample;
    const currentRupture = rupture;

    if (
      !currentSample ||
      !currentRupture ||
      !files.rompimento ||
      !files.prensa ||
      !files.cpFinal ||
      !load ||
      !diameter
    ) {
      return;
    }

    setSaving(true);

    try {
      const photos: PhotoEvidence[] = [];

      for (const key of ['rompimento', 'prensa', 'cpFinal'] as const) {
        const file = files[key];
        if (!file) continue;

        const url = await uploadEvidence(
          file,
          `samples/${currentSample.id}/ruptura-${currentRupture.ageDays}`,
        );

        photos.push({
          key,
          url,
          name: key,
          createdAt: new Date().toISOString(),
        });
      }

      const updatedRupture: RuptureEvent = {
        ...currentRupture,
        status: 'concluido',
        load: Number(load),
        loadUnit: unit,
        diameterMm: Number(diameter),
        heightMm: Number(height),
        resistanceMpa: calc,
        completedAt: new Date().toISOString(),
        photos: [...currentRupture.photos, ...photos],
      };

      const ruptures = currentSample.ruptures.map((item) =>
        item.id === currentRupture.id ? updatedRupture : item,
      );

      const next = ruptures.find((item) => item.status !== 'concluido');

      const updated: Sample = {
        ...currentSample,
        ruptures,
        physicalLocation: next ? physicalLocationByDate(next.dueDate) : 'Arquivo Encerrado',
        status: next ? 'em_andamento' : 'concluido',
        updatedAt: new Date().toISOString(),
      };

      await saveSample(updated);

      setSample(updated);
      setFiles({});
      setLoad('');
      setActive(next?.id);
    } finally {
      setSaving(false);
    }
  }

  async function removeCurrentSample() {
    const currentSample = sample;

    if (!currentSample) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a ficha ${currentSample.labelBase}?\n\n` +
        `Serão removidos os dados da ficha, rupturas, resultados e imagens vinculadas. ` +
        `Essa ação não pode ser desfeita.`,
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      await deleteSample(currentSample);
      router.push('/amostras');
      router.refresh();
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível excluir a ficha. Tente novamente.');
      setDeleting(false);
    }
  }

  const stages = [
    { label: 'Recebimento', date: sample.receivedAt, done: true },
    { label: 'Moldagem', date: sample.moldedAt, done: true },
    ...sample.ruptures.map((item) => ({
      label: `Ruptura ${item.ageDays} dias`,
      date: item.dueDate,
      done: item.status === 'concluido',
    })),
    {
      label: 'Relatório final',
      date: '',
      done: sample.status === 'concluido',
    },
  ];

  return (
    <div className="page-stack print-area">
      <section className="page-heading no-print">
        <div>
          <span className="eyebrow">AMOSTRA {sample.labelBase}</span>
          <h1>Rastreabilidade da amostra</h1>
          <p>
            {sample.workName} • {sample.cpQuantity} CPs
          </p>
        </div>

        <div className="heading-actions">
          <button className="button secondary" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir
          </button>

          <button
            className="button danger"
            disabled={deleting}
            onClick={removeCurrentSample}
          >
            <Trash2 size={16} />
            {deleting ? 'Excluindo...' : 'Excluir ficha'}
          </button>
        </div>
      </section>

      <section className="panel trace-head">
        <div>
          <span>Etiqueta</span>
          <strong>{sample.labelBase}</strong>
          <small>{sample.cpLabels.join(' • ')}</small>
        </div>

        <div>
          <span>Obra</span>
          <b>{sample.workName}</b>
          <small>Moldagem: {formatDate(sample.moldedAt)}</small>
        </div>

        <div>
          <span>Local físico da ficha</span>
          <b>{sample.physicalLocation}</b>
          <small>Atualizado pelo fluxo</small>
        </div>
      </section>

      <section className="panel">
        <div className="timeline">
          {stages.map((stage, index) => (
            <div key={index} className={stage.done ? 'done' : ''}>
              <span>
                {stage.done ? <CheckCircle2 size={16} /> : index + 1}
              </span>
              <b>{stage.label}</b>
              <small>{stage.date ? formatDate(stage.date) : 'Após encerramento'}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Evidências iniciais</h2>
            <p>Imagens obrigatórias registradas no cadastro.</p>
          </div>
          <FileImage />
        </div>

        <div className="evidence-strip">
          {sample.photos.map((photo) => (
            <figure key={`${photo.key}-${photo.url}`}>
              <img src={photo.url} alt={photo.name} />
              <figcaption>{photo.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="two-columns rupture-work no-print">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Lançar ruptura</h2>
              <p>Selecione uma idade e registre resultado + evidências.</p>
            </div>
          </div>

          <div className="rupture-tabs">
            {sample.ruptures.map((item) => (
              <button
                key={item.id}
                className={`${active === item.id ? 'active' : ''} ${
                  item.status === 'concluido' ? 'completed' : ''
                }`}
                onClick={() => setActive(item.id)}
              >
                {item.ageDays} dias
                <small>{formatDate(item.dueDate)}</small>
              </button>
            ))}
          </div>

          {rupture?.status === 'concluido' ? (
            <div className="success-box">
              <CheckCircle2 />
              <b>Ruptura concluída</b>
              <span>
                {rupture.resistanceMpa?.toFixed(2)} MPa • {rupture.load}{' '}
                {rupture.loadUnit}
              </span>
            </div>
          ) : (
            <>
              <div className="form-grid compact">
                <label>
                  Carga da prensa *
                  <input
                    type="number"
                    step="0.01"
                    value={load}
                    onChange={(event) => setLoad(event.target.value)}
                  />
                </label>

                <label>
                  Unidade *
                  <select
                    value={unit}
                    onChange={(event) =>
                      setUnit(event.target.value as 'kN' | 'tf' | 'kgf' | 'N')
                    }
                  >
                    <option>kN</option>
                    <option>tf</option>
                    <option>kgf</option>
                    <option>N</option>
                  </select>
                </label>

                <label>
                  Diâmetro CP (mm) *
                  <input
                    type="number"
                    value={diameter}
                    onChange={(event) => setDiameter(event.target.value)}
                  />
                </label>

                <label>
                  Altura CP (mm)
                  <input
                    type="number"
                    value={height}
                    onChange={(event) => setHeight(event.target.value)}
                  />
                </label>
              </div>

              <div className="result-preview">
                <span>Resultado preliminar</span>
                <strong>{calc ? calc.toFixed(2) : '—'} MPa</strong>
                <small>Força ÷ área circular. Conferência técnica obrigatória.</small>
              </div>

              <div className="photo-grid three">
                <PhotoCapture
                  label="Foto do rompimento"
                  value={files.rompimento}
                  onChange={(file) => setFiles({ ...files, rompimento: file })}
                />
                <PhotoCapture
                  label="Foto da prensa"
                  value={files.prensa}
                  onChange={(file) => setFiles({ ...files, prensa: file })}
                />
                <PhotoCapture
                  label="Foto final do CP"
                  value={files.cpFinal}
                  onChange={(file) => setFiles({ ...files, cpFinal: file })}
                />
              </div>

              <button
                className="button primary full"
                disabled={
                  saving ||
                  !files.rompimento ||
                  !files.prensa ||
                  !files.cpFinal ||
                  !load ||
                  !diameter
                }
                onClick={finish}
              >
                {saving ? 'Salvando...' : 'Concluir ruptura e mover ficha'}
              </button>
            </>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Histórico das rupturas</h2>
              <p>Dados consolidados desta amostra.</p>
            </div>
            <Camera />
          </div>

          <div className="history-list">
            {sample.ruptures.map((item) => (
              <div key={item.id}>
                <div>
                  <b>{item.ageDays} dias</b>
                  <span>{formatDate(item.dueDate)}</span>
                </div>

                <div>
                  <span className={`status ${item.status}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                  {item.resistanceMpa && (
                    <strong>{item.resistanceMpa.toFixed(2)} MPa</strong>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="report-sheet">
        <div className="report-brand">
          <img src="/logo-solocontrol.png" alt="Solocontrol" />
          <div>
            <h2>Relatório Gerencial da Amostra</h2>
            <span>Solocontrol Lab</span>
          </div>
        </div>

        <div className="report-grid">
          <div>
            <span>Obra</span>
            <b>{sample.workName}</b>
          </div>
          <div>
            <span>Etiqueta</span>
            <b>{sample.labelBase}</b>
          </div>
          <div>
            <span>Moldagem</span>
            <b>{formatDate(sample.moldedAt)}</b>
          </div>
          <div>
            <span>Tipo</span>
            <b>{sample.sampleType}</b>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Idade</th>
              <th>Data</th>
              <th>Carga</th>
              <th>Resultado</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {sample.ruptures.map((item) => (
              <tr key={item.id}>
                <td>{item.ageDays} dias</td>
                <td>{formatDate(item.dueDate)}</td>
                <td>{item.load ? `${item.load} ${item.loadUnit}` : '—'}</td>
                <td>
                  {item.resistanceMpa
                    ? `${item.resistanceMpa.toFixed(2)} MPa`
                    : '—'}
                </td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="report-note">
          Relatório gerencial do sistema. A emissão técnica oficial deve seguir os
          procedimentos e aprovações internas da Solocontrol.
        </p>
      </section>
    </div>
  );
}
