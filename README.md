https://bucket.foundation

# Background

Bucket.Foundation is an idea that I have brainstormed in my head for quite some time while in school, reading papers and doing independent research. Having an IP Management system was an integral puzzle piece to the fruition of the project, so Story had the exact technology that I needed to complete a life project of mine that I deeply care about.

# Problem

There is a high barrier of entry into the research industry due to:

1. **Access to Research is Expensive**  
   Researchers have to pay publishers to publish their research and pay them again to access the papers in publishers' journals. The price on knowledge is an inhibitor for curious individuals and aspiring students to conduct research, let alone read research papers. Independent researchers who either pay too much for journal subscriptions or need to pay for individual papers may waste money on useless papers because they didn't get to read the paper before they cited it.

2. **Research Papers are Difficult to Read**  
   Research papers are written for a specific genre of journals, which are reviewed and read by peer reviewers and researchers in the same field. It is difficult enough for a researcher in the field to understand a peer's work; imagine someone not in the field. This leads to segmentation in knowledge and a lack of interdisciplinary discussion, thought, and human evolution. From a data science perspective, one cannot make a mapping of all the research ever conducted in the publishing system because they are all disjoint databases from different publishing companies owning unique journals.

# Description

Bucket is a platform for free-to-read and paid-to-cite research. This allows for a freedom of knowledge that enables all students, curious individuals, or independent researchers to leverage a research system that is not owned by publishing companies, which creates innovative inefficiencies. Bucket.Foundation cares about the evolution of knowledge, and a free-to-read, pay-to-cite platform does just that. In this project, I have built the free-to-read, paid-to-cite part of the platform, but there is more to come, including a pre-publish peer-reviewing system and a citation market price calculator. 

One may wonder why, if the knowledge is available for free on the platform, someone wouldn't just download it and run with it. Well, citations are NFT tokens that will have a market value and fluctuate in price based on dimensions such as quality, ingenuity, authorship, demand (in terms of free NFT downloads), and more.

# Tools and Functionality

Bucket uses **Story**, **Walrus**, **Dynamic**, and **Supabase** to build a hybrid platform hosted on Vercel. 

- **Story** is used for:
  - Minting/registering/licensing research for publishing
  - Minting noncommercial research for reading and early research
  - Minting citation license tokens for citing research
  - Managing IP

- **Walrus** is used for:
  - Storing research data on-chain
  - Storing NFT data on-chain
  - Storing IP data on-chain
  - Retrieving data for web interactivity

- **Dynamic** is used for:
  - Authentication for web3 beginner and veteran researchers
  - Webhooks to populate user data in conjunction with Supabase

- **Supabase** is used for:
  - Storing Walrus keys
  - Storing Story transaction hashes and keys
  - Quick retrieval of blockchain duplicate data (e.g., title, description for research NFT)
  - Retrieval of data stored on Walrus
  - Retrieval of NFT and Token Data on Story Protocol
  - Hydrating the www.bucket.foundation website with data

# User Experience

## Dynamic Auth
- Button for Dynamic Auth

## Home Tab
- The home tab provides an explanation of the Bucket Platform for users.

## Library Tab  
- The Library Tab allows users to browse research IP Assets, mint a free noncommercial NFT PDF to read, and mint a paid commercial citation token to be attached to other research IP Assets.

## Research Tab
- The Research Tab allows users to upload a title, description, research paper PDF, and citation tokens to a Research IP Asset and mint/register/attach a license.

## Assets Tab
- The Assets Tab is where users can access all of their Story Protocol NFTs, including Research IP Assets, Citation Tokens, and Read NFTs.
# Knowledge
## Mint Read Token
### Steps
## Mint Citation Token
### Steps
# Research
## Mint Research IPAsset
### Steps
## Add File to IPFS
### Steps
## Attach License Terms
### Steps
## Mint License
### Steps
## Mint Royalty
### Steps

# Backend
## Walrus
### Aggregator
endpoint:
https://walrus.aggregator.agfarms.dev

example usage with curl:
curl "https://walrus.aggregator.agfarms.dev/v1/<some blob ID>" -o <some file name>

### Publisher
endpoint:
https://walrus.publisher.agfarms.dev

example usage with curl: 
curl -X PUT "https://walrus.publisher.agfarms.dev/v1/store" -d "some string"
curl -X PUT "https://walrus.publisher.agfarms.dev/v1/store?epochs=5" --upload-file "some/file"

