import { NextResponse, type NextRequest } from "next/server";
import SLUGS from "./data/word-slugs.json";
import SITE_LANGS from "./lib/site-langs.json";

const WORD_SLUGS = new Set<string>(SLUGS);
const LANGS = new Set<string>(SITE_LANGS);

export function knownWordPath(pathname: string): boolean {
  const [, lang, word, slug, rest] = pathname.split("/");
  return word === "word" && rest === undefined && LANGS.has(lang) && WORD_SLUGS.has(slug);
}

export function middleware(req: NextRequest): NextResponse {
  if (knownWordPath(req.nextUrl.pathname)) return NextResponse.next();
  return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

export const config = {
  matcher: [
    "/:lang((?!(?:ar|cs|de|el|es|fa|fi|fr|he|hi|id|it|ja|ko|nl|pl|pt|ru|sv|ta|th|tr|vi|zh)/)[^/]+)/word/:slug",
    "/:lang/word/:slug((?!(?:eight|five|four|half|hundred|nine|number|one|seven|six|ten|thousand|three|two|zero|black|blue|brown|color|green|orange|pink|red|white|yellow|baby|brother|child|daughter|father|friend|husband|man|mother|name|people|person|sister|son|wife|woman|bear|bee|bird|cat|chicken|cow|dog|egg|fish|horse|lion|mouse|pig|sheep|snake|spider|wolf|arm|back|blood|bone|brain|ear|eye|face|finger|foot|hair|hand|head|heart|knee|leg|mouth|neck|nose|skin|stomach|tongue|tooth|apple|beer|bread|butter|cheese|coffee|fruit|honey|meat|milk|potato|rice|salt|soup|sugar|tea|wine|beach|cloud|earth|fire|flower|forest|grass|ice|iron|island|lake|leaf|moon|mountain|rain|river|sand|sea|silver|sky|snow|star|stone|sun|tree|water|wind|wood|bag|ball|bed|boat|book|bridge|car|chair|church|city|clock|clothes|door|hat|house|key|knife|letter|money|music|paper|road|school|shirt|shoe|table|window|word|day|evening|hour|minute|month|morning|night|time|today|tomorrow|week|year|yesterday|bad|beautiful|big|clean|cold|dirty|dry|easy|empty|fast|full|good|happy|hard|heavy|high|hot|light|long|low|new|old|poor|rich|sad|short|slow|small|strong|sweet|warm|weak|wet|young|buy|close|come|cook|cry|dance|die|drink|eat|find|fly|give|go|hear|help|know|laugh|learn|live|love|open|pay|play|read|run|say|see|sell|sing|sit|sleep|speak|stand|swim|take|teach|think|wait|walk|want|wash|work|write)(?:$|[/#?.]))[^/]+)",
    "/:lang/word/:slug/:rest+",
  ],
};
