package com.moneyflow.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class SseEmitterService {

    // userId → SseEmitter
    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID userId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.put(userId, emitter);

        emitter.onCompletion(() -> {
            emitters.remove(userId);
            log.debug("SSE emitter completed for user: {}", userId);
        });
        emitter.onTimeout(() -> {
            emitters.remove(userId);
            log.debug("SSE emitter timed out for user: {}", userId);
        });
        emitter.onError(e -> {
            emitters.remove(userId);
            log.warn("SSE emitter error for user: {}: {}", userId, e.getMessage());
        });

        // Send a connection confirmation
        try {
            emitter.send(SseEmitter.event().name("connected").data("SSE connection established"));
        } catch (IOException e) {
            emitter.completeWithError(e);
        }

        return emitter;
    }

    public void sendToUser(UUID userId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) {
            log.debug("No SSE emitter found for user: {}", userId);
            return;
        }
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
            log.debug("SSE event '{}' sent to user: {}", eventName, userId);
        } catch (IOException e) {
            emitters.remove(userId);
            log.warn("Failed to send SSE to user {}: {}", userId, e.getMessage());
        }
    }

    public void broadcast(String eventName, Object data) {
        emitters.forEach((userId, emitter) -> sendToUser(userId, eventName, data));
    }

    public int getActiveConnections() {
        return emitters.size();
    }
}
