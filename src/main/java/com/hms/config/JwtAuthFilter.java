package com.hms.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (jwtUtil.isTokenValid(token)) {
                System.out.println("========== JWT DEBUG ==========");
                 System.out.println("JWT VALID");
                String email = jwtUtil.extractEmail(token);
                String role = jwtUtil.extractRole(token);
                            System.out.println("JWT EMAIL: " + email);
System.out.println("JWT ROLE: " + role);
                var authToken = new UsernamePasswordAuthenticationToken(
                        email, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );
                SecurityContextHolder.getContext().setAuthentication(authToken);
                System.out.println("AUTHENTICATED: "
        + SecurityContextHolder.getContext()
                .getAuthentication()
                .isAuthenticated());

System.out.println("AUTHORITIES: "
        + SecurityContextHolder.getContext()
                .getAuthentication()
                .getAuthorities());
            }
        }

        filterChain.doFilter(request, response);
    }
}
