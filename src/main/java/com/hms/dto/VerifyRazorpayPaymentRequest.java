package com.hms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyRazorpayPaymentRequest(
        @NotBlank @Size(max = 64) String razorpayOrderId,
        @NotBlank @Size(max = 64) String razorpayPaymentId,
        @NotBlank @Size(min = 64, max = 64) String razorpaySignature
) {
}
