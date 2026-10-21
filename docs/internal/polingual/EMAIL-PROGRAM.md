# Polingual Email Program

Drafts only. Nothing is sent until the founder sets up the sender and approves each email.

## Sending Setup

- Provider: Resend for transactional and lifecycle mail, on a `mail.polingual.com` subdomain with SPF, DKIM and a DMARC policy at `p=quarantine`. It has a plain HTTP API the Next.js backend can call, and React Email templates live in the repo.
- Broadcasts to existing Bucket users: Resend Broadcasts with an audience exported from `bucket.identities` for people who opted in to product email.
- Sender: `Polingual <hello@mail.polingual.com>`, replies to `support@polingual.com`.
- Trigger source: App Store Server Notifications V2 posted to a new backend route, matched to the person through the `appAccountToken` the app sets to the Bucket user id at purchase. Events used: `SUBSCRIBED` with an introductory offer, `DID_RENEW`, `DID_CHANGE_RENEWAL_STATUS`, `EXPIRED`.
- Only people who signed in get lifecycle email. Every email carries a one-click unsubscribe and the postal address.

## Trial Sequence

### Day 0: Trial Start

Sent within an hour of `SUBSCRIBED` with the free trial offer.

Subject: Your 3 days of Polingual start now
Preview: One short session today sets up the rest of the week.

Hi {first_name},

Your free trial is on. Three things make the first day count:

1. Take the placement test in each language of your system. It takes a few minutes and skips the words you know.
2. Do one session. Ten cards is enough.
3. Tap the speaker on any word to hear it, and the microphone to say it back.

Your trial ends {trial_end_date}. Polingual {plan_name} then renews at {price} per {period}. You can cancel any time in Settings on your iPhone, under your Apple Account, Subscriptions.

Open Polingual: {deep_link}

### Day 1: First Review

Sent 24 hours after the trial starts.

Subject: The words from yesterday are back
Preview: Spaced review brings them back right before you forget.

Hi {first_name},

The words you met yesterday are due today. Answering them now, a day later, is what moves them into long-term memory. Polingual mixes them across your languages, so {example_word_target_1} and {example_word_target_2} come back in the same session.

{due_count} cards are waiting.

Review now: {deep_link}

### Day 2: Before The Trial Ends

Sent 48 hours after the trial starts, at least 24 hours before renewal.

Subject: Your Polingual trial ends tomorrow
Preview: Keep going or cancel, your choice, with the details here.

Hi {first_name},

Your free trial ends on {trial_end_date}. After that, Polingual {plan_name} renews at {price} per {period}.

So far you have started {cards_started} cards across {language_count} languages and kept a {streak} day streak.

To keep going, do nothing. To cancel, open Settings on your iPhone, tap your name, then Subscriptions, then Polingual. Your progress stays in your account either way.

### Conversion

Sent on the first `DID_RENEW` after the trial.

Subject: Welcome to Polingual
Preview: Your plan is active. A short tour of what comes next.

Hi {first_name},

Your subscription is active. Next steps that pay off this month:

- Add a language to your system when the review queue feels light.
- Turn on readings and IPA in a session to see how each word sounds.
- Open Bucket or bucket.foundation and find the same progress there.

Manage your plan any time in Settings, Apple Account, Subscriptions.

### Win-Back

Sent 30 days after `EXPIRED`, once, with the win-back offer.

Subject: Your {language_list} words are still here
Preview: Your progress is saved. Come back for half the first month.

Hi {first_name},

Your Polingual progress is saved: {cards_started} cards and your placement in {language_count} languages. Many of those words are due for review now, and a session brings them back.

Come back with your first month at half price: {offer_link}

## Launch Announcement To Bucket Users

Subject: Polingual: the language side of Bucket, on its own
Preview: Learn a set of languages together. 3 days free.

Hi {first_name},

Polingual is out on iPhone, iPad and Mac. It is the language part of Bucket in its own app: language systems, placement, spaced review and speaking practice across 29 languages.

You already have an account. Sign in with this email and your language systems and progress are there.

New subscribers get 3 days free, then {monthly_price} a month or {yearly_price} a year. Bucket members can redeem {offer_code} for 30 days free.

Get Polingual: {app_store_link}

The science decks, the canon and the Research OS stay in Bucket.

build the past. build history. bucket is the new renaissance.
