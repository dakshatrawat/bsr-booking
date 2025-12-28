package com.bsr.bsr_booking.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AgentChatMessage {
    private String role; // "user" or "assistant"
    private String content;
}

