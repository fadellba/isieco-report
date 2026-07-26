<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Enums\SignalementStatutEnum;
use App\Models\Affectation;
use App\Models\Equipe;
use App\Models\Signalement;
use App\Models\User;
use App\Models\Zone;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AffectationApiTest extends TestCase
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

    private function citizen(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::CITIZEN->value);
        return $user;
    }

    private function validatedSignalement(): Signalement
    {
        $zone = Zone::factory()->create();
        return Signalement::factory()->create([
            'zone_id' => $zone->id,
            'statut' => SignalementStatutEnum::VALIDE->value,
        ]);
    }

    public function test_admin_can_create_affectation_for_validated_signalement(): void
    {
        $admin = $this->admin();
        $equipe = Equipe::factory()->create();
        $signalement = $this->validatedSignalement();

        $this->actingAs($admin)
            ->postJson('/api/affectations', [
                'date_heure_affectation' => now()->format('Y-m-d H:i:s'),
                'equipe_id' => $equipe->id,
                'signalement_id' => $signalement->id,
                'observation' => 'Intervention urgente requise',
            ])
            ->assertCreated()
            ->assertJsonPath('data.equipe.id', $equipe->id);

        // The signalement should now have transitioned to AFFECTE
        $this->assertDatabaseHas('signalements', [
            'id' => $signalement->id,
            'statut' => SignalementStatutEnum::AFFECTE->value,
        ]);
    }

    public function test_admin_cannot_affect_a_non_validated_signalement(): void
    {
        $admin = $this->admin();
        $equipe = Equipe::factory()->create();
        $zone = Zone::factory()->create();
        $signalement = Signalement::factory()->create([
            'zone_id' => $zone->id,
            'statut' => SignalementStatutEnum::EN_ATTENTE_VALIDATION->value,
        ]);

        $this->actingAs($admin)
            ->postJson('/api/affectations', [
                'date_heure_affectation' => now()->format('Y-m-d H:i:s'),
                'equipe_id' => $equipe->id,
                'signalement_id' => $signalement->id,
            ])
            ->assertStatus(422);
    }

    public function test_citizen_cannot_create_affectation(): void
    {
        $citizen = $this->citizen();
        $equipe = Equipe::factory()->create();
        $signalement = $this->validatedSignalement();

        $this->actingAs($citizen)
            ->postJson('/api/affectations', [
                'date_heure_affectation' => now()->format('Y-m-d H:i:s'),
                'equipe_id' => $equipe->id,
                'signalement_id' => $signalement->id,
            ])
            ->assertForbidden();
    }

    public function test_admin_can_list_affectations(): void
    {
        $admin = $this->admin();
        $zone = Zone::factory()->create();
        Affectation::factory()->count(2)->create([
            'signalement_id' => Signalement::factory()->create([
                'zone_id' => $zone->id,
                'statut' => SignalementStatutEnum::AFFECTE->value,
            ])->id,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/affectations')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
