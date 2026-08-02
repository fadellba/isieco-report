<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InterventionStatutEnum;
use App\Enums\RoleEnum;
use App\Enums\SignalementStatutEnum;
use App\Models\Affectation;
use App\Models\Equipe;
use App\Models\Intervention;
use App\Models\Signalement;
use App\Models\User;
use App\Models\Zone;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class InterventionApiTest extends TestCase
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

    private function createAffectation(): Affectation
    {
        $zone = Zone::factory()->create();
        $signalement = Signalement::factory()->create([
            'zone_id' => $zone->id,
            'statut' => SignalementStatutEnum::AFFECTE->value,
        ]);
        return Affectation::factory()->create([
            'signalement_id' => $signalement->id,
        ]);
    }

    public function test_agent_can_create_intervention(): void
    {
        $agent = $this->agent();
        $affectation = $this->createAffectation();

        $this->actingAs($agent)
            ->postJson('/api/interventions', [
                'date_heure_debut' => now()->format('Y-m-d H:i:s'),
                'affectation_id' => $affectation->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.statut', InterventionStatutEnum::EN_COURS->value);

        // Signalement should be EN_INTERVENTION now
        $this->assertDatabaseHas('signalements', [
            'id' => $affectation->signalement_id,
            'statut' => SignalementStatutEnum::EN_INTERVENTION->value,
        ]);
    }

    public function test_citizen_cannot_create_intervention(): void
    {
        $citizen = $this->citizen();
        $affectation = $this->createAffectation();

        $this->actingAs($citizen)
            ->postJson('/api/interventions', [
                'date_heure_debut' => now()->format('Y-m-d H:i:s'),
                'affectation_id' => $affectation->id,
            ])
            ->assertForbidden();
    }

    public function test_agent_can_update_intervention_with_compte_rendu(): void
    {
        $agent = $this->agent();
        $zone = Zone::factory()->create();
        // Signalement must be EN_INTERVENTION for transition to TERMINE to be valid
        $signalement = Signalement::factory()->create([
            'zone_id' => $zone->id,
            'statut' => SignalementStatutEnum::EN_INTERVENTION->value,
        ]);
        $affectation = Affectation::factory()->create(['signalement_id' => $signalement->id]);
        $intervention = Intervention::factory()->create(['affectation_id' => $affectation->id]);

        $this->actingAs($agent)
            ->putJson("/api/interventions/{$intervention->id}", [
                'compte_rendu' => 'Travaux effectués, zone nettoyée.',
                'statut' => InterventionStatutEnum::TERMINEE->value,
                'date_heure_fin' => now()->addHour()->format('Y-m-d H:i:s'),
            ])
            ->assertOk()
            ->assertJsonPath('data.statut', InterventionStatutEnum::TERMINEE->value);
    }

    public function test_cloturer_awards_points_to_citizen(): void
    {
        $admin = $this->admin();
        $citizen = $this->citizen();
        $zone = Zone::factory()->create();
        $signalement = Signalement::factory()->create([
            'user_id' => $citizen->id,
            'zone_id' => $zone->id,
            'statut' => SignalementStatutEnum::TERMINE->value,
        ]);
        $affectation = Affectation::factory()->create(['signalement_id' => $signalement->id]);
        $intervention = Intervention::factory()->create(['affectation_id' => $affectation->id]);

        $this->actingAs($admin)
            ->postJson("/api/interventions/{$intervention->id}/cloturer")
            ->assertOk();

        // Points should be awarded
        $this->assertDatabaseHas('historique_points', [
            'user_id' => $citizen->id,
            'motif' => 'Signalement clôturé',
        ]);

        // Signalement is now CLOTURE
        $this->assertDatabaseHas('signalements', [
            'id' => $signalement->id,
            'statut' => SignalementStatutEnum::CLOTURE->value,
        ]);
    }
}
