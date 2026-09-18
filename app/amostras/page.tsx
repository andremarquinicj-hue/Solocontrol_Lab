'use client';

import Link from 'next/link';
import { Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { deleteSample, listSamples } from '@/lib/store';
import { Sample } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useWorkScope } from '@/components/WorkScope';

export default function SamplesPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [q, setQ] = useState('');
  const [deletingId, setDeletingId] = useState<string>();
  const { selectedWorkId } = useWorkScope();

  useEffect(() => {
    listSamples().then(setSamples);
  }, []);

  const filtered = useMemo(
    () =>
      samples.filter((sample) =>
        (selectedWorkId === 'all' || sample.workId === selectedWorkId) &&
        `${sample.labelBase} ${sample.workName} ${sample.reportNumber || ''}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [samples, q, selectedWorkId],
  );

  async function removeSample(sample: Sample) {
    const confirmed = window.confirm(
      `Excluir a ficha ${sample.labelBase}?\n\n` +
        `Essa ação remove a ficha, os resultados e as imagens vinculadas a ela. ` +
        `Como o sistema ainda está em fase de testes, essa opção está liberada.`,
    );

    if (!confirmed) return;

    setDeletingId(sample.id);

    try {
      await deleteSample(sample);
      setSamples((current) => current.filter((item) => item.id !== sample.id));
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível excluir a ficha. Tente novamente.');
    } finally {
      setDeletingId(undefined);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">RASTREABILIDADE</span>
          <h1>Amostras / Ensaios</h1>
          <p>Localize rapidamente por etiqueta, obra ou relatório.</p>
        </div>

        <Link href="/lancamento" className="button primary">
          + Nova ficha
        </Link>
      </section>

      <section className="panel">
        <div className="search-box">
          <Search size={18} />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar etiqueta, obra ou relatório..."
          />
        </div>

        <div className="cards-list">
          {filtered.length === 0 && (
            <div className="empty-state">
              <b>Nenhuma ficha encontrada.</b>
              <span>Cadastre uma nova ficha ou altere os termos da busca.</span>
            </div>
          )}

          {filtered.map((sample) => (
            <div key={sample.id} className="sample-card">
              <div>
                <span className="label-kicker">ETIQUETA</span>
                <strong>{sample.labelBase}</strong>
                <small>{sample.workName}</small>
              </div>

              <div>
                <span>Moldagem</span>
                <b>{formatDate(sample.moldedAt)}</b>
              </div>

              <div>
                <span>Próxima ruptura</span>
                <b>
                  {formatDate(
                    sample.ruptures.find((rupture) => rupture.status !== 'concluido')?.dueDate,
                  )}
                </b>
              </div>

              <div>
                <span>Local físico</span>
                <b>{sample.physicalLocation}</b>
              </div>

              <span
                className={`status ${
                  sample.status === 'concluido' ? 'concluido' : 'em_execucao'
                }`}
              >
                {sample.status === 'concluido' ? 'Concluído' : 'Em andamento'}
              </span>

              <div className="sample-actions">
                <Link className="button secondary small" href={`/amostras/${sample.id}`}>
                  Abrir
                </Link>

                <button
                  type="button"
                  className="button danger small"
                  disabled={deletingId === sample.id}
                  onClick={() => removeSample(sample)}
                  title="Excluir ficha"
                >
                  <Trash2 size={15} />
                  {deletingId === sample.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
