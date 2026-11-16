package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "lab_report_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabReportFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lab_report_id", nullable = false, unique = true)
    private LabReport report;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGBLOB")
    private byte[] content;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;
}
