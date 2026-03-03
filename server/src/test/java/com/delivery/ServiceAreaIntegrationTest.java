package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ServiceAreaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthIdentityRepository authIdentityRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        upsertRole("USER", "General User");
        upsertRole("OPS_ADMIN", "Ops Admin");
        upsertRole("SYS_ADMIN", "System Admin");
        jdbcTemplate.update("DELETE FROM service_areas");
        jdbcTemplate.update("DELETE FROM service_area_master_dongs");
    }

    @Test
    void opsAdminCanRegisterDeactivateAndSearchServiceAreas() throws Exception {
        TestUser opsAdmin = createUser("service-area-ops@example.com", "OPS_ADMIN");
        String requestBody = """
                {
                  "city": "Seoul",
                  "district": "Mapo-gu",
                  "dong": "Seogyo-dong"
                }
                """;

        String createResponse = mockMvc.perform(post("/ops-admin/service-areas")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.city").value("Seoul"))
                .andExpect(jsonPath("$.district").value("Mapo-gu"))
                .andExpect(jsonPath("$.dong").value("Seogyo-dong"))
                .andExpect(jsonPath("$.active").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long serviceAreaId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/ops-admin/service-areas")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .param("query", "Mapo")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(serviceAreaId))
                .andExpect(jsonPath("$.content[0].active").value(true));

        mockMvc.perform(patch("/ops-admin/service-areas/{serviceAreaId}/deactivate", serviceAreaId)
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(serviceAreaId))
                .andExpect(jsonPath("$.active").value(false));

        String reactivateResponse = mockMvc.perform(post("/ops-admin/service-areas")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.active").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long reactivatedId = objectMapper.readTree(reactivateResponse).get("id").asLong();
        org.assertj.core.api.Assertions.assertThat(reactivatedId).isEqualTo(serviceAreaId);
    }

    @Test
    void userCanOnlySeeActiveServiceAreas() throws Exception {
        TestUser opsAdmin = createUser("service-area-ops-user-query@example.com", "OPS_ADMIN");
        TestUser user = createUser("service-area-user@example.com", "USER");

        Long inactiveAreaId = createServiceArea(opsAdmin.accessToken(), "Seoul", "Mapo-gu", "Hapjeong-dong");
        createServiceArea(opsAdmin.accessToken(), "Seoul", "Gangnam-gu", "Yeoksam-dong");
        mockMvc.perform(patch("/ops-admin/service-areas/{serviceAreaId}/deactivate", inactiveAreaId)
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/user/service-areas")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .param("query", "Mapo")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        mockMvc.perform(get("/user/service-areas")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .param("query", "Gangnam")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].district").value("Gangnam-gu"))
                .andExpect(jsonPath("$.content[0].active").value(true));
    }

    @Test
    void userCannotAccessOpsAdminServiceAreaManagementApi() throws Exception {
        TestUser user = createUser("service-area-forbidden-user@example.com", "USER");

        mockMvc.perform(post("/ops-admin/service-areas")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "city": "Seoul",
                                  "district": "Jongno-gu",
                                  "dong": "Gahoe-dong"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void opsAdminCanSearchMasterDongsAndRegisterServiceAreaByCode() throws Exception {
        TestUser opsAdmin = createUser("service-area-master-ops@example.com", "OPS_ADMIN");
        insertMasterDong("1144012000", "서울특별시", "마포구", "서교동", true);
        insertMasterDong("1168010100", "서울특별시", "강남구", "역삼동", true);

        mockMvc.perform(get("/ops-admin/service-areas/master-dongs")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .param("query", "서교")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].code").value("1144012000"))
                .andExpect(jsonPath("$.content[0].city").value("서울특별시"))
                .andExpect(jsonPath("$.content[0].district").value("마포구"))
                .andExpect(jsonPath("$.content[0].dong").value("서교동"));

        mockMvc.perform(post("/ops-admin/service-areas/by-code")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "1144012000"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.city").value("서울특별시"))
                .andExpect(jsonPath("$.district").value("마포구"))
                .andExpect(jsonPath("$.dong").value("서교동"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void opsAdminCanFilterMasterDongsByCityAndDistrict() throws Exception {
        TestUser opsAdmin = createUser("service-area-master-filter-ops@example.com", "OPS_ADMIN");
        insertMasterDong("1111010100", "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC", "\uC885\uB85C\uAD6C", "\uCCAD\uC6B4\uB3D9", true);
        insertMasterDong("1111010200", "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC", "\uC885\uB85C\uAD6C", "\uC2E0\uAD50\uB3D9", true);
        insertMasterDong("2611011000", "\uBD80\uC0B0\uAD11\uC5ED\uC2DC", "\uC911\uAD6C", "\uAD11\uBCF5\uB3D9", true);

        mockMvc.perform(get("/ops-admin/service-areas/master-dongs")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .param("city", "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC")
                        .param("district", "\uC885\uB85C\uAD6C")
                        .param("query", "\uCCAD\uC6B4")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].code").value("1111010100"));

        mockMvc.perform(get("/ops-admin/service-areas/master-dongs")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .param("city", "Seoul")
                        .param("district", "\uC885\uB85C\uAD6C")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2));
    }

    @Test
    void opsAdminCanCheckMasterDongSummaryAndLowDataWarning() throws Exception {
        TestUser opsAdmin = createUser("service-area-master-summary-ops@example.com", "OPS_ADMIN");
        insertMasterDong("1144012000", "서울특별시", "마포구", "서교동", true);
        insertMasterDong("2611011000", "부산광역시", "중구", "광복동", false);
        insertMasterDong("1168010100", "서울특별시", "강남구", "역삼동", true);

        mockMvc.perform(get("/ops-admin/service-areas/master-dongs/summary")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(3))
                .andExpect(jsonPath("$.activeCount").value(2))
                .andExpect(jsonPath("$.cityCount").value(2))
                .andExpect(jsonPath("$.districtCount").value(3))
                .andExpect(jsonPath("$.minimumTotalCountThreshold").value(3000))
                .andExpect(jsonPath("$.minimumCityCountThreshold").value(16))
                .andExpect(jsonPath("$.lowDataWarning").value(true));
    }

    @Test
    void opsAdminCanImportMasterDongsFromSourceFile() throws Exception {
        TestUser opsAdmin = createUser("service-area-master-import-ops@example.com", "OPS_ADMIN");
        insertMasterDong("1111010100", "Seoul", "Jongno-gu", "Hyoja-dong", false);

        String source = """
                1111010100\tSeoul Jongno-gu Cheongun-dong\tACTIVE
                1111010200\tSeoul Jongno-gu Singyo-dong\tACTIVE
                1111010200\tSeoul Jongno-gu Singyo-dong\tACTIVE
                1111010300\tSeoul Jongno-gu Gungjeong-dong\t\uD3D0\uC9C0
                1111010000\tSeoul Jongno-gu Jongno-gu\tACTIVE
                malformed-line
                """;

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "master-dongs.txt",
                MediaType.TEXT_PLAIN_VALUE,
                source.getBytes()
        );

        mockMvc.perform(multipart("/ops-admin/service-areas/master-dongs/import")
                        .file(file)
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.addedCount").value(1))
                .andExpect(jsonPath("$.updatedCount").value(1))
                .andExpect(jsonPath("$.skippedCount").value(4))
                .andExpect(jsonPath("$.failedCount").value(0))
                .andExpect(jsonPath("$.totalCountAfterImport").value(2))
                .andExpect(jsonPath("$.activeCountAfterImport").value(2))
                .andExpect(jsonPath("$.cityCountAfterImport").value(1))
                .andExpect(jsonPath("$.districtCountAfterImport").value(1))
                .andExpect(jsonPath("$.minimumTotalCountThreshold").value(3000))
                .andExpect(jsonPath("$.minimumCityCountThreshold").value(16))
                .andExpect(jsonPath("$.lowDataWarning").value(true))
                .andExpect(jsonPath("$.majorCityCoverageTarget").value(4))
                .andExpect(jsonPath("$.majorCityCoverageMet").value(0))
                .andExpect(jsonPath("$.missingMajorCities.length()").value(4));

        mockMvc.perform(get("/ops-admin/service-areas/master-dongs")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .param("query", "Cheongun")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].code").value("1111010100"))
                .andExpect(jsonPath("$.content[0].dong").value("Cheongun-dong"))
                .andExpect(jsonPath("$.content[0].active").value(true));
    }

    @Test
    void opsAdminCanResetImportAndCoverMajorCities() throws Exception {
        TestUser opsAdmin = createUser("service-area-master-major-cities-ops@example.com", "OPS_ADMIN");
        insertMasterDong("9999999999", "Dummy", "Dummy", "Dummy-dong", true);

        String source = """
                1111010200\t\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC885\uB85C\uAD6C \uC2E0\uAD50\uB3D9\tACTIVE
                2611011000\t\uBD80\uC0B0\uAD11\uC5ED\uC2DC \uC911\uAD6C \uAD11\uBCF5\uB3D9\tACTIVE
                2714010200\t\uB300\uAD6C\uAD11\uC5ED\uC2DC \uB3D9\uAD6C \uC2E0\uC554\uB3D9\tACTIVE
                2817710100\t\uC778\uCC9C\uAD11\uC5ED\uC2DC \uBBF8\uCD94\uD640\uAD6C \uC6A9\uD604\uB3D9\tACTIVE
                """;
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "master-dongs-major-cities.txt",
                MediaType.TEXT_PLAIN_VALUE,
                source.getBytes()
        );

        mockMvc.perform(multipart("/ops-admin/service-areas/master-dongs/import")
                        .file(file)
                        .param("reset", "true")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.addedCount").value(4))
                .andExpect(jsonPath("$.updatedCount").value(0))
                .andExpect(jsonPath("$.failedCount").value(0))
                .andExpect(jsonPath("$.totalCountAfterImport").value(4))
                .andExpect(jsonPath("$.majorCityCoverageTarget").value(4))
                .andExpect(jsonPath("$.majorCityCoverageMet").value(4))
                .andExpect(jsonPath("$.missingMajorCities.length()").value(0));

        mockMvc.perform(get("/ops-admin/service-areas/master-dongs")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .param("query", "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));

        mockMvc.perform(get("/ops-admin/service-areas/master-dongs")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .param("query", "\uBD80\uC0B0\uAD11\uC5ED\uC2DC")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    void opsAdminCanReactivateAndDeleteInactiveServiceArea() throws Exception {
        TestUser opsAdmin = createUser("service-area-reactivate-delete-ops@example.com", "OPS_ADMIN");
        Long serviceAreaId = createServiceArea(opsAdmin.accessToken(), "Seoul", "Mapo-gu", "Seogyo-dong");

        mockMvc.perform(delete("/ops-admin/service-areas/{serviceAreaId}", serviceAreaId)
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SERVICE_AREA_DELETE_NOT_ALLOWED"));

        mockMvc.perform(patch("/ops-admin/service-areas/{serviceAreaId}/deactivate", serviceAreaId)
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(patch("/ops-admin/service-areas/{serviceAreaId}/reactivate", serviceAreaId)
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));

        mockMvc.perform(patch("/ops-admin/service-areas/{serviceAreaId}/deactivate", serviceAreaId)
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(delete("/ops-admin/service-areas/{serviceAreaId}", serviceAreaId)
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isNoContent());

        String recreated = mockMvc.perform(post("/ops-admin/service-areas")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "city": "Seoul",
                                  "district": "Mapo-gu",
                                  "dong": "Seogyo-dong"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.active").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long recreatedId = objectMapper.readTree(recreated).get("id").asLong();
        org.assertj.core.api.Assertions.assertThat(recreatedId).isNotEqualTo(serviceAreaId);
    }

    private Long createServiceArea(String accessToken, String city, String district, String dong) throws Exception {
        String response = mockMvc.perform(post("/ops-admin/service-areas")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "city": "%s",
                                  "district": "%s",
                                  "dong": "%s"
                                }
                                """.formatted(city, district, dong)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private TestUser createUser(String email, String roleCode) throws Exception {
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode("password123"),
                "Service Area Tester",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        assignRole(user.getId(), roleCode);
        return new TestUser(user.getId(), login(email, "password123"));
    }

    private String login(String email, String password) throws Exception {
        String loginBody = objectMapper.writeValueAsString(new LoginPayload(email, password));
        String loginResponse = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(loginResponse).get("accessToken").asText();
    }

    private void assignRole(Long userId, String roleCode) {
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, id
                FROM roles
                WHERE code = ?
                """,
                userId,
                roleCode
        );
    }

    private void upsertRole(String code, String description) {
        jdbcTemplate.update("MERGE INTO roles (code, description) KEY(code) VALUES (?, ?)", code, description);
    }

    private void insertMasterDong(String code, String city, String district, String dong, boolean active) {
        jdbcTemplate.update(
                """
                INSERT INTO service_area_master_dongs (code, city, district, dong, is_active)
                VALUES (?, ?, ?, ?, ?)
                """,
                code,
                city,
                district,
                dong,
                active
        );
    }

    private record LoginPayload(String email, String password) {
    }

    private record TestUser(Long id, String accessToken) {
    }
}
