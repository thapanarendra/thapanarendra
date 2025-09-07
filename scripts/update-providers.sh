#!/usr/bin/env bash
# File: update-providers.sh
# Absolute path shown above.
# Summary: Build data/providers.json from upstream JSON URLs (if provided via env) or fallback to samples.
# Usage (CI): set AWS_JSON_URL / AZURE_JSON_URL / GCP_JSON_URL / ORACLE_JSON_URL / ALIBABA_JSON_URL as repo secrets.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/data/providers.json"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

declare -A URL_ENV=( ["AWS"]="AWS_JSON_URL" ["Azure"]="AZURE_JSON_URL" ["GCP"]="GCP_JSON_URL" ["OracleCloud"]="ORACLE_JSON_URL" ["AlibabaCloud"]="ALIBABA_JSON_URL" )
declare -A SAMPLE=( ["AWS"]="$ROOT/data/samples/aws.json" ["Azure"]="$ROOT/data/samples/azure.json" ["GCP"]="$ROOT/data/samples/gcp.json" ["OracleCloud"]="$ROOT/data/samples/oracle.json" ["AlibabaCloud"]="$ROOT/data/samples/alibaba.json" )

# Fetch or copy samples
for prov in "${!URL_ENV[@]}"; do
  ev="${URL_ENV[$prov]}"
  url="${!ev:-}"
  outfile="$TMPDIR/$(echo "$prov" | tr '[:upper:]' '[:lower:]').json"
  if [ -n "$url" ]; then
    echo "Fetching ${prov} from ${url}"
    if ! curl -fsSL "$url" -o "$outfile"; then
      echo "Fetch failed for ${prov}; using sample"
      cp "${SAMPLE[$prov]}" "$outfile"
    fi
  else
    echo "No URL for ${prov}; using sample"
    cp "${SAMPLE[$prov]}" "$outfile"
  fi
done

timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Assemble providers.json using jq (jq must be available in CI)
jq -n --arg ts "$timestamp" \
  --slurpfile aws "$TMPDIR/aws.json" \
  --slurpfile azure "$TMPDIR/azure.json" \
  --slurpfile gcp "$TMPDIR/gcp.json" \
  --slurpfile oraclecloud "$TMPDIR/oraclecloud.json" \
  --slurpfile alibaba "$TMPDIR/alibaba.json" \
  '{
    lastUpdated: $ts,
    providers: {
      "AWS": ($aws[0] // {}),
      "Azure": ($azure[0] // {}),
      "GCP": ($gcp[0] // {}),
      "OracleCloud": ($oraclecloud[0] // {}),
      "AlibabaCloud": ($alibaba[0] // {})
    }
  }' > "$OUT.tmp"

if [ ! -f "$OUT" ] || ! cmp -s "$OUT.tmp" "$OUT"; then
  mv "$OUT.tmp" "$OUT"
  echo "Updated $OUT"
else
  rm -f "$OUT.tmp"
  echo "No changes to $OUT"
fi
