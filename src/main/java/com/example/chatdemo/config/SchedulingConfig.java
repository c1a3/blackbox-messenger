package com.example.chatdemo.config;

import com.example.chatdemo.service.ChatService;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class SchedulingConfig {

    private final ChatService chatService;

    public SchedulingConfig(ChatService chatService) {
        this.chatService = chatService;
    }

    @Scheduled(fixedRate = 5000)
    public void scheduleFixedRateTask() {
        chatService.cleanupExpiredMessages();
    }
}