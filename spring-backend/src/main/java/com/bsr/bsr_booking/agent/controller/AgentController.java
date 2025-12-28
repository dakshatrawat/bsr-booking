package com.bsr.bsr_booking.agent.controller;

import com.bsr.bsr_booking.agent.dto.AgentChatRequest;
import com.bsr.bsr_booking.agent.dto.AgentChatResponse;
import com.bsr.bsr_booking.agent.service.AgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;

    @PostMapping("/chat")
    public ResponseEntity<AgentChatResponse> chat(@RequestBody AgentChatRequest request) {
        return ResponseEntity.ok(agentService.handleChat(request));
    }
}

