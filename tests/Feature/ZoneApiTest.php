<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\User;
use App\Models\Zone;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ZoneApiTest extends TestCase
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

    public function test_anyone_authenticated_can_list_zones(): void
    {
        $citizen = $this->citizen();
        Zone::factory()->count(4)->create();

        $this->actingAs($citizen)
            ->getJson('/api/zones')
            ->assertOk()
            ->assertJsonCount(4, 'data');
    }

    public function test_admin_can_create_zone(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->postJson('/api/zones', [
                'nom_zone' => 'Zone Nord',
                'description' => 'Zone au nord de la ville',
            ])
            ->assertCreated()
            ->assertJsonPath('data.nom_zone', 'Zone Nord');
    }

    public function test_citizen_cannot_create_zone(): void
    {
        $citizen = $this->citizen();

        $this->actingAs($citizen)
            ->postJson('/api/zones', ['nom_zone' => 'Test Zone'])
            ->assertForbidden();
    }

    public function test_admin_can_update_zone(): void
    {
        $admin = $this->admin();
        $zone = Zone::factory()->create(['nom_zone' => 'Ancienne zone']);

        $this->actingAs($admin)
            ->putJson("/api/zones/{$zone->id}", ['nom_zone' => 'Nouvelle zone'])
            ->assertOk()
            ->assertJsonPath('data.nom_zone', 'Nouvelle zone');
    }

    public function test_admin_can_delete_zone(): void
    {
        $admin = $this->admin();
        $zone = Zone::factory()->create();

        $this->actingAs($admin)
            ->deleteJson("/api/zones/{$zone->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('zones', ['id' => $zone->id]);
    }

    public function test_nom_zone_is_required(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->postJson('/api/zones', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nom_zone']);
    }
}
