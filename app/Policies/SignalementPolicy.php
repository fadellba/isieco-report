<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Signalement;
use App\Models\User;

final class SignalementPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Signalement $signalement): bool
    {
        return $user->isAdmin() || $user->isAgent() || $signalement->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Signalement $signalement): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        // Citizens can only update if it is their own and still in draft/pending status
        return $signalement->user_id === $user->id && in_array($signalement->statut->value, ['brouillon', 'en_attente_validation'], true);
    }

    public function delete(User $user, Signalement $signalement): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        // Citizens can only delete their own drafts
        return $signalement->user_id === $user->id && $signalement->statut->value === 'brouillon';
    }
}
