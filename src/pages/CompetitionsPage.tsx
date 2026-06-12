import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Shell } from '../components/Shell';
import { useCompetitionStore } from '../store/useCompetitionStore';
import { useAuthStore } from '../store/useAuthStore';
import type { CompetitionSettings, QualifyMode } from '../lib/types';

export function CompetitionsPage() {
  const navigate = useNavigate();
  const competitions = useCompetitionStore((s) => s.competitions);
  const fetchCompetitions = useCompetitionStore((s) => s.fetchCompetitions);
  const createCompetition = useCompetitionStore((s) => s.createCompetition);
  const deleteCompetition = useCompetitionStore((s) => s.deleteCompetition);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [qualifyMode, setQualifyMode] = useState<QualifyMode>('top2');

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const settings: CompetitionSettings = {
      groupCount: Number(data.get('groupCount')),
      meetingsPerPair: Number(data.get('meetingsPerPair')) === 2 ? 2 : 1,
      qualifyMode,
      knockoutLegs: Number(data.get('knockoutLegs')) === 2 ? 2 : 1,
      potCount: Number(data.get('potCount')),
    };
    if (qualifyMode === 'top2_plus_best_thirds') {
      settings.bestThirdsCount = Number(data.get('bestThirdsCount'));
    }
    const name = String(data.get('name')).trim();
    const description = String(data.get('description')).trim() || undefined;
    const competition = await createCompetition(name, description, settings);
    navigate(`/competition/${competition.id}`);
  }

  async function handleDelete(id: string) {
    if (confirm('Hapus competition ini beserta seluruh peserta dan match-nya?')) {
      await deleteCompetition(id);
    }
  }

  return (
    <Shell active="competitions" title="Competitions">
      {isAdmin ? (
        <section className="card">
          <h2>Buat competition</h2>
          <form className="form-grid" onSubmit={handleCreate}>
            <div className="field">
              <label>Nama</label>
              <input name="name" required placeholder="Piala Dunia Mini" />
            </div>
            <div className="field">
              <label>Jumlah grup</label>
              <input name="groupCount" type="number" min={1} defaultValue={4} required />
            </div>
            <div className="field">
              <label>Jumlah pot</label>
              <input name="potCount" type="number" min={1} defaultValue={4} required />
            </div>
            <div className="field">
              <label>Pertemuan per pasangan</label>
              <select name="meetingsPerPair" defaultValue="1">
                <option value="1">Sekali</option>
                <option value="2">Kandang & tandang</option>
              </select>
            </div>
            <div className="field">
              <label>Mode kualifikasi</label>
              <select value={qualifyMode} onChange={(e) => setQualifyMode(e.target.value as QualifyMode)}>
                <option value="top1">Juara grup saja</option>
                <option value="top2">2 teratas tiap grup</option>
                <option value="top2_plus_best_thirds">2 teratas + best third</option>
              </select>
            </div>
            {qualifyMode === 'top2_plus_best_thirds' ? (
              <div className="field">
                <label>Jumlah best third</label>
                <input name="bestThirdsCount" type="number" min={1} defaultValue={4} required />
              </div>
            ) : null}
            <div className="field">
              <label>Leg knockout</label>
              <select name="knockoutLegs" defaultValue="1">
                <option value="1">1 leg</option>
                <option value="2">2 leg (agregat)</option>
              </select>
            </div>
            <div className="field">
              <label>Deskripsi</label>
              <input name="description" placeholder="Opsional" />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <button className="btn primary" type="submit">Buat</button>
            </div>
          </form>
        </section>
      ) : null}

      <section style={{ marginTop: 18 }}>
        {competitions.length ? (
          <div className="grid">
            {competitions.map((c) => (
              <article className="card" key={c.id}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h2>{c.name}</h2>
                  <Badge status={c.status} />
                </div>
                <p className="muted">{c.description || 'Tanpa deskripsi'}</p>
                <div className="row">
                  <span className="badge">{c.settings.groupCount} grup</span>
                  <span className="badge">{c.settings.knockoutLegs} leg</span>
                </div>
                <div className="actions">
                  <button className="btn primary" type="button" onClick={() => navigate(`/competition/${c.id}`)}>
                    Buka
                  </button>
                  {isAdmin ? (
                    <button className="btn danger" type="button" onClick={() => handleDelete(c.id)}>
                      Hapus
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">Belum ada competition. Buat satu untuk memulai.</div>
        )}
      </section>
    </Shell>
  );
}
