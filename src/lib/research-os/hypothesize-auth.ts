export function authorizeHypothesize(
  production: { learner_id?: string } | null,
  learnerId: string,
): boolean {
  return production !== null && production.learner_id === learnerId;
}
