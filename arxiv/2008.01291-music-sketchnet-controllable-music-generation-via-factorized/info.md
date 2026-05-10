# Music SketchNet: Controllable Music Generation via Factorized Representations of Pitch and Rhythm

- **arXiv ID**: `2008.01291`
- **URL**: https://arxiv.org/abs/2008.01291
- **Authors**: Ke Chen, Cheng-i Wang, Taylor Berg-Kirkpatrick, Shlomo Dubnov
- **Published**: 2020-08-04T02:49:57Z
- **Updated**: 2020-08-04T02:49:57Z
- **Primary category**: cs.LG
- **All categories**: cs.LG, cs.MM, cs.SD, eess.AS, stat.ML
- **Captured**: 2026-05-10T15:29:16

## Abstract

Drawing an analogy with automatic image completion systems, we propose Music SketchNet, a neural network framework that allows users to specify partial musical ideas guiding automatic music generation. We focus on generating the missing measures in incomplete monophonic musical pieces, conditioned on surrounding context, and optionally guided by user-specified pitch and rhythm snippets. First, we introduce SketchVAE, a novel variational autoencoder that explicitly factorizes rhythm and pitch contour to form the basis of our proposed model. Then we introduce two discriminative architectures, SketchInpainter and SketchConnector, that in conjunction perform the guided music completion, filling in representations for the missing measures conditioned on surrounding context and user-specified snippets. We evaluate SketchNet on a standard dataset of Irish folk music and compare with models from recent works. When used for music completion, our approach outperforms the state-of-the-art both in terms of objective metrics and subjective listening tests. Finally, we demonstrate that our model can successfully incorporate user-specified snippets during the generation process.
