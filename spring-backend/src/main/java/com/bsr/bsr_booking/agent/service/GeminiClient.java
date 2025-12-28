package com.bsr.bsr_booking.agent.service;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class GeminiClient {

    private static final String MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    private final RestTemplate restTemplate;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    public String generateText(String prompt) {
        String apiKey = resolveApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("Gemini API key is not configured. Set env GEMINI_API_KEY or property gemini.api.key");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                )
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(
                MODEL_URL + apiKey,
                entity,
                GeminiResponse.class
        );

        GeminiResponse geminiResponse = response.getBody();
        if (geminiResponse == null || geminiResponse.getCandidates() == null || geminiResponse.getCandidates().isEmpty()) {
            throw new IllegalStateException("Empty response from Gemini");
        }

        List<GeminiResponse.Part> parts = geminiResponse.getCandidates().get(0).getContent().getParts();
        if (parts == null || parts.isEmpty() || !StringUtils.hasText(parts.get(0).getText())) {
            throw new IllegalStateException("No text found in Gemini response");
        }

        return parts.get(0).getText();
    }

    private String resolveApiKey() {
        if (StringUtils.hasText(geminiApiKey)) {
            return geminiApiKey.trim();
        }
        String fromEnv = System.getenv("GEMINI_API_KEY");
        return StringUtils.hasText(fromEnv) ? fromEnv.trim() : null;
    }

    @Data
    public static class GeminiResponse {
        private List<Candidate> candidates;

        @Data
        public static class Candidate {
            private Content content;
        }

        @Data
        public static class Content {
            private List<Part> parts;
        }

        @Data
        public static class Part {
            private String text;
        }
    }
}

