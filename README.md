# Example Schema Repository

A demo repository for managing [Snowplow](https://snowplow.io/) data structures using the **Snowplow CLI** and **Snowplow MCP**, with automated code generation via **Snowtype**.

## Repository Structure

```
data-structures/
  common/
    user.yaml              # Entity: user context
  content/
    article.yaml           # Entity: article context
    author.yaml            # Entity: author context
    paywall_view.yaml      # Event: user hits a paywall
  commerce/
    product.yaml           # Entity: product context
    add_to_cart.yaml       # Event: user adds item to cart

scripts/
  clean-generated.mjs      # Post-generation cleanup script

snowtype.config.json        # Snowtype configuration
package.json
```

Schemas are organised by domain:

- **common/** -- Shared entities (e.g. user) used across domains
- **content/** -- Article and author entities, plus content-related events
- **commerce/** -- Product entity and e-commerce events

## Schema Format

All schemas follow the [Snowplow CLI data structure format](https://docs.snowplow.io/docs/data-product-studio/data-structures/):

- `apiVersion: v1`, `resourceType: data-structure`
- `meta.schemaType` is either `entity` (context attached to events) or `event` (a trackable action)
- `data.self.version` uses [SchemaVer](https://docs.snowplow.io/docs/pipeline-components-and-applications/iglu/common-architecture/schemaver/) (`MODEL-REVISION-ADDITION`)

## Versioning with SchemaVer

Snowplow uses a three-part versioning scheme:

| Bump       | When to use                                                  | Example       |
|------------|--------------------------------------------------------------|---------------|
| MODEL      | Breaking change (field removed, type changed, new required)  | `1-0-0` -> `2-0-0` |
| REVISION   | Non-breaking addition (new optional field)                   | `1-0-0` -> `1-1-0` |
| ADDITION   | Editorial change (description update, no structural change)  | `1-0-0` -> `1-0-1` |

## CI/CD Workflows

### PR Validation (`validate-schemas.yml`)

Runs on every pull request that touches `data-structures/**`. Uses the Snowplow CLI to validate all schemas, catching structural errors before merge.

### Generate & Release (`generate-and-release.yml`)

Runs on push to `main`. Uses Snowtype to generate type-safe TypeScript tracking functions from the schemas, then publishes them as a GitHub Release artifact.

The workflow includes a cleanup step (`scripts/clean-generated.mjs`) that removes incorrect functions from the Snowtype output -- entity schemas only get `create*` functions and event schemas only get `track*` functions.

## Demo: Schema Version Bump

To practise SchemaVer versioning:

**ADDITION bump (editorial change)** -- update `product.yaml`:
1. Change `self.version` from `1-0-0` to `1-0-1`
2. Improve a field description (no structural change)
3. Validate: `snowplow-cli validate data-structures --data-structures-path ./data-structures`

**MODEL bump (breaking change)** -- update `add_to_cart.yaml`:
1. Add a new required field (e.g. `cartId` with `type: string, format: uuid`)
2. Add `cartId` to the `required` array
3. Change `self.version` from `1-0-0` to `2-0-0` (required field = breaking change)
4. Validate to confirm the schema is structurally valid

> **Note:** The Snowplow CLI enforces version lineage against a deployed registry. In a local-only context without BDP Console, you will see `"Version 1-0-0 not deployed. Cannot skip versions"`. This is expected -- the structural validation still passes. In a real workflow, `1-0-0` would be deployed first.

## Local Development

```bash
# Install dependencies
npm install

# Validate schemas (requires snowplow-cli)
snowplow-cli validate data-structures --data-structures-path ./data-structures

# Generate tracking code and clean up
npm run build
```
