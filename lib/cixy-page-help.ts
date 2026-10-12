/**
 * Page-by-page directions from Cixy (ported from Socixis `CixyPageHelp`, PR #76; 2026-10-05, Grok).
 * Steps describe what the Lyrixis code on each page actually does. Keep them plain and short.
 * Cixy's picture is the shared family photo, never an SVG stand-in. No religious wording.
 */
export const CIXY_AVATAR_SRC = "/cixy/cixy-combo-a-avatar.webp";

export type CixyPageHelpEntry = {
  title: string;
  /** 3–6 plain-language steps for this page. */
  steps: string[];
  tips: string[];
  /** One-tap questions that open the Cixy chat with the question filled in. */
  suggestions: string[];
};

export const PAGE_HELP: Record<string, CixyPageHelpEntry> = {
  "/": {
    title: "Lyrixis home",
    steps: [
      "Type a song, artist, writer or ISRC in the search box and press Search the catalog, or tap one of the Examples.",
      "Scroll to the live demo to see how a track becomes synced lyrics. How to use Lyrixis walks through every step.",
      "All-Access is $30 a month (3,000 Ixis). One song without the plan is $3 (300 Ixis). Labels use Contact sales.",
      "Pay by card or with Ixis (100 Ixis = $1). Card checkout is not open yet. Add Ixis in the Apixis Wallet.",
      "To process your own song, sign in with Apixis ID and use Upload.",
    ],
    tips: ["The round ◈ button at the bottom right opens a full chat with me."],
    suggestions: ["What can Lyrixis do with my song?", "How much does one song cost?", "How do I upload a track?"],
  },
  "/catalog": {
    title: "Catalog search",
    steps: [
      "Search by title, artist, writer, year, ISRC or ISWC and press Search.",
      "Results are the public seed catalog (public-domain or original works). Commercial tracks stay licensed.",
      "Click a recording to open its page with metadata and lyrics on file.",
      "On a recording page, Redeem · 300 Ixis ($3) unlocks its exports. All-Access is $30 a month when you are on that plan.",
    ],
    tips: ["Searching is free. You only spend Ixis when you press Redeem."],
    suggestions: ["Which tracks are in the catalog right now?", "What is the difference between ISRC and ISWC?"],
  },
  "/catalog/": {
    title: "Recording page",
    steps: [
      "The top shows title, artist and IDs (ISRC, ISWC, UPC, writers) on file.",
      "Press Redeem · 300 Ixis ($3) to unlock this recording. You need to be signed in. All-Access is $30 a month.",
      "Pay by card or with Ixis. Card checkout is not open yet. If your Wallet is short, buy Ixis and come back.",
      "Once unlocked, download the lyrics as .txt, .lrc or .json from the same card.",
    ],
    tips: ["Redeeming the same recording again doesn't charge you twice."],
    suggestions: ["What do I get when I redeem?", "What is an LRC file?"],
  },
  "/add": {
    title: "Add a recording",
    steps: [
      "Fill in Title and Artist. Album, year, ISRC, ISWC, UPC and writers are optional but make the record searchable.",
      "Pick the lyrics license: Original work I wrote, or Public domain. Commercial lyrics are not accepted.",
      "Paste the lyrics and save. You land on the new recording's page.",
      "For many songs, use Bulk ingest below: paste CSV with the header shown, one recording per row.",
      "Metadata-only CSV rows need an ISRC, ISWC or UPC.",
    ],
    tips: ["ISRC looks like CC-XXX-YY-NNNNN and ISWC like T-000.000.001-0."],
    suggestions: ["How do I format the CSV?", "Can I add lyrics I didn't write?"],
  },
  "/pricing": {
    title: "Pricing",
    steps: [
      "Lyrixis All-Access is $30 a month (3,000 Ixis). It renews every month. Cancel anytime; it stays on until the end of the paid month.",
      "Included now: unlimited song lyrics, plus Voice Songs (your voice model, 4 songs, and 1 release a month). Lyric video, translations, and the Voices marketplace are Coming soon.",
      "Without the plan, one song is $3 (300 Ixis). That unlock still works today.",
      "Pay by card or with Ixis (100 Ixis = $1). Card checkout is not open yet. Add Ixis in the Apixis Wallet.",
      "Labels and companies: fill in Contact sales. Company, your name, work email, phone if you want, songs per month, seats, and a message.",
      "After Awad approves the company, the owner opens Team and invites people by email. They get All-Access on that company's songs.",
    ],
    tips: ["The thank-you screen means the request was saved. It is emailed to awad@apixis.dev when email is set up."],
    suggestions: ["What do I get for $30?", "Can I pay with a card?", "How do I cancel?", "What is Ixis?"],
  },
  "/cixy": {
    title: "Chat with Cixy",
    steps: [
      "Type a question in the chat box, or tap a starter question.",
      "I can search the Lyrixis catalog live and cite records by title, ISRC and writers.",
      "Ask about mixing, mastering loudness, metadata, splits, distribution or royalties. I answer with real numbers.",
      "I can't see your account, charge Ixis or change anything for you.",
    ],
    tips: ["No legal or tax advice. I'll tell you what to ask a lawyer or accountant."],
    suggestions: ["What LUFS should I master for Spotify?", "Explain ISRC vs ISWC and splits."],
  },
  "/feed": {
    title: "Family feed",
    steps: [
      "This is the shared Socixis feed with posts from every Apixis company.",
      "Scroll to read. Sign in with your Apixis ID to post, follow, comment and tip in Ixis.",
      "Tips come from your Apixis Wallet balance.",
    ],
    tips: [],
    suggestions: ["What is the family feed?", "How do tips work?"],
  },
  "/companies": {
    title: "Apixis companies",
    steps: [
      "Each card is one company in the Apixis family, with a one-line description.",
      "Press Visit site on a card to open that company in a new tab.",
      "One Apixis ID and one Apixis Wallet work across all of them.",
    ],
    tips: [],
    suggestions: ["What is Apixis ID?", "Which company does what?"],
  },
  "/vision": {
    title: "Vision & FAQ",
    steps: [
      "The top explains why Lyrixis exists and where it's going.",
      "Open any question in the FAQ below to read the answer.",
      "Still stuck? Ask me, or email lyrixis@apixis.dev.",
    ],
    tips: [],
    suggestions: ["Is search free?", "What will Lyrixis do next?"],
  },
  "/updates": {
    title: "Updates",
    steps: ["This page lists what shipped on Lyrixis, newest first.", "The catalog itself is the best place to see what's new."],
    tips: [],
    suggestions: ["What's new on Lyrixis?"],
  },
  "/waitlist": {
    title: "Early access",
    steps: [
      "Enter your full name and work email. Company or artist name is optional.",
      "Submit to join the early-access list. The page shows how many people have joined.",
      "We'll email you from lyrixis@apixis.dev when your access opens.",
    ],
    tips: [],
    suggestions: ["What does early access include?"],
  },
  "/support": {
    title: "Support",
    steps: [
      "Enter your email so we can reply.",
      "Add a short subject and pick a category: General, Bug Report, Feature Request or Billing.",
      "Describe what happened, including the page and what you pressed, then send.",
      "Replies come from lyrixis@apixis.dev.",
    ],
    tips: ["For Ixis balance questions, the Apixis Wallet holds the record of every charge."],
    suggestions: ["I was charged but the track is still locked", "How do I report a bug?"],
  },
  "/login": {
    title: "Sign in",
    steps: [
      "Press Log in with Apixis ID. One Apixis ID works on every Apixis site.",
      "Existing email accounts can use Magic link (we email a sign-in link) or Password.",
      "Forgot your password? Choose Password, then Forgot password?, and open the reset link we email you.",
      "The sign-in help card on this page can answer questions about magic links and Apixis ID.",
    ],
    tips: ["Nobody from Lyrixis will ever ask for your password."],
    suggestions: ["I forgot my password", "What is Apixis ID?"],
  },
  "/signup": {
    title: "Create your account",
    steps: [
      "New accounts are created with Apixis ID: press Log in with Apixis ID.",
      "Sign up once on the Apixis ID page, then you come back here signed in.",
      "Every new Apixis ID gets 1,000 free Ixis once, in the shared Apixis Wallet.",
    ],
    tips: [],
    suggestions: ["What is Apixis ID?", "Is it free to start?"],
  },
  "/set-password": {
    title: "Choose a password",
    steps: [
      "Type a new password and confirm it.",
      "Save, and you're signed in with the new password.",
      "Reset links expire after an hour and work once. If yours expired, request a new one from Sign in.",
    ],
    tips: [],
    suggestions: ["My reset link expired"],
  },
  "/dashboard": {
    title: "Your dashboard",
    steps: [
      "Your tracks table lists every song you uploaded, with status, language, access and confidence.",
      "Click a title to open its synced lyrics. Status moves from Queued to Completed (or Needs review) on its own.",
      "Paid shows Preview until you unlock a song for $3 (300 Ixis), or until your company Enterprise plan covers it.",
      "Upload a track adds a new song. All-Access is $30 a month. Card checkout is not open yet.",
      "The Ixis pill in the top bar is your Apixis Wallet balance. Buy Ixis tops it up.",
    ],
    tips: ["Confidence is how sure the transcription is. Low-confidence tracks are marked for review."],
    suggestions: ["How do I upload a song?", "What does Needs review mean?", "Where is my Ixis balance?"],
  },
  "/upload": {
    title: "Upload a song",
    steps: [
      "Choose an audio file: MP3, WAV, FLAC, M4A or OGG, up to 100 MB and 12 minutes.",
      "Title and Artist are optional. If you leave them empty, Lyrixis reads them from the file's tags.",
      "Tick the box confirming you have the rights to this recording. Lyrixis stores that confirmation.",
      "Press Upload and process. You go straight to the track page while the lyrics are made.",
    ],
    tips: ["Processing is free. You pay $3 (300 Ixis) to unlock one song, or $30 a month for All-Access. Card checkout is not open yet."],
    suggestions: ["Which file format is best?", "How long does processing take?", "What does the rights box mean?"],
  },
  "/tracks/": {
    title: "Your track",
    steps: [
      "The status badge updates every few seconds until the lyrics are Completed (or Needs review).",
      "Press play. The current line highlights, and you can click any word to jump the audio there.",
      "Before unlocking you see the first 30 seconds. Press Unlock full lyrics · 300 Ixis ($3), unless your company plan already covers it.",
      "All-Access is $30 a month. Pay by card or with Ixis. Card checkout is not open yet, so the $3 unlock is what works today.",
      "After unlocking, use Correct to fix a line and Exports for TXT, SRT, LRC, or JSON. Lyric video is coming soon.",
    ],
    tips: [
      "If your Wallet is short, you're sent to buy Ixis and brought back to this track.",
      "If processing failed or stopped, press Retry processing. It picks up where it stopped and costs nothing.",
    ],
    suggestions: ["What do the amber marks mean?", "Which export do I need for Spotify or Apple Music?"],
  },
  "/how-to": {
    title: "How to use Lyrixis",
    steps: [
      "Follow the numbered steps on this page: account, upload, processing, playback, retry, and paying.",
      "All-Access is $30 a month (3,000 Ixis). One song is $3 (300 Ixis). Card checkout is not open yet.",
      "Lyric video downloads, translations, and Voices are marked Coming soon because they are not available yet.",
      "Label / Enterprise: fill in Contact sales on Pricing. After approval, the owner invites the team from Team.",
    ],
    tips: ["Companies only see their own songs."],
    suggestions: ["What do I get for $30?", "How does a company join?"],
  },
  "/team": {
    title: "Your company team",
    steps: [
      "This page is for a company Awad has marked as Enterprise. If you are not on one, start with Contact sales.",
      "Sign in with the work email on the request. The owner sees members, open invites, and songs processed.",
      "The owner invites teammates by email. They sign in with that email and land on this company.",
      "Everyone on the company gets All-Access for the company's songs. Another company's songs stay hidden.",
      "Unlimited song lyrics is included. Lyric video downloads, translations, and Voices are still coming soon.",
    ],
    tips: ["Seat count includes members and people who have not accepted yet."],
    suggestions: ["How do I invite my team?", "What do company members get?"],
  },
  "/admin/enterprise": {
    title: "Approve a company",
    steps: [
      "This page is only for Awad (alaidaroosawad@gmail.com and awad@apixis.dev).",
      "Each new Contact sales request is listed with the company, work email, songs per month, and seats.",
      "Press Mark as Enterprise. That creates the company and makes the contact the owner, or invites them if they have no account yet.",
      "They sign in with that work email, open Team, and invite the rest of the company.",
    ],
    tips: ["The database migration 20261006_enterprise_accounts.sql has to be applied before requests can be saved."],
    suggestions: ["How do I approve a company?"],
  },
  "/voice-songs": {
    title: "Voice Songs",
    steps: [
      "Sign in with Apixis ID. One private voice model belongs to that ID, and only your own voice can be cloned.",
      "Record 3 to 5 minutes, sign the plain-language consent, and read the random phrase aloud.",
      "Train the model, then write original lyrics with Cixy. Other artists’ names and “sing like” requests are refused.",
      "A voice song is $6 (600 Ixis) and includes 3 takes. An extra take is 100 Ixis ($1). Setup is $5 (500 Ixis) once.",
      "All-Access at $30 a month includes the voice model, 4 voice songs, and 1 release each month. Pay with Ixis or by card.",
      "Release is $9 (900 Ixis). You keep 90% of master royalties and Lyrixis keeps 10%. A reviewer sees it before any store.",
    ],
    tips: ["Delete my voice removes the model and the recording. Preview audio is watermarked."],
    suggestions: ["How much is a voice song?", "Can I clone someone else’s voice?"],
  },
  "/voice-songs/record": {
    title: "Record your voice",
    steps: [
      "Use the prompts: talk, sing on “la”, read the line, then hum.",
      "Press Start recording and watch the level. Clipping or a very quiet take will be rejected.",
      "Stop between 3 and 5 minutes, then Save sample.",
      "In the demo, Use a demo sample stands in so you can click through without a microphone.",
    ],
    tips: ["The file stays in a private bucket. Other accounts cannot read it."],
    suggestions: ["How long should the sample be?", "What if the mic clips?"],
  },
  "/voice-songs/consent": {
    title: "Voice consent",
    steps: [
      "Read the consent. It says this is your voice, stored only for songs you ask for, and deletable in one step.",
      "Tick the box and sign. Lyrixis will not train without that.",
      "Read the random phrase on the screen aloud. The words have to match.",
      "Then pay for setup ($5 or 500 Ixis) or use the All-Access allowance if it is on.",
    ],
    tips: ["The phrase changes. It is the liveness check, the same idea as a read-aloud captcha."],
    suggestions: ["What am I agreeing to?", "Why do I read a phrase?"],
  },
  "/voice-songs/train": {
    title: "Train your voice",
    steps: [
      "Press Train model after consent and the read-aloud check.",
      "Live training needs the voice provider key. If it is missing, the page says not configured.",
      "The demo finishes immediately and labels the model as a demo.",
      "Delete my voice removes the model and the raw recording together.",
    ],
    tips: ["Re-recording is included in the one-time setup."],
    suggestions: ["How long does training take?", "How do I delete my voice?"],
  },
  "/voice-songs/write": {
    title: "Write with Cixy",
    steps: [
      "Choose a theme, mood, and genre, and add a note that is yours.",
      "Ask Cixy for a verse and chorus. Edit any line in the box.",
      "Cixy refuses another artist’s name, a known song title, or a request to copy a voice.",
      "Pay $6 (600 Ixis) or use one of the 4 monthly All-Access songs, then the song is generated.",
    ],
    tips: ["If Cixy is not configured, the demo writer drafts an original lyric and says so."],
    suggestions: ["Will Cixy copy a famous song?", "What is included in a voice song?"],
  },
  "/voice-songs/song/": {
    title: "Preview your song",
    steps: [
      "Play the watermarked preview. The badge names the music provider and the voice provider.",
      "Edit the lyric and move the voice/backing mix, then press Re-sing.",
      "Three takes are included. After that, an extra take is 100 Ixis ($1).",
      "When a take is ready, Request a release to send it to review.",
    ],
    tips: ["A missing provider key stops a live render and explains which key is needed. The demo still plays a stand-in."],
    suggestions: ["Why is the preview watermarked?", "How do I get another take?"],
  },
  "/voice-songs/release": {
    title: "Release a song",
    steps: [
      "Enter your own artist name and the title. Another artist’s name is blocked.",
      "Add credits, optional cover art, and read the AI disclosure.",
      "The split is recorded as you 90% and Lyrixis 10%. Spotify may not pay under 1,000 streams a year.",
      "Accept the rights line. The release is $9 (900 Ixis), or the 1 release included with All-Access.",
      "It waits in the review queue. Stores are contacted only after approval, and only if a distributor key exists.",
    ],
    tips: ["You can request at most 4 releases in a month."],
    suggestions: ["What does the AI disclosure say?", "When does it reach Spotify?"],
  },
  "/voice-songs/admin": {
    title: "Release review",
    steps: [
      "This queue is for a Lyrixis reviewer. In the demo you only see your own requests.",
      "Read the artist, title, split, and AI disclosure.",
      "Approve to hand it to the distributor. Reject to send it back.",
      "If Too Lost or Revelator is not configured, approval stays on file and the distributor line says not configured.",
    ],
    tips: ["Raw voice recordings are not shown on this page."],
    suggestions: ["What happens when I approve?"],
  },
  "/voices": {
    title: "Lyrixis Voices",
    steps: [
      "Lyrixis Voices licenses Arabic and bilingual voices from creators who have agreed to it.",
      "It is coming soon and invite-only. It is not included as a working part of the $30 plan yet.",
    ],
    tips: [],
    suggestions: ["What is Lyrixis Voices?"],
  },
};

const FALLBACK: CixyPageHelpEntry = {
  title: "Lyrixis",
  steps: [
    "Use the top menu to reach the catalog, pricing and your dashboard.",
    "Signed in? Dashboard lists your tracks and Upload adds a new song.",
    "Ask me anything about this page with Ask Cixy below.",
  ],
  tips: [],
  suggestions: ["What can you do?", "How do I upload a song?"],
};

/** Exact route first, then the longest prefix ending in "/" (e.g. "/tracks/" for /tracks/trx_…). */
export function helpForPath(pathname: string): { route: string; entry: CixyPageHelpEntry } {
  const path = (pathname || "/").split("?")[0].replace(/(.)\/$/, "$1") || "/";
  if (PAGE_HELP[path]) return { route: path, entry: PAGE_HELP[path] };
  const prefix = Object.keys(PAGE_HELP)
    .filter((route) => route.endsWith("/") && route !== "/" && path.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];
  if (prefix) return { route: prefix, entry: PAGE_HELP[prefix] };
  const section = Object.keys(PAGE_HELP)
    .filter((route) => route !== "/" && !route.endsWith("/") && path.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (section) return { route: section, entry: PAGE_HELP[section] };
  return { route: path, entry: FALLBACK };
}

/** Window event the page help fires; CixyWidget opens and fills in the question. */
export const CIXY_ASK_EVENT = "lyrixis:cixy-ask";
export type CixyAskDetail = { question: string; handled: boolean };
