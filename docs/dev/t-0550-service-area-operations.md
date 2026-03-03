# T-0550 Service Area Operations Guide

## Scope
- Full master-dong import execution with coverage checks.
- Service-area reactivation and inactive-delete management.

## Master Dong Import
- Endpoint: `POST /ops-admin/service-areas/master-dongs/import`
- Params:
  - `file` (required): source txt file
  - `reset` (optional, default `false`): when `true`, clear `service_area_master_dongs` before import
- Role: `OPS_ADMIN`, `SYS_ADMIN`

## Master Dong Auto Import (No File)
- Endpoint: `POST /ops-admin/service-areas/master-dongs/import/auto`
- Params:
  - `reset` (optional, default `false`): when `true`, clear `service_area_master_dongs` before import
- Role: `OPS_ADMIN`, `SYS_ADMIN`
- Source: `https://kr-legal-dong.github.io/data/dong.json`

## Import Result Fields
- `addedCount`, `updatedCount`, `skippedCount`, `failedCount`
- `totalCountAfterImport`, `activeCountAfterImport`, `cityCountAfterImport`, `districtCountAfterImport`
- `lowDataWarning`
- `majorCityCoverageTarget`, `majorCityCoverageMet`, `missingMajorCities`

## Service Area State Management
- Reactivate:
  - `PATCH /ops-admin/service-areas/{serviceAreaId}/reactivate`
- Deactivate:
  - `PATCH /ops-admin/service-areas/{serviceAreaId}/deactivate`
- Delete (inactive only):
  - `DELETE /ops-admin/service-areas/{serviceAreaId}`
  - Active row deletion returns `400 SERVICE_AREA_DELETE_NOT_ALLOWED`

## Local Run (No Docker)
1. Run server with local MySQL
2. Login as OPS/SYS admin and get access token
3. Run import and verify summary

```bash
curl -X POST "http://localhost:8080/ops-admin/service-areas/master-dongs/import?reset=true" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@tmp/master_dong_source.txt"
```

```bash
curl -X POST "http://localhost:8080/ops-admin/service-areas/master-dongs/import/auto?reset=true" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Batch-Style Auto Import (Startup Runner)
- Enable startup auto import with environment variables:
  - `APP_SERVICE_AREA_MASTER_DONG_AUTO_IMPORT_ENABLED=true`
  - `APP_SERVICE_AREA_MASTER_DONG_AUTO_IMPORT_RESET=true`
- Run once in non-web mode:

```bash
APP_SERVICE_AREA_MASTER_DONG_AUTO_IMPORT_ENABLED=true \
APP_SERVICE_AREA_MASTER_DONG_AUTO_IMPORT_RESET=true \
./gradlew bootRun --args='--spring.main.web-application-type=none'
```

## Operational Notes
- Deactivate -> Reactivate is supported without re-registering.
- Deactivate -> Delete -> Register same region is supported.
- API logs include action/auditing fields (`action`, `actor`, `serviceAreaId`, region fields).
- Auto source deduplicates same `city/district/dong` rows (different legacy codes) to avoid unique-key conflicts.
- Current auto source (`kr-legal-dong`) provides 16 distinct `siName` values; city threshold is aligned to `16`.
