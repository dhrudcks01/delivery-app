package com.delivery.useraddress.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.useraddress.dto.UserAddressResponse;
import com.delivery.useraddress.dto.UserAddressUpsertRequest;
import com.delivery.useraddress.entity.UserAddressEntity;
import com.delivery.useraddress.exception.UserAddressNotFoundException;
import com.delivery.useraddress.repository.UserAddressRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserAddressService {

    private final UserRepository userRepository;
    private final UserAddressRepository userAddressRepository;

    public UserAddressService(UserRepository userRepository, UserAddressRepository userAddressRepository) {
        this.userRepository = userRepository;
        this.userAddressRepository = userAddressRepository;
    }

    @Transactional
    public List<UserAddressResponse> getMyAddresses(String loginId) {
        UserEntity user = getUserByLoginId(loginId);
        return userAddressRepository.findAllByUserOrderByPrimaryAddressDescUpdatedAtDesc(user)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserAddressResponse createAddress(String loginId, UserAddressUpsertRequest request) {
        UserEntity user = getUserByLoginId(loginId);
        boolean makePrimary = request.normalizedPrimary() || !userAddressRepository.existsByUser(user);
        if (makePrimary) {
            userAddressRepository.clearPrimaryForUser(user.getId(), null);
        }

        UserAddressEntity created = userAddressRepository.save(
                new UserAddressEntity(
                        user,
                        request.normalizedRoadAddress(),
                        request.normalizedJibunAddress(),
                        request.normalizedZipCode(),
                        request.normalizedDetailAddress(),
                        makePrimary
                )
        );
        return toResponse(created);
    }

    @Transactional
    public UserAddressResponse updateAddress(String loginId, Long addressId, UserAddressUpsertRequest request) {
        UserEntity user = getUserByLoginId(loginId);
        UserAddressEntity address = getAddressByIdAndUser(addressId, user);

        address.updateAddress(
                request.normalizedRoadAddress(),
                request.normalizedJibunAddress(),
                request.normalizedZipCode(),
                request.normalizedDetailAddress()
        );
        boolean shouldEnsurePrimary = false;
        if (request.isPrimary() != null) {
            if (request.normalizedPrimary()) {
                userAddressRepository.clearPrimaryForUser(user.getId(), addressId);
                address.setPrimaryAddress(true);
            } else {
                shouldEnsurePrimary = address.isPrimaryAddress();
                address.setPrimaryAddress(false);
            }
        }

        userAddressRepository.save(address);
        if (shouldEnsurePrimary) {
            ensurePrimaryAddressExists(user);
        }
        return toResponse(getAddressByIdAndUser(addressId, user));
    }

    @Transactional
    public UserAddressResponse setPrimaryAddress(String loginId, Long addressId) {
        UserEntity user = getUserByLoginId(loginId);
        UserAddressEntity address = getAddressByIdAndUser(addressId, user);

        userAddressRepository.clearPrimaryForUser(user.getId(), addressId);
        address.setPrimaryAddress(true);
        UserAddressEntity saved = userAddressRepository.save(address);
        return toResponse(saved);
    }

    @Transactional
    public void deleteAddress(String loginId, Long addressId) {
        UserEntity user = getUserByLoginId(loginId);
        UserAddressEntity address = getAddressByIdAndUser(addressId, user);
        boolean deletingPrimary = address.isPrimaryAddress();

        userAddressRepository.delete(address);
        if (deletingPrimary) {
            ensurePrimaryAddressExists(user);
        }
    }

    private UserEntity getUserByLoginId(String loginId) {
        return userRepository.findByLoginId(loginId)
                .orElseThrow(InvalidCredentialsException::new);
    }

    private UserAddressEntity getAddressByIdAndUser(Long addressId, UserEntity user) {
        return userAddressRepository.findByIdAndUser(addressId, user)
                .orElseThrow(UserAddressNotFoundException::new);
    }

    private void ensurePrimaryAddressExists(UserEntity user) {
        if (userAddressRepository.existsByUserAndPrimaryAddressTrue(user)) {
            return;
        }
        userAddressRepository.findFirstByUserOrderByCreatedAtAsc(user).ifPresent(firstAddress -> {
            userAddressRepository.clearPrimaryForUser(user.getId(), firstAddress.getId());
            firstAddress.setPrimaryAddress(true);
            userAddressRepository.save(firstAddress);
        });
    }

    private UserAddressResponse toResponse(UserAddressEntity entity) {
        return new UserAddressResponse(
                entity.getId(),
                entity.getRoadAddress(),
                entity.getJibunAddress(),
                entity.getZipCode(),
                entity.getDetailAddress(),
                entity.isPrimaryAddress(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
