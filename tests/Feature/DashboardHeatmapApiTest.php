<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\Signalement;
use App\Models\User;
use App\Models\Zone;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class DashboardHeatmapApiTest extends TestCase
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

    public function test_citizen_cannot_access_heatmap(): void
    {
        $citizen = $this->citizen();

        $this->actingAs($citizen)
            ->getJson('/api/dashboard/heatmap')
            ->assertForbidden();
    }

    public function test_unauthenticated_user_cannot_access_heatmap(): void
    {
        $this->getJson('/api/dashboard/heatmap')
            ->assertUnauthorized();
    }

    public function test_admin_can_access_heatmap(): void
    {
        $admin = $this->admin();
        Zone::factory()->create();
        Signalement::factory()->valide()->create();

        $this->actingAs($admin)
            ->getJson('/api/dashboard/heatmap')
            ->assertOk()
            ->assertJsonCount(1);
    }

    public function test_returns_empty_array_when_no_active_signalements(): void
    {
        $admin = $this->admin();
        Signalement::factory()->count(3)->create();

        $this->actingAs($admin)
            ->getJson('/api/dashboard/heatmap')
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_weight_is_calculated_per_zone(): void
    {
        $admin = $this->admin();

        $zoneCritique = Zone::factory()->create(['nom_zone' => 'Mermoz']);
        $zoneCalme = Zone::factory()->create(['nom_zone' => 'Ouakam']);

        Signalement::factory()->count(3)->valide()->create([
            'zone_id' => $zoneCritique->id,
            'latitude' => 14.7168,
            'longitude' => -17.4677,
        ]);

        Signalement::factory()->valide()->create([
            'zone_id' => $zoneCalme->id,
            'latitude' => 14.7182,
            'longitude' => -17.4710,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/dashboard/heatmap')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.zone_id', $zoneCritique->id)
            ->assertJsonPath('0.zone_nom', 'Mermoz')
            ->assertJsonPath('0.weight', 3)
            ->assertJsonPath('0.latitude', 14.7168)
            ->assertJsonPath('0.longitude', -17.4677)
            ->assertJsonPath('1.zone_id', $zoneCalme->id)
            ->assertJsonPath('1.weight', 1);
    }

    public function test_inactive_signalements_are_excluded(): void
    {
        $admin = $this->admin();

        $zone = Zone::factory()->create();

        Signalement::factory()->valide()->create(['zone_id' => $zone->id]);
        Signalement::factory()->cloture()->create(['zone_id' => $zone->id]);
        Signalement::factory()->rejete()->create(['zone_id' => $zone->id]);
        Signalement::factory()->create(['zone_id' => $zone->id]);

        $this->actingAs($admin)
            ->getJson('/api/dashboard/heatmap')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.weight', 1);
    }

    public function test_heatmap_does_not_expose_citizen_data(): void
    {
        $admin = $this->admin();

        $zone = Zone::factory()->create();
        Signalement::factory()->valide()->create([
            'zone_id' => $zone->id,
            'user_id' => User::factory()->create(['email' => 'citoyen@example.com']),
        ]);

        $this->actingAs($admin)
            ->getJson('/api/dashboard/heatmap')
            ->assertOk()
            ->assertJsonMissingPath('0.user_id')
            ->assertJsonMissingPath('0.user');
    }
}
