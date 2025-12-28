package com.bsr.bsr_booking.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AgentChatRequest {
    private String sessionId;
    @Builder.Default
    private List<AgentChatMessage> messages = new ArrayList<>();
}

