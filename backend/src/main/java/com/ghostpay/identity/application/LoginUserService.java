package com.ghostpay.identity.application;


import org.springframework.security.crypto.password.PasswordEncoder;
import com.ghostpay.identity.persistence.UserRepository;
import org.springframework.stereotype.Service;
import com.ghostpay.identity.domain.User;
import com.ghostpay.identity.domain.exception.*;

@Service
public class LoginUserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public LoginUserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User login(String email, String rawPassword) {
        String normalizedEmail = email.trim().toLowerCase();

        User user = userRepository
            .findByEmail(normalizedEmail)
            .orElseThrow(InvalidCredentialsException::new);

        boolean passwordMatches = passwordEncoder.matches(rawPassword, user.getPasswordHash());

        if (!passwordMatches) {
            throw new InvalidCredentialsException();
        }
        return user;
    }
}
