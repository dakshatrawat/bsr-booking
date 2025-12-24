package com.bsr.bsr_booking.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer webMvcConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedOrigins("*")
                        .allowedHeaders("*")
                        .allowCredentials(false)
                        .maxAge(3600);
            }
            
            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                // Serve uploaded room images from uploads/rooms directory
                String uploadsPath = System.getProperty("user.dir") + File.separator + "uploads" + File.separator + "rooms" + File.separator;
                registry.addResourceHandler("/uploads/rooms/**")
                        .addResourceLocations("file:" + uploadsPath);
            }
        };
    }
}
