"use client";

import { cn } from "cn";
import { Check, ChevronDown, Globe, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  COUNTRIES,
  type Country,
  getCountry,
  getCountryFlag,
  PINNED_COUNTRY_CODES,
} from "@/shared/constants/countries";

export interface CountrySelectProps {
  id?: string;
  name?: string;
  value?: string | null;
  defaultValue?: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

function removeDiacritics(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function CountrySelect({
  id,
  name,
  value: controlledValue,
  defaultValue = "VN",
  onChange,
  disabled = false,
  className,
  placeholder = "Chọn quốc gia...",
}: CountrySelectProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const [internalValue, setInternalValue] = useState<string>(
    controlledValue ?? defaultValue,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue || "VN");
    }
  }, [controlledValue]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const currentValue = (controlledValue ?? internalValue ?? "VN").toUpperCase();
  const selectedCountry = useCountry(currentValue);

  const pinnedCountries = useMemo(() => {
    return PINNED_COUNTRY_CODES.map((code) => getCountry(code)).filter(
      (c): c is Country => Boolean(c),
    );
  }, []);

  const otherCountries = useMemo(() => {
    const pinnedSet = new Set(PINNED_COUNTRY_CODES);
    return COUNTRIES.filter((c) => !pinnedSet.has(c.code));
  }, []);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return null;
    }
    const q = removeDiacritics(searchQuery.trim());
    return COUNTRIES.filter((c) => {
      const matchName = removeDiacritics(c.name).includes(q);
      const matchNameEn = removeDiacritics(c.nameEn).includes(q);
      const matchCode = c.code.toLowerCase().includes(q);
      return matchName || matchNameEn || matchCode;
    });
  }, [searchQuery]);

  const handleSelect = (code: string) => {
    setInternalValue(code);
    onChange?.(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Hidden input for HTML form submissions */}
      {name && <input type="hidden" name={name} value={currentValue} />}

      {/* Trigger Button */}
      <button
        id={inputId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex items-center justify-between w-full h-9 px-3 rounded-xl border text-xs text-left transition-all outline-none",
          "border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-50 dark:hover:bg-slate-900/60",
          "focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          isOpen && "ring-2 ring-amber-500/30 border-amber-500",
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-base leading-none select-none">
            {getCountryFlag(currentValue)}
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
            {selectedCountry ? selectedCountry.name : placeholder}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase">
            {currentValue}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 left-0 top-full mt-1.5 w-full min-w-[280px] sm:min-w-[340px] max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-popover shadow-xl shadow-slate-900/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm quốc gia (VD: Hàn, Nhật, Korea, US...)"
                className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 p-0.5 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin text-xs">
            {filteredResults !== null ? (
              /* Search results */
              filteredResults.length > 0 ? (
                <div className="space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Kết quả tìm kiếm ({filteredResults.length})
                  </div>
                  {filteredResults.map((country) => (
                    <CountryItem
                      key={country.code}
                      country={country}
                      isSelected={country.code === currentValue}
                      onSelect={() => handleSelect(country.code)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <Globe className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                  Không tìm thấy quốc gia &quot;{searchQuery}&quot;
                </div>
              )
            ) : (
              /* Default list with pinned & all countries */
              <div className="space-y-2">
                {/* Pinned section */}
                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    ★ Phổ biến / Thường gặp
                  </div>
                  <div className="space-y-0.5">
                    {pinnedCountries.map((country) => (
                      <CountryItem
                        key={country.code}
                        country={country}
                        isSelected={country.code === currentValue}
                        onSelect={() => handleSelect(country.code)}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* All other countries */}
                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Tất cả quốc gia (A – Z)
                  </div>
                  <div className="space-y-0.5">
                    {otherCountries.map((country) => (
                      <CountryItem
                        key={country.code}
                        country={country}
                        isSelected={country.code === currentValue}
                        onSelect={() => handleSelect(country.code)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function useCountry(code: string | null | undefined): Country | undefined {
  return useMemo(() => getCountry(code), [code]);
}

interface CountryItemProps {
  country: Country;
  isSelected: boolean;
  onSelect: () => void;
}

function CountryItem({ country, isSelected, onSelect }: CountryItemProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-left transition-colors",
        isSelected
          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold"
          : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300",
      )}
    >
      <div className="flex items-center gap-2 truncate">
        <span className="text-base leading-none select-none shrink-0">
          {getCountryFlag(country.code)}
        </span>
        <span className="truncate">{country.name}</span>
        {country.nameEn !== country.name && (
          <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
            ({country.nameEn})
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
          {country.code}
        </span>
        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
      </div>
    </button>
  );
}
