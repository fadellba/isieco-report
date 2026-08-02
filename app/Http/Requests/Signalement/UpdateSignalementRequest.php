<?php

declare(strict_types=1);

namespace App\Http\Requests\Signalement;

use App\DTOs\Signalement\UpdateSignalementDTO;
use App\Enums\SignalementPrioriteEnum;
use App\Enums\SignalementStatutEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class UpdateSignalementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'description' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'statut' => [
                'sometimes',
                new Enum(SignalementStatutEnum::class),
            ],

            'priorite' => [
                'sometimes',
                new Enum(SignalementPrioriteEnum::class),
            ],

            'zone_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:zones,id',
            ],
        ];
    }

    public function toDTO(): UpdateSignalementDTO
    {
        return new UpdateSignalementDTO(
            description: $this->validated('description'),
            statut: $this->filled('statut')
                ? SignalementStatutEnum::from($this->validated('statut'))
                : null,
            priorite: $this->filled('priorite')
                ? SignalementPrioriteEnum::from($this->validated('priorite'))
                : null,
            zone_id: $this->validated('zone_id'),
            zone_id_present: $this->exists('zone_id'),
        );
    }
}
