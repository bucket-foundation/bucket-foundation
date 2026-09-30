import itertools
import json
from collections import deque
from pathlib import Path
import numpy as np

SEED = 20260925


class InvalidGraph(ValueError):
    pass


def plan(parents, target, mastery, foundations):
    visiting, closure, order = set(), set(), []

    def visit(v):
        if v not in parents:
            raise InvalidGraph('missing_node')
        if v in visiting:
            raise InvalidGraph('cycle')
        if v in closure:
            return
        visiting.add(v)
        if not parents[v] and v not in foundations:
            raise InvalidGraph('unreviewed_foundation')
        for p in sorted(parents[v]):
            visit(p)
        visiting.remove(v)
        closure.add(v)
        order.append(v)

    visit(target)
    if any(not parents[v] <= mastery for v in closure & mastery):
        raise InvalidGraph('mastery_conflict')
    return [v for v in order if v not in mastery], closure


def state_distance(parents, target, mastery):
    initial = frozenset(mastery)
    queue = deque([(initial, 0)])
    seen = {initial}
    while queue:
        known, distance = queue.popleft()
        if target in known:
            return distance
        for v, required in parents.items():
            if v not in known and required <= known:
                nxt = known | {v}
                if nxt not in seen:
                    seen.add(nxt)
                    queue.append((nxt, distance + 1))
    return None


def graph_analysis():
    cases = errors = readiness_errors = inclusion_errors = graphs = 0
    for n in range(1, 6):
        edges = list(itertools.combinations(range(n), 2))
        for bits in range(1 << len(edges)):
            parents = {i: set() for i in range(n)}
            for k, (p, v) in enumerate(edges):
                if bits & (1 << k):
                    parents[v].add(p)
            graphs += 1
            foundations = {v for v in parents if not parents[v]}
            for mask in range(1 << n):
                mastery = {v for v in parents if mask & (1 << v)}
                if any(not parents[v] <= mastery for v in mastery):
                    continue
                for target in parents:
                    sequence, closure = plan(parents, target, mastery, foundations)
                    distance = state_distance(parents, target, mastery)
                    errors += len(sequence) != distance
                    inclusion_errors += set(sequence) != closure - mastery
                    known = set(mastery)
                    for v in sequence:
                        readiness_errors += not parents[v] <= known
                        known.add(v)
                    cases += 1
    assert errors == readiness_errors == inclusion_errors == 0
    fixtures = {}
    diamond = {0: set(), 1: {0}, 2: {0}, 3: {1, 2}, 4: set()}
    for name, parents, mastery, roots in [
        ('diamond_disconnected', diamond, set(), {0, 4}),
        ('shortcut', {0: set(), 1: {0}, 2: {0, 1}}, set(), {0}),
        ('mastered_target', diamond, {0, 1, 2, 3}, {0, 4}),
        ('unmastered_root', {0: set()}, set(), {0}),
        ('cycle', {0: {1}, 1: {0}}, set(), set()),
        ('mastery_conflict', diamond, {3}, {0, 4}),
        ('unreviewed_foundation', {0: set()}, set(), set()),
        ('missing_node', {0: {1}}, set(), set()),
    ]:
        target = 3 if parents is diamond else max(parents)
        try:
            sequence, _ = plan(parents, target, mastery, roots)
            fixtures[name] = {'sequence': sequence, 'distance': len(sequence)}
        except InvalidGraph as error:
            fixtures[name] = {'error': str(error)}
    assert fixtures['cycle']['error'] == 'cycle'
    assert fixtures['mastery_conflict']['error'] == 'mastery_conflict'
    assert fixtures['unmastered_root']['distance'] == 1
    assert fixtures['mastered_target']['distance'] == 0
    assert fixtures['missing_node']['error'] == 'missing_node'
    assert fixtures['unreviewed_foundation']['error'] == 'unreviewed_foundation'
    assert fixtures['diamond_disconnected']['distance'] == 4
    assert 4 not in fixtures['diamond_disconnected']['sequence']
    assert fixtures['shortcut']['distance'] == 3
    assert fixtures['shortcut']['sequence'] == [0, 1, 2]
    queue = deque([[3]])
    while queue:
        backward_chain = queue.popleft()
        if not diamond[backward_chain[-1]]:
            break
        queue.extend(backward_chain + [p] for p in sorted(diamond[backward_chain[-1]]))
    chain = backward_chain[::-1]
    sequence, closure = plan(diamond, 3, set(), {0, 4})
    omitted = sorted(closure - set(chain))
    assert omitted and len(chain) < state_distance(diamond, 3, set())
    known = set()
    chain_readiness_failures = []
    for v in chain:
        if not diamond[v] <= known:
            chain_readiness_failures.append(v)
        known.add(v)
    assert chain_readiness_failures == [3]
    fixtures['naive_chain_counterexample'] = {'chain': chain, 'readiness_failures': chain_readiness_failures, 'omitted_required': omitted, 'chain_nodes': len(chain), 'minimum_learning_nodes': len(sequence)}
    disjoint = {0: set(), 1: {0}, 2: {0}, 3: {1, 2}, 4: set(), 5: {4}}
    unrelated_mastery = {5}
    local_sequence, local_closure = plan(disjoint, 3, unrelated_mastery, {0, 4})
    empty_sequence, _ = plan(disjoint, 3, set(), {0, 4})
    restricted_mastery = unrelated_mastery & local_closure
    restricted_graph = {v: disjoint[v] for v in local_closure}
    restricted_distance = state_distance(restricted_graph, 3, restricted_mastery)
    assert local_sequence == empty_sequence == [0, 1, 2, 3]
    assert restricted_distance == 4
    assert restricted_mastery == set()
    fixtures['unrelated_inconsistent_mastery'] = {'sequence': local_sequence, 'target_closure': sorted(local_closure), 'chart_mastered_nodes': sorted(restricted_mastery), 'restricted_reference_distance': restricted_distance}
    return {'dags': graphs, 'valid_mastery_target_cases': cases, 'distance_errors': errors, 'readiness_errors': readiness_errors, 'required_inclusion_errors': inclusion_errors, 'fixtures': fixtures}


def axis_analysis():
    def coordinates(supports, mastery):
        allocation = np.array([[int(axis in set(s)) / len(set(s)) for axis in ('a', 'b')] for s in supports])
        denominators = allocation.sum(axis=0)
        g = (allocation * np.array(mastery)[:, None]).sum(axis=0) / denominators
        return {'coordinates': g.tolist(), 'denominators': denominators.tolist(), 'coverage': float(denominators @ g / denominators.sum()), 'extent_squared': float(denominators @ (g * g) / denominators.sum())}
    supports = [('a',), ('b',), ('a', 'b')]
    results = [coordinates(supports, m) for m in ([0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1])]
    assert np.allclose(results[1]['coordinates'], [2 / 3, 0])
    assert np.isclose(results[1]['extent_squared'], 2 / 9)
    assert np.allclose([r['coverage'] for r in results], [0, 1 / 3, 2 / 3, 1])
    for m in itertools.product([0, 1], repeat=3):
        assert coordinates(supports, m) == coordinates([('a',), ('b',), ('a', 'a', 'b')], m)
        for k in range(3):
            increased = list(m)
            increased[k] = 1
            assert coordinates(supports, increased)['extent_squared'] >= coordinates(supports, m)['extent_squared']
    return {'milestones': results, 'duplicate_invariance': True, 'all_binary_mastery_monotonicity': True}


def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -30, 30)))


def fit(x, y):
    beta = np.zeros(x.shape[1])
    for _ in range(40):
        p = sigmoid(x @ beta)
        gradient = x.T @ (p - y) + .01 * beta
        hessian = (x.T * (p * (1 - p))) @ x + .01 * np.eye(x.shape[1])
        step = np.linalg.solve(hessian, gradient)
        beta -= step
        if np.linalg.norm(step) < 1e-8:
            break
    return beta


def statistical_analysis():
    rng = np.random.default_rng(SEED)
    n, items = 1200, 8
    axes = rng.normal(size=(n, 2))
    prerequisites = rng.binomial(1, sigmoid(axes[:, 0]))
    latent = rng.normal(size=n)
    difficulty = np.linspace(-.9, .9, items)
    item_axis = np.arange(items) % 2
    logits = difficulty[None, :] + 1.1 * axes[:, item_axis] + .65 * prerequisites[:, None]
    logits[:, :2] += 1.8 * latent[:, None]
    y = rng.binomial(1, sigmoid(logits)).astype(float)
    item_features = np.tile(np.eye(items), (n, 1))
    axis_features = np.zeros((n, items, 2))
    for item in range(items):
        axis_features[:, item, item_axis[item]] = axes[:, item_axis[item]]
    features = {
        'intercept': np.ones((n * items, 1)),
        'item_baseline': item_features,
        'prerequisite_axis': np.column_stack([item_features, axis_features.reshape(-1, 2), np.repeat(prerequisites, items)]),
    }
    train, calibration, test = slice(0, 400 * items), slice(400 * items, 600 * items), slice(600 * items, n * items)
    response = y.ravel()
    metrics, predictions = {}, {}
    for name, x in features.items():
        beta = fit(x[train], response[train])
        raw = x @ beta
        calibration_x = np.column_stack([np.ones(200 * items), raw[calibration]])
        calibrator = fit(calibration_x, response[calibration])
        p = sigmoid(np.column_stack([np.ones(600 * items), raw[test]]) @ calibrator)
        truth = response[test]
        bins = []
        for low in np.arange(0, 1, .1):
            selected = (p >= low) & (p < low + .1)
            if selected.any():
                bins.append({'lower': round(float(low), 1), 'n': int(selected.sum()), 'predicted': float(p[selected].mean()), 'observed': float(truth[selected].mean())})
        metrics[name] = {'brier': float(np.mean((truth - p) ** 2)), 'calibration_bins': bins, 'calibration_intercept_slope': calibrator.tolist()}
        predictions[name] = p.reshape(600, items)
    residual = y[600:] - predictions['prerequisite_axis']
    pairs = {'planted_shared_latent': (0, 1), 'control': (2, 3)}
    correlations = {}
    indices = rng.integers(0, 600, size=(2000, 600))
    for name, (a, b) in pairs.items():
        point = float(np.corrcoef(residual[:, a], residual[:, b])[0, 1])
        boot = np.array([np.corrcoef(residual[idx, a], residual[idx, b])[0, 1] for idx in indices])
        interval = np.quantile(boot, [.0125, .9875]).tolist()
        permutation = np.array([np.corrcoef(residual[rng.permutation(600), a], residual[:, b])[0, 1] for _ in range(2000)])
        p_value = float((1 + np.sum(np.abs(permutation) >= abs(point))) / 2001)
        correlations[name] = {'items': [a, b], 'correlation': point, 'permutation_p': p_value, 'bonferroni_97_5_percent_bootstrap_interval': interval, 'excludes_zero': bool(interval[0] > 0 or interval[1] < 0)}
    running = 0.0
    for rank, name in enumerate(sorted(correlations, key=lambda key: correlations[key]['permutation_p'])):
        running = max(running, min(1.0, (len(pairs) - rank) * correlations[name]['permutation_p']))
        correlations[name]['holm_adjusted_p'] = running
    return {'source': 'synthetic_only', 'seed': SEED, 'learners': {'train': 400, 'calibration': 200, 'test': 600}, 'items_per_learner': items, 'bootstrap_replicates': 2000, 'models': metrics, 'residual_correlations': correlations, 'prerequisite_axis_brier_improvement_over_item': metrics['item_baseline']['brier'] - metrics['prerequisite_axis']['brier'], 'efficacy_claim': False}


def main():
    result = {'graphs': graph_analysis(), 'axes': axis_analysis(), 'statistics': statistical_analysis()}
    destination = Path(__file__).parent / 'results' / 'metrics.json'
    destination.parent.mkdir(exist_ok=True)
    destination.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'output': str(destination), 'graph_cases': result['graphs']['valid_mastery_target_cases'], 'distance_errors': result['graphs']['distance_errors'], 'brier': {k: v['brier'] for k, v in result['statistics']['models'].items()}, 'residual_correlations': result['statistics']['residual_correlations']}, indent=2))


if __name__ == '__main__':
    main()
