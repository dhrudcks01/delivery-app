# T-0549 Service Area Master Import Guide

## Purpose
- Allow `OPS_ADMIN` and `SYS_ADMIN` to upload a source file and import data into `service_area_master_dongs`.
- Prevent operations from being blocked by sample-only data.

## API
- Method/Path: `POST /ops-admin/service-areas/master-dongs/import`
- Roles: `OPS_ADMIN`, `SYS_ADMIN`
- Content-Type: `multipart/form-data`
- Form field: `file` (source txt file)

## Response Fields
- `addedCount`: inserted rows
- `updatedCount`: updated rows
- `skippedCount`: skipped rows (invalid/deprecated/non-dong/no-change)
- `failedCount`: failed rows
- `totalCountAfterImport`, `activeCountAfterImport`, `cityCountAfterImport`, `districtCountAfterImport`
- `minimumTotalCountThreshold`, `minimumCityCountThreshold`, `lowDataWarning`

## Local Run (No Docker)
1. Run server with local MySQL
2. Login as `OPS_ADMIN` or `SYS_ADMIN` and get an access token
3. Upload source file

```bash
curl -X POST "http://localhost:8080/ops-admin/service-areas/master-dongs/import" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@tmp/master_dong_source.txt"
```

## Operational Notes
- Re-running the same file is idempotent (`code` based upsert).
- If `lowDataWarning=true`, verify data with summary API and DB validation queries.
- If `failedCount > 0`, fix source data issues and retry import.
