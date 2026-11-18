'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronRight,
  Clock,
  HeartPulse,
  Lock,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { cycleState, formatDate } from '@/lib/analytics';
import styles from '@/components/native-prototype.module.css';

function AvaliarHubContent() {
  const { data } = useApp();

  const activeCycle = useMemo(() => {
    return data.cycles.find(c => cycleState(c) === 'Em andamento');
  }, [data.cycles]);

  const lastClosedCycle = useMemo(() => {
    const closed = data.cycles.filter(c => cycleState(c) === 'Encerrado');
    return closed.sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  }, [data.cycles]);

  return (
    <div className={styles.portal}>
      <aside className={styles.portalAside}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}><HeartPulse size={24} /></span>
          <span>Cardiofitness <small>Gestão de Pessoas</small></span>
        </div>

        <div className={styles.asideCenter}>
          <div className={styles.asideEyebrow}>PORTAL DE AVALIAÇÕES</div>
          <h1>Avaliação de Desempenho</h1>
          <p>
            Escolha o formulário que deseja responder. Todas as avaliações utilizam a escala oficial de 1 a 4 e são computadas diretamente no ciclo ativo.
          </p>

          <div className={styles.asidePill}>
            <ShieldCheck size={16} />
            <span>Dois formulários oficiais · Selecione seu nome para responder</span>
          </div>
        </div>

        <div className={styles.asideFooter}>
          © {new Date().getFullYear()} Cardiofitness · Cardiologia e Medicina Preventiva
        </div>
      </aside>

      <main className={styles.portalMain} style={{ justifyContent: 'center' }}>
        <div className={styles.formShell} style={{ maxWidth: 680 }}>
          {!activeCycle ? (
            <div style={{ background: '#fff', border: '1px solid #fee4e2', borderRadius: 16, padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3f2', color: '#b42318', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                <Lock size={30} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#101828', marginBottom: 10 }}>
                Período de Avaliação Encerrado
              </h2>
              <p style={{ color: '#475467', fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 24px' }}>
                Não há ciclo de avaliação ativo no momento. As avaliações estão disponíveis exclusivamente durante as datas estabelecidas pelo RH da Cardiofitness.
              </p>
              {lastClosedCycle && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '10px 18px', borderRadius: 8, fontSize: 13, color: '#64748b' }}>
                  <Clock size={16} />
                  <span>Último ciclo encerrado em <b>{formatDate(lastClosedCycle.endDate)}</b> ({lastClosedCycle.name})</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ background: '#f0f7fd', border: '1px solid #c5def1', borderRadius: 12, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <b style={{ color: '#0573b9', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarDays size={18} /> {activeCycle.name}
                  </b>
                  <span style={{ fontSize: 13, color: '#475467', display: 'block', marginTop: 2 }}>
                    Período aberto até <b>{formatDate(activeCycle.endDate)}</b>
                  </span>
                </div>
                <span style={{ background: '#ecfdf5', color: '#067647', border: '1px solid #a6f4c5', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  ● Ciclo Aberto
                </span>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
                  Selecione o Formulário
                </h2>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                  Clique no formulário correspondente. Na tela seguinte, basta selecionar seu nome na lista.
                </p>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {/* Cartão 1: Avaliação de Líderes */}
                <Link
                  href="/avaliacao-de-lideres"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '24px',
                    borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e0f2fe', color: '#0284c7', display: 'grid', placeItems: 'center' }}>
                      <UserCheck size={26} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0284c7' }}>
                        Formulário 1
                      </span>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '2px 0 4px' }}>
                        Avaliação de Líderes
                      </h3>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                        Avalie o suporte, comunicação e desempenho da liderança do seu setor.
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={22} style={{ color: '#94a3b8', flexShrink: 0 }} />
                </Link>

                {/* Cartão 2: Avaliação da Equipe */}
                <Link
                  href="/avaliacao-da-equipe"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '24px',
                    borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
                      <Users size={26} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#16a34a' }}>
                        Formulário 2
                      </span>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '2px 0 4px' }}>
                        Avaliação e Autoavaliação da Equipe
                      </h3>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                        Autoavaliação individual e avaliação de cooperação entre colegas do mesmo setor.
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={22} style={{ color: '#94a3b8', flexShrink: 0 }} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AvaliarPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>}>
      <AvaliarHubContent />
    </Suspense>
  );
}
