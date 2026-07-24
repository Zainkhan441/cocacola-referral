"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { usePublicCmsPage } from "@/features/pages/hooks/use-public-cms-page";
import { SectionRenderer } from "@/features/pages/components/section-renderer";

type PublicCmsPageClientProps = {
  slug: string;
};

export function PublicCmsPageClient({ slug }: PublicCmsPageClientProps) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const isAdmin = Boolean(user && profile?.role === "admin");

  const { page, sections, isDraftPreview, error, retry } = usePublicCmsPage(slug, isAdmin);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="min-h-[60vh]">
        {page === undefined && !error && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-2xl px-6 py-16">
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
              <Alert variant="error">{error}</Alert>
              <Button variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {page === null && !error && (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-6 py-24 text-center">
            <h1 className="text-2xl font-bold text-white">Page not found</h1>
            <p className="text-sm text-white/50">
              This page doesn’t exist or hasn’t been published yet.
            </p>
          </div>
        )}

        {page && (
          <>
            {isDraftPreview && (
              <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-center text-xs font-medium text-amber-300">
                Draft preview — this page is not published yet
              </div>
            )}

            {sections.length === 0 && (
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-6 py-24 text-center">
                <h1 className="text-2xl font-bold text-white">{page.title}</h1>
                <p className="text-sm text-white/50">This page doesn’t have any content yet.</p>
              </div>
            )}

            {sections.map((section) => (
              <SectionRenderer key={section.id} section={section} />
            ))}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
