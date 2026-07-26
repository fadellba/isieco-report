<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SignalementPrioriteEnum;
use App\Enums\SignalementStatutEnum;
use App\Models\Signalement;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Signalement>
 */
final class SignalementFactory extends Factory
{
    protected $model = Signalement::class;

    public function definition(): array
    {
        return [
            'description' => $this->faker->sentence(),
            'date_heure_signalement' => $this->faker->dateTimeBetween('-3 months', 'now')->format('Y-m-d H:i:s'),
            'latitude' => $this->faker->latitude(0, 20),
            'longitude' => $this->faker->longitude(-20, 20),
            'statut' => SignalementStatutEnum::EN_ATTENTE_VALIDATION->value,
            'priorite' => $this->faker->randomElement(SignalementPrioriteEnum::cases())->value,
            'user_id' => User::factory(),
            'zone_id' => Zone::factory(),
        ];
    }

    public function valide(): static
    {
        return $this->state(['statut' => SignalementStatutEnum::VALIDE->value]);
    }

    public function priorise(): static
    {
        return $this->state(['statut' => SignalementStatutEnum::PRIORISE->value]);
    }

    public function affecte(): static
    {
        return $this->state(['statut' => SignalementStatutEnum::AFFECTE->value]);
    }
}
