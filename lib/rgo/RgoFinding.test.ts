import assert from 'node:assert/strict';
import test from 'node:test';
import { createN05RgoMeshMessage, deriveRgoDual, validateRgoFinding } from './RgoFinding';

const base = {
  schema_version: '1.0.0' as const,
  finding_id: 'n05-1',
  object_id: 'o1',
  timestamp: new Date().toISOString(),
  correlation_id: 'c1',
  trace_id: 't1',
  source: { system: 'N05', module: 'test', version: '1.0.0' },
  epistemic: { mode: 'INSPECTION' as const, verification_state: 'VERIFIED' as const },
  actionability: { status: 'ACTIONABLE' as const },
  failure: { type: 'BUG', description: 'test', nature: 'functional' },
  correction_boundary: { problem_to_resolve: 'test', required_property: 'validation' },
  dual: { status: 'UNRESOLVED' as const },
  evidence: [{ id: 'e1', kind: 'test', ref: 'test://rgo' }],
  provenance: { origin: 'test', input_hash: 'sha256:test' },
};

test('N05 RGO derives dual only from the declared correction boundary', () => {
  assert.equal(deriveRgoDual(base).dual.status, 'DERIVED_FROM_CONTRACT');
  assert.deepEqual(deriveRgoDual({ ...base, correction_boundary: { ...base.correction_boundary, required_property: '' } }).dual, { status: 'UNRESOLVED' });
});

test('N05 RGO validates identity, provenance and evidence before Mesh emission', () => {
  assert.doesNotThrow(() => validateRgoFinding(base));
  assert.throws(() => validateRgoFinding({ ...base, evidence: [] }), /RGO_EVIDENCE_REQUIRED/);
});

test('N05 RGO emits canonical Mesh finding event without changing source authority', () => {
  const msg = createN05RgoMeshMessage(base);
  assert.equal(msg.source, 'N05');
  assert.equal(msg.target, 'N07');
  assert.equal(msg.capability, 'rgo.finding.ingest');
  assert.equal(msg.correlationId, 'c1');
  assert.equal(msg.meta?.traceId, 't1');
});
