<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SignalementStatutEnum;
use App\Models\Signalement;
use App\Models\User;

final class SignalementPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(
        User $user,
        Signalement $signalement
    ): bool {
        return $user->isAdmin()
            || $user->isAgent()
            || $signalement->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(
        User $user,
        Signalement $signalement
    ): bool {
        if ($user->isAdmin()) {
            return true;
        }

        return $signalement->user_id === $user->id
            && in_array(
                $signalement->statut,
                [
                    SignalementStatutEnum::BROUILLON,
                    SignalementStatutEnum::EN_ATTENTE_VALIDATION,
                ],
                true
            );
    }

    public function delete(
        User $user,
        Signalement $signalement
    ): bool {
        if ($user->isAdmin()) {
            return true;
        }

        return $signalement->user_id === $user->id
            && $signalement->statut === SignalementStatutEnum::BROUILLON;
    }
}
