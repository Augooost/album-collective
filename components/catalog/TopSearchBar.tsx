"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>;
  disabled?: boolean;
};

export function TopSearchBar({ value, onChange, onPaste, disabled = false }: Props) {
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
        aria-label="Search or paste album"
        placeholder="Search or Paste Album"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onPaste={onPaste}
      />
    </div>
  );
}
