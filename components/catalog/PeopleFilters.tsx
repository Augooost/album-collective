"use client";

import { useState } from "react";

export type Person = { id: string; name: string | null; image: string | null };

export function usePeopleFilter(initialSelection: string[] = []) {
  const [selected, setSelected] = useState(initialSelection);
  const [showPeople, setShowPeople] = useState(true);

  function togglePerson(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((person) => person !== id) : [...current, id]);
  }

  return { selected, setSelected, showPeople, setShowPeople, togglePerson };
}

export function PeopleToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button className="catalog-filter-pill people-toggle" type="button" aria-label="Show people filters"
      aria-pressed={open} aria-controls="catalog-people" onClick={onToggle}
      title={open ? "Hide people filters" : "Show people filters"}>
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M13.3 15.7H3v-1a3.4 3.4 0 0 1 3.4-3.4h3.5a3.4 3.4 0 0 1 3.4 3.4v1ZM15.1 11.5a3.4 3.4 0 0 1 1.9 3v1.2h-1.6M13.4 4.9a2.4 2.4 0 0 1 0 4.6"
          stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.15" cy="7.15" r="2.25" stroke="currentColor" strokeWidth="1.35" />
      </svg>
    </button>
  );
}

type Props = {
  people: Person[];
  viewerId: string;
  selected: string[];
  open: boolean;
  onToggle: (id: string) => void;
};

export function PeopleRow({ people, viewerId, selected, open, onToggle }: Props) {
  return (
    <div className="catalog-people" id="catalog-people" role="group" aria-label="Filter by people" hidden={!open}>
      {people.map((person) => {
        const name = person.name || (person.id === viewerId ? "You" : "Member");
        return (
          <button key={person.id} type="button" className="people-chip" aria-pressed={selected.includes(person.id)}
            onClick={() => onToggle(person.id)} title={name}>
            <span className="people-avatar" aria-hidden="true">
              <span>{name.charAt(0).toUpperCase()}</span>
              {person.image && <img src={person.image} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
            </span>
            <span>{name}</span>
          </button>
        );
      })}
    </div>
  );
}
