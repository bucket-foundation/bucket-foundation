<!-- voice-ignore-file: transcript-derived digest -->
# 10. Regularized Pricing and Risk Models | MIT OpenCourseWare | aga-Tak3c3M | 1.50 h

Teaches: A Morgan Stanley rates quant (guest speaker Ivan Masyukov) walks from bond yield and duration through swaps, spline yield curves and hedging by principal components to Tikhonov-regularized calibration of a two-dimensional volatility surface.

Claims:
- A bond price is the sum of cash flows times discount factors; with one yield, discount factor = e^(-y t_i). Price is observed in the market and yield is a way to align cash flows with it. "align future cash flows with the bond" [0:10:37]
- Duration (price sensitivity to yield, normalized by price) is a weighted average of cash-flow times; a zero-coupon bond has duration equal to maturity and a coupon bond has less; convexity captures large moves. "zero coupon bond equals to maturity duration" [0:14:10]
- A swap exchanges fixed for floating (3-month LIBOR) payments and costs nothing to enter; the swap rate is a discount-weighted average of forward rates and is what traders quote. "swap that fixed in exchange of floating" [0:21:02]
- The curve is an ill-posed problem: moving one input by 1 basis point moves forward rates by up to 14 basis points. "in the curve reaches 14 basis points" [0:37:32]
- Hedging every risk bucket of his example portfolio costs about $3.6 million; hedging with five liquid swaps (1, 2, 5, 10, 30 years) found by PCA drops cost by orders of magnitude (the lecturer says "something like 400"). "just pick five swaps that are liquid" [0:43:52]
- The bond-swap spread is traded and is more liquid than the 10-year swap itself, so curves are built from the bond yield plus the spread rather than the raw swap quote. "the spread between the 10 year swap" [0:35:47]
- Volatility surface calibration: a 240 by 240 triangle (about 28K unknowns, 3-month steps over 60 years) with few instruments is underdetermined; exact calibration yields a "Manhattan skyline", and a 1% change in one swaption quote produces a large change. "quite large change of the volatility surface" [1:05:57]
- Fix: use smooth 2-D B-spline basis functions and minimize pricing error plus penalties on surface gradients; singular values explain the instability and the condition number is max over min singular value. Tikhonov regularization and truncated SVD limit amplification. "you add some penalty to the amplitude" [1:14:54]


Worked:
- A real-time calibrator works because most of the linear algebra (A^T A) is precomputed; traders see anomalies and trade them as relative value. "a real time calibrator the reason why" [1:24:56]
- Smoothness-regularized hedges rest on a fundamental principle and should stay more stable than historical PCA. "your model is based on fundamental principle" [1:26:35]

Failed:
- PCA hedging is attuned to history, ignores the ordering of maturities, is sensitive to outliers and overfits; if coefficients change daily the cost is too high. "outputs and if those coefficients change daily" [0:49:24]
- A square-Jacobian Newton-Raphson calibration is common but often wrong because it is unstable. "often is wrong approach it produces unstable" [1:03:50]
- Regularization biases the solution (smoother than reality) and a textbook penalty on amplitude gives a poor result for this problem. "acceptable it might cause a biased solution" [1:18:39]
- Single-parameter yield models assume parallel rate moves, which the speaker says no longer holds with a steep curve. "all rates go like in a parallel" [0:14:44]
- Bond-based curves are harder because on-the-run and off-the-run bonds produce roll effects. "be stable just because those roll effects" [1:29:01]
