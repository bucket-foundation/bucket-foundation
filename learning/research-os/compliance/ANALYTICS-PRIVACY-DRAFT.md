# Learning Analytics: Privacy Text Draft

Founder decision 2026-10-26: record everything a learner does in the apps, for two uses. The learner sees and uses their own data, and Bucket Foundation uses it for research and to run the apps. Bead bkt-5vsj4, PR #1003. Waits on founder approval.

## Section For bucket.foundation/privacy And polingual.com/privacy

### What we record while you learn

When you use Bucket or Polingual we record what you do in the app: when a session starts and ends, each card you see, your answer, whether it was right, how long you took, the words you look up and save, and which app version and device type you use. If you join an experiment, we record which version of a feature you saw.

These records are tied to your account, so they follow you across devices.

### Why

1. For you. Your history drives your review schedule, and you can see your own progress, streaks and mastery. You can download everything we hold about you.
2. To learn what works. We study the records to find out which teaching methods help people remember, and to fix what breaks. Published results use counts and averages across learners and never name you.

### What we never do

We never sell your data. We never use it for advertising or share it with ad networks. We run our own analytics, and no third-party analytics company receives these records.

### Who processes it

Supabase stores the records for us under a data processing agreement. Nobody else receives them.

### How long we keep it

As long as your account exists. When you delete your account, your records are deleted within 30 days. Research figures we already published from the totals stay published.

### Your choices

You can export or delete your data from Settings, or by writing to privacy@bucket.foundation.

## App Store Connect: App Privacy Answers

The founder fills in the form. The answers below match the text above.

| Data type | Collected | Linked to the user | Used for tracking | Purposes |
|---|---|---|---|---|
| Email address | Yes | Yes | No | App Functionality |
| User ID | Yes | Yes | No | App Functionality, Analytics |
| Product Interaction | Yes | Yes | No | App Functionality, Analytics, Product Personalization |
| Other Usage Data: answers, timings, lookups | Yes | Yes | No | App Functionality, Analytics, Product Personalization |
| Crash Data | Yes | No | No | App Functionality |
| Performance Data | Yes | No | No | Analytics |

"Used for tracking" stays No only while nothing goes to ad networks. If the Meta or TikTok pixels from bkt-g6h45 ever run inside the apps, this answer changes, and so do the App Tracking Transparency prompt and this text.

## Open Points

- Confirm that privacy@bucket.foundation receives mail.
- The 30-day deletion window has to match the delete job in the code.
