package com.ghostpay.identity.api;

import com.ghostpay.identity.application.RegisterUserService;
import com.ghostpay.identity.application.LoginUserService;
import com.ghostpay.identity.api.login.*;
import com.ghostpay.identity.api.register.*;
import com.ghostpay.shared.security.*;
import com.ghostpay.identity.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final RegisterUserService registerUserService;
    private final LoginUserService loginUserService;
    private final JwtService jwtService;

    public AuthController(
        RegisterUserService registerUserService,
        LoginUserService loginUserService,
        JwtService jwtService
    ) {
        this.registerUserService = registerUserService;
        this.loginUserService = loginUserService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        User user = registerUserService.register(request.email(), request.password());
        return RegisterResponse.from(user);
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        User user = loginUserService.login(request.email(), request.password());
        String accessToken = jwtService.generateAccessToken(user);
        return LoginResponse.bearer(accessToken);
    }
}
