import { describe, expect, it } from 'vitest';
import { normalizeProcessResumeResponse } from './api';

describe('normalizeProcessResumeResponse', () => {
  it('normalizes string-based skills and keywords into arrays', () => {
    const payload = {
      critique: 'test critique',
      required_skills: '- Docker\n- Terraform\n- Jenkins',
      missing_keywords: 'Observability, Service Mesh, DNS',
      updated_resume_latex: 'latex',
      surgical_patches: [],
      patch_report: { items: [] },
      job_description: 'jd',
    };

    const result = normalizeProcessResumeResponse(payload);

    expect(result.required_skills).toEqual(['Docker', 'Terraform', 'Jenkins']);
    expect(result.missing_keywords).toEqual(['Observability', 'Service Mesh', 'DNS']);
    expect(result.analysis_warnings.length).toBeGreaterThan(0);
  });

  it('keeps deterministic patch report defaults for malformed report payload', () => {
    const payload = {
      critique: 'ok',
      required_skills: [],
      missing_keywords: [],
      updated_resume_latex: 'latex',
      surgical_patches: [{ search_text: 'a', replace_with: 'b' }],
      patch_report: 'bad',
      job_description: 'jd',
    };

    const result = normalizeProcessResumeResponse(payload);

    expect(result.patch_report.total_patches).toBe(1);
    expect(result.patch_report.items).toEqual([]);
  });
});
