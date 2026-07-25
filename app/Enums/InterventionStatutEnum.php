<?php

declare(strict_types=1);

namespace App\Enums;

enum InterventionStatutEnum: string
{
    case EN_COURS  = 'en_cours';
    case TERMINEE  = 'terminee';
    case SUSPENDUE = 'suspendue';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
