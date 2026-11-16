package com.hms.dto;

import java.time.LocalDateTime;

public record AdminStaffResponse(
        Long id,
        String fullName,
        String email,
        String role,
        String status,
        String specialization,
        LocalDateTime createdAt
) {
}
