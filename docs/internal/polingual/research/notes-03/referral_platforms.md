# Referral Platforms and Creator Payout Stack for Polingual

## What are OWM.ai and sideshift.app, how do brands list campaigns, and what do they charge?

### Takeaway
OWM pays creators in startup equity or advisor roles, matched by an AI engine; it does not run cash per-user campaigns. SideShift is a UGC and influencer marketplace with a monthly software fee from $210 to $999 plus creator spend; it handles payouts and 1099s but does not advertise affiliate or per-subscriber campaigns.

### Cited Findings
- OWM matches founders with creators; founders give equity in exchange for promotion, aiming at long-term partnerships over one-off sponsored posts. Founder and CEO is Jeff Frommer. - [Tubefilter](https://www.tubefilter.com/2025/10/01/owm-influencer-marketing-equity-partnerships-creator-products/)
- OWM's AI data engine "Andy" identifies the consumers a founder needs and matches creators; creators can take equity or an advisor, ambassador or co-founder role. At launch: hundreds of companies seeking deals, 5,000+ creators, rosters from VaynerSports, Underscore Talent and Wasserman. Backers include ACQ Ventures, Avalanche VC, Firsthand Ventures. - [Tubefilter](https://www.tubefilter.com/2025/10/01/owm-influencer-marketing-equity-partnerships-creator-products/)
- OWM measures performance by sales, user acquisition or product adoption over impressions. - [Net Influencer interview](https://www.netinfluencer.com/owm-founder-jeff-frommer-on-why-creators-are-leaving-money-on-the-table/)
- OWM fees are not published; owm.ai returned HTTP 403 to automated fetch. - [Tubefilter](https://www.tubefilter.com/2025/10/01/owm-influencer-marketing-equity-partnerships-creator-products/)
- SideShift: brands recruit UGC creators, manage campaigns, track results and pay automatically; creators apply or get invited. Self-reported scale: 700,000+ creators, 1,000+ (elsewhere 3,000+) brands. - [SideShift](https://go.sideshift.app/), [SideShift creators](https://sideshift.app/creators)
- SideShift brand plans: Starter $210/mo annual or $299 monthly (15 live creators, 600 tracked videos), Growth $349/$499 (50 creators), Scale $699/$999 (unlimited). 14-day trial on monthly. Extra invites $0.10. Recommended creator spend $2k to $10k+/mo on top. - [SideShift plans](https://sideshift.app/plans/brands)
- SideShift: no stated percentage fee on payouts beyond processing charges; one-click automated payouts with 1099s and W-9s handled; "performance bonuses" and ROAS tracking; attribution sync with App Store Connect and Stripe. No explicit affiliate or per-subscriber campaign type. - [SideShift plans](https://sideshift.app/plans/brands)
- SideShift case study claims 20M installs in 60 days for Remini (self-reported). - [SideShift](https://go.sideshift.app/)

### Inferences
- OWM fits a raise-plus-distribution play (give creators equity in Polingual) and the founder's past employment there gives a warm intro. It does not deliver the 25% revenue-share mechanic.
- SideShift fits paying creators flat fees for UGC videos for Polingual's TikTok and Reels, with a performance bonus layered on. The rev-share piece would need separate tracking.

### Gaps
- OWM fees, deal terms and whether OWM now offers cash or rev-share campaigns: site blocked automated fetch.
- SideShift payout rails (bank, PayPal, crypto) are not listed on its pricing page.

## Which creator and affiliate marketplaces support mobile app subscriptions and recurring commission?

### Takeaway
Mobile-native affiliate tools that plug into RevenueCat (Insert Affiliate, WinWinKit, Influto) are the only class that tracks App Store and Play subscription renewals for recurring rev share out of the box. Web SaaS tools (Rewardful, FirstPromoter, Tolt, Dub Partners, PartnerStack) track Stripe and Paddle billing, so they cover Polingual's web checkout only. Clipping marketplaces (Content Rewards) pay per view, which suits top-of-funnel reach.

### Cited Findings
Mobile-native, RevenueCat-integrated:
- Insert Affiliate integrates directly with RevenueCat for real-time affiliate attribution, tracks renewals, cancellations and refunds, supports recurring revenue-share commissions, and is a listed RevenueCat technology partner. - [RevenueCat partner directory](https://www.revenuecat.com/partners/technology/partner/insert-affiliate)
- Insert Affiliate supports dynamic offer codes: a creator's link or short code fills in an App Store offer code modifier (e.g. one week free). - [Insert Affiliate SDK docs](https://app.unpkg.com/insert-affiliate-react-native-sdk@1.10.0/files/docs/dynamic-offer-codes.md)
- Insert Affiliate pricing: Capterra lists $20, $70 and $200/mo per installation; AlternativeTo says flat fee or base fee plus small rev share with a free tier. Sources conflict. - [Capterra](https://www.capterra.com/p/10049513/Insert-Affiliate/), [AlternativeTo](https://alternativeto.net/software/insert-affiliate/about/)
- WinWinKit counts initial and recurring purchases toward commission and needs matching user IDs in RevenueCat and WinWinKit. - [WinWinKit docs](https://winwinkit.com/docs/affiliates/introduction/)
- Influto pays recurring commission only on verified paying subscribers via RevenueCat webhook or direct App Store and Play validation. - [Product Hunt](https://www.producthunt.com/products/influto)
- Viral.app connects RevenueCat to show subscription outcomes next to creator performance. - [Viral.app docs](https://viral.app/docs/brands/revenuecat)
- Affonso lists RevenueCat integration as a feature request, not shipped. - [Affonso feature board](https://affonso.featurebase.app/p/revenuecat-integration)

Web SaaS affiliate tools:
- Rewardful from $49/mo (to $7,500/mo affiliate revenue), Stripe or Paddle; FirstPromoter from $49 (cap $5,000) with Stripe, Paddle, Chargebee, Braintree, Recurly; Tolt from $69 per some sources, Growth $99 automates payouts with 2% processing fee. Pricing conflicts across comparison sites. - [Referly compare](https://www.referly.so/pricing/compare), [Tolt vs FirstPromoter](https://tolt.com/alternatives/firstpromoter), [Refgrow](https://refgrow.com/compare-competitors/rewardful-vs-tolt-vs-firstpromoter)
- No source confirmed Rewardful, FirstPromoter or Tolt track RevenueCat or app store purchases. - [Refgrow](https://refgrow.com/compare-competitors/rewardful-vs-tolt-vs-firstpromoter)
- Dub Partners: Business plan reported $75 to $90/mo, Advanced $250 to $300; payout fee 3% to 5% on partner payouts (Dub help says about 3% average); available on Business and above. - [Referly on Dub](https://www.referly.so/pricing/dub-pricing), [Dub partner payouts](https://dub.co/help/article/partner-payouts), [Rewardful article](https://www.rewardful.com/articles/dub-vs-tolt-vs-trackdesk)
- Dub stablecoin payouts are generally available: partners receive USDC, 0.5% transaction fee versus 1% FX fee on international bank payouts, sent within minutes. - [Dub blog](https://dub.co/blog/stablecoin-payouts)
- impact.com tiers per trackers: Starter $30/mo, Essentials $500, Pro $2,500, plus a reported 2.5% transaction fee. PartnerStack does not publish pricing; reported $1k to $5k/mo, median contract about $19.6k/yr; aimed at B2B SaaS. - [CostBench](https://www.costbench.com/compare/partnerstack-vs-impact/), [Affonso PartnerStack guide](https://affonso.io/blog/partnerstack-pricing-guide)

Clipping and creator marketplaces:
- Content Rewards (formerly Whop Content Rewards): campaigns from $1,000; brand pays a 10% fee on each creator payout (8% if verified); pay per 1,000 views, flat per approved post, or retainer; brand approves each clip. - [Whop docs](https://docs.whop.com/manage-your-business/growth-marketing/content-rewards), [Content Rewards](https://contentrewards.com/about)
- Typical clipping rates $1 to $5 per 1,000 views (one source says $0.20 to $6, average about $1). - [Opus](https://www.opus.pro/blog/whop-content-rewards), [OpenClip](https://openclip.app/guides/whop-clipping-guide.md)
- Content Rewards ran a campaign for Lovable (app-company precedent). - [Methods blog](https://whop.methods.app/blog/content-rewards-x-lovable)
- Picsart Earn pays up to $3 per 1,000 verified views. - [Picsart](https://picsart.com/earn/brands/)

### Inferences
- For the 25% rev share on app subscribers, Insert Affiliate is the closest fit: RevenueCat partner, renewals and refunds tracked, offer-code integration, low entry price.
- For web (Stripe) subscribers, Dub Partners adds USDC payouts natively, which matches the stablecoin goal; Rewardful or Tolt are cheaper but lack stablecoin.
- Running Content Rewards CPM campaigns alongside the affiliate program covers reach; affiliate rev share covers conversion.
- impact.com and PartnerStack are oversized for a pre-scale consumer app.

### Gaps
- Not researched in depth within the call budget: Refersion, Tapfiliate, Everflow, Upfluence, Aspire, Creator.co, CreatorIQ, Agentio, Passionfroot, Vyro, Clipify, Grovia, TikTok Shop affiliates. Refersion and Tapfiliate are ecommerce or web-tracking oriented; Upfluence, Aspire, CreatorIQ are enterprise influencer CRMs; Agentio and Passionfroot sell sponsorship placements. These characterizations come from general knowledge and need verification.
- Whether Superwall offers affiliate or creator attribution features: not checked.
- Official Insert Affiliate and Dub pricing pages were not fetched; figures above come from third parties.

## How to attribute a paid subscription to a creator: RevenueCat, MMPs, Apple and Google tools

### Takeaway
Attribute at the user level by capturing a creator code (from a deep link, a referral code field, or an offer code) and writing it to the RevenueCat subscriber as an attribute, then pay on RevenueCat webhook events for initial purchase and each renewal net of refunds. Apple campaign links and offer codes give aggregate or limited signals; Google Play Install Referrer gives install-level UTM data on Android.

### Cited Findings
- RevenueCat has no visibility into payouts; the brand defines the payable event (trial start versus converted paid subscription) and the attribution window. - [RevenueCat guide](https://www.revenuecat.com/guides/web-to-app-funnels/measuring-creator)
- A practitioner approach: user enters the creator's code in a text field, saved as a RevenueCat subscriber attribute before purchase. - [RevenueCat community](https://community.revenuecat.com/third-party-integrations-53/running-a-creator-affiliate-program-on-revenuecat-what-actually-works-attribution-renewals-offer-code-limits-payouts-7791)
- The same thread argues per-creator Apple offer codes do not scale, citing a 10-active-offer cap per subscription. - [RevenueCat community](https://community.revenuecat.com/third-party-integrations-53/running-a-creator-affiliate-program-on-revenuecat-what-actually-works-attribution-renewals-offer-code-limits-payouts-7791)
- Apple offer codes: up to 10 active offers per app, 1 million codes per app per quarter; custom codes redeemable by many users up to a limit (25,000 per batch); one code per customer per offer; app must be Ready for Distribution and IAP approved. - [App Store Connect Help](https://developer-mdn.apple.com/help/app-store-connect/manage-in-app-purchases/create-offer-codes-for-in-app-purchases)
- Apple expanded custom product pages and offer codes in early 2026. - [iClarified](https://www.iclarified.com/98906/apple-expands-app-store-marketing-tools-with-more-custom-pages-offer-codes)
- Apple campaign links carry a campaign token and provider token; App Store Connect Analytics reports impressions, page views, downloads, sales and subscriptions per campaign token; custom product pages use a `ppid` URL parameter. - [App Store Connect Analytics Help](https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links/), [Adjust](https://help.adjust.com/en/article/app-store-custom-product-pages)
- Google Play Install Referrer: UTM-style referrer parameters appended to the Play URL are read by the app on first launch via the Install Referrer API. - [AppsFlyer glossary](https://www.appsflyer.com/glossary/install-referrer/), [Adjust help](https://help.adjust.com/en/article/measure-installs-with-google-play-install-referrer)

### Inferences
- Recommended flow: creator link `polingual.com/r/{code}` sets a cookie on web and passes the code through a deferred deep link to the app (Install Referrer on Android; on iOS, a clipboard-free fallback is a "Have a creator code?" field at onboarding, or an MMP such as Branch or AppsFlyer for deferred deep linking). The app writes `$creator_code` to RevenueCat and to a Supabase `referrals` table keyed by user ID. A RevenueCat webhook handler in Supabase credits 25% of net proceeds on INITIAL_PURCHASE and RENEWAL and claws back on REFUND.
- Base commission on net proceeds after Apple's 15% or 30% cut, or on gross; at gross, 25% plus Apple's 30% leaves Polingual 45% of the price in year one. This is a pricing decision for the founder.
- Apple campaign tokens give aggregate per-campaign reporting only; use them to compare creators, not to pay them.
- Use one shared offer code per creator tier, or Insert Affiliate's dynamic codes, to stay under the 10-active-offer limit.

### Gaps
- AppsFlyer, Adjust and Branch pricing for a small app: not researched.
- Whether Apple's AdAttributionKit or Attribution API gives user-level creator data: not verified.
- Superwall's role: it is a paywall tool that can read the stored creator attribute to show creator-specific offers; not verified in docs.

## Payout rails: Stripe Connect, stablecoins, PayPal, Tipalti, Trolley, Wise, and tax forms

### Takeaway
Stripe Connect is the default for Polingual since web billing already runs through Stripe; its stablecoin payouts to USDC wallets were in preview for US platforms and expanding through late 2026. Dub Partners offers USDC payouts out of the box at 0.5%. Collect W-9 from US creators and W-8BEN from foreign ones; issue 1099-NEC to US creators paid $600 or more a year (threshold not verified here).

### Cited Findings
- Stripe stablecoin payouts for Connect: private preview, US-based platforms only, recipients individuals or sole proprietors in supported countries; access by emailing Stripe; recipients link a wallet in the Express Dashboard and receive USDC. - [Stripe docs](https://docs.stripe.com/connect/stablecoin-payouts)
- Press reports (late 2026): US businesses can send stablecoin payments to wallets in 160+ markets via Global Payouts, wallet payouts in public preview early November 2026; since 26 October 2026 USDC balances can pay out to bank accounts in nine local currencies. Not confirmed on Stripe's own pages. - [crypto.news](https://crypto.news/stripe-us-stablecoin-payouts-160-markets/), [Crypto Briefing](https://cryptobriefing.com/stripe-stablecoin-payouts-crypto-wallets/)
- Stripe resource on stablecoin payout strategies for speed, cost and reach. - [Stripe](https://stripe.com/au/resources/more/stablecoin-payout-strategies-to-increase-speed-cut-costs-and-expand-reach)
- Dub: USDC payouts GA, 0.5% fee. - [Dub blog](https://dub.co/blog/stablecoin-payouts)
- SideShift handles 1099s and W-9s for creators paid through it. - [SideShift plans](https://sideshift.app/plans/brands)

### Inferences
- Simplest path: Stripe Connect Express accounts for creators. Stripe collects tax info and can file 1099s; creators who opt in get USDC once Polingual's platform is admitted to stablecoin payouts. If Stripe access lags, Dub Partners covers both tracking for web and USDC payout.
- Tipalti, Trolley and PayPal Payouts are alternatives for mass payouts with tax-form collection; Wise suits ad hoc international bank transfers. None researched within budget.
- Coinbase, Bridge (owned by Stripe) and Circle offer direct USDC payout APIs; using them means Polingual collects W-9 and W-8BEN itself.

### Gaps
- Stripe Connect fees per payout and stablecoin fee: not verified on Stripe pricing page.
- Tipalti, Trolley, PayPal Payouts, Wise, Coinbase, Bridge, Circle fees and features: not researched in this pass.
- 1099-NEC threshold for 2026 tax year and whether crypto payouts change reporting (1099-DA rules): not verified.

## App Store rules: can Polingual pay creators a share of IAP revenue and reward referring users?

### Takeaway
Nothing in the App Review Guidelines bars paying outside marketers or creators from the developer's own revenue; that is ordinary marketing spend outside the app. The risks are in-app: rewards for store actions (ratings, reviews, downloads) are banned, chart or review manipulation can get the developer expelled, and digital vouchers redeemable in-app must go through IAP.

### Cited Findings
- 3.2.2(x): apps must not force users to rate, review, download other apps or take other store-related actions to access functionality; apps may incentivize specific in-app actions such as completing a level or watching an ad. - [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Section 3 intro: attempts to manipulate reviews or inflate chart rankings with paid, incentivized, filtered or fake feedback, or via third-party services, may lead to expulsion from the Developer Program. - [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.5(v): crypto apps may not offer currency for tasks such as downloading other apps, encouraging other users to download, or posting to social networks. - [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 5.1.2(i): apps may not require enabling system features (push, location, tracking) to receive monetary or other compensation, including gift cards and codes. - [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.1: digital gift cards, vouchers and coupons redeemable for digital goods can only be sold in-app via IAP. - [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.1(a) and 3.1.3: on the US storefront, apps may include buttons and external links to other purchase methods; elsewhere they may not. - [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- The guidelines do not mention referral rewards or referral credits by name. - [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Inferences
- Creator rev share paid off-platform via Stripe or USDC is a marketing cost and sits outside App Review.
- A user-to-user referral reward ("give a friend a free month, get a free month") is safest delivered as an Apple offer code or a promotional offer, which keeps entitlements inside IAP.
- Paying cash or USDC to regular users for referring installs, run inside the iOS app, edges toward 3.1.5(v) and the chart-manipulation clause; keep cash rewards for creators enrolled via the web, and reward on paid conversions, not installs or reviews.
- In the US storefront Polingual can link from the app to a web checkout, where Stripe and Dub tracking work without the app store cut.
- FTC endorsement rules require creators to disclose paid relationships (#ad); include this in the creator terms.

### Gaps
- Section 5.6 (Developer Code of Conduct) text was truncated in the fetch and not quoted.
- Google Play policy on referral incentives was not checked.
