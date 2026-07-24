import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { CmsSectionDoc } from "@/lib/firestore/cms-sections";

function SectionButton({ label, url }: { label: string; url: string }) {
  const isExternal = /^https?:\/\//i.test(url);
  return (
    <Link
      href={url}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={buttonVariants({ size: "md" })}
    >
      {label}
    </Link>
  );
}

// Renders one cmsSections/{id} document. Every case here maps only to the
// plain-text/URL fields already validated at write time (firestore.rules) —
// there is no path through this renderer that interprets stored text as
// HTML/markup, since "custom_html" was never a supported section type.
export function SectionRenderer({ section }: { section: CmsSectionDoc }) {
  switch (section.type) {
    case "hero":
      return (
        <section className="border-b border-white/10 py-20 text-center">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6">
            {section.title && <h1 className="text-4xl font-bold text-white sm:text-5xl">{section.title}</h1>}
            {section.subtitle && <p className="text-lg text-white/60">{section.subtitle}</p>}
            {section.mediaUrl && (
              /* eslint-disable-next-line @next/next/no-img-element -- external, admin-supplied URL, not a local asset */
              <img src={section.mediaUrl} alt={section.title ?? ""} className="mt-4 max-h-96 rounded-2xl object-cover" />
            )}
            {section.buttonLabel && section.buttonUrl && (
              <SectionButton label={section.buttonLabel} url={section.buttonUrl} />
            )}
          </div>
        </section>
      );

    case "rich_text":
      return (
        <section className="border-b border-white/10 py-16">
          <div className="mx-auto max-w-3xl px-6">
            {section.title && <h2 className="mb-4 text-2xl font-bold text-white">{section.title}</h2>}
            {section.richText && (
              <p className="whitespace-pre-wrap text-white/70">{section.richText}</p>
            )}
          </div>
        </section>
      );

    case "image_text":
      return (
        <section className="border-b border-white/10 py-16">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 sm:grid-cols-2 sm:items-center">
            {section.mediaUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={section.mediaUrl} alt={section.title ?? ""} className="w-full rounded-2xl object-cover" />
            )}
            <div className="flex flex-col gap-3">
              {section.title && <h2 className="text-2xl font-bold text-white">{section.title}</h2>}
              {section.subtitle && <p className="text-white/60">{section.subtitle}</p>}
              {section.description && <p className="whitespace-pre-wrap text-white/70">{section.description}</p>}
              {section.buttonLabel && section.buttonUrl && (
                <SectionButton label={section.buttonLabel} url={section.buttonUrl} />
              )}
            </div>
          </div>
        </section>
      );

    case "cards_grid":
      return (
        <section className="border-b border-white/10 py-16">
          <div className="mx-auto max-w-5xl px-6">
            {section.title && <h2 className="mb-8 text-center text-2xl font-bold text-white">{section.title}</h2>}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item, index) => (
                <div key={index} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
                  {item.mediaUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.mediaUrl} alt={item.title} className="h-40 w-full rounded-xl object-cover" />
                  )}
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  {item.description && <p className="text-sm text-white/60">{item.description}</p>}
                  {item.buttonLabel && item.buttonUrl && (
                    <SectionButton label={item.buttonLabel} url={item.buttonUrl} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "faq":
      return (
        <section className="border-b border-white/10 py-16">
          <div className="mx-auto max-w-2xl px-6">
            {section.title && <h2 className="mb-8 text-center text-2xl font-bold text-white">{section.title}</h2>}
            <div className="flex flex-col divide-y divide-white/10">
              {section.items.map((item, index) => (
                <div key={index} className="py-4">
                  <p className="font-semibold text-white">{item.title}</p>
                  {item.description && <p className="mt-1 text-sm text-white/60">{item.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "contact_block":
      return (
        <section className="border-b border-white/10 py-16">
          <div className="mx-auto max-w-2xl px-6 text-center">
            {section.title && <h2 className="mb-3 text-2xl font-bold text-white">{section.title}</h2>}
            {section.description && <p className="whitespace-pre-wrap text-white/70">{section.description}</p>}
            {section.buttonLabel && section.buttonUrl && (
              <div className="mt-4 flex justify-center">
                <SectionButton label={section.buttonLabel} url={section.buttonUrl} />
              </div>
            )}
          </div>
        </section>
      );

    case "cta":
      return (
        <section className="border-b border-white/10 bg-surface py-16 text-center">
          <div className="mx-auto max-w-2xl px-6">
            {section.title && <h2 className="mb-3 text-2xl font-bold text-white">{section.title}</h2>}
            {section.description && <p className="mb-6 text-white/60">{section.description}</p>}
            {section.buttonLabel && section.buttonUrl && (
              <SectionButton label={section.buttonLabel} url={section.buttonUrl} />
            )}
          </div>
        </section>
      );

    case "banner":
      return (
        <section className="border-b border-white/10 bg-brand/10 py-6 text-center">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-6">
            {section.title && <p className="font-semibold text-white">{section.title}</p>}
            {section.description && <p className="text-sm text-white/70">{section.description}</p>}
            {section.buttonLabel && section.buttonUrl && (
              <SectionButton label={section.buttonLabel} url={section.buttonUrl} />
            )}
          </div>
        </section>
      );

    case "video":
      return (
        <section className="border-b border-white/10 py-16">
          <div className="mx-auto max-w-3xl px-6">
            {section.title && <h2 className="mb-4 text-2xl font-bold text-white">{section.title}</h2>}
            {section.mediaUrl && (
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10">
                <iframe
                  src={section.mediaUrl}
                  title={section.title ?? "Video"}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </section>
      );

    case "document":
      return (
        <section className="border-b border-white/10 py-16 text-center">
          <div className="mx-auto max-w-2xl px-6">
            {section.title && <h2 className="mb-2 text-2xl font-bold text-white">{section.title}</h2>}
            {section.description && <p className="mb-4 text-white/60">{section.description}</p>}
            {section.mediaUrl && (
              <SectionButton label={section.buttonLabel ?? "Download"} url={section.mediaUrl} />
            )}
          </div>
        </section>
      );

    case "social_links":
      return (
        <section className="border-b border-white/10 py-16 text-center">
          <div className="mx-auto max-w-2xl px-6">
            {section.title && <h2 className="mb-6 text-2xl font-bold text-white">{section.title}</h2>}
            <div className="flex flex-wrap justify-center gap-3">
              {section.items.map((item, index) =>
                item.buttonUrl ? (
                  <SectionButton key={index} label={item.title} url={item.buttonUrl} />
                ) : null,
              )}
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
}
