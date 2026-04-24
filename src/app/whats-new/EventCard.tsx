import Link from "next/link";
import {
  FeedEvent,
  commitUrl,
  relativeTime,
  TYPE_LABEL,
  TYPE_GLYPH,
} from "./types";

export default function EventCard({ event }: { event: FeedEvent }) {
  return (
    <article className="group bg-[color:var(--bone-2)] p-6 border-b hairline hover:bg-[color:var(--bone-3)] transition">
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="font-mono-mark text-lg text-[color:var(--gold)] shrink-0 w-8 text-center"
        >
          {TYPE_GLYPH[event.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 small-caps text-[10px]">
            <span className="text-[color:var(--gold)]">
              {TYPE_LABEL[event.type]}
            </span>
            {event.branch && (
              <span className="text-[color:var(--parchment-dim)]">
                · {event.branch}
              </span>
            )}
            {event.topic && (
              <span className="text-[color:var(--parchment-dim)]">
                · {event.topic}
              </span>
            )}
            <span
              className="text-[color:var(--parchment-dim)] ml-auto"
              title={event.timestamp}
            >
              {relativeTime(event.timestamp)}
            </span>
          </div>

          <h3 className="font-serif-display text-lg leading-snug text-[color:var(--parchment)] mb-2">
            <a
              href={commitUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[color:var(--gold)]"
            >
              {event.title}
            </a>
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--parchment-dim)]">
            <Link
              href={`/contributors/${event.author_github}`}
              className="small-caps text-[color:var(--gold)] hover:text-[color:var(--parchment)]"
            >
              @{event.author_github}
            </Link>
            <span className="font-mono-mark">
              {event.commit_sha.slice(0, 7)}
            </span>
            {event.doi && (
              <a
                href={`https://doi.org/${event.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[color:var(--gold)] truncate"
              >
                doi:{event.doi}
              </a>
            )}
            {event.pr_number !== null && (
              <a
                href={`https://github.com/bucket-foundation/bucket-foundation/pull/${event.pr_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[color:var(--gold)]"
              >
                #{event.pr_number}
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
