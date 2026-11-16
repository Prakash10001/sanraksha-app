package com.hms.dto;

import com.hms.entity.Role;

public record LabStaffResponse(Long id, String fullName, String email, Role role) {
}
