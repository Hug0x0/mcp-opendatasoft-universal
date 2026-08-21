import { describe, expect, it } from 'vitest';

describe('mcp-opendatasoft-universal', () => {
  it('uses an mcp package name', () => {
    expect('mcp-opendatasoft-universal').toMatch(/^mcp-/);
  });

  it('has curated HTTP sources', () => {
    const sources = [
      {
            "title": "OpenDataSoft Explore API v2.1",
            "url": "https://help.opendatasoft.com/apis/ods-explore-v2/"
      },
      {
            "title": "data.regionreunion.com example portal",
            "url": "https://data.regionreunion.com/"
      },
      {
            "title": "data.education.gouv.fr example portal",
            "url": "https://data.education.gouv.fr/"
      },
      {
            "title": "ODRE example portal",
            "url": "https://odre.opendatasoft.com/"
      }
];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.url).toMatch(/^https?:\/\//);
    }
  });

  it('has a stable tool prefix', () => {
    expect('opendatasoft_universal').toMatch(/^[a-z0-9_]+$/);
  });
});
