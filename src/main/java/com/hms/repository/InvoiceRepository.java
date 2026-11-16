package com.hms.repository;

import com.hms.entity.Invoice;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findAllByOrderByCreatedAtDesc();
    List<Invoice> findByPatient_User_EmailIgnoreCaseOrderByCreatedAtDesc(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invoice from Invoice invoice where invoice.id = :invoiceId")
    Optional<Invoice> findByIdForUpdate(@Param("invoiceId") Long invoiceId);
}
