package com.delivery.upload.service;

import com.delivery.upload.config.UploadProperties;
import com.delivery.upload.exception.InvalidUploadFileException;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class UploadService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    private final UploadProperties uploadProperties;

    public UploadService(UploadProperties uploadProperties) {
        this.uploadProperties = uploadProperties;
    }

    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidUploadFileException("업로드 파일이 비어 있습니다.");
        }
        if (file.getSize() > uploadProperties.getMaxSizeBytes()) {
            throw new InvalidUploadFileException("업로드 파일 크기 제한을 초과했습니다.");
        }

        String extension = extractAllowedExtension(file.getOriginalFilename());
        String storedName = UUID.randomUUID() + "." + extension;
        Path baseDir = Paths.get(uploadProperties.getLocalDir()).toAbsolutePath().normalize();
        Path target = baseDir.resolve(storedName).normalize();

        try {
            Files.createDirectories(baseDir);
            file.transferTo(target.toFile());
        } catch (IOException exception) {
            throw new InvalidUploadFileException("파일 저장에 실패했습니다.");
        }

        return "/uploads/files/" + storedName;
    }

    public Resource loadAsResource(String filename) {
        if (!StringUtils.hasText(filename)) {
            throw new InvalidUploadFileException("잘못된 파일 이름입니다.");
        }

        Path baseDir = Paths.get(uploadProperties.getLocalDir()).toAbsolutePath().normalize();
        Path target = baseDir.resolve(filename).normalize();
        if (!target.startsWith(baseDir)) {
            throw new InvalidUploadFileException("잘못된 파일 경로입니다.");
        }
        if (!Files.exists(target)) {
            throw new InvalidUploadFileException("파일을 찾을 수 없습니다.");
        }

        try {
            return new UrlResource(target.toUri());
        } catch (MalformedURLException exception) {
            throw new InvalidUploadFileException("파일 경로가 올바르지 않습니다.");
        }
    }

    private String extractAllowedExtension(String originalFilename) {
        if (!StringUtils.hasText(originalFilename) || !originalFilename.contains(".")) {
            throw new InvalidUploadFileException("허용되지 않는 파일 형식입니다.");
        }
        String extension = originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new InvalidUploadFileException("허용되지 않는 파일 형식입니다.");
        }
        return extension;
    }
}
