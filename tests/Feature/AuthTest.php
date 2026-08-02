<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\DTOs\Auth\LoginDTO;
use App\DTOs\Auth\RegisterDTO;
use App\DTOs\Auth\ResetPasswordDTO;
use App\Enums\RoleEnum;
use App\Models\User;
use App\Services\AuthService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_user_can_register(): void
    {
        $authService = app(AuthService::class);

        $result = $authService->register(
            new RegisterDTO(
                nom: 'Fadel',
                prenom: 'Lba',
                email: 'fadel@example.com',
                password: 'password123'
            )
        );

        $this->assertInstanceOf(
            User::class,
            $result['user']
        );

        $this->assertNotEmpty(
            $result['token']
        );

        $this->assertDatabaseHas('users', [
            'email' => 'fadel@example.com',
        ]);
    }

    public function test_user_can_login(): void
    {
        $authService = app(AuthService::class);

        $authService->register(
            new \App\DTOs\Auth\RegisterDTO(
                nom: 'Fadel',
                prenom: 'Lba',
                email: 'login@example.com',
                password: 'password123'
            )
        );

        $result = $authService->login(
            new LoginDTO(
                email: 'login@example.com',
                password: 'password123'
            )
        );

        $this->assertInstanceOf(
            \App\Models\User::class,
            $result['user']
        );

        $this->assertNotEmpty(
            $result['token']
        );
    }

    public function test_user_cannot_login_with_invalid_password(): void
    {
        $authService = app(AuthService::class);

        $authService->register(
            new \App\DTOs\Auth\RegisterDTO(
                nom: 'Fadel',
                prenom: 'Lba',
                email: 'invalid@example.com',
                password: 'password123'
            )
        );

        $this->expectException(
            \App\Exceptions\Auth\InvalidCredentialsException::class
        );

        $authService->login(
            new LoginDTO(
                email: 'invalid@example.com',
                password: 'wrong-password'
            )
        );
    }

    public function test_user_can_logout(): void
    {
        $authService = app(AuthService::class);

        $result = $authService->register(
            new \App\DTOs\Auth\RegisterDTO(
                nom: 'Logout',
                prenom: 'User',
                email: 'logout@example.com',
                password: 'password123'
            )
        );

        $user = $result['user'];

        $token = $user->tokens()->first();

        $this->assertNotNull($token);

        $authService->logout(
            $user,
            (string) $token->id
        );

        $this->assertDatabaseMissing(
            'personal_access_tokens',
            [
                'id' => $token->id,
            ]
        );
    }

    public function test_user_can_request_password_reset_link(): void
    {
        $authService = app(AuthService::class);

        $authService->register(
            new \App\DTOs\Auth\RegisterDTO(
                nom: 'Reset',
                prenom: 'User',
                email: 'reset@example.com',
                password: 'password123'
            )
        );

        $result = $authService->sendResetLink(
            new \App\DTOs\Auth\ForgotPasswordDTO(
                email: 'reset@example.com'
            )
        );

        $this->assertSame(
            \Illuminate\Support\Facades\Password::RESET_LINK_SENT,
            $result
        );
    }

    public function test_user_can_reset_password(): void
    {
        $authService = app(AuthService::class);

        $authService->register(
            new \App\DTOs\Auth\RegisterDTO(
                nom: 'Reset',
                prenom: 'Password User',
                email: 'reset-password@example.com',
                password: 'password123'
            )
        );

        $user = \App\Models\User::where(
            'email',
            'reset-password@example.com'
        )->firstOrFail();

        $token = Password::createToken($user);

        $result = $authService->resetPassword(
            new ResetPasswordDTO(
                email: 'reset-password@example.com',
                token: $token,
                password: 'new-password123'
            )
        );

        $this->assertSame(
            Password::PASSWORD_RESET,
            $result
        );

        $user->refresh();

        $this->assertTrue(
            Hash::check(
                'new-password123',
                $user->password
            )
        );
    }
}
