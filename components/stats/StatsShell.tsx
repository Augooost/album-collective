"use client";

import { useMemo, useState } from "react";

import { FilterPill } from "@/components/catalog/FilterPill";
import { CatalogFrame } from "@/components/catalog/CatalogFrame";

type StatsEntry = {
  entryKind: "TRACK" | "ALBUM" | "EP" | "PLAYLIST";
  subtitle: string | null;
  addedAt: string | Date;
};

type Props = {
  entries: StatsEntry[];
  userImage: string | null;
};

export function StatsShell({ entries, userImage }: Props) {
  const [search, setSearch] = useState("");

  const insights = useMemo(() => {
    const totals = entries.reduce(
      (acc, entry) => {
        acc[entry.entryKind] += 1;
        return acc;
      },
      { TRACK: 0, ALBUM: 0, EP: 0, PLAYLIST: 0 }
    );

    const byMonth = entries.reduce<Record<string, number>>((acc, entry) => {
      const date = new Date(entry.addedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const topArtists = Object.entries(
      entries.reduce<Record<string, number>>((acc, entry) => {
        if (!entry.subtitle) {
          return acc;
        }

        acc[entry.subtitle] = (acc[entry.subtitle] ?? 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const monthBars = Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);

    return {
      totals,
      topArtists,
      monthBars
    };
  }, [entries]);

  const filteredTopArtists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return insights.topArtists;
    }

    return insights.topArtists.filter(([name]) => name.toLowerCase().includes(q));
  }, [insights.topArtists, search]);

  const maxMonthValue = Math.max(1, ...insights.monthBars.map(([, count]) => count));

  return (
    <CatalogFrame userImage={userImage} search={search} onSearchChange={setSearch}>
      <section className="catalog-filter-row">
        <FilterPill>
          <span className="home-chip-label">Insights</span>
        </FilterPill>
        <FilterPill>
          <span className="home-chip-label">Last 6 Months</span>
        </FilterPill>
        <FilterPill>
          <span className="home-chip-label">{entries.length} Total Saves</span>
        </FilterPill>
      </section>

      <section className="catalog-content stack">
        <h2>Stats Dashboard</h2>

        <div className="stats-summary-grid">
          <article className="catalog-album-card stats-card">
            <p className="kicker">Tracks</p>
            <h3>{insights.totals.TRACK}</h3>
          </article>
          <article className="catalog-album-card stats-card">
            <p className="kicker">EPs</p>
            <h3>{insights.totals.EP}</h3>
          </article>
          <article className="catalog-album-card stats-card">
            <p className="kicker">Albums</p>
            <h3>{insights.totals.ALBUM}</h3>
          </article>
          <article className="catalog-album-card stats-card">
            <p className="kicker">Playlists</p>
            <h3>{insights.totals.PLAYLIST}</h3>
          </article>
        </div>

        <div className="stats-detail-grid">
          <article className="catalog-album-card stats-panel">
            <h3>Monthly Activity</h3>
            <div className="stats-bars">
              {insights.monthBars.map(([month, count]) => (
                <div key={month} className="stats-bar-row">
                  <span>{month}</span>
                  <div className="stats-bar-track">
                    <div
                      className="stats-bar-fill"
                      style={{ width: `${Math.max(8, (count / maxMonthValue) * 100)}%` }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="catalog-album-card stats-panel">
            <h3>Top Artists / Owners</h3>
            {filteredTopArtists.length === 0 ? (
              <p className="muted">No matching artists.</p>
            ) : (
              <ul className="stats-list">
                {filteredTopArtists.map(([name, count]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </CatalogFrame>
  );
}
