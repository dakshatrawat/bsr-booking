package com.bsr.bsr_booking.agent.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.HashMap;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AgentDecision {
    private String action;
    private String intent;
    private Map<String, Object> params = new HashMap<>();
    private String response;
}

