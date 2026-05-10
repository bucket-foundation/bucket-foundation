# Drawing and Recognizing Chinese Characters with Recurrent Neural Network.

- **PMID**: 28436845
- **DOI**: 10.1109/TPAMI.2017.2695539
- **PMCID**:  
- **Journal**: IEEE transactions on pattern analysis and machine intelligence  ·  **Year**: 2018
- **Authors**: Xu-Yao Zhang, Fei Yin, Yan-Ming Zhang, Cheng-Lin Liu, Yoshua Bengio
- **MeSH**: 
- **URL**: https://pubmed.ncbi.nlm.nih.gov/28436845/
- **Captured**: 2026-05-10T14:07:27

## Abstract

Recent deep learning based approaches have achieved great success on handwriting recognition. Chinese characters are among the most widely adopted writing systems in the world. Previous research has mainly focused on recognizing handwritten Chinese characters. However, recognition is only one aspect for understanding a language, another challenging and interesting task is to teach a machine to automatically write (pictographic) Chinese characters. In this paper, we propose a framework by using the recurrent neural network (RNN) as both a discriminative model for recognizing Chinese characters and a generative model for drawing (generating) Chinese characters. To recognize Chinese characters, previous methods usually adopt the convolutional neural network (CNN) models which require transforming the online handwriting trajectory into image-like representations. Instead, our RNN based approach is an end-to-end system which directly deals with the sequential structure and does not require any domain-specific knowledge. With the RNN system (combining an LSTM and GRU), state-of-the-art performance can be achieved on the ICDAR-2013 competition database. Furthermore, under the RNN framework, a conditional generative model with character embedding is proposed for automatically drawing recognizable Chinese characters. The generated characters (in vector format) are human-readable and also can be recognized by the discriminative RNN model with high accuracy. Experimental results verify the effectiveness of using RNNs as both generative and discriminative models for the tasks of drawing and recognizing Chinese characters.
