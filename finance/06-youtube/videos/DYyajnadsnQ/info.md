<!-- voice-ignore-file -->
# What is Portfolio Management? | Explained

- **Video ID**: `DYyajnadsnQ`
- **URL**: https://www.youtube.com/watch?v=DYyajnadsnQ
- **Channel**: QuantInsti Quantitative Learning — https://www.youtube.com/channel/UC8kXgHG13XdgsigIPRmrIyA
- **Uploaded**: 20200703
- **Duration**: 6:28 (388s)
- **Views**: 973  ·  **Likes**: 14
- **Captured**: 2026-11-27T10:04:38

## Description

In a portfolio, you have a single strategy or single stocks You can think of them as a single stream of returns - it can be just a strategy or just a buy-hold of a single stock.

Portfolio management on the other hand is a meta strategy that means a strategy for strategies. That meta strategy is concerned about risks, the uncertainties that we talked about and context, and the period of time. If we think about it in terms of maths, the value of a strategy is effectively the positions that you have taken on the line and then the underlying return that is for one period then it goes on multiplying and accumulating for periods over periods.

If you're not familiar with mathematical notations, which is absolutely fine it's not important, what is important is to get the idea. So the idea is that the value of the strategy is driven by the underlying returns multiplied by your positions in the underlying. So, here the greek symbol phi is the position that you have taken so that is T-1 that is the day before or the time period before you are computing the returns of the underlying and S is the returns of the underlying for period T.

On the same line, the portfolio value is very similar. So instead of ST the underlying strategy we are replacing it with RT which is the strategy returns itself. For example, if your underlying is stock and your strategy is long only so Pi 5 will always remain 1 and S will be just simply the returns of the stock and then RT will be the product of 2, which is again just the return of the stock and then we are weighing it by the allocation to it. That's where the factor W comes in.

For example; if you have total investment capital of a hundred thousand dollars and your underlying universe is around 10 stocks and you're investing equally in each one of them, so W for each will remain as 0.1 or 10 percent, so this is a portfolio value.

Basically, the strategy value is the stream of the underlying stream of returns and portfolio value is the weighted underlying stream of returns. Portfolio management is about solving this mathematical problem that you see here which is we define a function U, which is a function of the portfolio value P and for a particular definition of U we try to find the weights W that satisfy a maximization condition.

We want to find those allocations (those weights W) in such a manner so that it maximizes U, which is a function of P which is a portfolio value. Depending on what U is and how we define the function and how we do the optimization, we have a wide range of possibilities. For example; how we define U, that defines many ways of optimization like mean-variance optimization, kelly optimization, risk parity optimization etc.

How we optimize it defines whether it's a static optimization that means you just optimize for a particular period to the next period or you want to optimize it in a dynamic manner so almost continuously rebalancing your portfolio or what are the types of constraints that are specified in this optimization problem. For example; if you specify that your W only varies between zero to one, that means you're trying to build a long only portfolio, you cannot go short or you can even go for a long short or leveraged portfolio.

How we choose the state of the underlying return stream that determines how you're building the portfolios, the pillars whether it is a set of alpha strategies, like the examples that we just saw or it is a factor portfolio. If you don't know about what a factor portfolio is, don't worry we'll have a closer look at it. The value portfolio is just a bunch of stocks. This is more or less what portfolio management is in a nutshell.

You are trying to define a meta strategy that satisfies a maximization condition so that your portfolio value is maximized or rather a function of your portfolio value is maximized. If you have to define what is portfolio management I’d say this is very close to a definition.

Say, we have N different strategies or say stocks so can we just invest equally in everything to build our portfolio? Actually, this is a very good question. Many people think that probably the answer will be no but under certain circumstances, the answer is probably yes.

-----------------------------------------
This is a clip from our webinar 'Quantitative Portfolio Management Strategies'.
Complete webinar video recording: https://youtu.be/73gr7qkQedo
Slides: https://blog.quantinsti.com/why-algo-trading-webinar-12-december-2019/
-----------------------------------------
Most useful links:
Join EPAT – Executive Programme in Algorithmic Trading: https://goo.gl/3Oyf2B
Visit us at: https://www.quantinsti.com/

Like and Follow us on:
Facebook: https://www.facebook.com/quantinsti/
Twitter: https://twitter.com/QuantInsti
LinkedIn: https://www.linkedin.com/school/quantinsti/
Instagram: https://www.instagram.com/quantinstian/

#algotrading #portfolio #stockmarkets #stocks #quantinsti #trader #algotradingcourse

## Chapters

- `0s` — Defining strategy types
- `52s` — Mathematical modeling
- `182s` — Portfolio optimization
- `332s` — Strategic allocation

## Files

- `metadata.json` — full yt-dlp dump
- `transcript.txt` — plain text
- `transcript.vtt` — original captions
- `transcript.json` — timestamped chunks
- `chapters.json` — chapter markers
- `thumbnail.jpg`
