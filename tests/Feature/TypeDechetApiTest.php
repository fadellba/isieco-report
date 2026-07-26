<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\TypeDechet;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class TypeDechetApiTest extends TestCase
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

    public function test_anyone_authenticated_can_list_types_dechets(): void
    {
        $citizen = $this->citizen();
        TypeDechet::factory()->count(3)->create();

        $this->actingAs($citizen)
            ->getJson('/api/types-dechets')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_admin_can_create_type_dechet(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->postJson('/api/types-dechets', [
                'libelle' => 'Déchets plastiques',
                'description' => 'Bouteilles, sacs, emballages',
            ])
            ->assertCreated()
            ->assertJsonPath('data.libelle', 'Déchets plastiques');
    }

    public function test_citizen_cannot_create_type_dechet(): void
    {
        $citizen = $this->citizen();

        $this->actingAs($citizen)
            ->postJson('/api/types-dechets', [
                'libelle' => 'Test',
            ])
            ->assertForbidden();
    }

    public function test_admin_can_update_type_dechet(): void
    {
        $admin = $this->admin();
        $typeDechet = TypeDechet::factory()->create(['libelle' => 'Ancien']);

        $this->actingAs($admin)
            ->putJson("/api/types-dechets/{$typeDechet->id}", [
                'libelle' => 'Nouveau',
            ])
            ->assertOk()
            ->assertJsonPath('data.libelle', 'Nouveau');
    }

    public function test_admin_can_delete_type_dechet(): void
    {
        $admin = $this->admin();
        $typeDechet = TypeDechet::factory()->create();

        $this->actingAs($admin)
            ->deleteJson("/api/types-dechets/{$typeDechet->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('types_dechets', ['id' => $typeDechet->id]);
    }

    public function test_libelle_is_required_when_creating(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->postJson('/api/types-dechets', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['libelle']);
    }
}
