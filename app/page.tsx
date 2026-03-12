import { getServerSession } from "next-auth";

import { HomeShell } from "@/components/home/HomeShell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

type HomePageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const authBaseUrl = process.env.NEXTAUTH_URL ?? "";
  const spotifyCallbackUrl = authBaseUrl
    ? `${authBaseUrl}/api/auth/callback/spotify`
    : null;
  const authError =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : null;

  if (!session?.user?.id) {
    return (
      <section className="stack">
        {authError === "Callback" ? (
          <section className="card stack-sm">
            <h2>Spotify callback failed</h2>
            <p>
              Sign-in returned from Spotify, but session creation failed in the app.
            </p>
            <p className="muted">
              Most common cause: Prisma cannot connect with <code>DATABASE_URL</code>.
              Confirm your Postgres server is running and <code>DATABASE_URL</code> is
              valid in <code>.env.local</code>.
            </p>
          </section>
        ) : null}
        <section className="card stack">
          <h2>Welcome</h2>
          <p>Sign in with Spotify to start your private shared music journal.</p>
          <a className="button-link" href="/api/auth/signin/spotify">
            Verify Spotify Sign-In
          </a>
          {spotifyCallbackUrl ? (
            <p className="muted">
              Spotify callback URL: <code>{spotifyCallbackUrl}</code>
            </p>
          ) : null}
        </section>
      </section>
    );
  }

  const feedEntries = await prisma.journalEntry.findMany({
    orderBy: { addedAt: "desc" },
    take: 24,
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return <HomeShell entries={feedEntries} userImage={session.user.image ?? null} />;
}
