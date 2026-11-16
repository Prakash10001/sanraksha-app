package com.hms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.http.HttpMethod; // NEW
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.sameOrigin()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/forgot-password",
                        "/api/auth/reset-password", "/api/auth/browser-reset").permitAll()
                .requestMatchers("/api/auth/change-password").authenticated()
                .requestMatchers("/reset-password").permitAll()
                .requestMatchers("/api/patients/me", "/api/patients/me/**").hasRole("PATIENT")
                .requestMatchers(HttpMethod.POST, "/api/records").hasRole("DOCTOR")
                .requestMatchers(HttpMethod.GET, "/api/records/me").hasRole("PATIENT")
              //  .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // NEW
                .requestMatchers("/api/doctors/me/patients").hasRole("DOCTOR")
                .requestMatchers("/api/doctors/**").authenticated()
                .requestMatchers("/api/appointments/**").authenticated()
                .requestMatchers("/api/prescriptions/**").authenticated()
                .requestMatchers("/api/symptom-check/**").authenticated()
                .requestMatchers("/api/records/**").authenticated()
                .requestMatchers("/api/patient/billing/**").hasRole("PATIENT")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
