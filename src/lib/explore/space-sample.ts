import { parseAdvisorReview, parsePrimeDirections } from "../research-os/advisor-review";
import { fromAdvisorReview, type Dataset } from "./space";
import sampleReview from "./fixtures/advisors.sample.json";
import samplePrime from "./fixtures/prime.sample.json";

export function sampleDataset(): Dataset {
  return fromAdvisorReview(parseAdvisorReview(sampleReview), parsePrimeDirections(samplePrime), true);
}
