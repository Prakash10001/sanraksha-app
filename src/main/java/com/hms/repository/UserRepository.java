package com.hms.repository;

import com.hms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<User> findByRoleIn(Collection<com.hms.entity.Role> roles);
}
