<!-- voice-ignore-file: transcript-derived digest -->
# "Generative AI for Trading and Asset Management" with Dr. Hamlet Medina and Dr. Ernest Chan | Quantopian | JgGOtCskLRg | 1.01 h

Teaches: Two authors of a generative AI for trading book describe what generative models add to quant finance (density modeling, synthetic data, anomaly detection, alternative data), the pitfalls, and career advice.

Claims:
- Generative models serve three goals: estimating a probability density of the data, generating similar data, and representation learning for downstream tasks. "for example generating data that is similar" [0:13:56]
- Ernest Chan says ChatGPT performance on financial questions is unreliable for numeric answers (example: it said to multiply returns by the square root of 252 to annualize), but useful for code and for summarizing papers when outputs are scrutinized or unit-tested. "multiply by the square root of 252" [0:20:15]
- Traditional machine learning models P(Y given X); the generative view models the joint P(X,Y), which needs fewer labeled examples, a semi-supervised shift. "is the notion of semi supervised learning" [0:24:00]
- A model of P(X) can flag out-of-distribution inputs and cut false positives, since a conditional classifier is forced to output a probability even for noise. "probably even if the input is noise" [0:27:34]
- Synthetic data can be validated by training on real plus synthetic data and checking out-of-sample performance on real data (train on synthetic, test on real). "data and after we check the performance" [0:31:39]
- Chan does not expect a large financial institution to let a large model approve or reject a loan soon. "the day that large financial institution will use large financial model" [0:52:40]

Architecture: Demo from their 2023 workshop: process Federal Reserve speeches (unstructured alternative data) with a language model to produce a trading signal that can be validated; described as a use case, not a full system [0:06:00]-[0:07:00].

Worked:
- The real-time speech signal demo drew good workshop feedback. "2023 we have a very good feedback" [0:06:55]
- Mixing synthetic data into training was reported to give good results in Medina's work. "data and i see a better result" [0:33:09]

Failed:
- ChatGPT is less helpful for numerical answers because you never know if it is correct; Chan quotes an example in the book. "you never know if it is correct" [0:20:01]
- Classifiers output confident wrong predictions on noise inputs. "art classifiers and they produce from predictions" [0:27:54]
- Many ML approaches suffer data snooping bias from engineering many features. "very much subject to data snooping bias" [0:39:44]
- Backtests of a beginner's LDA, QDA and SVM classifiers were terrible, and Chan says the lessons come from losses. "classification models so i'm still a beginner" [0:38:05]
- Safety instructions in chat models can be bypassed with prompting. "they do is like they add instruction" [0:51:21]
