import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveRgoDual, createN05RgoMeshMessage } from './RgoFinding';
const base={schema_version:'1.0.0' as const,finding_id:'n05-1',object_id:'o1',timestamp:new Date().toISOString(),correlation_id:'c1',trace_id:'t1',source:{system:'test',module:'rgo',version:'1.0.0'},epistemic:{mode:'INSPECTION' as const,verification_state:'VERIFIED' as const},actionability:{status:'ACTIONABLE' as const},failure:{type:'BUG',description:'x',nature:'test'},correction_boundary:{problem_to_resolve:'x',required_property:'validate'},dual:{status:'UNRESOLVED' as const},evidence:[{id:'e1',kind:'test',ref:'test://rgo'}],provenance:{origin:'test',input_hash:'sha256:x'}};
test('N05 RGO derives only from declared correction boundary',()=>{assert.equal(deriveRgoDual(base).dual.status,'DERIVED_FROM_CONTRACT');});
test('N05 RGO builds a Mesh event',()=>{assert.equal(createN05RgoMeshMessage(base).capability,'rgo.finding.ingest');});
