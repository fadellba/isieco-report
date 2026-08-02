<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class UserApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_admin_can_list_users(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);

        User::factory()
            ->count(3)
            ->create();


        $response = $this
            ->actingAs($admin, 'sanctum')
            ->getJson('/api/users');


        $response
            ->assertOk()
            ->assertJsonStructure([
                'data',
            ]);
    }

    public function test_admin_can_show_user(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);

        $user = User::factory()->create();


        $response = $this
            ->actingAs($admin, 'sanctum')
            ->getJson("/api/users/{$user->id}");


        $response
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'nom',
                    'prenom',
                    'email',
                ],
            ]);
    }

    public function test_admin_can_update_user(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);

        $user = User::factory()->create([
            'nom' => 'Old',
            'prenom' => 'Name',
            'email' => 'old@example.com',
        ]);


        $response = $this
            ->actingAs($admin, 'sanctum')
            ->putJson("/api/users/{$user->id}", [
                'nom' => 'New',
                'prenom' => 'Name',
                'email' => 'new@example.com',
            ]);


        $response
            ->assertOk()
            ->assertJson([
                'data' => [
                    'nom' => 'New',
                    'prenom' => 'Name',
                    'email' => 'new@example.com',
                ],
            ]);


        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'nom' => 'New',
            'prenom' => 'Name',
            'email' => 'new@example.com',
        ]);
    }

    public function test_admin_can_delete_user(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);

        $user = User::factory()->create();


        $response = $this
            ->actingAs($admin, 'sanctum')
            ->deleteJson("/api/users/{$user->id}");


        $response->assertNoContent();


        $this->assertDatabaseMissing('users', [
            'id' => $user->id,
        ]);
    }

    public function test_user_cannot_manage_users(): void
    {
        $user = User::factory()->create();

        $user->assignRole(RoleEnum::CITIZEN);


        $this
            ->actingAs($user, 'sanctum')
            ->getJson('/api/users')
            ->assertForbidden();


        $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/users', [
                'nom' => 'New',
                'prenom' => 'User',
                'email' => 'new-user@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role' => RoleEnum::CITIZEN->value,
            ])
            ->assertForbidden();
    }
}
