## Short Description 
    (280 Characters)
Bucket is a research platform that allows free to read and paid to cite research.

## Description


Change Knowledge to Explore
Get rid of library or make Knowledge Library

Library, Research, Assets

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

