<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\DTOs\User\CreateUserDTO;
use App\Enums\RoleEnum;
use App\Models\User;
use App\Services\UserService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class UserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_can_create_a_user(): void
    {
        $user = User::factory()->create();

        $this->assertInstanceOf(
            User::class,
            $user
        );
    }

    public function test_assigns_user_role_when_creating_a_user(): void
    {
        $service = app(UserService::class);

        $user = $service->create(
            new CreateUserDTO(
                nom: 'Fadel',
                prenom: 'Lba',
                email: 'fadel@test.com',
                password: 'password123'
            )
        );

        $this->assertTrue(
            $user->hasRole(RoleEnum::CITIZEN->value)
        );
    }
}
