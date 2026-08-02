<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\RoleEnum;
use App\Models\Equipe;
use App\Models\HistoriquePoint;
use App\Models\Signalement;
use App\Models\TypeDechet;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles always seeded first
        $this->call([
            RoleSeeder::class,
        ]);

        // 2. Reference data
        $zones = Zone::factory()->count(5)->create();
        $typesDechets = TypeDechet::factory()->count(6)->create();

        // 3. Users
        $admin = User::factory()->create([
            'nom' => 'Admin',
            'prenom' => 'ISI',
            'email' => 'admin@isieco.sn',
            'password' => bcrypt('password'),
        ]);
        $admin->assignRole(RoleEnum::ADMIN->value);

        $agents = User::factory()->count(6)->create();
        foreach ($agents as $agent) {
            $agent->assignRole(RoleEnum::AGENT->value);
        }

        $citizens = User::factory()->count(10)->create();
        foreach ($citizens as $citizen) {
            $citizen->assignRole(RoleEnum::CITIZEN->value);
        }

        // 4. Equipes with agents assigned
        $equipes = Equipe::factory()->count(3)->create();
        $equipes->each(function (Equipe $equipe) use ($agents) {
            $selectedAgents = $agents->random(2);
            foreach ($selectedAgents as $agent) {
                $equipe->agents()->attach($agent->id, [
                    'date_debut' => now()->subMonths(2)->toDateString(),
                    'fonction' => 'Agent de collecte',
                ]);
            }
            // Assign zones
        });

        // 5. Zone coverage for each equipe
        $equipes->each(function (Equipe $equipe, int $index) use ($zones) {
            $equipe->zones()->attach($zones->get($index)?->id ?? $zones->first()->id);
        });

        // 6. Signalements by citizens with type_dechets content
        $citizens->each(function (User $citizen) use ($zones, $typesDechets) {
            $signalements = Signalement::factory()->count(2)->create([
                'user_id' => $citizen->id,
                'zone_id' => $zones->random()->id,
            ]);

            $signalements->each(function (Signalement $signalement) use ($typesDechets) {
                $selected = $typesDechets->random(rand(1, 3));
                $attachData = [];
                foreach ($selected as $type) {
                    $attachData[$type->id] = [
                        'quantite_estime' => rand(1, 100),
                        'volume_estime' => rand(1, 50),
                        'dangerosite' => 'modere',
                        'remarque' => null,
                    ];
                }
                $signalement->typeDechets()->attach($attachData);
            });
        });

        // 7. Points for citizens
        $citizens->each(function (User $citizen) {
            HistoriquePoint::factory()->count(2)->create([
                'user_id' => $citizen->id,
            ]);
        });
    }
}
