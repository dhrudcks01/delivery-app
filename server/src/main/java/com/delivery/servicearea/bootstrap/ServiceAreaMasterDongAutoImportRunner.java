package com.delivery.servicearea.bootstrap;

import com.delivery.servicearea.dto.ServiceAreaMasterDongImportResponse;
import com.delivery.servicearea.service.ServiceAreaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class ServiceAreaMasterDongAutoImportRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ServiceAreaMasterDongAutoImportRunner.class);

    private final ServiceAreaService serviceAreaService;

    @Value("${app.service-area.master-dong.auto-import-enabled:false}")
    private boolean autoImportEnabled;

    @Value("${app.service-area.master-dong.auto-import-reset:false}")
    private boolean autoImportReset;

    public ServiceAreaMasterDongAutoImportRunner(ServiceAreaService serviceAreaService) {
        this.serviceAreaService = serviceAreaService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!autoImportEnabled) {
            return;
        }

        log.info("Service area master auto import started: reset={}", autoImportReset);
        ServiceAreaMasterDongImportResponse response = serviceAreaService.importMasterDongsFromAutoSource(autoImportReset);
        log.info(
                "Service area master auto import finished: added={} updated={} skipped={} failed={} total={} active={} cityCount={} districtCount={} lowDataWarning={} majorCityCoverage={}/{}",
                response.addedCount(),
                response.updatedCount(),
                response.skippedCount(),
                response.failedCount(),
                response.totalCountAfterImport(),
                response.activeCountAfterImport(),
                response.cityCountAfterImport(),
                response.districtCountAfterImport(),
                response.lowDataWarning(),
                response.majorCityCoverageMet(),
                response.majorCityCoverageTarget()
        );
    }
}
