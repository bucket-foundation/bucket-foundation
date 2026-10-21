# Polingual iOS Launch Campaign

Goal for the first 60 days: trial starts from the App Store and from Bucket, and trial to paid conversion above 35 percent. Every number below is a planning input to replace with measured App Store Connect data after week two.

## Product Page

- Icon: the serif P with the accent marks on Bucket green. Test a paper-background variant through product page optimization.
- First screenshot carries the promise: "Learn languages together" over the word family card, night in Spanish, French, Italian and Portuguese.
- Preview video, 20 seconds: build a Romance system, answer three cards in three languages, hear one word spoken.
- Product page optimization, two tests in sequence, 14 days each at 50 percent traffic: icon green against paper, then screenshot one word family against placement.

## Custom Product Pages

Each page gets its own screenshots, promotional text and deep link, and its own Search Ads ad group.

| Page | Audience | First screenshot |
|---|---|---|
| Romance | Learners who want Spanish, French and Italian | Romance preset card |
| Heritage | Latin, Ancient Greek, Sanskrit, Old English | A root word traced through Latin and English |
| Travel Iberia | Spanish and Portuguese together | Iberian preset with shared roots |
| Bucket members | People arriving from the Bucket upsell | "Your Bucket progress is already here" |

## In-App Events

Events need a live app and an event card image. Plan three per quarter at most.

- Launch week challenge: seven days of reviews in any system. Card: "Seven day polyglot start."
- Romance month: a featured Romance system with placement in each language.
- Back to school, late August: Latin and Ancient Greek for students.

## Apple Search Ads

Start on Search Ads Advanced with exact match, a discovery campaign on broad match, and daily caps. Pause any keyword over a 30 dollar cost per trial after 50 taps.

| Option | Daily budget | 30 day spend | Use |
|---|---|---|---|
| Probe | 20 dollars | 600 dollars | Find the keywords that convert |
| Launch | 60 dollars | 1,800 dollars | Probe winners plus the brand set |
| Scale | 150 dollars | 4,500 dollars | Only after trial to paid is above 35 percent |

Keyword sets:

- Brand: polingual, polingual app, bucket foundation, bucket app.
- Multi-language: learn multiple languages, learn spanish and french, polyglot app, learn romance languages, learn two languages at once.
- Single language intent: learn spanish, learn french, learn italian, learn portuguese, learn german, learn japanese.
- Classical: learn latin, learn ancient greek, learn sanskrit, old english.
- Method: spaced repetition vocabulary, vocabulary flashcards, language flashcards.
- Competitor terms: hold until brand and multi-language sets have a cost per trial on record.

## Cross Promotion From Bucket

The upsell sits where a Bucket learner has shown language intent. These are hook requests for the Bucket app owner:

1. Languages row in Learn: a Polingual card below the language decks, opening the App Store overlay through `SKOverlay` for `com.polingual.app`.
2. Session done in StudyView, Bucket build only: "Continue in Polingual: 3 days free," shown after the second completed session.
3. Account screen: a Polingual row with the same overlay.
4. An open-in-app link: when Polingual is installed, open it to the same system with a `polingual://system/<id>` URL.

Shared sign-in through the team keychain group means the person lands in Polingual already signed in, with their systems loaded.

## Offer Codes

- One-time codes: 500 codes for one free month, for teachers, language clubs and the launch press list.
- Custom codes: `BUCKET30`, a 30 day free trial for Bucket email recipients. `LATIN`, a first month at half price for the classical page.
- Referral: a share sheet in Polingual with the App Store link and a custom offer code per campaign. Apple offers no per-person referral codes; track by code name.
- Win-back offer: one month at half price for people whose subscription lapsed more than 30 days ago, configured as an App Store win-back offer.

## Launch Sequence

1. Week minus two: TestFlight to 50 Bucket learners, fix what they report.
2. Week minus one: submit for review, schedule the launch week event.
3. Launch day: email to Bucket users, Bucket upsell live, Search Ads probe on.
4. Week two: read conversion by source, move budget to the winners, start the first product page test.
