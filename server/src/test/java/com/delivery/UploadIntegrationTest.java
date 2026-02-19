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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.upload.local-dir=${java.io.tmpdir}/delivery-upload-test",
        "app.upload.max-size-bytes=5242880"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UploadIntegrationTest {

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
    void setUpRoles() {
        upsertRole("USER", "일반 사용자");
        upsertRole("DRIVER", "기사");
    }

    @Test
    void driverCanUploadFileAndGetDownloadUrl() throws Exception {
        String driverToken = login(createUser("upload-driver@example.com", "DRIVER").getEmail());
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample.png",
                MediaType.IMAGE_PNG_VALUE,
                "png-data".getBytes()
        );

        String uploadResponse = mockMvc.perform(multipart("/uploads")
                        .file(file)
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.startsWith("/uploads/files/")))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String url = objectMapper.readTree(uploadResponse).get("url").asText();
        mockMvc.perform(get(url)
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk());
    }

    @Test
    void userCannotUploadFile() throws Exception {
        String userToken = login(createUser("upload-user@example.com", "USER").getEmail());
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample.png",
                MediaType.IMAGE_PNG_VALUE,
                "png-data".getBytes()
        );

        mockMvc.perform(multipart("/uploads")
                        .file(file)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void uploadReturnsBadRequestForInvalidExtension() throws Exception {
        String driverToken = login(createUser("upload-invalid-ext@example.com", "DRIVER").getEmail());
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample.txt",
                MediaType.TEXT_PLAIN_VALUE,
                "text".getBytes()
        );

        mockMvc.perform(multipart("/uploads")
                        .file(file)
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_UPLOAD_FILE"));
    }

    @Test
    void uploadReturnsBadRequestWhenFileTooLarge() throws Exception {
        String driverToken = login(createUser("upload-too-large@example.com", "DRIVER").getEmail());
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "large.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                new byte[5 * 1024 * 1024 + 1]
        );

        mockMvc.perform(multipart("/uploads")
                        .file(file)
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_UPLOAD_FILE"));
    }

    private UserEntity createUser(String email, String roleCode) {
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode("password123"),
                "업로드테스터",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, id FROM roles WHERE code = ?
                """,
                user.getId(),
                roleCode
        );
        return user;
    }

    private String login(String email) throws Exception {
        String body = objectMapper.writeValueAsString(new LoginPayload(email, "password123"));
        String response = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    private void upsertRole(String code, String description) {
        jdbcTemplate.update("MERGE INTO roles (code, description) KEY(code) VALUES (?, ?)", code, description);
    }

    private record LoginPayload(String email, String password) {
    }
}
