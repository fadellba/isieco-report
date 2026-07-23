<?php

declare(strict_types=1);

namespace App\Http\Requests\Signalement;

use App\DTOs\Signalement\CreateSignalementDTO;
use App\Enums\DangerositeEnum;
use App\Enums\SignalementPrioriteEnum;
use App\Enums\SignalementStatutEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class StoreSignalementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'description' => ['required', 'string'],
            'date_heure_signalement' => ['required', 'date_format:Y-m-d H:i:s'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'zone_id' => ['required', 'integer', 'exists:zones,id'],
            'statut' => ['sometimes', new Enum(SignalementStatutEnum::class)],
            'priorite' => ['sometimes', new Enum(SignalementPrioriteEnum::class)],

            // Pivot details
            'type_dechets' => ['required', 'array', 'min:1'],
            'type_dechets.*.type_dechet_id' => ['required', 'integer', 'exists:types_dechets,id'],
            'type_dechets.*.quantite_estime' => ['required', 'numeric', 'min:0'],
            'type_dechets.*.volume_estime' => ['required', 'numeric', 'min:0'],
            'type_dechets.*.dangerosite' => ['required', new Enum(DangerositeEnum::class)],
            'type_dechets.*.remarque' => ['nullable', 'string'],

            'photos' => ['sometimes', 'array'],
            'photos.*' => ['string', 'url'],
        ];
    }

    public function toDTO(): CreateSignalementDTO
    {
        return new CreateSignalementDTO(
            description: $this->validated('description'),
            date_heure_signalement: $this->validated('date_heure_signalement'),
            latitude: (float) $this->validated('latitude'),
            longitude: (float) $this->validated('longitude'),
            user_id: $this->user()->id,
            zone_id: (int) $this->validated('zone_id'),
            statut: $this->filled('statut')
                ? SignalementStatutEnum::from($this->validated('statut'))
                : SignalementStatutEnum::EN_ATTENTE_VALIDATION,
            priorite: $this->filled('priorite')
                ? SignalementPrioriteEnum::from($this->validated('priorite'))
                : SignalementPrioriteEnum::NORMALE,
            type_dechets: $this->validated('type_dechets', []),
            photos: $this->validated('photos', []),
        );
    }
}
