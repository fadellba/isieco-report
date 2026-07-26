<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_user_cannot_create_user(): void
    {
        $user = User::factory()->create();

        $user->assignRole(RoleEnum::CITIZEN);

        $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/users', [
                'nom' => 'Test',
                'prenom' => 'User',
                'email' => 'test@test.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ])
            ->assertForbidden();
    }

    public function test_admin_can_create_user(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);

        $this
            ->actingAs($admin, 'sanctum')
            ->postJson('/api/users', [
                'nom' => 'New',
                'prenom' => 'User',
                'email' => 'new@test.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role' => RoleEnum::CITIZEN->value,
            ])
            ->assertCreated();
    }
}
