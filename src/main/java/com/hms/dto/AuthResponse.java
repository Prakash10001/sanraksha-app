package com.hms.dto;

import lombok.*;

@Getter @Setter
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String fullName;
    private String role;
    private boolean mustResetPassword;

    public AuthResponse(String token, String fullName, String role) {
        this(token, fullName, role, false);
    }

    public boolean isMustResetPassword() {
        return mustResetPassword;
    }

    public boolean getMustResetPassword() {
        return mustResetPassword;
    }

    public void setMustResetPassword(boolean mustResetPassword) {
        this.mustResetPassword = mustResetPassword;
    }
}
