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

    public function test_admin_can_create_user_with_prenom_and_confirmation(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);


        $response = $this
            ->actingAs($admin, 'sanctum')
            ->postJson('/api/users', [
                'nom' => 'Dupont',
                'prenom' => 'Jean',
                'email' => 'jean@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role' => RoleEnum::AGENT->value,
            ]);


        $response
            ->assertCreated()
            ->assertJsonPath('prenom', 'Jean')
            ->assertJsonPath('nom', 'Dupont');
    }

    public function test_create_user_fails_without_prenom(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);


        $this
            ->actingAs($admin, 'sanctum')
            ->postJson('/api/users', [
                'nom' => 'Dupont',
                'email' => 'jean@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role' => RoleEnum::AGENT->value,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['prenom']);
    }

    public function test_create_user_fails_on_password_confirmation_mismatch(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);


        $this
            ->actingAs($admin, 'sanctum')
            ->postJson('/api/users', [
                'nom' => 'Dupont',
                'prenom' => 'Jean',
                'email' => 'jean@example.com',
                'password' => 'password123',
                'password_confirmation' => 'different123',
                'role' => RoleEnum::AGENT->value,
            ])
            ->assertUnprocessable();
    }

    public function test_admin_can_filter_users_by_nom(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);

        User::factory()->create(['nom' => 'Martel']);
        User::factory()->create(['nom' => 'Bernard']);


        $response = $this
            ->actingAs($admin, 'sanctum')
            ->getJson('/api/users?nom=Martel');


        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nom', 'Martel');
    }

    public function test_admin_can_filter_users_by_email(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);

        User::factory()->create(['email' => 'cible@example.com']);
        User::factory()->create(['email' => 'autre@example.com']);


        $response = $this
            ->actingAs($admin, 'sanctum')
            ->getJson('/api/users?email=cible@example.com');


        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'cible@example.com');
    }

    public function test_admin_can_filter_users_by_role(): void
    {
        $admin = User::factory()->create();

        $admin->assignRole(RoleEnum::ADMIN);

        $agent = User::factory()->create();

        $agent->assignRole(RoleEnum::AGENT);


        $response = $this
            ->actingAs($admin, 'sanctum')
            ->getJson('/api/users?role=' . RoleEnum::AGENT->value);


        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $agent->id);
    }
}
