import Link from "next/link";
import { formatRef } from "@/lib/books";
import { festivalDate } from "@/lib/format";
import { ChiasmLadder } from "./ChiasmLadder";

type D = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any


function refLink(ref: string) {
  const [a, b] = ref.split("-");
  const label = b ? `${formatRef(a)}–${b.split(".").slice(a.split(".")[0] === b.split(".")[0] && a.split(".")[1] === b.split(".")[1] ? 2 : 1).join(":")}` : formatRef(a);
  return (
    <Link key={ref} href={`/verse/${a}`} className="underline decoration-dotted underline-offset-2 hover:text-accent">
      {label}
    </Link>
  );
}

export function RefList({ refs }: { refs: string[] }) {
  if (!refs?.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
      {refs.map((r) => refLink(r))}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Views({ title, views }: { title: string; views?: D[] }) {
  if (!views?.length) return null;
  return (
    <div className="mt-6">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
        {views.map((v, i) => (
          <li key={i} className="p-3">
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold">{v.view}</span>
              {v.range && <span className="text-sm text-muted">{v.range}</span>}
              {v.consensus && v.consensus !== "n/a" && (
                <span className="rounded-full border border-border px-2 text-xs text-muted">{v.consensus}</span>
              )}
            </p>
            {(v.arguments || v.support) && <p className="mt-1 max-w-prose text-sm">{v.arguments ?? v.support}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Kind-specific facts drawn from an entry's structured data. */
export function EntryData({ kind, data }: { kind: string; data: D }) {
  switch (kind) {
    case "book":
      return (
        <div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Fact label="Genre">{data.genre}</Fact>
            <Fact label="Traditional author">{data.author_traditional}</Fact>
            <Fact label="Audience">{data.audience}</Fact>
            <Fact label="Setting">{data.setting}</Fact>
          </dl>
          <Views title="Who wrote it: the range of views" views={data.author_views} />
          <Views title="When it was written: the range of views" views={data.date_views} />
          {data.outline?.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold">Outline</h3>
              <ol className="mt-2 space-y-1">
                {data.outline.map((o: D, i: number) => (
                  <li key={i} className="grid grid-cols-[minmax(7rem,10rem)_1fr] gap-3 text-sm">
                    <span>{o.ref ? refLink(o.ref) : null}</span>
                    <span>{o.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {data.themes?.length > 0 && (
            <p className="mt-6 flex flex-wrap gap-2">
              {data.themes.map((t: string) => (
                <span key={t} className="rounded-full bg-surface-2 px-3 py-1 text-sm">
                  {t}
                </span>
              ))}
            </p>
          )}
        </div>
      );
    case "structure":
      return data.levels?.length ? <ChiasmLadder levels={data.levels} form={data.form} /> : null;
    case "festival":
      return (
        <dl className="grid gap-3 sm:grid-cols-4">
          <Fact label="Hebrew">
            {data.hebrew && (
              <span lang="he" dir="rtl" className="text-2xl text-hebrew">
                {data.hebrew}
              </span>
            )}
          </Fact>
          <Fact label="Transliteration">{data.transliteration}</Fact>
          <Fact label="Date">
            {festivalDate(data) || null}
          </Fact>
          <Fact label="Season">{data.season}</Fact>
          <Fact label="Pilgrim feast">{data.pilgrim == null ? null : data.pilgrim ? "Yes" : "No"}</Fact>
        </dl>
      );
    case "sacrifice":
      return (
        <dl className="grid gap-3 sm:grid-cols-3">
          <Fact label="Hebrew">
            {data.hebrew && (
              <span lang="he" dir="rtl" className="text-2xl text-hebrew">
                {data.hebrew}
              </span>
            )}
          </Fact>
          <Fact label="Transliteration">{data.transliteration}</Fact>
          <Fact label="Offered">{Array.isArray(data.animals) ? data.animals.join(", ") : data.animals}</Fact>
          <Fact label="Who ate it">{data.portion}</Fact>
        </dl>
      );
    case "law":
      return (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Category">{data.category}</Fact>
          <Fact label="Jesus on this law">{data.jesus_refs?.length ? <RefList refs={data.jesus_refs} /> : null}</Fact>
        </dl>
      );
    case "covenant":
      return (
        <dl className="grid gap-3 sm:grid-cols-3">
          <Fact label="Parties">{data.parties}</Fact>
          <Fact label="Sign">{data.sign}</Fact>
          <Fact label="Promise">{data.promise}</Fact>
        </dl>
      );
    case "number":
      return (
        <div>
          <p className="text-6xl font-semibold text-accent">{data.value}</p>
          {data.caution && (
            <p className="mt-4 max-w-prose rounded-lg border border-dashed border-muted p-3 text-sm">
              <span className="font-semibold">Read with care. </span>
              {data.caution}
            </p>
          )}
        </div>
      );
    case "typology":
      return (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted">Type</p>
            <p className="text-lg font-semibold">{data.type}</p>
            <RefList refs={data.type_refs ?? []} />
          </div>
          <span aria-hidden className="text-center text-2xl text-accent">
            ⟶
          </span>
          <div className="rounded-lg border border-accent p-4">
            <p className="text-xs text-muted">Fulfilled in</p>
            <p className="text-lg font-semibold">{data.antitype}</p>
            <RefList refs={data.antitype_refs ?? []} />
          </div>
        </div>
      );
    case "jesus_word":
      return (
        <dl className="grid gap-3 sm:grid-cols-3">
          <Fact label="Greek">{data.greek && <span lang="grc" className="text-2xl text-greek">{data.greek}</span>}</Fact>
          <Fact label="Aramaic">{data.aramaic}</Fact>
          <Fact label="Hebrew">
            {data.hebrew && (
              <span lang="he" dir="rtl" className="text-2xl text-hebrew">
                {data.hebrew}
              </span>
            )}
          </Fact>
        </dl>
      );
    case "denomination":
      return (
        <div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Fact label="Founded">{data.founded}</Fact>
            <Fact label="Founders">{Array.isArray(data.founders) ? data.founders.join(", ") : data.founders}</Fact>
            <Fact label="Family">{data.family}</Fact>
          </dl>
          {data.distinctives?.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5">
              {data.distinctives.map((d: string) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      );
    case "doctrine":
      return data.steps?.length ? (
        <ol className="relative space-y-4 border-l-2 border-border pl-6">
          {data.steps.map((s: D, i: number) => (
            <li key={i} className="relative">
              <span className="absolute -left-[1.95rem] top-1 size-3 rounded-full bg-accent" aria-hidden />
              <p className="text-sm text-muted">
                {s.year < 0 ? `${-s.year} BC` : s.year ? `AD ${s.year}` : ""} {s.who && <>· {s.who}</>}
              </p>
              <p className="max-w-prose">{s.what}</p>
            </li>
          ))}
        </ol>
      ) : null;
    case "roman_term":
      return (
        <dl className="grid gap-3 sm:grid-cols-3">
          <Fact label="Greek">{data.greek && <span lang="grc" className="text-2xl text-greek">{data.greek}</span>}</Fact>
          <Fact label="Latin">{data.latin && <span className="text-xl italic">{data.latin}</span>}</Fact>
          <Fact label="Area of life">{data.category}</Fact>
        </dl>
      );
    case "christophany":
      return <dl><Fact label="Form">{data.form}</Fact></dl>;
    case "tabernacle":
      return (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Where">{({ courtyard: "Courtyard", holy: "Holy place", most_holy: "Most holy place" } as D)[data.zone] ?? data.zone}</Fact>
          <Fact label="Made of">{data.material}</Fact>
        </dl>
      );
    case "parable":
      return (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Setting">{data.setting}</Fact>
        </dl>
      );
    default:
      return null;
  }
}
