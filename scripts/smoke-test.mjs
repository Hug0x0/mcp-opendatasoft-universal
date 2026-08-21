#!/usr/bin/env node

const sources = [
  [
    "OpenDataSoft Explore API v2.1",
    "https://help.opendatasoft.com/apis/ods-explore-v2/"
  ],
  [
    "data.regionreunion.com example portal",
    "https://data.regionreunion.com/"
  ],
  [
    "data.education.gouv.fr example portal",
    "https://data.education.gouv.fr/"
  ],
  [
    "ODRE example portal",
    "https://odre.opendatasoft.com/"
  ]
];
let failures = 0;

for (const [title, url] of sources) {
  try {
    const response = await fetch(url, { headers: { Accept: 'text/html,application/json,*/*', 'User-Agent': 'mcp-opendatasoft-universal-smoke/0.1' } });
    const body = await response.text();
    const ok = response.ok && body.length > 50;
    console.log(`${ok ? 'OK' : 'FAIL'} ${response.status} ${title} ${url}`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${title} ${url} ${error.message}`);
  }
}

process.exitCode = failures === 0 ? 0 : 1;
