package com.delivery;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(OutputCaptureExtension.class)
class ErrorResponseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthorizedReturnsStandardErrorResponse() throws Exception {
        mockMvc.perform(get("/admin/secure"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.path").value("/admin/secure"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void forbiddenReturnsStandardErrorResponse() throws Exception {
        mockMvc.perform(get("/admin/secure"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.path").value("/admin/secure"));
    }

    @Test
    @WithMockUser(roles = "SYS_ADMIN")
    void validationErrorReturnsStandardErrorResponse() throws Exception {
        mockMvc.perform(post("/test/errors/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("name"));
    }

    @Test
    @WithMockUser(roles = "SYS_ADMIN")
    void internalServerErrorReturnsStandardErrorResponseWithRequestIdAndErrorLog(CapturedOutput output) throws Exception {
        String requestId = "error-test-request-id-001";

        mockMvc.perform(get("/test/errors/runtime")
                        .header("X-Request-Id", requestId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"))
                .andExpect(jsonPath("$.path").value("/test/errors/runtime"))
                .andExpect(jsonPath("$.requestId").value(requestId));

        String logs = output.getOut();
        assertThat(logs).contains("Unhandled exception requestId=" + requestId);
        assertThat(logs).contains("uri=/test/errors/runtime");
        assertThat(logs).contains("exceptionType=java.lang.IllegalStateException");
        assertThat(logs).contains("forced error");
    }
}
