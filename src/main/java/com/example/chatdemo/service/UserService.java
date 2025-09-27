package com.example.chatdemo.service;

import com.example.chatdemo.model.User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class UserService {
    // We no longer use BCryptPasswordEncoder
    private final ConcurrentHashMap<String, User> users = new ConcurrentHashMap<>();

    // WARNING: This now stores passwords in plain text.
    // This is ONLY acceptable for a temporary, local-only demo.
    public User signUp(String displayName, String password) {
        String sessionId;
        do {
            sessionId = generateRandomSessionId();
        } while (users.containsKey(sessionId));

        // We store the password directly, not a hash.
        User newUser = new User(sessionId, displayName, password);
        users.put(sessionId, newUser);
        return newUser;
    }

    // The login check is now a simple string comparison.
    public Optional<User> login(String sessionId, String password) {
        User user = users.get(sessionId);
        if (user != null && user.passwordHash().equals(password)) { // passwordHash field now holds the plain password
            return Optional.of(user);
        }
        return Optional.empty();
    }

    private String generateRandomSessionId() {
        long min = 100_000_000_000_000L;
        long max = 999_999_999_999_999L;
        long randomNum = ThreadLocalRandom.current().nextLong(min, max + 1);
        return String.valueOf(randomNum);
    }
    
    // --- Other methods remain the same ---
    public Optional<User> findBySessionId(String sessionId) {
        return Optional.ofNullable(users.get(sessionId));
    }

    public void deleteUser(String sessionId) {
        users.remove(sessionId);
    }
    
    public List<User> getAllUsersExcept(String sessionId) {
        return users.values().stream()
            .filter(user -> !user.sessionId().equals(sessionId))
            .collect(Collectors.toList());
    }
}