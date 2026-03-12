"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function TopSearchBar({ value, onChange }: Props) {
  return (
    <div className="catalog-search-wrap">
      <img
        src="/design-reference/icons/search.svg"
        alt=""
        aria-hidden="true"
        className="catalog-search-icon"
      />
      <input
        className="catalog-search-input"
        placeholder="Search or Paste Album"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
