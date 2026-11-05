"use client";

import { useMemo, useState } from "react";

import { AlbumCard } from "@/components/catalog/AlbumCard";
import { FilterPill } from "@/components/catalog/FilterPill";
import { CatalogFrame } from "@/components/catalog/CatalogFrame";
import { EntryDetailSheet } from "@/components/item/EntryDetailSheet";

type CatalogEntry = {
  id: string;
  spotifyType: "TRACK" | "ALBUM" | "PLAYLIST";
  spotifyId: string;
  title: string;
  subtitle: string | null;
  artistName: string | null;
  releaseDate: string | null;
  imageUrl: string | null;
  spotifyUrl: string;
  entryKind: "TRACK" | "ALBUM" | "EP" | "PLAYLIST";
  addedAt: string | Date;
};

type Props = {
  entries: CatalogEntry[];
  userImage: string | null;
};

const PAGE_SIZE = 18;

function yearFromReleaseDate(releaseDate: string | null, addedAt: string | Date): string {
  if (releaseDate && releaseDate.length >= 4) {
    return releaseDate.slice(0, 4);
  }
  return new Date(addedAt).getFullYear().toString();
}

export function CatalogShell({ entries, userImage }: Props) {
  const [search, setSearch] = useState("");
  const [itemType, setItemType] = useState("all");
  const [year, setYear] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [density, setDensity] = useState(5);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);

  const years = useMemo(() => {
    return Array.from(
      new Set(entries.map((entry) => yearFromReleaseDate(entry.releaseDate, entry.addedAt)))
    ).sort((a, b) => Number(b) - Number(a));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = entries.filter((entry) => {
      if (itemType !== "all" && entry.entryKind.toLowerCase() !== itemType) {
        return false;
      }

      const entryYear = yearFromReleaseDate(entry.releaseDate, entry.addedAt);
      if (year !== "all" && entryYear !== year) {
        return false;
      }

      if (!q) {
        return true;
      }

      return [entry.title, entry.artistName ?? entry.subtitle ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    if (sortBy === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "oldest") {
      list.sort((a, b) => +new Date(a.addedAt) - +new Date(b.addedAt));
    } else {
      list.sort((a, b) => +new Date(b.addedAt) - +new Date(a.addedAt));
    }

    return list;
  }, [entries, itemType, search, sortBy, year]);

  const visibleEntries = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleEntries.length;

  function resetFilters() {
    setSearch("");
    setItemType("all");
    setYear("all");
    setSortBy("recent");
    setDensity(5);
  }

  const gridStyle = {
    gridTemplateColumns: `repeat(${density}, minmax(0, 1fr))`
  };

  return (
    <CatalogFrame userImage={userImage} search={search} onSearchChange={setSearch}>
      <section className="catalog-filter-row">
        <FilterPill>
          <img src="/design-reference/icons/album.svg" alt="" aria-hidden="true" className="catalog-pill-icon" />
          <select value={itemType} onChange={(event) => setItemType(event.target.value)}>
            <option value="all">Albums</option>
            <option value="album">Album</option>
            <option value="ep">EP</option>
            <option value="track">Track</option>
          </select>
        </FilterPill>

        <FilterPill>
          <img src="/design-reference/icons/date.svg" alt="" aria-hidden="true" className="catalog-pill-icon" />
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">Any Year</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FilterPill>

        <FilterPill>
          <img src="/design-reference/icons/rating.svg" alt="" aria-hidden="true" className="catalog-pill-icon" />
          <select defaultValue="any">
            <option value="any">Any Rating</option>
          </select>
        </FilterPill>

        <FilterPill>
          <img src="/design-reference/icons/filter.svg" alt="" aria-hidden="true" className="catalog-pill-icon" />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title</option>
          </select>
        </FilterPill>

        <div className="catalog-grow" />

        <FilterPill>
          <div className="catalog-density">
            <img src="/design-reference/icons/grid-sm.svg" alt="" aria-hidden="true" className="catalog-grid-icon" />
            <input
              type="range"
              min={2}
              max={7}
              value={density}
              onChange={(event) => setDensity(Number(event.target.value))}
            />
            <img src="/design-reference/icons/grid-lg.svg" alt="" aria-hidden="true" className="catalog-grid-icon" />
          </div>
        </FilterPill>

        <button className="catalog-reset" type="button" onClick={resetFilters}>
          Reset
        </button>
      </section>

      <section className="catalog-content">
        <h2>Albums</h2>
        <div className="catalog-grid" style={gridStyle}>
          {visibleEntries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="catalog-card-button"
              onClick={() => setSelectedEntry(entry)}
            >
              <AlbumCard
                title={entry.title}
                artist={entry.artistName ?? entry.subtitle ?? "Unknown Artist"}
                year={yearFromReleaseDate(entry.releaseDate, entry.addedAt)}
                imageUrl={entry.imageUrl}
              />
            </button>
          ))}
        </div>

        <div className="catalog-load-wrap">
          {hasMore ? (
            <button
              className="catalog-load-more"
              type="button"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              Load More
            </button>
          ) : null}
        </div>
      </section>
      <EntryDetailSheet key={selectedEntry ? `${selectedEntry.spotifyType}:${selectedEntry.spotifyId}` : "closed"}
        item={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </CatalogFrame>
  );
}
