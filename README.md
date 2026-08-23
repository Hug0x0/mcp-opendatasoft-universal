# mcp-opendatasoft-universal

Universal MCP server for querying any OpenDataSoft Explore v2.1 portal.

## Tools

Run the MCP and call `opendatasoft_universal_get_sources` first to inspect source coverage. This server also exposes domain-specific tools for the topic described above.

Core tools include catalog search, dataset inspection, record queries, and aggregate queries for any OpenDataSoft Explore v2.1 portal.

## Install

```bash
npm install
npm run build
npm test
npm run dev
```

## Claude Desktop

```json
{
  "mcpServers": {
    "opendatasoft-universal": {
      "command": "npx",
      "args": ["mcp-opendatasoft-universal"]
    }
  }
}
```

## Sources

- OpenDataSoft Explore API v2.1: https://help.opendatasoft.com/apis/ods-explore-v2/
- data.regionreunion.com example portal: https://data.regionreunion.com/
- data.education.gouv.fr example portal: https://data.education.gouv.fr/
- ODRE example portal: https://odre.opendatasoft.com/

## Publishing

See [docs/publishing.md](docs/publishing.md).

## Glama / Docker

The repo includes `Dockerfile` and `glama.json`.

Build steps:

```json
["npm install", "npm run build"]
```

CMD arguments:

```json
["node", "dist/index.js"]
```

## Safety

This MCP helps agents discover and summarize public sources. It is not an official authority. Verify decisions against the competent public service or original data producer.

## License

MIT
