<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\Equipe;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class EquipeApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::ADMIN->value);
        return $user;
    }

    private function agent(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::AGENT->value);
        return $user;
    }

    private function citizen(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::CITIZEN->value);
        return $user;
    }

    public function test_admin_and_agent_can_list_equipes(): void
    {
        Equipe::factory()->count(2)->create();

        $this->actingAs($this->agent())
            ->getJson('/api/equipes')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_citizen_cannot_list_equipes(): void
    {
        $this->actingAs($this->citizen())
            ->getJson('/api/equipes')
            ->assertForbidden();
    }

    public function test_admin_can_create_equipe(): void
    {
        $admin = $this->admin();
        $agent = $this->agent();

        $this->actingAs($admin)
            ->postJson('/api/equipes', [
                'nom_equipe' => 'Équipe Alpha',
                'description' => 'Équipe principale',
                'agent_ids' => [$agent->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.nom_equipe', 'Équipe Alpha');
    }

    public function test_agent_cannot_create_equipe(): void
    {
        $this->actingAs($this->agent())
            ->postJson('/api/equipes', ['nom_equipe' => 'Nouvelle'])
            ->assertForbidden();
    }

    public function test_admin_can_update_equipe(): void
    {
        $admin = $this->admin();
        $equipe = Equipe::factory()->create(['nom_equipe' => 'Ancienne']);

        $this->actingAs($admin)
            ->putJson("/api/equipes/{$equipe->id}", ['nom_equipe' => 'Nouvelle'])
            ->assertOk()
            ->assertJsonPath('data.nom_equipe', 'Nouvelle');
    }

    public function test_admin_can_delete_equipe(): void
    {
        $admin = $this->admin();
        $equipe = Equipe::factory()->create();

        $this->actingAs($admin)
            ->deleteJson("/api/equipes/{$equipe->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('equipes', ['id' => $equipe->id]);
    }

    public function test_nom_equipe_is_required(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/equipes', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nom_equipe']);
    }
}
