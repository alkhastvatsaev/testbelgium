"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { MutableRefObject, Ref } from "react";
import { createPortal } from "react-dom";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadGoogleMapsScript } from "@/features/interventions/googleMapsPlacesLoader";
import { REQUESTER_GEOLOC_ADDRESS_PENDING } from "@/features/interventions/smartInterventionConstants";
import { useTranslation } from "@/core/i18n/I18nContext";

const PREDICT_DEBOUNCE_MS = 220;
const LIST_PORTAL_Z_INDEX = 200;
const MIN_INPUT_LEN = 2;
const MAX_RESULTS = 6;

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
};

type Props = {
  value: string;
  onValueChange: (next: string) => void;
  onPlaceSelect: (formattedAddress: string, latLng: { lat: number; lng: number }) => void;
  disabled?: boolean;
  className?: string;
};

type ListBoxRect = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

type GMaps = {
  maps: {
    places: {
      AutocompleteService: new () => {
        getPlacePredictions: (
          request: {
            input: string;
            componentRestrictions: { country: string | string[] };
            types?: string[];
          },
          callback: (predictions: PlacePrediction[] | null, status: string) => void,
        ) => void;
      };
      PlacesService: new (attr: HTMLElement) => {
        getDetails: (
          request: { placeId: string; fields: string[] },
          callback: (
            place: {
              formatted_address?: string;
              name?: string;
              geometry?: { location?: { lat(): number; lng(): number } };
            } | null,
            status: string,
          ) => void,
        ) => void;
      };
      PlacesServiceStatus: { OK: string };
    };
  };
};

function assignInputRef(
  node: HTMLInputElement | null,
  local: MutableRefObject<HTMLInputElement | null>,
  outer: Ref<HTMLInputElement> | undefined,
) {
  local.current = node;
  if (typeof outer === "function") outer(node);
  else if (outer && typeof outer === "object")
    (outer as MutableRefObject<HTMLInputElement | null>).current = node;
}

const SmartFormAddressAutocomplete = forwardRef<HTMLInputElement, Props>(function SmartFormAddressAutocomplete(
  { value, onValueChange, onPlaceSelect, disabled, className },
  ref,
) {
  const { t } = useTranslation();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [listBoxRect, setListBoxRect] = useState<ListBoxRect | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  const displayValue =
    value === REQUESTER_GEOLOC_ADDRESS_PENDING
      ? String(t("requester.intervention.geoloc_pending"))
      : value;

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!apiKey || input.trim().length < MIN_INPUT_LEN) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      void (async () => {
        try {
          await loadGoogleMapsScript(apiKey);
          const g = window as unknown as { google?: GMaps };
          const google = g.google;
          if (!google?.maps?.places?.AutocompleteService) {
            setPredictions([]);
            setLoading(false);
            return;
          }

          const service = new google.maps.places.AutocompleteService();
          const OK = google.maps.places.PlacesServiceStatus?.OK ?? "OK";
          service.getPlacePredictions(
            {
              input: input.trim(),
              componentRestrictions: { country: ["be"] },
              types: ["address"],
            },
            (preds, status) => {
              if (status !== OK || !preds?.length) {
                setPredictions([]);
              } else {
                setPredictions(preds.slice(0, MAX_RESULTS) as PlacePrediction[]);
              }
              setLoading(false);
            },
          );
        } catch {
          setPredictions([]);
          setLoading(false);
        }
      })();
    },
    [apiKey],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const scheduleFetch = (input: string) => {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    if (input.trim().length < MIN_INPUT_LEN) {
      setPredictions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(() => fetchPredictions(input), PREDICT_DEBOUNCE_MS);
  };

  const resolvePlace = (prediction: PlacePrediction) => {
    if (!apiKey) return;
    void (async () => {
      try {
        await loadGoogleMapsScript(apiKey);
        const g = window as unknown as { google?: GMaps };
        const google = g.google;
        if (!google?.maps?.places?.PlacesService) return;

        const dummy = document.createElement("div");
        const placesService = new google.maps.places.PlacesService(dummy);
        const OK = google.maps.places.PlacesServiceStatus?.OK ?? "OK";

        placesService.getDetails(
          { placeId: prediction.place_id, fields: ["formatted_address", "geometry", "name"] },
          (place, status) => {
            if (status !== OK || !place?.geometry?.location) return;
            const loc = place.geometry.location;
            const lat = loc.lat();
            const lng = loc.lng();
            const label = place.formatted_address?.trim() || place.name?.trim() || prediction.description;
            onPlaceSelect(label, { lat, lng });
            setOpen(false);
            setPredictions([]);
            setActiveIdx(-1);
            inputRef.current?.focus();
          },
        );
      } catch {
        /* ignore */
      }
    })();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || predictions.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1 >= predictions.length ? 0 : i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? predictions.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter" && activeIdx >= 0 && predictions[activeIdx]) {
      e.preventDefault();
      resolvePlace(predictions[activeIdx]);
    }
  };

  const showList = open && predictions.length > 0 && Boolean(apiKey);

  const syncListBoxRect = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const top = r.bottom + gap;
    const maxH = Math.max(120, Math.min(256, window.innerHeight - top - 12));
    setListBoxRect({ left: r.left, top, width: r.width, maxHeight: maxH });
  }, []);

  useLayoutEffect(() => {
    if (!showList) {
      setListBoxRect(null);
      return;
    }
    syncListBoxRect();
    const onSync = () => syncListBoxRect();
    window.addEventListener("resize", onSync);
    document.addEventListener("scroll", onSync, true);
    return () => {
      window.removeEventListener("resize", onSync);
      document.removeEventListener("scroll", onSync, true);
    };
  }, [showList, syncListBoxRect, predictions]);

  const suggestionList =
    showList && listBoxRect ? (
      <ul
        id={listId}
        data-testid="smart-form-address-suggestions"
        role="listbox"
        className="box-border max-h-64 overflow-auto rounded-[16px] border border-slate-200/80 bg-white/95 py-1.5 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.22),0_0_0_1px_rgba(15,23,42,0.04)] backdrop-blur-md"
        style={{
          position: "fixed",
          left: listBoxRect.left,
          top: listBoxRect.top,
          width: listBoxRect.width,
          maxHeight: listBoxRect.maxHeight,
          zIndex: LIST_PORTAL_Z_INDEX,
        }}
      >
        {predictions.map((p, i) => {
          const main = p.structured_formatting?.main_text ?? p.description;
          const sub = p.structured_formatting?.secondary_text;
          const active = i === activeIdx;
          return (
            <li key={p.place_id} role="presentation">
              <button
                type="button"
                role="option"
                id={`${listId}-opt-${i}`}
                aria-selected={active}
                data-testid={`smart-form-address-prediction-${i}`}
                className={cn(
                  "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
                  active ? "bg-slate-900/[0.06]" : "hover:bg-slate-50",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => resolvePlace(p)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold leading-snug text-slate-900">
                    {main}
                  </span>
                  {sub ? (
                    <span className="mt-0.5 block truncate text-sm font-medium leading-snug text-slate-500">
                      {sub}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div className={cn("relative w-full", className)}>
      <input
        ref={(node) => assignInputRef(node, inputRef, ref)}
        data-testid="smart-form-address"
        value={displayValue}
        disabled={disabled}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
          scheduleFetch(e.target.value);
        }}
        onFocus={() => {
          setOpen(true);
          scheduleFetch(value === REQUESTER_GEOLOC_ADDRESS_PENDING ? "" : value);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            setActiveIdx(-1);
          }, 120);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={activeIdx >= 0 ? `${listId}-opt-${activeIdx}` : undefined}
        placeholder={t("smart_form.address_placeholder")}
        autoComplete="off"
        className="w-full rounded-[14px] border border-black/[0.06] bg-white/95 py-3 pl-3 pr-12 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-medium focus-visible:ring-2 focus-visible:ring-slate-900/15 disabled:opacity-50"
      />

      {apiKey && loading ? (
        <span
          className="pointer-events-none absolute right-14 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-slate-400"
          aria-hidden
        >
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      ) : null}

      {typeof document !== "undefined" && suggestionList
        ? createPortal(suggestionList, document.body)
        : null}
    </div>
  );
});

SmartFormAddressAutocomplete.displayName = "SmartFormAddressAutocomplete";

export default SmartFormAddressAutocomplete;
