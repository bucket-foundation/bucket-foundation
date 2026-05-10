# ZORB: A Derivative-Free Backpropagation Algorithm for Neural Networks

- **arXiv ID**: `2011.08895`
- **URL**: https://arxiv.org/abs/2011.08895
- **Authors**: Varun Ranganathan, Alex Lewandowski
- **Published**: 2020-11-17T19:29:47Z
- **Updated**: 2020-11-17T19:29:47Z
- **Primary category**: cs.LG
- **All categories**: cs.LG, cs.NE, stat.ML
- **Captured**: 2026-05-10T13:50:11

## Abstract

Gradient descent and backpropagation have enabled neural networks to achieve remarkable results in many real-world applications. Despite ongoing success, training a neural network with gradient descent can be a slow and strenuous affair. We present a simple yet faster training algorithm called Zeroth-Order Relaxed Backpropagation (ZORB). Instead of calculating gradients, ZORB uses the pseudoinverse of targets to backpropagate information. ZORB is designed to reduce the time required to train deep neural networks without penalizing performance. To illustrate the speed up, we trained a feed-forward neural network with 11 layers on MNIST and observed that ZORB converged 300 times faster than Adam while achieving a comparable error rate, without any hyperparameter tuning. We also broaden the scope of ZORB to convolutional neural networks, and apply it to subsamples of the CIFAR-10 dataset. Experiments on standard classification and regression benchmarks demonstrate ZORB's advantage over traditional backpropagation with Gradient Descent.
