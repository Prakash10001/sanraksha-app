package com.hms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.client.RestTemplate;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class HmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(HmsApplication.class, args);
    }

    // Used by SymptomCheckService to call the Python AI microservice
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
