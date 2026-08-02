<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\DangerositeEnum;
use App\Enums\RoleEnum;
use App\Enums\SignalementStatutEnum;
use App\Models\Signalement;
use App\Models\TypeDechet;
use App\Models\User;
use App\Models\Zone;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SignalementApiTest extends TestCase
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

    private function payload(
        ?string $description = 'Déchets sauvages',
        ?int $zoneId = null,
        array $typeDechets = [],
    ): array {
        return [
            'description' => $description,
            'latitude' => 14.7167,
            'longitude' => -17.4677,
            'zone_id' => $zoneId,
            'type_dechets' => $typeDechets,
        ];
    }

    public function test_citizen_can_create_signalement(): void
    {
        $citizen = $this->citizen();

        $zone = Zone::factory()->create();

        $type = TypeDechet::factory()->create();

        $payload = $this->payload(
            'Déchets sauvages',
            $zone->id,
            [[
                'type_dechet_id' => $type->id,
                'quantite_estime' => 5,
                'volume_estime' => 2,
                'dangerosite' => DangerositeEnum::MODERE->value,
            ]]
        );

        $this->actingAs($citizen)
            ->postJson('/api/signalements', $payload)
            ->assertCreated()
            ->assertJsonPath(
                'data.description',
                'Déchets sauvages'
            )
            ->assertJsonPath(
                'data.statut',
                SignalementStatutEnum::EN_ATTENTE_VALIDATION->value
            );
    }

    public function test_citizen_can_create_signalement_without_description(): void
    {
        $citizen = $this->citizen();

        $payload = $this->payload(
            null,
            null,
            []
        );

        $this->actingAs($citizen)
            ->postJson('/api/signalements', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('signalements', [
            'description' => null,
        ]);
    }

    public function test_citizen_can_create_signalement_without_zone(): void
    {
        $citizen = $this->citizen();

        $payload = $this->payload();

        $this->actingAs($citizen)
            ->postJson('/api/signalements', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('signalements', [
            'zone_id' => null,
        ]);
    }

    public function test_citizen_can_create_signalement_without_type_dechets(): void
    {
        $citizen = $this->citizen();

        $payload = $this->payload();

        $response = $this->actingAs($citizen)
            ->postJson('/api/signalements', $payload)
            ->assertCreated();

        $id = $response->json('data.id');

        $this->assertDatabaseMissing('contenu_signalement', [
            'signalement_id' => $id,
        ]);
    }

    public function test_citizen_can_view_own_signalement(): void
    {
        $citizen = $this->citizen();

        $signalement = Signalement::factory()->create([
            'user_id' => $citizen->id,
        ]);

        $this->actingAs($citizen)
            ->getJson("/api/signalements/{$signalement->id}")
            ->assertOk()
            ->assertJsonPath(
                'data.id',
                $signalement->id
            );
    }

    public function test_citizen_cannot_view_other_citizens_signalement(): void
    {
        $citizen = $this->citizen();

        $other = $this->citizen();

        $signalement = Signalement::factory()->create([
            'user_id' => $other->id,
        ]);

        $this->actingAs($citizen)
            ->getJson("/api/signalements/{$signalement->id}")
            ->assertForbidden();
    }

    public function test_admin_can_list_all_signalements(): void
    {
        $admin = $this->admin();

        Signalement::factory()
            ->count(3)
            ->create();

        $this->actingAs($admin)
            ->getJson('/api/signalements')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_admin_can_validate_signalement(): void
    {
        $admin = $this->admin();

        $signalement = Signalement::factory()->create([
            'statut' => SignalementStatutEnum::EN_ATTENTE_VALIDATION->value,
        ]);

        $this->actingAs($admin)
            ->putJson(
                "/api/signalements/{$signalement->id}",
                [
                    'statut' => SignalementStatutEnum::VALIDE->value,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.statut',
                SignalementStatutEnum::VALIDE->value
            );
    }

    public function test_invalid_status_transition_returns_error(): void
    {
        $admin = $this->admin();

        $signalement = Signalement::factory()->create([
            'statut' => SignalementStatutEnum::EN_ATTENTE_VALIDATION->value,
        ]);

        $this->actingAs($admin)
            ->putJson(
                "/api/signalements/{$signalement->id}",
                [
                    'statut' => SignalementStatutEnum::AFFECTE->value,
                ]
            )
            ->assertStatus(422);
    }

    public function test_admin_can_remove_zone(): void
    {
        $admin = $this->admin();

        $zone = Zone::factory()->create();

        $signalement = Signalement::factory()->create([
            'zone_id' => $zone->id,
        ]);

        $this->actingAs($admin)
            ->putJson(
                "/api/signalements/{$signalement->id}",
                [
                    'zone_id' => null,
                ]
            )
            ->assertOk();

        $this->assertDatabaseHas('signalements', [
            'id' => $signalement->id,
            'zone_id' => null,
        ]);
    }
}
