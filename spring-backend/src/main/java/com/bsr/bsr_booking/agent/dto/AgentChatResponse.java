package com.bsr.bsr_booking.agent.dto;

import com.bsr.bsr_booking.dtos.Response;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AgentChatResponse {
    private String reply;
    private AgentAction action;
    private Response backendResponse;
    private String rawModelOutput;
    private String note;
}

