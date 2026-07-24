<?php

declare(strict_types=1);

namespace App\DTOs\Signalement;

use App\Enums\SignalementPrioriteEnum;
use App\Enums\SignalementStatutEnum;

final readonly class CreateSignalementDTO
{
    public function __construct(
        public string $description,
        public string $date_heure_signalement,
        public float $latitude,
        public float $longitude,
        public int $user_id,
        public int $zone_id,
        public SignalementStatutEnum $statut = SignalementStatutEnum::EN_ATTENTE_VALIDATION,
        public SignalementPrioriteEnum $priorite = SignalementPrioriteEnum::NORMALE,
        public array $type_dechets = [], // array of arrays: ['type_dechet_id' => int, 'quantite_estime' => float, 'volume_estime' => float, 'dangerosite' => string, 'remarque' => string]
        public array $photos = [], // array of string urls
    ) {
    }

    public function toArray(): array
    {
        return [
            'description' => $this->description,
            'date_heure_signalement' => $this->date_heure_signalement,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'user_id' => $this->user_id,
            'zone_id' => $this->zone_id,
            'statut' => $this->statut->value,
            'priorite' => $this->priorite->value,
        ];
    }
}
